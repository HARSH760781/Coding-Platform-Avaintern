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

    res.json({ success: true, submissions });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch submissions",
    });
  }
});

// ============================================
// POST /api/submissions/run/:problemId
// Run code against EXAMPLES only (visible test cases)
// ============================================
router.post("/run/:problemId", protect, async (req, res) => {
  try {
    const { problemId } = req.params;
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({
        success: false,
        error: "Code and language are required",
      });
    }

    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({
        success: false,
        error: "Problem not found",
      });
    }

    const languageId = judge0.getLanguageId(language);
    if (!languageId) {
      return res.status(400).json({
        success: false,
        error: "Unsupported language",
      });
    }

    // ✅ Only EXAMPLES (visible)
    const examples = problem.examples || [];
    if (examples.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No example test cases available for this problem",
      });
    }

    const testResults = [];
    let passedCount = 0;
    let finalStatus = "Accepted";
    let errorMessage = "";

    for (let i = 0; i < examples.length; i++) {
      const ex = examples[i];

      try {
        const result = await judge0.executeCode(
          code,
          languageId,
          ex.input || "",
          ex.output || "",
        );

        const passed = result.status && result.status.id === 3;
        if (passed) passedCount++;

        testResults.push({
          testCaseId: i + 1,
          input: ex.input || "",
          expected: ex.output || "",
          output: result.stdout || "",
          error: result.stderr || "",
          passed,
          isHidden: false,
          executionTime: result.time || 0,
        });

        // Short-circuit on hard errors
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
          input: ex.input || "",
          expected: ex.output || "",
          output: "",
          error: error.message,
          passed: false,
          isHidden: false,
          executionTime: 0,
        });
        break;
      }
    }

    if (finalStatus === "Accepted" && passedCount < examples.length) {
      finalStatus = "Wrong Answer";
    }

    res.json({
      success: true,
      status: finalStatus,
      passedTests: passedCount,
      totalTests: examples.length,
      score: examples.length > 0 ? (passedCount / examples.length) * 100 : 0,
      testResults,
      isSaved: false,
      errorMessage: errorMessage || undefined,
    });
  } catch (error) {
    console.error("Run samples error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to run samples",
    });
  }
});

// ============================================
// POST /api/submissions/:problemId
// Submit code — runs EXAMPLES (visible) + TESTCASES (hidden)
// ============================================
router.post("/:problemId", protect, async (req, res) => {
  try {
    const { problemId } = req.params;
    const { code, language } = req.body;
    const userId = req.userId;

    if (!code || !language) {
      return res.status(400).json({
        success: false,
        error: "Code and language are required",
      });
    }

    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({
        success: false,
        error: "Problem not found",
      });
    }

    const languageId = judge0.getLanguageId(language);
    if (!languageId) {
      return res.status(400).json({
        success: false,
        error: "Unsupported language",
      });
    }

    // ✅ Split into visible examples + hidden test cases
    const examples = problem.examples || [];
    const testCases = problem.testCases || [];

    if (examples.length === 0 && testCases.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No test cases found for this problem",
      });
    }

    const totalTests = examples.length + testCases.length;

    const submission = new Submission({
      userId,
      problemId,
      language,
      code,
      status: "Pending",
      totalTestCases: totalTests,
    });

    let passedCount = 0;
    let finalStatus = "Accepted";
    let errorMessage = "";

    // ============================================
    // 1. Run EXAMPLES (visible — full data)
    // ============================================
    const exampleResults = [];

    for (let i = 0; i < examples.length; i++) {
      const ex = examples[i];

      try {
        const result = await judge0.executeCode(
          code,
          languageId,
          ex.input || "",
          ex.output || "",
        );

        const passed = result.status && result.status.id === 3;
        if (passed) passedCount++;

        exampleResults.push({
          testCaseId: i + 1,
          input: ex.input || "",
          expected: ex.output || "",
          output: result.stdout || "",
          error: result.stderr || "",
          passed,
          isHidden: false,
          executionTime: result.time || 0,
        });

        // Short-circuit on compilation / runtime / TLE
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
        exampleResults.push({
          testCaseId: i + 1,
          input: ex.input || "",
          expected: ex.output || "",
          output: "",
          error: error.message,
          passed: false,
          isHidden: false,
          executionTime: 0,
        });
        break;
      }
    }

    // ============================================
    // 2. Run HIDDEN test cases (pass/fail only)
    // ============================================
    const hiddenResults = [];

    if (finalStatus === "Accepted") {
      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];

        try {
          const result = await judge0.executeCode(
            code,
            languageId,
            tc.input || "",
            tc.expectedOutput || "",
          );

          const passed = result.status && result.status.id === 3;
          if (passed) passedCount++;

          // ⚠️ No input / expected / output leaked
          hiddenResults.push({
            testCaseId: examples.length + i + 1,
            passed,
            isHidden: true,
            executionTime: result.time || 0,
          });

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
          hiddenResults.push({
            testCaseId: examples.length + i + 1,
            passed: false,
            isHidden: true,
            executionTime: 0,
          });
          break;
        }
      }
    }

    // ============================================
    // 3. Determine final status
    // ============================================
    if (finalStatus === "Accepted" && passedCount < totalTests) {
      finalStatus = "Wrong Answer";
    }

    const examplePassed = exampleResults.filter((r) => r.passed).length;
    const hiddenPassed = hiddenResults.filter((r) => r.passed).length;

    const allResults = [...exampleResults, ...hiddenResults];

    const score = totalTests > 0 ? (passedCount / totalTests) * 100 : 0;

    // ============================================
    // 4. Persist submission
    // ============================================
    submission.status = finalStatus;
    submission.passedTestCases = passedCount;
    submission.score = score;
    submission.testResults = allResults;
    submission.executionTime = allResults.reduce(
      (sum, tr) => sum + (tr.executionTime || 0),
      0,
    );
    await submission.save();

    // ============================================
    // 5. Update problem + user stats
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

        if (problem.difficulty === "Easy") {
          user.codingStats.easySolved = (user.codingStats.easySolved || 0) + 1;
        } else if (problem.difficulty === "Medium") {
          user.codingStats.mediumSolved =
            (user.codingStats.mediumSolved || 0) + 1;
        } else if (problem.difficulty === "Hard") {
          user.codingStats.hardSolved = (user.codingStats.hardSolved || 0) + 1;
        }

        if (!user.solvedProblems.includes(problemId)) {
          user.solvedProblems.push(problemId);
        }
      }
      await user.save();
    }

    // ============================================
    // 6. Response — examples with data, hidden with pass only
    // ============================================
    res.json({
      success: true,
      submissionId: submission._id,
      status: finalStatus,
      score,
      passedTests: passedCount,
      totalTests,
      executionTime: submission.executionTime,
      isSaved: finalStatus === "Accepted",

      // Full data for visible examples
      exampleResults,
      exampleSummary: {
        passed: examplePassed,
        total: exampleResults.length,
      },

      // Hidden summary — counts only, no data
      hiddenSummary: {
        passed: hiddenPassed,
        total: hiddenResults.length,
      },

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

    res.json({ success: true, submissions });
  } catch (error) {
    console.error("Error fetching problem submissions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch submissions",
    });
  }
});

// ============================================
// GET /api/submissions/:id
// Get a specific submission
// (kept at bottom so it doesn't shadow /run/:problemId)
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

    if (
      submission.userId._id.toString() !== req.userId.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to view this submission",
      });
    }

    res.json({ success: true, submission });
  } catch (error) {
    console.error("Error fetching submission:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch submission",
    });
  }
});

export default router;
