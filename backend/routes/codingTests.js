// backend/routes/codingTests.js
import express from "express";
import Problem from "../models/Problem.js";
import Submission from "../models/Submission.js";
import CodingTestAttempt from "../models/TestAttempt.js";
import judge0Service from "../services/judge0Service.js";

const router = express.Router();

router.post("/coding-tests/create", async (req, res) => {
  try {
    const {
      title,
      description,
      subject,
      topic,
      college,
      duration,
      problems,
      startTime,
      endTime,
      passingPercentage,
    } = req.body;

    console.log("📝 Creating coding test:", title);
    console.log("📝 Request body:", req.body);

    // Validate required fields
    if (
      !title ||
      !subject ||
      !topic ||
      !college ||
      !duration ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Generate unique testId
    const testId = `TEST_${Date.now()}`;

    // Get user ID from request
    const userId = req.userId || "admin";

    // Create test
    const test = new CodingTest({
      title,
      description: description || "",
      subject,
      topic,
      college,
      duration: parseInt(duration),
      problems: problems || [],
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      totalQuestions: problems?.length || 0,
      isActive: true,
      createdBy: userId,
    });

    await test.save();

    console.log(`✅ Coding test created: ${testId} - ${title}`);

    res.json({
      success: true,
      message: "Coding test created successfully",
      test,
    });
  } catch (error) {
    console.error("❌ Error creating coding test:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create coding test",
    });
  }
});
// ============================================
// POST /api/coding/submit
// Submit code - Runs ALL test cases (Sample + Hidden)
// Saves to database AND groups by user per test
// ============================================
router.post("/submit", async (req, res) => {
  try {
    const { problemId, code, language, testId } = req.body;
    const userId = req.userId || "test_user_123";

    const languageId = judge0Service.getLanguageId(language);
    if (!languageId) {
      return res.status(400).json({
        success: false,
        error: "Unsupported language",
      });
    }

    const problem = await Problem.findOne({ problemId: problemId });
    if (!problem) {
      return res.status(404).json({
        success: false,
        error: "Problem not found",
      });
    }

    console.log(`📝 Found problem: ${problem.title}`);
    console.log(`📝 Total test cases: ${problem.testCases.length}`);

    const testCases = problem.testCases || [];
    if (testCases.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No test cases found for this problem",
      });
    }

    // Run ALL test cases (Sample + Hidden)
    let result;
    try {
      result = await judge0Service.runTestCases(code, language, testCases);
    } catch (error) {
      console.error("❌ Judge0 execution error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Code execution failed",
      });
    }

    // Determine final status
    let finalStatus = "Accepted";
    const hasCompilationError = result.results.some(
      (r) => r.status === "Compilation Error",
    );
    const hasRuntimeError = result.results.some(
      (r) => r.status === "Runtime Error",
    );
    const hasTimeLimit = result.results.some(
      (r) => r.status === "Time Limit Exceeded",
    );

    if (hasCompilationError) {
      finalStatus = "Compilation Error";
    } else if (hasRuntimeError) {
      finalStatus = "Runtime Error";
    } else if (hasTimeLimit) {
      finalStatus = "Time Limit Exceeded";
    } else if (result.passedCount === result.totalCount) {
      finalStatus = "Accepted";
    } else {
      finalStatus = "Wrong Answer";
    }

    // ============================================
    // ✅ STEP 1: Save individual submission (for code history)
    // ============================================
    const totalExecutionTime = result.results.reduce((sum, r) => {
      const time = parseFloat(r.executionTime) || 0;
      return sum + time;
    }, 0);

    const submission = new Submission({
      userId,
      problemId: problem._id,
      testId: testId || "DEFAULT_TEST",
      language,
      code,
      status: finalStatus,
      passedTestCases: result.passedCount,
      totalTestCases: result.totalCount,
      score: result.score,
      testResults: result.results,
      executionTime: totalExecutionTime,
    });

    await submission.save();
    console.log(`✅ Submission saved to database (ID: ${submission._id})`);

    // ============================================
    // ✅ STEP 2: Group by user in CodingTestAttempt
    // ============================================
    if (testId) {
      let attempt = await CodingTestAttempt.findOne({
        userId,
        testId,
        status: "in_progress",
      });

      if (!attempt) {
        attempt = new CodingTestAttempt({
          userId,
          testId,
          status: "in_progress",
          solutions: [],
          totalProblems: 0,
        });
      }

      // Check if solution already exists for this problem
      const existingIndex = attempt.solutions.findIndex(
        (s) => s.problemId.toString() === problem._id.toString(),
      );

      const solutionData = {
        problemId: problem._id,
        code,
        language,
        status: finalStatus === "Accepted" ? "accepted" : "wrong_answer",
        passedTests: result.passedCount,
        totalTests: result.totalCount,
        executionTime: totalExecutionTime,
        submittedAt: new Date(),
      };

      if (existingIndex !== -1) {
        attempt.solutions[existingIndex] = solutionData;
      } else {
        attempt.solutions.push(solutionData);
      }

      // Update scores
      const acceptedSolutions = attempt.solutions.filter(
        (s) => s.status === "accepted",
      );
      attempt.passedCount = acceptedSolutions.length;
      attempt.totalProblems = attempt.solutions.length;
      attempt.percentage =
        attempt.totalProblems > 0
          ? (acceptedSolutions.length / attempt.totalProblems) * 100
          : 0;
      attempt.passed = attempt.percentage >= 40;

      await attempt.save();
      console.log(`✅ Grouped submission for user ${userId} in test ${testId}`);
    }

    // ============================================
    // ✅ STEP 3: Update problem stats
    // ============================================
    problem.totalSubmissions = (problem.totalSubmissions || 0) + 1;
    if (finalStatus === "Accepted") {
      problem.acceptedSubmissions = (problem.acceptedSubmissions || 0) + 1;
    }
    problem.acceptanceRate =
      problem.totalSubmissions > 0
        ? (problem.acceptedSubmissions / problem.totalSubmissions) * 100
        : 0;
    await problem.save();

    const firstError = result.results.find(
      (r) => r.error && r.error.length > 0,
    );

    // ============================================
    // ✅ STEP 4: Filter results for frontend
    // ============================================
    const sampleTestResults = result.results.filter((r, index) => {
      const testCase = testCases[index];
      return testCase && !testCase.isHidden;
    });

    const hiddenTestResults = result.results.filter((r, index) => {
      const testCase = testCases[index];
      return testCase && testCase.isHidden;
    });

    console.log(`📊 Sample test cases: ${sampleTestResults.length}`);
    console.log(`🔒 Hidden test cases: ${hiddenTestResults.length}`);

    res.json({
      success: true,
      submissionId: submission._id,
      status: finalStatus,
      passedTests: result.passedCount,
      totalTests: result.totalCount,
      score: result.score,
      executionTime: parseFloat(submission.executionTime) || 0,
      isSaved: true,
      testResults: sampleTestResults.map((r) => ({
        testCase: r.testCase,
        passed: r.passed,
        status: r.status,
        input: r.input,
        expected: r.expected,
        output: r.output,
        error: r.error || undefined,
        executionTime: r.executionTime,
        memoryUsed: r.memoryUsed,
        isHidden: false,
      })),
      hiddenCount: hiddenTestResults.length,
      hiddenPassed: hiddenTestResults.filter((r) => r.passed).length,
      errorMessage: firstError?.error || undefined,
    });
  } catch (error) {
    console.error("❌ Submission error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to submit code",
    });
  }
});

// ============================================
// POST /api/coding/run-samples
// Run ONLY sample test cases (isHidden: false)
// Does NOT save to database
// ============================================
router.post("/run-samples", async (req, res) => {
  try {
    const { problemId, code, language } = req.body;

    console.log(`🧪 ===== RUN SAMPLES ONLY =====`);
    console.log(`📝 Problem: ${problemId}`);
    console.log(`💻 Language: ${language}`);

    const languageId = judge0Service.getLanguageId(language);
    if (!languageId) {
      return res.status(400).json({
        success: false,
        error: "Unsupported language",
      });
    }

    const problem = await Problem.findOne({ problemId: problemId });
    if (!problem) {
      return res.status(404).json({
        success: false,
        error: "Problem not found",
      });
    }

    // ✅ ONLY sample test cases (isHidden: false)
    const sampleTestCases = problem.testCases.filter((tc) => !tc.isHidden);
    console.log(`📝 Sample test cases: ${sampleTestCases.length}`);

    if (sampleTestCases.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No sample test cases found for this problem",
      });
    }

    let result;
    try {
      result = await judge0Service.runTestCases(
        code,
        language,
        sampleTestCases,
      );
    } catch (error) {
      console.error("❌ Judge0 execution error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Code execution failed",
      });
    }

    let finalStatus = "All Samples Passed";
    const hasCompilationError = result.results.some(
      (r) => r.status === "Compilation Error",
    );
    const hasRuntimeError = result.results.some(
      (r) => r.status === "Runtime Error",
    );
    const hasTimeLimit = result.results.some(
      (r) => r.status === "Time Limit Exceeded",
    );

    if (hasCompilationError) {
      finalStatus = "Compilation Error";
    } else if (hasRuntimeError) {
      finalStatus = "Runtime Error";
    } else if (hasTimeLimit) {
      finalStatus = "Time Limit Exceeded";
    } else if (result.passedCount === result.totalCount) {
      finalStatus = "All Samples Passed ✅";
    } else {
      finalStatus = "Some Samples Failed";
    }

    const firstError = result.results.find(
      (r) => r.error && r.error.length > 0,
    );

    res.json({
      success: true,
      status: finalStatus,
      passedTests: result.passedCount,
      totalTests: result.totalCount,
      score: result.score,
      executionTime: result.results.reduce(
        (sum, r) => sum + (r.executionTime || 0),
        0,
      ),
      isSaved: false,
      testResults: result.results.map((r) => ({
        testCase: r.testCase,
        passed: r.passed,
        status: r.status,
        input: r.input,
        expected: r.expected,
        output: r.output,
        error: r.error || undefined,
        executionTime: r.executionTime,
        memoryUsed: r.memoryUsed,
        isHidden: false,
      })),
      hiddenCount: 0,
      hiddenPassed: 0,
      errorMessage: firstError?.error || undefined,
    });
  } catch (error) {
    console.error("❌ Run samples error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to run samples",
    });
  }
});

// ============================================
// GET /api/coding/problem/:problemId/testcases
// Get sample test cases for display
// ============================================
router.get("/problem/:problemId/testcases", async (req, res) => {
  try {
    const { problemId } = req.params;
    console.log(`📡 Fetching test cases for problem: ${problemId}`);

    const problem = await Problem.findOne({ problemId: problemId });

    if (!problem) {
      return res.status(404).json({
        success: false,
        error: "Problem not found",
      });
    }

    const sampleTestCases = problem.testCases
      .filter((tc) => !tc.isHidden)
      .map((tc) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        explanation: tc.explanation || "",
      }));

    console.log(`✅ Found ${sampleTestCases.length} sample test cases`);

    res.json({
      success: true,
      testCases: sampleTestCases,
      starterCode: problem.starterCode || {},
    });
  } catch (error) {
    console.error("Error fetching test cases:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch test cases",
    });
  }
});

// ============================================
// GET /api/coding/submissions/:userId
// Get user submissions
// ============================================
router.get("/submissions/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const submissions = await Submission.find({ userId })
      .populate("problemId", "title problemId difficulty")
      .sort({ submittedAt: -1 })
      .limit(50);

    res.json({
      success: true,
      submissions,
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch submissions",
    });
  }
});

export default router;
