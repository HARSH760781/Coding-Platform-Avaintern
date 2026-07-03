// backend/routes/testcases.js
import express from "express";
import Problem from "../models/Problem.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// ============================================
// GET /api/testcases/:problemId
// Get all test cases for a problem
// ============================================
router.get("/:problemId", async (req, res) => {
  try {
    const problem = await Problem.findOne({
      problemId: req.params.problemId,
    });

    if (!problem) {
      return res.status(404).json({
        success: false,
        error: "Problem not found",
      });
    }

    res.json({
      success: true,
      testCases: problem.testCases || [],
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
// POST /api/testcases/:problemId
// Add a test case to a problem (Admin only)
// ============================================
router.post("/:problemId", async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Not authorized. Admin only.",
      });
    }

    const problem = await Problem.findOne({
      problemId: req.params.problemId,
    });

    if (!problem) {
      return res.status(404).json({
        success: false,
        error: "Problem not found",
      });
    }

    const { input, expectedOutput, isHidden, explanation, weightage } =
      req.body;

    if (!input || !expectedOutput) {
      return res.status(400).json({
        success: false,
        error: "Input and expected output are required",
      });
    }

    problem.testCases.push({
      input,
      expectedOutput,
      isHidden: isHidden || false,
      explanation: explanation || "",
      weightage: weightage || 1,
    });

    await problem.save();

    res.json({
      success: true,
      testCases: problem.testCases,
    });
  } catch (error) {
    console.error("Error adding test case:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to add test case",
    });
  }
});

// ============================================
// DELETE /api/testcases/:problemId/:testCaseId
// Delete a test case (Admin only)
// ============================================
router.delete("/:problemId/:testCaseId", protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Not authorized. Admin only.",
      });
    }

    const problem = await Problem.findOne({
      problemId: req.params.problemId,
    });

    if (!problem) {
      return res.status(404).json({
        success: false,
        error: "Problem not found",
      });
    }

    const testCaseId = req.params.testCaseId;
    problem.testCases = problem.testCases.filter(
      (tc) => tc._id.toString() !== testCaseId,
    );

    await problem.save();

    res.json({
      success: true,
      testCases: problem.testCases,
    });
  } catch (error) {
    console.error("Error deleting test case:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete test case",
    });
  }
});

export default router;
