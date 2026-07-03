// backend/routes/submissions.js
import express from "express";
import Submission from "../models/Submission.js";
import Problem from "../models/Problem.js";
import User from "../models/User.js";
import judge0 from "../services/judge0Service.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// ============================================
// GET /api/submissions
// Get all submissions for the logged-in user
// ============================================
router.get("/", protect, async (req, res) => {
  try {
    const submissions = await Submission.find({ userId: req.userId })
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

// ============================================
// GET /api/submissions/:id
// Get a specific submission
// ============================================
router.get("/:id", protect, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate("problemId", "title problemId difficulty description")
      .populate("userId", "fullName email");

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: "Submission not found",
      });
    }

    // Check if user owns this submission or is admin
    if (
      submission.userId._id.toString() !== req.userId.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to view this submission",
      });
    }

    res.json({
      success: true,
      submission,
    });
  } catch (error) {
    console.error("Error fetching submission:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch submission",
    });
  }
});

// ============================================
// POST /api/submissions/:problemId
// Submit code for a problem
// ============================================
router.post("/:problemId", protect, async (req, res) => {
  try {
    const { problemId } = req.params;
    const { code, language } = req.body;
    const userId = req.userId;

    // Validate input
    if (!code || !language) {
      return res.status(400).json({
        success: false,
        error: "Code and language are required",
      });
    }

    // Find the problem
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({
        success: false,
        error: "Problem not found",
      });
    }

    // Get language ID for Judge0
    const languageId = judge0.getLanguageId(language);
    if (!languageId) {
      return res.status(400).json({
        success: false,
        error: "Unsupported language",
      });
    }

    // Get test cases
    const testCases = problem.testCases || [];
    if (testCases.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No test cases found for this problem",
      });
    }

    // Create submission record
    const submission = new Submission({
      userId,
      problemId,
      language,
      code,
      status: "Pending",
      totalTestCases: testCases.length,
    });

    let passedTestCases = 0;
    const testResults = [];
    let finalStatus = "Accepted";
    let errorMessage = "";

    // Execute code against each test case
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];

      try {
        const result = await judge0.executeCode(
          code,
          languageId,
          testCase.input || "",
          testCase.expectedOutput || "",
        );

        const passed = result.status && result.status.id === 3;
        if (passed) passedTestCases++;

        const testResult = {
          testCaseId: i + 1,
          passed,
          input: testCase.input || "",
          expected: testCase.expectedOutput || "",
          output: result.stdout || "",
          error: result.stderr || "",
          executionTime: result.time || 0,
        };
        testResults.push(testResult);

        // Check for errors
        if (result.status) {
          const statusId = result.status.id;
          if (statusId === 6) {
            finalStatus = "Compilation Error";
            errorMessage = result.compile_output || "Compilation Error";
            break;
          }
          if (statusId === 5) {
            finalStatus = "Runtime Error";
            errorMessage = result.stderr || "Runtime Error";
            break;
          }
          if (statusId === 8) {
            finalStatus = "Time Limit Exceeded";
            errorMessage = "Time Limit Exceeded";
            break;
          }
        }
      } catch (error) {
        finalStatus = "Runtime Error";
        errorMessage = error.message || "Execution failed";
        testResults.push({
          testCaseId: i + 1,
          passed: false,
          input: testCase.input || "",
          expected: testCase.expectedOutput || "",
          output: "",
          error: error.message,
          executionTime: 0,
        });
        break;
      }
    }

    // Determine final status
    if (finalStatus === "Accepted" && passedTestCases < testCases.length) {
      finalStatus = "Wrong Answer";
    }

    // Update submission
    submission.status = finalStatus;
    submission.passedTestCases = passedTestCases;
    submission.testResults = testResults;
    submission.executionTime = testResults.reduce(
      (sum, tr) => sum + (tr.executionTime || 0),
      0,
    );
    await submission.save();

    // Update problem stats
    problem.totalSubmissions = (problem.totalSubmissions || 0) + 1;
    if (finalStatus === "Accepted") {
      problem.acceptedSubmissions = (problem.acceptedSubmissions || 0) + 1;
    }
    problem.acceptanceRate =
      problem.totalSubmissions > 0
        ? (problem.acceptedSubmissions / problem.totalSubmissions) * 100
        : 0;
    await problem.save();

    // Update user stats
    const user = await User.findById(userId);
    if (user) {
      user.codingStats = user.codingStats || {
        totalSolved: 0,
        easySolved: 0,
        mediumSolved: 0,
        hardSolved: 0,
      };
      user.codingStats.totalSubmissions =
        (user.codingStats.totalSubmissions || 0) + 1;

      if (finalStatus === "Accepted") {
        user.codingStats.totalAccepted =
          (user.codingStats.totalAccepted || 0) + 1;
        user.codingStats.totalSolved = (user.codingStats.totalSolved || 0) + 1;

        // Update difficulty-specific stats
        if (problem.difficulty === "Easy") {
          user.codingStats.easySolved = (user.codingStats.easySolved || 0) + 1;
        } else if (problem.difficulty === "Medium") {
          user.codingStats.mediumSolved =
            (user.codingStats.mediumSolved || 0) + 1;
        } else if (problem.difficulty === "Hard") {
          user.codingStats.hardSolved = (user.codingStats.hardSolved || 0) + 1;
        }

        // Add to solved problems if not already
        if (!user.solvedProblems.includes(problemId)) {
          user.solvedProblems.push(problemId);
        }
      }
      await user.save();
    }

    res.json({
      success: true,
      submissionId: submission._id,
      status: finalStatus,
      passedTestCases,
      totalTestCases: testCases.length,
      executionTime: submission.executionTime,
      testResults: testResults.map((tr) => ({
        testCaseId: tr.testCaseId,
        passed: tr.passed,
        input: tr.input,
        expected: tr.expected,
        output: tr.output,
        error: tr.error,
        executionTime: tr.executionTime,
      })),
      errorMessage: errorMessage || undefined,
    });
  } catch (error) {
    console.error("Submission error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to submit code",
    });
  }
});

// ============================================
// GET /api/submissions/problem/:problemId
// Get submissions for a specific problem
// ============================================
router.get("/problem/:problemId", protect, async (req, res) => {
  try {
    const { problemId } = req.params;
    const submissions = await Submission.find({
      userId: req.userId,
      problemId,
    })
      .sort({ submittedAt: -1 })
      .limit(20);

    res.json({
      success: true,
      submissions,
    });
  } catch (error) {
    console.error("Error fetching problem submissions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch submissions",
    });
  }
});

export default router;
