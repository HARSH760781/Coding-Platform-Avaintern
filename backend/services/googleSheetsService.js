// backend/services/googleSheetsService.js
import axios from "axios";
import Problem from "../models/Problem.js";

class GoogleSheetsService {
  constructor(sheetUrl) {
    this.sheetUrl = sheetUrl;
  }

  async fetchProblemsFromSheet() {
    try {
      console.log("📡 Fetching from Google Sheets:", this.sheetUrl);

      if (!this.sheetUrl) {
        throw new Error("Google Sheets URL is not configured");
      }

      const cacheBuster = `&_=${Date.now()}`;
      const url =
        this.sheetUrl +
        (this.sheetUrl.includes("?") ? cacheBuster : `?${cacheBuster}`);

      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          Accept: "text/csv,text/plain,*/*",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          "User-Agent": "Mozilla/5.0",
        },
      });

      const csvData = response.data;
      console.log("📄 Received CSV data length:", csvData.length);

      const rows = this.parseCSV(csvData);
      if (rows.length < 2) {
        throw new Error("No data found in sheet.");
      }

      const headers = rows[0];
      console.log("📋 Headers found:", headers);

      const problems = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || !row[0]) continue;

        const problem = this.parseProblemRow(headers, row);
        if (problem.problemId && problem.title) {
          problems.push(problem);
          console.log(
            `   ✓ Found problem: ${problem.problemId} - ${problem.title}`,
          );
        }
      }

      console.log(`✅ Parsed ${problems.length} problems from sheet`);
      return problems;
    } catch (error) {
      console.error("Error fetching from Google Sheets:", error.message);
      throw error;
    }
  }

  parseCSV(csvData) {
    const rows = [];
    let currentRow = [];
    let currentCell = "";
    let inQuotes = false;

    for (let i = 0; i < csvData.length; i++) {
      const char = csvData[i];
      const nextChar = csvData[i + 1];

      if (char === '"') {
        inQuotes = !inQuotes;
        currentCell += char;
      } else if (char === "," && !inQuotes) {
        currentRow.push(currentCell);
        currentCell = "";
      } else if (
        (char === "\n" || (char === "\r" && nextChar === "\n")) &&
        !inQuotes
      ) {
        currentRow.push(currentCell);
        if (currentRow.length > 0 && currentRow.some((cell) => cell.trim())) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = "";
        if (char === "\r") i++;
      } else {
        currentCell += char;
      }
    }

    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell);
      if (currentRow.length > 0 && currentRow.some((cell) => cell.trim())) {
        rows.push(currentRow);
      }
    }

    console.log(`📊 Parsed ${rows.length} total rows`);
    return rows;
  }

  // ============================================
  // ✅ UNIVERSAL JSON PARSER - Handles ANY format
  // ============================================
  parseTestCasesFromJSON(jsonStr) {
    if (!jsonStr) return [];

    try {
      let cleanStr = jsonStr.trim();

      console.log(
        `🔍 Universal Parser - Original:`,
        cleanStr.substring(0, 200) + "...",
      );

      // ============================================
      // Step 1: Remove outer quotes if present
      // ============================================
      if (cleanStr.startsWith('"') && cleanStr.endsWith('"')) {
        cleanStr = cleanStr.slice(1, -1);
      }
      if (cleanStr.startsWith('"') && cleanStr.endsWith('"')) {
        cleanStr = cleanStr.slice(1, -1);
      }

      // ============================================
      // Step 2: Handle escaped quotes
      // ============================================
      cleanStr = cleanStr.replace(/""/g, '"');
      cleanStr = cleanStr.replace(/\\"/g, '"');

      // ============================================
      // Step 3: Handle newlines (both \n and \\n)
      // ============================================
      cleanStr = cleanStr.replace(/\\\\n/g, "\\n");
      cleanStr = cleanStr.replace(/\\n/g, "\\n");

      // ============================================
      // Step 4: Remove extra whitespace between tokens
      // ============================================
      cleanStr = cleanStr.replace(/\s+/g, " ");

      // ============================================
      // Step 5: Fix common JSON issues
      // ============================================
      // Replace single quotes with double quotes (for keys)
      cleanStr = cleanStr.replace(/'/g, '"');
      // Remove trailing commas before closing brackets
      cleanStr = cleanStr.replace(/,\s*}/g, "}");
      cleanStr = cleanStr.replace(/,\s*\]/g, "]");
      // Fix missing quotes around keys
      cleanStr = cleanStr.replace(/(\{|\,)\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');

      console.log(`🔍 Cleaned JSON:`, cleanStr.substring(0, 200) + "...");

      // ============================================
      // Step 6: Parse JSON
      // ============================================
      const testCases = JSON.parse(cleanStr);

      // Validate and format
      const formatted = testCases.map((tc) => ({
        input:
          tc.input !== undefined && tc.input !== null ? String(tc.input) : "", // ✅ Allow empty strings
        expectedOutput:
          tc.expectedOutput !== undefined && tc.expectedOutput !== null
            ? String(tc.expectedOutput)
            : "", // ✅ Allow empty strings
        isHidden:
          tc.isHidden === true ||
          tc.isHidden === "true" ||
          tc.isHidden === "TRUE" ||
          tc.hidden === true ||
          tc.hidden === "true" ||
          tc.hidden === "TRUE",
        weightage: tc.weightage || tc.weight || 1,
      }));

      console.log(`✅ Universal Parser: Parsed ${formatted.length} test cases`);
      return formatted;
    } catch (error) {
      console.error(`❌ Universal Parser failed:`, error.message);
      console.error(`❌ Failed string:`, jsonStr);

      // ============================================
      // Step 7: Fallback - Try to fix common issues
      // ============================================
      return this.fallbackParseJSON(jsonStr);
    }
  }

  // ============================================
  // ✅ FALLBACK PARSER - Handles even more edge cases
  // ============================================
  fallbackParseJSON(jsonStr) {
    try {
      console.log(`🔍 Fallback Parser - Attempting to fix...`);
      let fixed = jsonStr;

      // Remove all whitespace (except in strings)
      let inString = false;
      let cleaned = "";
      for (let i = 0; i < fixed.length; i++) {
        const char = fixed[i];
        if (char === '"' && fixed[i - 1] !== "\\") {
          inString = !inString;
          cleaned += char;
        } else if (inString) {
          cleaned += char;
        } else if (
          char === " " ||
          char === "\n" ||
          char === "\r" ||
          char === "\t"
        ) {
          continue;
        } else {
          cleaned += char;
        }
      }
      fixed = cleaned;

      // Fix common issues
      fixed = fixed.replace(/'/g, '"');
      fixed = fixed.replace(/,\s*}/g, "}");
      fixed = fixed.replace(/,\s*\]/g, "]");
      fixed = fixed.replace(/(\{|\,)\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');

      // Handle escaped newlines
      fixed = fixed.replace(/\\\\n/g, "\\n");
      fixed = fixed.replace(/\\n/g, "\\n");

      // Remove outer quotes if present
      if (fixed.startsWith('"') && fixed.endsWith('"')) {
        fixed = fixed.slice(1, -1);
      }

      console.log(`🔍 Fallback cleaned:`, fixed.substring(0, 200) + "...");

      const testCases = JSON.parse(fixed);

      const formatted = testCases.map((tc) => ({
        input:
          tc.input !== undefined && tc.input !== null ? String(tc.input) : "", // ✅ Allow empty strings
        expectedOutput:
          tc.expectedOutput !== undefined && tc.expectedOutput !== null
            ? String(tc.expectedOutput)
            : "", // ✅ Allow empty strings
        isHidden:
          tc.isHidden === true ||
          tc.isHidden === "true" ||
          tc.isHidden === "TRUE" ||
          tc.hidden === true ||
          tc.hidden === "true" ||
          tc.hidden === "TRUE",
        weightage: tc.weightage || tc.weight || 1,
      }));
      console.log(`✅ Fallback Parser: Parsed ${formatted.length} test cases`);
      return formatted;
    } catch (error) {
      console.error(`❌ Fallback Parser also failed:`, error.message);
      console.error(`❌ Original JSON:`, jsonStr);
      return [];
    }
  }

  // ============================================
  // ✅ UPDATED parseProblemRow with Universal JSON support
  // ============================================
  parseProblemRow(headers, row) {
    console.log("📝 Parsing row with headers:", headers);

    const getValue = (headerName) => {
      let index = headers.findIndex((h) => h && h.trim() === headerName);

      if (index === -1) {
        index = headers.findIndex(
          (h) => h && h.trim().toLowerCase() === headerName.toLowerCase(),
        );
      }

      if (index !== -1 && row[index] !== undefined) {
        let value = row[index] || "";
        if (typeof value === "string") {
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          value = value.replace(/""/g, '"');
        }
        return value;
      }
      return "";
    };

    const parseHidden = (value) => {
      if (!value) return false;
      const val = String(value).toUpperCase().trim();
      return (
        val === "TRUE" ||
        val === "YES" ||
        val === "1" ||
        val === "T" ||
        val === "Y"
      );
    };

    // ============================================
    // ✅ PRIMARY: JSON Test Cases (Supports 100+)
    // ============================================
    let testCases = [];
    const problemId = getValue("Problem ID");

    // Try multiple column names
    let jsonTestCases = getValue("Test Cases JSON");
    if (
      !jsonTestCases ||
      jsonTestCases.trim() === "" ||
      jsonTestCases.trim() === "[]"
    ) {
      jsonTestCases = getValue("TestCases JSON");
    }
    if (
      !jsonTestCases ||
      jsonTestCases.trim() === "" ||
      jsonTestCases.trim() === "[]"
    ) {
      jsonTestCases = getValue("Test Cases (JSON)");
    }
    if (
      !jsonTestCases ||
      jsonTestCases.trim() === "" ||
      jsonTestCases.trim() === "[]"
    ) {
      jsonTestCases = getValue("JSON Test Cases");
    }
    if (
      !jsonTestCases ||
      jsonTestCases.trim() === "" ||
      jsonTestCases.trim() === "[]"
    ) {
      jsonTestCases = getValue("Test Cases");
    }

    console.log(`📡 Parsing test cases for ${problemId}`);

    if (
      jsonTestCases &&
      jsonTestCases.trim() !== "" &&
      jsonTestCases.trim() !== "[]"
    ) {
      console.log(`🔍 Found JSON: ${jsonTestCases.substring(0, 100)}...`);
      // ✅ Use universal parser
      testCases = this.parseTestCasesFromJSON(jsonTestCases);
      console.log(`✅ Parsed ${testCases.length} test cases from JSON`);
    } else {
      // ============================================
      // ✅ FALLBACK: Individual columns (up to 5)
      // ============================================
      console.log(
        `⚠️ No JSON found, using individual columns for ${problemId}`,
      );

      const test1Input = getValue("Test Case 1 Input");
      const test1Output = getValue("Test Case 1 Output");
      const test1Hidden = getValue("Test Case 1 Hidden");
      if (test1Input && test1Output) {
        testCases.push({
          input: String(test1Input),
          expectedOutput: String(test1Output),
          isHidden: parseHidden(test1Hidden),
          weightage: 1,
        });
      }

      const test2Input = getValue("Test Case 2 Input");
      const test2Output = getValue("Test Case 2 Output");
      const test2Hidden = getValue("Test Case 2 Hidden");
      if (test2Input && test2Output) {
        testCases.push({
          input: String(test2Input),
          expectedOutput: String(test2Output),
          isHidden: parseHidden(test2Hidden),
          weightage: 1,
        });
      }

      const test3Input = getValue("Test Case 3 Input");
      const test3Output = getValue("Test Case 3 Output");
      const test3Hidden = getValue("Test Case 3 Hidden");
      if (test3Input && test3Output) {
        testCases.push({
          input: String(test3Input),
          expectedOutput: String(test3Output),
          isHidden: parseHidden(test3Hidden),
          weightage: 1,
        });
      }

      const test4Input = getValue("Test Case 4 Input");
      const test4Output = getValue("Test Case 4 Output");
      const test4Hidden = getValue("Test Case 4 Hidden");
      if (test4Input && test4Output) {
        testCases.push({
          input: String(test4Input),
          expectedOutput: String(test4Output),
          isHidden: parseHidden(test4Hidden),
          weightage: 1,
        });
      }

      const test5Input = getValue("Test Case 5 Input");
      const test5Output = getValue("Test Case 5 Output");
      const test5Hidden = getValue("Test Case 5 Hidden");
      if (test5Input && test5Output) {
        testCases.push({
          input: String(test5Input),
          expectedOutput: String(test5Output),
          isHidden: parseHidden(test5Hidden),
          weightage: 1,
        });
      }

      console.log(`✅ Parsed ${testCases.length} test cases from columns`);
    }

    // ============================================
    // EXAMPLES PARSING
    // ============================================
    let examples = [];
    const examplesStr = getValue("Examples");

    console.log(`📝 Examples for ${problemId}:`, examplesStr);

    if (
      examplesStr &&
      examplesStr.trim() !== "" &&
      examplesStr.trim() !== "[]"
    ) {
      try {
        let cleanStr = examplesStr;

        if (cleanStr.startsWith('"') && cleanStr.endsWith('"')) {
          cleanStr = cleanStr.slice(1, -1);
        }

        cleanStr = cleanStr.replace(/""/g, '"');
        cleanStr = cleanStr.replace(/\\\\n/g, "<<NEWLINE>>");
        const parsed = JSON.parse(cleanStr);

        examples = parsed.map((item) => ({
          input: item.input ? item.input.replace(/<<NEWLINE>>/g, "\n") : "",
          output: item.output ? item.output.replace(/<<NEWLINE>>/g, "\n") : "",
          explanation: item.explanation || "",
        }));

        console.log(`✅ Parsed ${examples.length} examples for ${problemId}`);
      } catch (e) {
        console.log(`⚠️ Failed to parse examples for ${problemId}:`, e.message);
      }
    }

    const tagsStr = getValue("Tags");
    const tags = tagsStr
      ? tagsStr
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t)
      : [];

    const timeLimit = parseInt(getValue("Time Limit")) || 2;
    const memoryLimit = parseInt(getValue("Memory Limit")) || 256;

    const problemData = {
      problemId: String(getValue("Problem ID")),
      title: String(getValue("Title")),
      difficulty: String(getValue("Difficulty")),
      description: String(getValue("Description")),
      constraints: getValue("Constraints") || "",
      examples: examples,
      tags: tags,
      companies: [],
      timeLimit: isNaN(timeLimit) ? 2 : timeLimit,
      memoryLimit: isNaN(memoryLimit) ? 256 : memoryLimit,
      starterCode: {
        python: getValue("Python Code") || "",
        javascript: getValue("JavaScript Code") || "",
        java: getValue("Java Code") || "",
        cpp: getValue("C++ Code") || "",
        c: getValue("C Code") || "",
      },
      hints: [],
      testCases: testCases,
    };

    console.log(
      `📝 ${problemData.problemId}: ${problemData.examples.length} examples, ${problemData.testCases.length} test cases`,
    );
    console.log(
      `   Hidden test cases: ${problemData.testCases.filter((tc) => tc.isHidden).length}`,
    );

    return problemData;
  }

  async syncProblemsToDatabase() {
    try {
      console.log("🔄 Starting sync from Google Sheets...");
      const problems = await this.fetchProblemsFromSheet();

      if (problems.length === 0) {
        throw new Error("No problems found in Google Sheet");
      }

      let importedCount = 0;
      let updatedCount = 0;

      for (const problem of problems) {
        const existing = await Problem.findOne({
          problemId: problem.problemId,
        });

        if (existing) {
          await Problem.findOneAndUpdate(
            { problemId: problem.problemId },
            { ...problem, updatedAt: new Date() },
            { new: true, runValidators: false },
          );
          updatedCount++;
          console.log(`📝 Updated: ${problem.title}`);
        } else {
          const newProblem = new Problem(problem);
          await newProblem.save();
          importedCount++;
          console.log(`✨ Created: ${problem.title}`);
        }
      }

      console.log(
        `✅ Sync complete: ${importedCount} new, ${updatedCount} updated`,
      );
      return {
        success: true,
        imported: importedCount,
        updated: updatedCount,
        total: problems.length,
      };
    } catch (error) {
      console.error("Sync error:", error);
      throw error;
    }
  }
}

export default GoogleSheetsService;
