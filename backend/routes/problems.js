import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import Problem from "../models/Problem.js";
import ExcelParser from "../utils/excelParser.js";
import GoogleSheetsService from "../services/googleSheetsService.js";
import XLSX from "xlsx";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// ============================================
// ✅ REMOVE THIS - Don't create service at top
// const sheetsService = new GoogleSheetsService(process.env.GOOGLE_SHEETS_URL);
// console.log("Hello", sheetsService);
// ============================================

// ============================================
// ✅ CREATE SERVICE WHEN NEEDED
// ============================================
const getSheetsService = () => {
  const url = process.env.GOOGLE_SHEETS_URL;
  console.log("📡 Creating GoogleSheetsService with URL:", url || "❌ NOT SET");
  return new GoogleSheetsService(url);
};

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

// ============ ROUTES ============

// GET - Check Google Sheets status
router.get("/google-sheets-status", async (req, res) => {
  try {
    const url = process.env.GOOGLE_SHEETS_URL;
    console.log("📡 Google Sheets URL check:", url || "NOT SET");

    res.json({
      success: true,
      configured: !!url,
      url: url ? "Configured" : "Not configured",
      urlValue: url || null,
    });
  } catch (error) {
    console.error("Status error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Preview problems from Google Sheets
router.get("/preview-google-sheets", async (req, res) => {
  try {
    console.log("📡 Preview endpoint called");
    console.log(
      "📡 GOOGLE_SHEETS_URL from env:",
      process.env.GOOGLE_SHEETS_URL || "❌ NOT SET",
    );

    if (!process.env.GOOGLE_SHEETS_URL) {
      return res.status(400).json({
        success: false,
        error:
          "Google Sheets URL not configured. Add GOOGLE_SHEETS_URL to .env file",
      });
    }

    // ✅ Create service HERE when needed
    const sheetsService = getSheetsService();
    const problems = await sheetsService.fetchProblemsFromSheet();

    console.log(`✅ Found ${problems.length} problems in Google Sheets`);

    res.json({
      success: true,
      count: problems.length,
      problems: problems.map((p) => ({
        problemId: p.problemId,
        title: p.title,
        difficulty: p.difficulty,
        testCasesCount: p.testCases ? p.testCases.length : 0,
      })),
    });
  } catch (error) {
    console.error("❌ Preview error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to preview Google Sheets",
    });
  }
});

// POST - Sync problems from Google Sheets
router.post("/sync-google-sheets", async (req, res) => {
  try {
    console.log("🔄 Sync endpoint called");

    if (!process.env.GOOGLE_SHEETS_URL) {
      return res.status(400).json({
        error:
          "Google Sheets URL not configured. Add GOOGLE_SHEETS_URL to .env file",
      });
    }

    // ✅ Create service HERE when needed
    const sheetsService = getSheetsService();
    const result = await sheetsService.syncProblemsToDatabase();

    res.json({
      success: true,
      message: `Synced: ${result.imported} new, ${result.updated} updated`,
      details: result,
    });
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET - Download Excel template
router.get("/template/download", protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Not authorized. Admin only.",
      });
    }

    const template = ExcelParser.generateTemplate();
    const worksheet = XLSX.utils.json_to_sheet([template]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Problems");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=problems_template.xlsx",
    );
    res.send(buffer);
  } catch (error) {
    console.error("Template download error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST - Import from Excel file
router.post("/import", protect, upload.single("file"), async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Not authorized. Admin only.",
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const problems = ExcelParser.parseProblemsFromExcel(req.file.path);
    let importedCount = 0;
    let updatedCount = 0;

    for (const problem of problems) {
      const existing = await Problem.findOne({ problemId: problem.problemId });
      if (existing) {
        await Problem.findOneAndUpdate(
          { problemId: problem.problemId },
          { ...problem, updatedAt: new Date() },
        );
        updatedCount++;
      } else {
        await Problem.create(problem);
        importedCount++;
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `Import complete: ${importedCount} new, ${updatedCount} updated`,
      imported: importedCount,
      updated: updatedCount,
    });
  } catch (error) {
    console.error("Import error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============ DYNAMIC ROUTES (ORDER MATTERS - PUT MORE SPECIFIC FIRST) ============

// GET all problems
router.get("/", protect, async (req, res) => {
  try {
    const problems = await Problem.find(
      {},
      "problemId title difficulty tags acceptanceRate totalSubmissions",
    );
    res.json({
      success: true,
      count: problems.length,
      problems,
    });
  } catch (error) {
    console.error("Error fetching problems:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST - Batch delete multiple problems
router.post("/delete-batch", protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Not authorized. Admin only.",
      });
    }

    const { problemIds } = req.body;

    if (!problemIds || !problemIds.length) {
      return res.status(400).json({ error: "No problem IDs provided" });
    }

    const result = await Problem.deleteMany({ problemId: { $in: problemIds } });

    console.log(`🗑️ Batch deleted: ${result.deletedCount} problems`);
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} problems`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Batch delete error:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Delete a specific problem by ID
router.delete("/:problemId", protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Not authorized. Admin only.",
      });
    }

    const problemId = req.params.problemId;
    const deleted = await Problem.findOneAndDelete({ problemId: problemId });

    if (!deleted) {
      return res.status(404).json({ error: "Problem not found" });
    }

    console.log(`🗑️ Deleted problem: ${problemId} - ${deleted.title}`);
    res.json({
      success: true,
      message: `Problem "${deleted.title}" deleted successfully`,
      deleted: {
        problemId: deleted.problemId,
        title: deleted.title,
      },
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET single problem (THIS MUST BE LAST - catches :problemId)
router.get("/:problemId", protect, async (req, res) => {
  try {
    const problem = await Problem.findOne({ problemId: req.params.problemId });
    if (!problem) {
      return res.status(404).json({ error: "Problem not found" });
    }

    // Only show non-hidden test cases to students
    const visibleTestCases = problem.testCases.filter((tc) => !tc.isHidden);

    res.json({
      success: true,
      problem: {
        ...problem.toObject(),
        testCases: visibleTestCases,
      },
    });
  } catch (error) {
    console.error("Error fetching problem:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE all problems (for testing - keep at the end)
router.delete("/all", protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Not authorized. Admin only.",
      });
    }

    const result = await Problem.deleteMany({});
    console.log(`🗑️ Deleted all ${result.deletedCount} problems`);
    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} problems`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Delete all error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
