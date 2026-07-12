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
    const userId = req.userId;

    // ✅ Validate user
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

    // ✅ Validate testId
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

    console.log(`👤 User ID: ${userId}`);
    console.log(`📝 Problem ID: ${problemId}`);
    console.log(`💻 Language: ${language}`);
    console.log(`🧪 Test ID: ${testId}`);

    // ✅ Get language ID
    const languageId = judge0Service.getLanguageId(language);
    if (!languageId) {
      return res.status(400).json({
        success: false,
        error: "Unsupported language",
      });
    }

    // ✅ Find the problem
    const problem = await Problem.findOne({ problemId: problemId });
    if (!problem) {
      return res.status(404).json({
        success: false,
        error: "Problem not found",
      });
    }

    const testCases = problem.testCases || [];
    if (testCases.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No test cases found for this problem",
      });
    }

    // ✅ Run ALL test cases
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
    let enumStatus = "pending";

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
      enumStatus = "compilation_error";
    } else if (hasRuntimeError) {
      displayStatus = "Runtime Error";
      enumStatus = "runtime_error";
    } else if (hasTimeLimit) {
      displayStatus = "Time Limit Exceeded";
      enumStatus = "runtime_error";
    } else if (result.passedCount === result.totalCount) {
      displayStatus = "Accepted";
      enumStatus = "accepted";
    } else {
      displayStatus = "Wrong Answer";
      enumStatus = "wrong_answer";
    }

    console.log(`📊 Display Status: ${displayStatus}`);
    console.log(`📊 Enum Status: ${enumStatus}`);
    console.log(`📊 Passed: ${result.passedCount}/${result.totalCount}`);

    // ============================================
    // Calculate total execution time
    // ============================================
    const totalExecutionTime = result.results.reduce((sum, r) => {
      const time = parseFloat(r.executionTime) || 0;
      return sum + time;
    }, 0);

    // ============================================
    // ✅ STORE IN CODINGTESTATTEMPT (Nested Structure)
    // ============================================
    try {
      console.log(`🔍 Looking for user: ${userId}`);

      // ✅ Step 1: Find the user's document
      let userAttempt = await CodingTestAttempt.findOne({ userId: userId });

      if (!userAttempt) {
        // ✅ Step 2: Create new user document if not exists
        console.log(`🆕 Creating new user document`);
        userAttempt = new CodingTestAttempt({
          userId: userId,
          tests: [],
          totalTestsTaken: 0,
          totalProblemsSolved: 0,
          averageScore: 0,
        });
      }

      // ✅ Step 3: Find the test in the tests array
      let testIndex = userAttempt.tests.findIndex((t) => t.testId === testId);

      if (testIndex === -1) {
        // ✅ Step 4: Create new test if not exists
        console.log(`🆕 Creating new test: ${testId}`);
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
      } else {
        console.log(`📝 Found existing test at index: ${testIndex}`);
        console.log(
          `📝 Current solutions: ${userAttempt.tests[testIndex].solutions.length}`,
        );
      }

      // ✅ Step 5: Get the test
      const test = userAttempt.tests[testIndex];

      // ✅ Step 6: Check if solution already exists for this problem
      const existingIndex = test.solutions.findIndex(
        (s) => s.problemId && s.problemId.toString() === problem._id.toString(),
      );

      // ✅ Step 7: Create solution data
      const solutionData = {
        problemId: problem._id,
        problemTitle: problem.title || "",
        code: code,
        language: language,
        status: enumStatus,
        passedTests: result.passedCount,
        totalTests: result.totalCount,
        executionTime: totalExecutionTime,
        submittedAt: new Date(),
      };

      // ✅ Step 8: Update or add solution
      if (existingIndex !== -1) {
        test.solutions[existingIndex] = solutionData;
        console.log(`🔄 Updated solution for ${problemId}`);
      } else {
        test.solutions.push(solutionData);
        console.log(`➕ Added solution for ${problemId}`);
      }

      // ✅ Step 9: Update test stats
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

      // ✅ Step 10: Mark test as completed if all problems solved
      // if (test.totalProblems > 0 && test.passedCount === test.totalProblems) {
      //   test.status = "completed";
      //   test.endTime = new Date();
      //   test.submittedAt = new Date();
      //   console.log(`🎉 Test ${testId} completed!`);
      // }

      // ✅ Step 11: Update overall user stats
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

      // ✅ Step 12: Save everything
      await userAttempt.save();
      console.log(`✅✅✅ Successfully saved!`);
      console.log(
        `📊 Test: ${test.passedCount}/${test.totalProblems} (${test.percentage}%)`,
      );
      console.log(
        `📊 User: ${userAttempt.totalProblemsSolved} problems solved`,
      );

      // ============================================
      // ✅ STEP 13: ALSO SAVE TO TESTRESULT
      // ============================================
      if (enumStatus === "accepted") {
        console.log(`📊 Updating TestResult for test: ${testId}`, userId);
        try {
          // ✅ Step 1: Find the CodingTest document using the MongoDB _id
          const codingTest = await CodingTest.findById(testId);

          if (!codingTest) {
            console.log(`❌ CodingTest not found with _id: ${testId}`);
          } else {
            console.log("✅ Found CodingTest:", codingTest.title);
            console.log("📝 String testId:", codingTest.testId);
            console.log("📝 MongoDB _id:", codingTest._id);

            // ✅ Step 2: Use the string testId to find/update TestResult
            const stringTestId = codingTest.testId; // "TEST_1783766498906"

            // Find or create TestResult using the string testId
            let testResult = await TestResult.findOne({ testId: stringTestId });

            if (!testResult) {
              // Create new TestResult if it doesn't exist
              testResult = new TestResult({
                testId: stringTestId,
                testTitle: codingTest.title || "Untitled Test",
                subject: codingTest.subject || "",
                topic: codingTest.topic || "",
                college: codingTest.college || "",
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
              console.log("🆕 New TestResult created");
            } else {
              console.log("📝 Existing TestResult found");
            }

            // ✅ Step 3: Find or create student entry
            let studentIndex = testResult.students.findIndex(
              (s) => s.userId.toString() === userId.toString(),
            );

            // ✅ Step 4: Create solution data
            const solutionData = {
              problemId: problem._id,
              problemTitle: problem.title || "Untitled Problem",
              status: enumStatus, // "accepted"
              code: code || "",
              language: language || "cpp",
              passedTests: result.passedCount || 0,
              totalTests: result.totalCount || 0,
              executionTime: totalExecutionTime || 0,
              submittedAt: new Date(),
            };

            if (studentIndex === -1) {
              // ✅ New student
              const User = mongoose.model("User");
              const user = await User.findById(userId);

              testResult.students.push({
                userId: userId,
                userEmail: user?.email || "Unknown",
                userName: user?.fullName || "Unknown Student",
                solutions: [solutionData],
                totalSolved: 1,
                totalProblems: 1,
                percentage: 100,
                passed: true,
                status: "in_progress",
                startTime: new Date(),
                endTime: null,
                timeTaken: 0,
              });
              console.log("✅ New student added to TestResult");
            } else {
              // ✅ Existing student
              const student = testResult.students[studentIndex];

              // Check if problem already exists
              const existingIndex = student.solutions.findIndex(
                (s) =>
                  s.problemId &&
                  s.problemId.toString() === problem._id.toString(),
              );

              if (existingIndex !== -1) {
                // Update existing solution
                student.solutions[existingIndex] = solutionData;
                console.log(`🔄 Updated solution for ${problem.problemId}`);
              } else {
                // Add new solution
                student.solutions.push(solutionData);
                console.log(`➕ Added solution for ${problem.problemId}`);
              }

              // Recalculate student stats
              const acceptedSolutions = student.solutions.filter(
                (s) => s.status === "accepted",
              );
              student.totalSolved = acceptedSolutions.length;
              student.totalProblems = student.solutions.length;
              student.percentage =
                student.totalProblems > 0
                  ? (acceptedSolutions.length / student.totalProblems) * 100
                  : 0;
              student.passed =
                student.percentage >= (codingTest.passingPercentage || 40);

              // Update status if all problems solved
              // if (
              //   student.totalSolved === codingTest.totalQuestions &&
              //   codingTest.totalQuestions > 0
              // ) {
              //   student.status = "completed";
              //   student.endTime = new Date();
              // }

              console.log(
                `📊 Student stats: ${student.totalSolved}/${student.totalProblems} (${student.percentage}%)`,
              );
            }

            // ✅ Step 5: Recalculate overall stats
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

            console.log(`✅✅✅ TestResult updated successfully!`);
            console.log(`📊 Test: ${codingTest.title}`);
            console.log(
              `📊 Students: ${totalStudents}, Passed: ${passedStudents}`,
            );
          }
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
      // Don't fail the whole request if this fails
    }

    // ============================================
    // Update problem stats
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

    // ============================================
    // Return response
    // ============================================
    const firstError = result.results.find(
      (r) => r.error && r.error.length > 0,
    );
    const sampleTestResults = result.results.filter((r, index) => {
      const testCase = testCases[index];
      return testCase && !testCase.isHidden;
    });
    const hiddenTestResults = result.results.filter((r, index) => {
      const testCase = testCases[index];
      return testCase && testCase.isHidden;
    });

    res.json({
      success: true,
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

// ============================================
// GET /api/coding/user/stats
// Get overall user stats
// ============================================
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

// ============================================
// ✅ CHECK ATTEMPT STATUS
// ============================================
router.get("/attempt-status/:testId", protect, async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.userId;

    console.log(`🔍 Checking attempt for user ${userId} on test ${testId}`);

    // ✅ Try to find by _id first (MongoDB ObjectId)
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

    console.log(`✅ Found CodingTest: ${codingTest.title}`);
    console.log(`📝 String testId: ${codingTest.testId}`);

    const stringTestId = codingTest.testId;
    let hasAttempted = false;
    let attemptStatus = null;
    let attemptData = null;
    let solutions = []; // ✅ Initialize solutions array

    // Check in TestResult
    const testResult = await TestResult.findOne({ testId: stringTestId });

    if (testResult) {
      const student = testResult.students.find(
        (s) => s.userId.toString() === userId.toString(),
      );

      if (student) {
        hasAttempted = true;
        attemptStatus = student.status || "in_progress";
        solutions = student.solutions || []; // ✅ Get solutions from TestResult
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

    // Also check in CodingTestAttempt
    if (!hasAttempted) {
      const userAttempt = await CodingTestAttempt.findOne({ userId: userId });

      if (userAttempt) {
        const testAttempt = userAttempt.tests.find((t) => t.testId === testId);
        if (testAttempt) {
          hasAttempted = true;
          attemptStatus = testAttempt.status || "in_progress";
          solutions = testAttempt.solutions || []; // ✅ Get solutions from CodingTestAttempt
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

    // ✅ Log solutions count
    console.log(`📊 Solutions found: ${solutions.length}`);

    res.json({
      success: true,
      hasAttempted: hasAttempted,
      status: attemptStatus,
      canAttempt: !hasAttempted || attemptStatus !== "submitted",
      message: hasAttempted
        ? attemptStatus === "submitted"
          ? "You have already submitted this test"
          : "You have already started this test"
        : "You can start this test",
      solutions: solutions, // ✅ Return solutions at root level
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

// ============================================
// ✅ GET TEST STATUS (with timer)
// ============================================
router.get("/test-status/:testId", protect, async (req, res) => {
  try {
    const { testId } = req.params;

    console.log(`🔍 Looking for test status with ID: ${testId}`);

    // ✅ Try to find by _id first
    let codingTest = null;

    if (mongoose.Types.ObjectId.isValid(testId)) {
      codingTest = await CodingTest.findById(testId);
      console.log(`🔍 Searching by _id: ${codingTest ? "Found" : "Not found"}`);
    }

    if (!codingTest) {
      codingTest = await CodingTest.findOne({ testId: testId });
      console.log(
        `🔍 Searching by testId string: ${codingTest ? "Found" : "Not found"}`,
      );
    }

    if (!codingTest) {
      codingTest = await CodingTest.findOne({ testId: `TEST_${testId}` });
      console.log(
        `🔍 Searching by TEST_ prefix: ${codingTest ? "Found" : "Not found"}`,
      );
    }

    if (!codingTest) {
      return res.status(404).json({
        success: false,
        error: "Test not found",
      });
    }

    console.log(`✅ Found CodingTest: ${codingTest.title}`);

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
// ✅ SUBMIT COMPLETE TEST
// ============================================
router.post("/submit-test", protect, async (req, res) => {
  try {
    const { testId } = req.body;
    const userId = req.userId;

    console.log(`📤 Submitting test: ${testId} for user: ${userId}`, testId);
    console.log(`📤 testId type: ${typeof testId}`);
    console.log(`📤 userId type: ${typeof userId}`);

    // ✅ Find the coding test
    let codingTest = null;

    if (mongoose.Types.ObjectId.isValid(testId)) {
      codingTest = await CodingTest.findById(testId);
      console.log(`🔍 Searching by _id: ${codingTest ? "Found" : "Not found"}`);
    }

    if (!codingTest) {
      codingTest = await CodingTest.findOne({ testId: testId });
      console.log(
        `🔍 Searching by testId string: ${codingTest ? "Found" : "Not found"}`,
      );
    }

    if (!codingTest) {
      codingTest = await CodingTest.findOne({ testId: `TEST_${testId}` });
      console.log(
        `🔍 Searching by TEST_ prefix: ${codingTest ? "Found" : "Not found"}`,
      );
    }

    if (!codingTest) {
      return res.status(404).json({
        success: false,
        error: "Test not found",
      });
    }

    console.log(`✅ Found CodingTest: ${codingTest.title}`);
    console.log(`📝 MongoDB _id: ${codingTest._id}`);
    console.log(`📝 String testId: ${codingTest.testId}`);

    const stringTestId = codingTest.testId;
    const mongoId = codingTest._id.toString();

    // Find user attempt
    console.log(`🔍 Looking for user attempt with userId: ${userId}`);
    let userAttempt = await CodingTestAttempt.findOne({ userId: userId });

    if (!userAttempt) {
      console.log(`❌ No user attempt found for userId: ${userId}`);
      return res.status(404).json({
        success: false,
        error: "No test attempt found. Please start the test first.",
      });
    }

    console.log(`📊 User attempts found: ${userAttempt.tests.length}`);

    // ✅ Log all testIds in the user's attempts
    console.log("📊 All testIds in user attempts:");
    userAttempt.tests.forEach((t, index) => {
      console.log(
        `  [${index}] testId: ${t.testId} (type: ${typeof t.testId})`,
      );
      console.log(
        `      status: ${t.status}, solutions: ${t.solutions.length}`,
      );
    });

    // ✅ Try MULTIPLE ways to find the test
    let testIndex = -1;

    // 1. Try by string testId (TEST_xxx)
    testIndex = userAttempt.tests.findIndex((t) => t.testId === stringTestId);
    console.log(
      `🔍 1. By string testId (${stringTestId}): ${testIndex !== -1 ? "✅ Found" : "❌ Not found"}`,
    );

    // 2. Try by MongoDB _id
    if (testIndex === -1) {
      testIndex = userAttempt.tests.findIndex((t) => t.testId === mongoId);
      console.log(
        `🔍 2. By MongoDB _id (${mongoId}): ${testIndex !== -1 ? "✅ Found" : "❌ Not found"}`,
      );
    }

    // 3. Try by the original testId passed in
    if (testIndex === -1) {
      testIndex = userAttempt.tests.findIndex((t) => t.testId === testId);
      console.log(
        `🔍 3. By original testId (${testId}): ${testIndex !== -1 ? "✅ Found" : "❌ Not found"}`,
      );
    }

    // 4. Try by converting the testId to string
    if (testIndex === -1) {
      testIndex = userAttempt.tests.findIndex(
        (t) => t.testId === String(testId),
      );
      console.log(
        `🔍 4. By String(testId) (${String(testId)}): ${testIndex !== -1 ? "✅ Found" : "❌ Not found"}`,
      );
    }

    // 5. Try by ObjectId comparison
    if (testIndex === -1) {
      for (let i = 0; i < userAttempt.tests.length; i++) {
        const t = userAttempt.tests[i];
        if (t.testId && t.testId.toString && t.testId.toString() === mongoId) {
          testIndex = i;
          console.log(`✅ 5. Found by ObjectId comparison: ${mongoId}`);
          break;
        }
      }
    }

    if (testIndex === -1) {
      console.log("❌ Test not found in user attempts!");
      return res.status(404).json({
        success: false,
        error: "Test attempt not found. Please start the test first.",
        availableTests: userAttempt.tests.map((t) => ({
          testId: t.testId,
          type: typeof t.testId,
        })),
      });
    }

    const test = userAttempt.tests[testIndex];
    console.log(`✅ Found test at index ${testIndex}:`, {
      testId: test.testId,
      status: test.status,
      solutions: test.solutions.length,
      passedCount: test.passedCount,
    });

    if (test.status === "submitted" || test.status === "completed") {
      return res.status(400).json({
        success: false,
        error: "Test already submitted",
      });
    }

    // Update status
    test.status = "submitted";
    test.endTime = new Date();
    test.submittedAt = new Date();

    const acceptedSolutions = test.solutions.filter(
      (s) => s.status === "accepted",
    );
    test.passedCount = acceptedSolutions.length;
    test.totalProblems = test.solutions.length;
    test.percentage =
      test.totalProblems > 0
        ? (acceptedSolutions.length / test.totalProblems) * 100
        : 0;
    test.passed = test.percentage >= (codingTest.passingPercentage || 40);

    await userAttempt.save();

    console.log(`✅ Test submitted: ${stringTestId}`);
    console.log(
      `📊 Passed: ${test.passedCount}/${test.totalProblems} (${test.percentage}%)`,
    );

    // Update TestResult
    const testResult = await TestResult.findOne({ testId: stringTestId });
    if (testResult) {
      const studentIndex = testResult.students.findIndex(
        (s) => s.userId.toString() === userId.toString(),
      );

      if (studentIndex !== -1) {
        const student = testResult.students[studentIndex];
        student.status = "submitted";
        student.endTime = new Date();
        student.totalSolved = test.passedCount;
        student.totalProblems = test.totalProblems;
        student.percentage = test.percentage;
        student.passed = test.passed;
        student.submittedAt = new Date();

        const students = testResult.students;
        const totalStudents = students.length;
        const passedStudents = students.filter((s) => s.passed).length;
        const averageScore =
          totalStudents > 0
            ? students.reduce((sum, s) => sum + s.percentage, 0) / totalStudents
            : 0;

        testResult.stats = {
          totalStudents: totalStudents,
          passedStudents: passedStudents,
          failedStudents: totalStudents - passedStudents,
          averageScore: parseFloat(averageScore.toFixed(2)),
          passRate:
            totalStudents > 0 ? (passedStudents / totalStudents) * 100 : 0,
        };

        await testResult.save();
      }
    }

    res.json({
      success: true,
      message: "Test submitted successfully",
      test: {
        status: test.status,
        percentage: test.percentage,
        passed: test.passed,
        passedCount: test.passedCount,
        totalProblems: test.totalProblems,
        submittedAt: test.submittedAt,
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
