// backend/routes/codingTests.js
import express from "express";
import Problem from "../models/Problem.js";
import mongoose from "mongoose";
import CodingTestAttempt from "../models/Submission.js";
import TestResult from "../models/TestResult.js";
import CodingTest from "../models/CodingTest.js";
import TestAttempt from "../models/TestAttempt.js";
import judge0Service from "../services/judge0Service.js";
import { protect } from "../middleware/auth.js";

import {
  submissionLimiter,
  sameProblemLimiter,
  testSubmissionLimiter,
  dailySubmissionLimiter,
} from "../middleware/rateLimiter.js";
import { validateSubmission } from "../middleware/validators.js";

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

    const testId = `TEST_${Date.now()}`;
    const userId = req.userId || "admin";

    const test = new CodingTest({
      testId,
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
    Accepted: "accepted",
    "Accepted ✅": "accepted",
    AC: "accepted",
    accepted: "accepted",
    "Wrong Answer": "wrong_answer",
    "Wrong Answer ❌": "wrong_answer",
    WA: "wrong_answer",
    wrong_answer: "wrong_answer",
    "wrong-answer": "wrong_answer",
    "Runtime Error": "runtime_error",
    "Runtime Error ⚠️": "runtime_error",
    RE: "runtime_error",
    runtime_error: "runtime_error",
    "runtime-error": "runtime_error",
    "Compilation Error": "compilation_error",
    "Compilation Error 🔧": "compilation_error",
    CE: "compilation_error",
    compilation_error: "compilation_error",
    "compilation-error": "compilation_error",
    "Time Limit Exceeded": "runtime_error",
    TLE: "runtime_error",
    time_limit: "runtime_error",
    time_limit_exceeded: "runtime_error",
    "time-limit-exceeded": "runtime_error",
    Pending: "pending",
    "Pending ⏳": "pending",
    pending: "pending",
  };
  return statusMap[status] || "pending";
};

// ============================================
// POST /api/coding/submit
// Runs EXAMPLES (visible) + TESTCASES (hidden)
// ============================================
router.post(
  "/submit",
  protect,
  submissionLimiter,
  sameProblemLimiter,
  testSubmissionLimiter,
  validateSubmission,
  async (req, res) => {
    try {
      const { problemId, code, language, testId } = req.body;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: "User not authenticated. Please login.",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid user ID format",
        });
      }

      if (
        !testId ||
        testId === "DEFAULT_TEST" ||
        testId === "undefined" ||
        testId === "null"
      ) {
        return res.status(400).json({
          success: false,
          error: "Invalid test ID. Please start a test first.",
        });
      }

      const languageId = judge0Service.getLanguageId(language);
      if (!languageId) {
        return res.status(400).json({
          success: false,
          error: "Unsupported language",
        });
      }

      /* ---------- Load test + find problem in embedded array ---------- */
      const codingTest = await CodingTest.findOne({ testId: testId });
      if (!codingTest) {
        return res.status(404).json({
          success: false,
          error: "Test not found",
        });
      }

      const problem = codingTest.problems.find(
        (p) => p.problemId === problemId,
      );
      if (!problem) {
        return res.status(404).json({
          success: false,
          error: "Problem not found for this test",
        });
      }

      // ✅ Rule: examples = visible, testCases = hidden
      const examples = problem.examples || [];
      const testCases = problem.testCases || [];

      if (examples.length === 0 && testCases.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No test cases found for this problem",
        });
      }

      // Map examples → shape judge0 expects
      const exampleCasesForJudge = examples.map((ex) => ({
        input: ex.input,
        expectedOutput: ex.output,
      }));

      // ============================================
      // 1. Run EXAMPLES (visible)
      // ============================================
      let exampleRun = { results: [], passedCount: 0, totalCount: 0, score: 0 };
      if (exampleCasesForJudge.length > 0) {
        try {
          exampleRun = await judge0Service.runTestCasesBatch(
            code,
            language,
            exampleCasesForJudge,
          );
        } catch (err) {
          console.error("❌ Judge0 examples error:", err);
          return res.status(500).json({
            success: false,
            error: err.message || "Code execution failed",
          });
        }
      }

      // ============================================
      // 2. Run HIDDEN test cases
      // ============================================
      let hiddenRun = { results: [], passedCount: 0, totalCount: 0, score: 0 };
      if (testCases.length > 0) {
        try {
          hiddenRun = await judge0Service.runTestCasesBatch(
            code,
            language,
            testCases,
          );
        } catch (err) {
          console.error("❌ Judge0 hidden error:", err);
          return res.status(500).json({
            success: false,
            error: err.message || "Code execution failed",
          });
        }
      }

      // ============================================
      // 3. Determine overall status
      // ============================================
      const allResults = [...exampleRun.results, ...hiddenRun.results];
      const totalCount = allResults.length;
      const passedCount = allResults.filter((r) => r.passed).length;

      const hasCompilationError = allResults.some(
        (r) =>
          r.status === "Compilation Error" || r.status === "compilation error",
      );
      const hasRuntimeError = allResults.some(
        (r) => r.status === "Runtime Error" || r.status === "runtime error",
      );
      const hasTimeLimit = allResults.some(
        (r) =>
          r.status === "Time Limit Exceeded" ||
          r.status === "time limit exceeded",
      );

      let displayStatus = "Pending";
      let enumStatus = "pending";

      if (hasCompilationError) {
        displayStatus = "Compilation Error";
        enumStatus = "compilation_error";
      } else if (hasRuntimeError) {
        displayStatus = "Runtime Error";
        enumStatus = "runtime_error";
      } else if (hasTimeLimit) {
        displayStatus = "Time Limit Exceeded";
        enumStatus = "runtime_error";
      } else if (passedCount === totalCount && totalCount > 0) {
        displayStatus = "Accepted";
        enumStatus = "accepted";
      } else {
        displayStatus = "Wrong Answer";
        enumStatus = "wrong_answer";
      }

      const score =
        totalCount > 0
          ? parseFloat(((passedCount / totalCount) * 100).toFixed(2))
          : 0;

      const totalExecutionTime = allResults.reduce((sum, r) => {
        const time = parseFloat(r.executionTime) || 0;
        return sum + time;
      }, 0);

      const problemDocId = problem._id;

      /* ---------- Save attempt / TestResult ---------- */
      try {
        let userAttempt = await CodingTestAttempt.findOne({ userId: userId });

        if (!userAttempt) {
          userAttempt = new CodingTestAttempt({
            userId: userId,
            tests: [],
            totalTestsTaken: 0,
            totalProblemsSolved: 0,
            averageScore: 0,
          });
        }

        let testIndex = userAttempt.tests.findIndex((t) => t.testId === testId);

        if (testIndex === -1) {
          const newTest = {
            testId: testId,
            status: "in_progress",
            startTime: new Date(),
            solutions: [],
            totalProblems: 0,
            passedCount: 0,
            percentage: 0,
            passed: false,
          };
          userAttempt.tests.push(newTest);
          testIndex = userAttempt.tests.length - 1;
        }

        const test = userAttempt.tests[testIndex];

        const existingIndex = test.solutions.findIndex(
          (s) =>
            s.problemId && s.problemId.toString() === problemDocId.toString(),
        );

        const solutionData = {
          problemId: problemDocId,
          problemTitle: problem.title || "",
          code: code,
          language: language,
          status: enumStatus,
          passedTests: passedCount,
          totalTests: totalCount,
          executionTime: totalExecutionTime,
          submittedAt: new Date(),
        };

        if (existingIndex !== -1) {
          test.solutions[existingIndex] = solutionData;
        } else {
          test.solutions.push(solutionData);
        }

        const acceptedSolutions = test.solutions.filter(
          (s) => s.status === "accepted",
        );
        test.passedCount = acceptedSolutions.length;
        test.totalProblems = test.solutions.length;
        test.percentage =
          test.totalProblems > 0
            ? (acceptedSolutions.length / test.totalProblems) * 100
            : 0;
        test.passed = test.percentage >= 40;

        const allTests = userAttempt.tests;
        userAttempt.totalTestsTaken = allTests.length;
        userAttempt.totalProblemsSolved = allTests.reduce(
          (sum, t) => sum + t.passedCount,
          0,
        );
        const totalAttempted = allTests.reduce(
          (sum, t) => sum + t.totalProblems,
          0,
        );
        userAttempt.averageScore =
          totalAttempted > 0
            ? (userAttempt.totalProblemsSolved / totalAttempted) * 100
            : 0;

        await userAttempt.save();

        /* ---------- TestResult update ---------- */
        if (enumStatus === "accepted") {
          try {
            const stringTestId = codingTest.testId;

            let testResult = await TestResult.findOne({
              testId: stringTestId,
            });

            if (!testResult) {
              testResult = new TestResult({
                testId: stringTestId,
                testTitle: codingTest.title || "Untitled Test",
                subject: codingTest.subject || "",
                topic: codingTest.topic || "",
                college: codingTest.college || "",
                collegeId: codingTest.collegeId || null,
                departmentId: codingTest.departmentId || null,
                totalQuestions: codingTest.totalQuestions || 0,
                passingPercentage: codingTest.passingPercentage || 40,
                students: [],
                stats: {
                  totalStudents: 0,
                  passedStudents: 0,
                  failedStudents: 0,
                  averageScore: 0,
                  passRate: 0,
                },
                generatedAt: new Date(),
                updatedAt: new Date(),
              });
            }

            let studentIndex = testResult.students.findIndex(
              (s) => s.userId.toString() === userId.toString(),
            );

            const trSolution = {
              problemId: problemDocId,
              problemTitle: problem.title || "Untitled Problem",
              status: enumStatus,
              code: code || "",
              language: language || "cpp",
              passedTests: passedCount || 0,
              totalTests: totalCount || 0,
              executionTime: totalExecutionTime || 0,
              submittedAt: new Date(),
            };

            if (studentIndex === -1) {
              const User = mongoose.model("User");
              const user = await User.findById(userId);

              // ✅ Preserve real startTime from CodingTestAttempt if available
              const realStartTime = test.startTime || new Date();

              testResult.students.push({
                userId: userId,
                userEmail: user?.email || "Unknown",
                userName: user?.fullName || "Unknown Student",
                solutions: [trSolution],
                totalSolved: 1,
                totalProblems: 1,
                percentage: 100,
                passed: true,
                status: "in_progress",
                startTime: realStartTime,
                endTime: null,
                timeTaken: 0,
              });
            } else {
              const student = testResult.students[studentIndex];

              const existingIdx = student.solutions.findIndex(
                (s) =>
                  s.problemId &&
                  s.problemId.toString() === problemDocId.toString(),
              );

              if (existingIdx !== -1) {
                student.solutions[existingIdx] = trSolution;
              } else {
                student.solutions.push(trSolution);
              }

              const acceptedTr = student.solutions.filter(
                (s) => s.status === "accepted",
              );
              student.totalSolved = acceptedTr.length;
              student.totalProblems = student.solutions.length;
              student.percentage =
                student.totalProblems > 0
                  ? (acceptedTr.length / student.totalProblems) * 100
                  : 0;
              student.passed =
                student.percentage >= (codingTest.passingPercentage || 40);
            }

            const students = testResult.students;
            const totalStudents = students.length;
            const passedStudents = students.filter((s) => s.passed).length;
            const averageScore =
              totalStudents > 0
                ? students.reduce((sum, s) => sum + s.percentage, 0) /
                  totalStudents
                : 0;

            testResult.stats = {
              totalStudents: totalStudents,
              passedStudents: passedStudents,
              failedStudents: totalStudents - passedStudents,
              averageScore: parseFloat(averageScore.toFixed(2)),
              passRate:
                totalStudents > 0 ? (passedStudents / totalStudents) * 100 : 0,
            };

            testResult.updatedAt = new Date();
            await testResult.save();
          } catch (error) {
            console.error("❌ Error updating TestResult:", error);
          }
        } else {
          console.log(
            `⚠️ Solution not accepted (${enumStatus}), skipping TestResult update`,
          );
        }
      } catch (error) {
        console.error("❌❌❌ ERROR saving to CodingTestAttempt:", error);
        console.error("Error details:", error.errors || error.message);
      }

      // ✅ Increment submission counter (every attempt counts)
      problem.submissions = (problem.submissions || 0) + 1;

      // ✅ Increment accepted counter only when submission is Accepted
      if (enumStatus === "accepted") {
        problem.accepted = (problem.accepted || 0) + 1;
      }

      // ✅ Compute and store acceptance rate
      problem.acceptanceRate =
        problem.submissions > 0
          ? parseFloat(
              ((problem.accepted / problem.submissions) * 100).toFixed(2),
            )
          : 0;

      codingTest.markModified("problems");
      await codingTest.save();

      /* ---------- Response ---------- */
      const firstError = allResults.find((r) => r.error && r.error.length > 0);

      // ✅ Examples with full data
      const exampleResults = exampleRun.results.map((r, idx) => ({
        testCase: idx + 1,
        passed: r.passed,
        status: r.status,
        input: examples[idx].input || "",
        expected: examples[idx].output || "",
        output: r.output || "",
        error: r.error || undefined,
        executionTime: r.executionTime || 0,
        memoryUsed: r.memoryUsed || 0,
        isHidden: false,
      }));

      const examplePassed = exampleResults.filter((r) => r.passed).length;
      const hiddenPassed = hiddenRun.results.filter((r) => r.passed).length;

      res.json({
        success: true,
        status: displayStatus,
        passedTests: passedCount,
        totalTests: totalCount,
        score,
        executionTime: parseFloat(totalExecutionTime) || 0,
        isSaved: enumStatus === "accepted",

        // ✅ Visible examples (full data)
        exampleResults,
        exampleSummary: {
          passed: examplePassed,
          total: exampleResults.length,
        },

        // ✅ Hidden tests (count only)
        hiddenSummary: {
          passed: hiddenPassed,
          total: hiddenRun.results.length,
        },

        // ✅ Backwards-compatible fields
        testResults: exampleResults,
        hiddenCount: hiddenRun.results.length,
        hiddenPassed,

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
  },
);

router.get("/test/:testId/results", protect, async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.userId;

    const userAttempt = await CodingTestAttempt.findOne({ userId: userId });

    if (!userAttempt) {
      return res.status(404).json({
        success: false,
        error: "No test data found for this user",
      });
    }

    const test = userAttempt.tests.find((t) => t.testId === testId);

    if (!test) {
      return res.status(404).json({
        success: false,
        error: "Test not found",
      });
    }

    res.json({
      success: true,
      test: {
        testId: test.testId,
        status: test.status,
        startTime: test.startTime,
        endTime: test.endTime,
        totalProblems: test.totalProblems,
        passedCount: test.passedCount,
        percentage: test.percentage,
        passed: test.passed,
        solutions: test.solutions,
      },
      userStats: {
        totalTestsTaken: userAttempt.totalTestsTaken,
        totalProblemsSolved: userAttempt.totalProblemsSolved,
        averageScore: userAttempt.averageScore,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching test results:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch test results",
    });
  }
});

router.get("/user/stats", protect, async (req, res) => {
  try {
    const userId = req.userId;

    const userAttempt = await CodingTestAttempt.findOne({ userId: userId });

    if (!userAttempt) {
      return res.json({
        success: true,
        stats: {
          totalTestsTaken: 0,
          totalProblemsSolved: 0,
          averageScore: 0,
          tests: [],
        },
      });
    }

    res.json({
      success: true,
      stats: {
        totalTestsTaken: userAttempt.totalTestsTaken,
        totalProblemsSolved: userAttempt.totalProblemsSolved,
        averageScore: userAttempt.averageScore,
        tests: userAttempt.tests.map((t) => ({
          testId: t.testId,
          status: t.status,
          totalProblems: t.totalProblems,
          passedCount: t.passedCount,
          percentage: t.percentage,
          passed: t.passed,
          startTime: t.startTime,
          endTime: t.endTime,
        })),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching user stats:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch user stats",
    });
  }
});

// ============================================
// POST /api/coding/run-samples
// Runs EXAMPLES only (visible)
// ============================================
router.post("/run-samples", async (req, res) => {
  try {
    const { problemId, code, language, testId } = req.body;

    const languageId = judge0Service.getLanguageId(language);
    if (!languageId) {
      return res.status(400).json({
        success: false,
        error: "Unsupported language",
      });
    }

    if (!testId) {
      return res.status(400).json({
        success: false,
        error: "testId is required",
      });
    }

    const codingTest = await CodingTest.findOne({ testId });
    if (!codingTest) {
      return res.status(404).json({
        success: false,
        error: "Test not found",
      });
    }

    const problem = codingTest.problems.find((p) => p.problemId === problemId);
    if (!problem) {
      return res.status(404).json({
        success: false,
        error: "Problem not found for this test",
      });
    }

    // ✅ Only examples (visible)
    const examples = problem.examples || [];
    if (examples.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No example test cases found for this problem",
      });
    }

    const exampleCasesForJudge = examples.map((ex) => ({
      input: ex.input,
      expectedOutput: ex.output,
    }));

    let result;
    try {
      result = await judge0Service.runTestCasesBatch(
        code,
        language,
        exampleCasesForJudge,
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
      testResults: result.results.map((r, idx) => ({
        testCase: idx + 1,
        passed: r.passed,
        status: r.status,
        input: examples[idx].input || "",
        expected: examples[idx].output || "",
        output: r.output || "",
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
// Returns ONLY examples (visible)
// ============================================
router.get("/problem/:problemId/testcases", async (req, res) => {
  try {
    const { problemId } = req.params;
    const { testId } = req.query;

    if (!testId) {
      return res.status(400).json({
        success: false,
        error: "testId query param is required",
      });
    }

    const codingTest = await CodingTest.findOne({ testId });
    if (!codingTest) {
      return res.status(404).json({
        success: false,
        error: "Test not found",
      });
    }

    const problem = codingTest.problems.find((p) => p.problemId === problemId);
    if (!problem) {
      return res.status(404).json({
        success: false,
        error: "Problem not found for this test",
      });
    }

    // ✅ Only examples (visible). Never expose testCases (hidden).
    const sampleTestCases = (problem.examples || []).map((ex) => ({
      input: ex.input,
      expectedOutput: ex.output,
      explanation: ex.explanation || "",
    }));

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

router.get("/submissions/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const submissions = await CodingTestAttempt.find({ userId })
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

router.post("/update-start-time", protect, async (req, res) => {
  try {
    const { testId, startTime } = req.body;
    const userId = req.userId;

    // ─────────────────────────────────────────────
    // 1. Resolve CodingTest by any form of testId
    // ─────────────────────────────────────────────
    let codingTest = null;
    if (mongoose.Types.ObjectId.isValid(testId)) {
      codingTest = await CodingTest.findById(testId);
    }
    if (!codingTest) {
      codingTest = await CodingTest.findOne({ testId });
    }
    if (!codingTest) {
      codingTest = await CodingTest.findOne({ testId: `TEST_${testId}` });
    }

    if (!codingTest) {
      return res.status(404).json({
        success: false,
        error: "Test not found",
      });
    }

    const stringTestId = codingTest.testId;

    // ─────────────────────────────────────────────
    // 2. Find or create the TestResult
    // ─────────────────────────────────────────────
    let testResult = await TestResult.findOne({ testId: stringTestId });

    if (!testResult) {
      testResult = new TestResult({
        testId: stringTestId,
        testTitle: codingTest.title || "Untitled Test",
        subject: codingTest.subject || "",
        topic: codingTest.topic || "",
        college: codingTest.college || "",
        collegeId: codingTest.collegeId || null,
        departmentId: codingTest.departmentId || null,
        totalQuestions: codingTest.totalQuestions || 0,
        passingPercentage: codingTest.passingPercentage || 40,
        students: [],
        stats: {
          totalStudents: 0,
          passedStudents: 0,
          failedStudents: 0,
          averageScore: 0,
          passRate: 0,
        },
        generatedAt: new Date(),
        updatedAt: new Date(),
      });
    } else if (!testResult.collegeId && codingTest.collegeId) {
      testResult.collegeId = codingTest.collegeId;
      if (codingTest.departmentId && !testResult.departmentId) {
        testResult.departmentId = codingTest.departmentId;
      }
    }

    // ─────────────────────────────────────────────
    // 3. Find or create the student row — WITHOUT overwriting existing startTime
    // ─────────────────────────────────────────────
    let studentIndex = testResult.students.findIndex(
      (s) => s.userId.toString() === userId.toString(),
    );

    if (studentIndex === -1) {
      const User = mongoose.model("User");
      const user = await User.findById(userId);

      testResult.students.push({
        userId: userId,
        userEmail: user?.email || "Unknown",
        userName: user?.fullName || "Unknown Student",
        startTime: new Date(startTime),
        endTime: null,
        status: "in_progress",
        solutions: [],
        totalSolved: 0,
        totalProblems: 0,
        percentage: 0,
        passed: false,
        timeTaken: 0,
      });
    } else {
      const student = testResult.students[studentIndex];

      // ✅ NEVER overwrite an existing startTime
      if (!student.startTime) {
        student.startTime = new Date(startTime);
      }

      // ✅ Only flip to in_progress if not already finished
      if (
        student.status === "not_started" ||
        !student.status ||
        student.status === "in_progress"
      ) {
        student.status = "in_progress";
      }
    }

    testResult.updatedAt = new Date();
    await testResult.save();

    // ─────────────────────────────────────────────
    // 4. Respond with the ACTUAL start time on record
    // ─────────────────────────────────────────────
    const savedStudent = testResult.students.find(
      (s) => s.userId.toString() === userId.toString(),
    );

    res.json({
      success: true,
      message: "Start time updated successfully",
      data: {
        testId: stringTestId,
        startTime: savedStudent?.startTime || startTime,
      },
    });
  } catch (error) {
    console.error("❌ Error updating start time:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to update start time",
    });
  }
});

router.get("/attempt-status/:testId", protect, async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.userId;

    let codingTest = null;

    if (mongoose.Types.ObjectId.isValid(testId)) {
      codingTest = await CodingTest.findById(testId);
    }
    if (!codingTest) {
      codingTest = await CodingTest.findOne({ testId: testId });
    }
    if (!codingTest) {
      codingTest = await CodingTest.findOne({ testId: `TEST_${testId}` });
    }

    if (!codingTest) {
      return res.status(404).json({
        success: false,
        message: "Test not found",
      });
    }

    const stringTestId = codingTest.testId;
    let hasAttempted = false;
    let attemptStatus = null;
    let attemptData = null;
    let solutions = [];
    let startTime = null;

    const testResult = await TestResult.findOne({ testId: stringTestId });

    if (testResult) {
      const student = testResult.students.find(
        (s) => s.userId.toString() === userId.toString(),
      );

      if (student) {
        hasAttempted = true;
        attemptStatus = student.status || "in_progress";
        solutions = student.solutions || [];
        startTime = student.startTime || null;
        attemptData = {
          startTime: student.startTime,
          endTime: student.endTime,
          totalSolved: student.totalSolved || 0,
          totalProblems: student.totalProblems || 0,
          percentage: student.percentage || 0,
          passed: student.passed || false,
        };
      }
    }

    if (!hasAttempted) {
      const userAttempt = await CodingTestAttempt.findOne({ userId: userId });

      if (userAttempt) {
        const testAttempt = userAttempt.tests.find((t) => t.testId === testId);
        if (testAttempt) {
          hasAttempted = true;
          attemptStatus = testAttempt.status || "in_progress";
          solutions = testAttempt.solutions || [];
          startTime = testAttempt.startTime || null;
          attemptData = {
            startTime: testAttempt.startTime,
            endTime: testAttempt.endTime,
            totalSolved: testAttempt.passedCount || 0,
            totalProblems: testAttempt.totalProblems || 0,
            percentage: testAttempt.percentage || 0,
            passed: testAttempt.passed || false,
          };
        }
      }
    }

    // ─────────────────────────────────────────────
    // ✅ Build solvedProblemIds — map ObjectId → string problemId
    // ─────────────────────────────────────────────
    const problemIdMap = new Map();
    (codingTest.problems || []).forEach((p) => {
      if (p._id) {
        problemIdMap.set(p._id.toString(), p.problemId);
      }
    });

    const solvedProblemIds = (solutions || [])
      .filter(
        (s) =>
          s.status === "accepted" ||
          s.status === "Accepted" ||
          s.status === "Accepted ✅",
      )
      .map((s) => {
        const rawId = s.problemId?.toString();
        return problemIdMap.get(rawId) || rawId;
      })
      .filter(Boolean);

    res.json({
      success: true,
      hasAttempted: hasAttempted,
      status: attemptStatus,
      startTime: startTime,
      canAttempt: !hasAttempted || attemptStatus !== "submitted",
      message: hasAttempted
        ? attemptStatus === "submitted"
          ? "You have already submitted this test"
          : "You have already started this test"
        : "You can start this test",
      solutions: solutions,
      solvedProblemIds, // ✅ NEW — clean array of string-form problemIds
      passedCount: attemptData?.totalSolved || 0,
      totalProblems: attemptData?.totalProblems || 0,
      percentage: attemptData?.percentage || 0,
      passed: attemptData?.passed || false,
    });
  } catch (error) {
    console.error("❌ Error checking attempt:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to check attempt",
    });
  }
});

router.get("/test-status/:testId", protect, async (req, res) => {
  try {
    const { testId } = req.params;

    let codingTest = null;

    if (mongoose.Types.ObjectId.isValid(testId)) {
      codingTest = await CodingTest.findById(testId);
    }
    if (!codingTest) {
      codingTest = await CodingTest.findOne({ testId: testId });
    }
    if (!codingTest) {
      codingTest = await CodingTest.findOne({ testId: `TEST_${testId}` });
    }

    if (!codingTest) {
      return res.status(404).json({
        success: false,
        error: "Test not found",
      });
    }

    const now = new Date();
    const startTime = new Date(codingTest.startTime);
    const endTime = new Date(codingTest.endTime);

    let status = "upcoming";
    if (now >= startTime && now <= endTime) {
      status = "active";
    } else if (now > endTime) {
      status = "ended";
    }

    res.json({
      success: true,
      status: status,
      startTime: codingTest.startTime,
      endTime: codingTest.endTime,
      timeRemaining: status === "active" ? endTime - now : 0,
      duration: codingTest.duration * 60 * 1000,
    });
  } catch (error) {
    console.error("❌ Error getting test status:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get test status",
    });
  }
});

// ============================================
// POST /api/coding/submit-test
// Handles both manual submit and auto-submit on timer expiry.
// Preserves real startTime, clamps timeTaken, backfills missing fields.
// ============================================
router.post("/submit-test", protect, async (req, res) => {
  try {
    const { testId, endTime, isAuto } = req.body;
    const userId = req.userId;

    console.log(`📤 Submitting test: ${testId} for user: ${userId}`);
    console.log(`📤 isAuto: ${isAuto}`);

    // ─────────────────────────────────────────────
    // 1. Resolve CodingTest
    // ─────────────────────────────────────────────
    let codingTest = null;

    if (mongoose.Types.ObjectId.isValid(testId)) {
      codingTest = await CodingTest.findById(testId);
    }
    if (!codingTest) {
      codingTest = await CodingTest.findOne({ testId });
    }
    if (!codingTest) {
      codingTest = await CodingTest.findOne({ testId: `TEST_${testId}` });
    }

    if (!codingTest) {
      return res.status(404).json({
        success: false,
        error: "Test not found",
      });
    }

    const stringTestId = codingTest.testId;
    const mongoId = codingTest._id.toString();

    // ─────────────────────────────────────────────
    // 2. Locate student in TestResult + CodingTestAttempt
    // ─────────────────────────────────────────────
    let testResult = await TestResult.findOne({ testId: stringTestId });
    let foundInTestResult = false;
    let studentData = null;
    let testStatus = "in_progress";
    let solutions = [];

    if (testResult) {
      const studentIndex = testResult.students.findIndex(
        (s) => s.userId.toString() === userId.toString(),
      );

      if (studentIndex !== -1) {
        foundInTestResult = true;
        studentData = testResult.students[studentIndex];
        testStatus = studentData.status || "in_progress";
        solutions = studentData.solutions || [];
      }
    }

    let userAttempt = await CodingTestAttempt.findOne({ userId });
    let foundInAttempt = false;
    let attemptTestIndex = -1;
    let testAttempt = null;

    if (userAttempt) {
      attemptTestIndex = userAttempt.tests.findIndex(
        (t) => t.testId === stringTestId,
      );
      if (attemptTestIndex === -1) {
        attemptTestIndex = userAttempt.tests.findIndex(
          (t) => t.testId === mongoId,
        );
      }
      if (attemptTestIndex === -1) {
        attemptTestIndex = userAttempt.tests.findIndex(
          (t) => t.testId === testId,
        );
      }

      if (attemptTestIndex !== -1) {
        foundInAttempt = true;
        testAttempt = userAttempt.tests[attemptTestIndex];
        testStatus = testAttempt.status || "in_progress";
        solutions = testAttempt.solutions || [];
      }
    }

    if (!foundInTestResult && !foundInAttempt) {
      return res.status(404).json({
        success: false,
        error: "No test attempt found. Please start & attempt the test first.",
        details: {
          testId,
          stringTestId,
          mongoId,
          foundInTestResult,
          foundInAttempt,
        },
      });
    }

    if (testStatus === "submitted" || testStatus === "completed") {
      return res.status(400).json({
        success: false,
        error: "Test already submitted",
      });
    }

    // ─────────────────────────────────────────────
    // 3. Compute results + timings (WITH SANITY CHECKS)
    // ─────────────────────────────────────────────
    const acceptedSolutions = solutions.filter((s) => s.status === "accepted");
    const totalSolved = acceptedSolutions.length;
    const totalProblems = codingTest.totalQuestions || solutions.length || 0;
    const percentage =
      totalProblems > 0 ? (totalSolved / totalProblems) * 100 : 0;
    const passed = percentage >= (codingTest.passingPercentage || 40);

    // ✅ Resolve real startTime — prefer TestResult, fall back to Attempt
    const realStartTime =
      studentData?.startTime || testAttempt?.startTime || null;

    // ✅ Resolve real endTime — never before startTime
    const now = new Date();
    const incomingEnd = endTime ? new Date(endTime) : now;
    const startMs = realStartTime
      ? new Date(realStartTime).getTime()
      : now.getTime();
    const endMs = Math.max(startMs, incomingEnd.getTime());
    const realEndTime = new Date(endMs);

    // ✅ Recompute timeTaken safely
    const timeTaken = realStartTime
      ? Math.max(0, Math.round((endMs - startMs) / 60000))
      : 0;

    // ─────────────────────────────────────────────
    // 4. Update TestResult
    // ─────────────────────────────────────────────
    if (foundInTestResult && testResult) {
      const studentIndex = testResult.students.findIndex(
        (s) => s.userId.toString() === userId.toString(),
      );

      if (studentIndex !== -1) {
        const student = testResult.students[studentIndex];

        // ✅ Backfill startTime if missing
        if (!student.startTime && realStartTime) {
          student.startTime = new Date(realStartTime);
        }

        student.status = "submitted";
        student.endTime = realEndTime;
        student.submittedAt = now;
        student.totalSolved = totalSolved;
        student.totalProblems = totalProblems;
        student.percentage = percentage;
        student.passed = passed;
        student.solutions = solutions;
        student.timeTaken = timeTaken;
        student.autoSubmitted = !!isAuto;

        const students = testResult.students;
        const totalStudents = students.length;
        const passedStudents = students.filter((s) => s.passed).length;
        const averageScore =
          totalStudents > 0
            ? students.reduce((sum, s) => sum + (s.percentage || 0), 0) /
              totalStudents
            : 0;

        testResult.stats = {
          totalStudents,
          passedStudents,
          failedStudents: totalStudents - passedStudents,
          averageScore: parseFloat(averageScore.toFixed(2)),
          passRate:
            totalStudents > 0 ? (passedStudents / totalStudents) * 100 : 0,
        };

        testResult.updatedAt = now;
        await testResult.save();
      }
    } else if (!foundInTestResult && foundInAttempt) {
      const User = mongoose.model("User");
      const user = await User.findById(userId);

      if (!testResult) {
        testResult = new TestResult({
          testId: stringTestId,
          testTitle: codingTest.title || "Untitled Test",
          subject: codingTest.subject || "",
          topic: codingTest.topic || "",
          college: codingTest.college || "",
          collegeId: codingTest.collegeId || null,
          departmentId: codingTest.departmentId || null,
          totalQuestions: codingTest.totalQuestions || 0,
          passingPercentage: codingTest.passingPercentage || 40,
          students: [],
          stats: {
            totalStudents: 0,
            passedStudents: 0,
            failedStudents: 0,
            averageScore: 0,
            passRate: 0,
          },
          generatedAt: now,
          updatedAt: now,
        });
      }

      // ✅ Use realStartTime — not `new Date()`
      const studentStartTime = realStartTime ? new Date(realStartTime) : now;

      testResult.students.push({
        userId,
        userEmail: user?.email || "Unknown",
        userName: user?.fullName || "Unknown Student",
        startTime: studentStartTime,
        endTime: realEndTime,
        status: "submitted",
        solutions,
        totalSolved,
        totalProblems,
        percentage,
        passed,
        timeTaken,
        submittedAt: now,
        autoSubmitted: !!isAuto,
      });

      // Recompute stats
      const students = testResult.students;
      const totalStudents = students.length;
      const passedStudents = students.filter((s) => s.passed).length;
      const averageScore =
        totalStudents > 0
          ? students.reduce((sum, s) => sum + (s.percentage || 0), 0) /
            totalStudents
          : 0;

      testResult.stats = {
        totalStudents,
        passedStudents,
        failedStudents: totalStudents - passedStudents,
        averageScore: parseFloat(averageScore.toFixed(2)),
        passRate:
          totalStudents > 0 ? (passedStudents / totalStudents) * 100 : 0,
      };

      testResult.updatedAt = now;
      await testResult.save();
    }

    // ─────────────────────────────────────────────
    // 5. Update CodingTestAttempt
    // ─────────────────────────────────────────────
    if (foundInAttempt && userAttempt && attemptTestIndex !== -1) {
      const testAttempt = userAttempt.tests[attemptTestIndex];

      // ✅ Backfill startTime if missing
      if (!testAttempt.startTime && realStartTime) {
        testAttempt.startTime = new Date(realStartTime);
      }

      testAttempt.status = "submitted";
      testAttempt.endTime = realEndTime;
      testAttempt.submittedAt = now;
      testAttempt.passedCount = totalSolved;
      testAttempt.totalProblems = totalProblems;
      testAttempt.percentage = percentage;
      testAttempt.passed = passed;
      testAttempt.solutions = solutions;
      testAttempt.timeTaken = timeTaken;
      testAttempt.autoSubmitted = !!isAuto;

      userAttempt.markModified("tests");
      await userAttempt.save();
    } else if (!foundInAttempt) {
      const newTest = {
        testId: stringTestId,
        status: "submitted",
        startTime: realStartTime ? new Date(realStartTime) : now,
        endTime: realEndTime,
        submittedAt: now,
        solutions,
        totalProblems,
        passedCount: totalSolved,
        percentage,
        passed,
        timeTaken,
        autoSubmitted: !!isAuto,
      };

      if (!userAttempt) {
        userAttempt = new CodingTestAttempt({
          userId,
          tests: [newTest],
          totalTestsTaken: 1,
          totalProblemsSolved: totalSolved,
          averageScore: percentage,
        });
      } else {
        userAttempt.tests.push(newTest);
        userAttempt.totalTestsTaken = userAttempt.tests.length;
        userAttempt.totalProblemsSolved = userAttempt.tests.reduce(
          (sum, t) => sum + (t.passedCount || 0),
          0,
        );
        const totalAttempted = userAttempt.tests.reduce(
          (sum, t) => sum + (t.totalProblems || 0),
          0,
        );
        userAttempt.averageScore =
          totalAttempted > 0
            ? (userAttempt.totalProblemsSolved / totalAttempted) * 100
            : 0;
      }

      await userAttempt.save();
    }

    res.json({
      success: true,
      message: "Test submitted successfully",
      test: {
        status: "submitted",
        percentage,
        passed,
        passedCount: totalSolved,
        totalProblems,
        startTime: realStartTime,
        endTime: realEndTime,
        timeTaken,
        submittedAt: now,
        isAuto: !!isAuto,
      },
    });
  } catch (error) {
    console.error("❌ Error submitting test:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to submit test",
    });
  }
});

export default router;
