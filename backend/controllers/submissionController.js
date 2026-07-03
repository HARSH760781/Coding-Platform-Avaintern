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

    // Use ALL test cases including hidden for final evaluation
    const allTestCases = problem.testCases;

    const submission = new Submission({
      userId,
      problemId: problem._id,
      language,
      code,
      totalTestCases: allTestCases.length,
    });

    await submission.save();

    // Run code against all test cases
    const result = await judge0.runBatchTests(code, language, allTestCases);

    if (!result.success) {
      submission.status = "Runtime Error";
      await submission.save();
      return res.status(500).json({ error: result.error });
    }

    // Update submission with results
    const passedCount = result.summary.passed;
    const status =
      passedCount === allTestCases.length ? "Accepted" : "Wrong Answer";

    submission.status = status;
    submission.passedTestCases = passedCount;
    submission.score = parseFloat(result.summary.score);
    submission.testResults = result.results;
    submission.executionTime =
      result.results.reduce((sum, r) => sum + (r.executionTime || 0), 0) /
      result.results.length;

    await submission.save();

    // Update problem stats
    problem.totalSubmissions += 1;
    if (status === "Accepted") {
      problem.acceptedSubmissions += 1;
    }
    problem.acceptanceRate =
      (problem.acceptedSubmissions / problem.totalSubmissions) * 100;
    await problem.save();

    // Update user stats if accepted
    if (status === "Accepted") {
      const user = await User.findById(userId);
      if (!user.solvedProblems.includes(problem._id)) {
        user.solvedProblems.push(problem._id);
        user.stats.totalSolved += 1;

        if (problem.difficulty === "Easy") user.stats.easySolved += 1;
        else if (problem.difficulty === "Medium") user.stats.mediumSolved += 1;
        else if (problem.difficulty === "Hard") user.stats.hardSolved += 1;

        await user.save();
      }
    }

    res.json({
      success: true,
      submission: {
        id: submission._id,
        status,
        score: result.summary.score,
        passedTests: passedCount,
        totalTests: allTestCases.length,
        testResults: result.results,
        executionTime: submission.executionTime,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
