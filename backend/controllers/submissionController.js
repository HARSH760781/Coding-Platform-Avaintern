const Submission = require("../models/Submission");
const Problem = require("../models/Problem");
const User = require("../models/User");
const judge0 = require("../utils/judge0");

exports.submitCode = async (req, res) => {
  const { problemId } = req.params;
  const { code, language } = req.body;
  const userId = req.user.id;

  try {
    const problem = await Problem.findOne({ problemId });
    if (!problem) {
      return res.status(404).json({ error: "Problem not found" });
    }

    const examples = problem.examples || [];
    const testCases = problem.testCases || [];

    const submission = new Submission({
      userId,
      problemId: problem._id,
      language,
      code,
      totalTestCases: examples.length + testCases.length,
    });
    await submission.save();

    // ---- 1. Run examples ----
    const exampleRun =
      examples.length > 0
        ? await judge0.runBatchTests(
            code,
            language,
            examples.map((ex) => ({
              input: ex.input,
              expectedOutput: ex.output,
            })),
          )
        : { success: true, results: [] };

    if (!exampleRun.success) {
      submission.status = "Runtime Error";
      await submission.save();
      return res.status(500).json({ success: false, error: exampleRun.error });
    }

    // ---- 2. Run hidden test cases ----
    const hiddenRun =
      testCases.length > 0
        ? await judge0.runBatchTests(code, language, testCases)
        : { success: true, results: [] };

    if (!hiddenRun.success) {
      submission.status = "Runtime Error";
      await submission.save();
      return res.status(500).json({ success: false, error: hiddenRun.error });
    }

    // ---- 3. Build results ----
    // Visible results carry full data
    const exampleResults = exampleRun.results.map((r, idx) => ({
      input: examples[idx].input,
      expected: examples[idx].output,
      output: r.output || "",
      error: r.error || "",
      passed: r.passed,
      isHidden: false,
    }));

    // Hidden results — pass/fail only, no data
    const hiddenResults = hiddenRun.results.map((r) => ({
      passed: r.passed,
      isHidden: true,
    }));

    const testResults = [...exampleResults, ...hiddenResults];

    // ---- 4. Score ----
    const examplePassed = exampleResults.filter((r) => r.passed).length;
    const hiddenPassed = hiddenResults.filter((r) => r.passed).length;
    const passedCount = examplePassed + hiddenPassed;
    const totalCount = testResults.length;
    const score = totalCount > 0 ? (passedCount / totalCount) * 100 : 0;
    const status = passedCount === totalCount ? "Accepted" : "Wrong Answer";

    // ---- 5. Persist ----
    submission.status = status;
    submission.passedTestCases = passedCount;
    submission.score = score;
    submission.testResults = testResults;
    submission.executionTime =
      testResults.reduce((s, r) => s + (r.executionTime || 0), 0) /
      Math.max(testResults.length, 1);
    await submission.save();

    problem.totalSubmissions += 1;
    if (status === "Accepted") problem.acceptedSubmissions += 1;
    problem.acceptanceRate =
      (problem.acceptedSubmissions / problem.totalSubmissions) * 100;
    await problem.save();

    if (status === "Accepted") {
      const user = await User.findById(userId);
      if (user && !user.solvedProblems.includes(problem._id)) {
        user.solvedProblems.push(problem._id);
        user.stats.totalSolved += 1;
        if (problem.difficulty === "Easy") user.stats.easySolved += 1;
        if (problem.difficulty === "Medium") user.stats.mediumSolved += 1;
        if (problem.difficulty === "Hard") user.stats.hardSolved += 1;
        await user.save();
      }
    }

    // ---- 6. Response ----
    return res.json({
      success: true,
      status,
      score,
      passedTests: passedCount,
      totalTests: totalCount,
      isSaved: status === "Accepted",
      testResults, // examples (full data) + hidden (pass only)
      hiddenSummary: {
        passed: hiddenPassed,
        total: hiddenResults.length,
      },
    });
  } catch (error) {
    console.error("submitCode error:", error);
    return res.status(500).json({ error: error.message });
  }
};

exports.getSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ userId: req.user.id })
      .populate("problemId", "title problemId")
      .sort("-submittedAt")
      .limit(20);

    res.json({ success: true, submissions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.runSamples = async (req, res) => {
  const { problemId } = req.params;
  const { code, language } = req.body;

  try {
    const problem = await Problem.findOne({ problemId });
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    const examples = problem.examples || [];
    if (examples.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No examples available",
      });
    }

    const run = await judge0.runBatchTests(
      code,
      language,
      examples.map((ex) => ({
        input: ex.input,
        expectedOutput: ex.output,
      })),
    );

    if (!run.success) {
      return res.status(500).json({ success: false, error: run.error });
    }

    const testResults = run.results.map((r, idx) => ({
      input: examples[idx].input,
      expected: examples[idx].output,
      output: r.output || "",
      error: r.error || "",
      passed: r.passed,
      isHidden: false,
    }));

    const passedTests = testResults.filter((r) => r.passed).length;

    return res.json({
      success: true,
      status: passedTests === testResults.length ? "Accepted" : "Wrong Answer",
      passedTests,
      totalTests: testResults.length,
      score: (passedTests / testResults.length) * 100,
      testResults,
      isSaved: false,
    });
  } catch (error) {
    console.error("runSamples error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
