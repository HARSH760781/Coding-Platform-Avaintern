// backend/routes/codingTests.js
import express from "express";
import Problem from "../models/Problem.js";
import mongoose from "mongoose";
import Submission from "../models/Submission.js";
import TestAttempt from "../models/TestAttempt.js";
import judge0Service from "../services/judge0Service.js";
import { protect } from "../middleware/auth.js";

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
// ✅ Helper function to normalize status for TestAttempt
const normalizeStatusForTestAttempt = (status) => {
  const statusMap = {
    // Accepted
    Accepted: "accepted",
    "Accepted ✅": "accepted",
    AC: "accepted",
    accepted: "accepted",

    // Wrong Answer
    "Wrong Answer": "wrong_answer",
    "Wrong Answer ❌": "wrong_answer",
    WA: "wrong_answer",
    wrong_answer: "wrong_answer",
    "wrong-answer": "wrong_answer",

    // Runtime Error
    "Runtime Error": "runtime_error",
    "Runtime Error ⚠️": "runtime_error",
    RE: "runtime_error",
    runtime_error: "runtime_error",
    "runtime-error": "runtime_error",

    // Compilation Error
    "Compilation Error": "compilation_error",
    "Compilation Error 🔧": "compilation_error",
    CE: "compilation_error",
    compilation_error: "compilation_error",
    "compilation-error": "compilation_error",

    // Time Limit
    "Time Limit Exceeded": "runtime_error",
    TLE: "runtime_error",
    time_limit: "runtime_error",
    time_limit_exceeded: "runtime_error",
    "time-limit-exceeded": "runtime_error",

    // Pending
    Pending: "pending",
    "Pending ⏳": "pending",
    pending: "pending",
  };

  return statusMap[status] || "pending";
};

// ============================================
// POST /api/coding/submit
// ============================================
router.post("/submit", protect, async (req, res) => {
  try {
    const { problemId, code, language, testId } = req.body;

    // ✅ Get userId from authenticated user
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated. Please login.",
      });
    }

    // ✅ Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user ID format",
      });
    }

    console.log(`👤 User ID: ${userId}`);
    console.log(`📝 Problem ID: ${problemId}`);
    console.log(`💻 Language: ${language}`);
    console.log(`🧪 Test ID: ${testId || "No test ID"}`);

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

    // Run ALL test cases
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

    // ✅ Determine final status
    let displayStatus = "Pending";
    let rawStatus = "pending";

    const hasCompilationError = result.results.some(
      (r) =>
        r.status === "Compilation Error" || r.status === "compilation error",
    );
    const hasRuntimeError = result.results.some(
      (r) => r.status === "Runtime Error" || r.status === "runtime error",
    );
    const hasTimeLimit = result.results.some(
      (r) =>
        r.status === "Time Limit Exceeded" ||
        r.status === "time limit exceeded",
    );

    if (hasCompilationError) {
      displayStatus = "Compilation Error";
      rawStatus = "Compilation Error";
    } else if (hasRuntimeError) {
      displayStatus = "Runtime Error";
      rawStatus = "Runtime Error";
    } else if (hasTimeLimit) {
      displayStatus = "Time Limit Exceeded";
      rawStatus = "Time Limit Exceeded";
    } else if (result.passedCount === result.totalCount) {
      displayStatus = "Accepted";
      rawStatus = "Accepted";
    } else {
      displayStatus = "Wrong Answer";
      rawStatus = "Wrong Answer";
    }

    // ✅ Normalize for TestAttempt enum
    const enumStatus = normalizeStatusForTestAttempt(rawStatus);

    console.log(`📊 Display Status: ${displayStatus}`);
    console.log(`📊 Raw Status: ${rawStatus}`);
    console.log(`📊 Enum Status: ${enumStatus}`);
    console.log(`📊 Passed: ${result.passedCount}/${result.totalCount}`);

    // ============================================
    // STEP 1: Save individual submission
    // ============================================
    const totalExecutionTime = result.results.reduce((sum, r) => {
      const time = parseFloat(r.executionTime) || 0;
      return sum + time;
    }, 0);

    const submission = new Submission({
      userId: userId,
      problemId: problem._id,
      testId: testId || "DEFAULT_TEST",
      language,
      code,
      status: displayStatus,
      passedTestCases: result.passedCount,
      totalTestCases: result.totalCount,
      score: result.score,
      testResults: result.results,
      executionTime: totalExecutionTime,
    });

    await submission.save();
    console.log(`✅ Submission saved (ID: ${submission._id})`);

    // ============================================
    // STEP 2: Group by user in TestAttempt
    // ============================================
    if (testId) {
      try {
        let attempt = await TestAttempt.findOne({
          userId: userId,
          testId: testId,
          status: "in_progress",
        });

        if (!attempt) {
          attempt = new TestAttempt({
            userId: userId,
            testId: testId,
            status: "in_progress",
            solutions: [],
            totalProblems: 0,
            passedCount: 0,
            percentage: 0,
            passed: false,
          });
        }

        // Check if solution already exists
        const existingIndex = attempt.solutions.findIndex(
          (s) =>
            s.problemId && s.problemId.toString() === problem._id.toString(),
        );

        // ✅ Use enumStatus for TestAttempt
        const solutionData = {
          problemId: problem._id,
          code: code,
          language: language,
          status: enumStatus, // ✅ This is normalized for the enum
          passedTests: result.passedCount,
          totalTests: result.totalCount,
          executionTime: totalExecutionTime,
          submittedAt: new Date(),
        };

        console.log(`🔍 Saving to TestAttempt with status: ${enumStatus}`);

        if (existingIndex !== -1) {
          attempt.solutions[existingIndex] = solutionData;
          console.log(`🔄 Updated existing solution`);
        } else {
          attempt.solutions.push(solutionData);
          console.log(`➕ Added new solution`);
        }

        // Update scores - case insensitive
        const acceptedSolutions = attempt.solutions.filter(
          (s) => s.status && s.status.toLowerCase() === "accepted",
        );
        attempt.passedCount = acceptedSolutions.length;
        attempt.totalProblems = attempt.solutions.length;
        attempt.percentage =
          attempt.totalProblems > 0
            ? (acceptedSolutions.length / attempt.totalProblems) * 100
            : 0;
        attempt.passed = attempt.percentage >= 40;

        await attempt.save();
        console.log(`✅ TestAttempt updated for user ${userId}`);
        console.log(
          `📊 Problems solved: ${attempt.passedCount}/${attempt.totalProblems}`,
        );
        console.log(`📊 Percentage: ${attempt.percentage}%`);
      } catch (error) {
        console.error("❌ Error updating TestAttempt:", error);
        console.error("Error details:", error.errors);
        // Don't fail the whole request if this fails
      }
    }

    // ============================================
    // STEP 3: Update problem stats
    // ============================================
    problem.totalSubmissions = (problem.totalSubmissions || 0) + 1;
    if (enumStatus === "accepted") {
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
    // STEP 4: Filter results for frontend
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
      status: displayStatus,
      passedTests: result.passedCount,
      totalTests: result.totalCount,
      score: result.score,
      executionTime: parseFloat(totalExecutionTime) || 0,
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
      ...(process.env.NODE_ENV === "development" && {
        stack: error.stack,
      }),
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
