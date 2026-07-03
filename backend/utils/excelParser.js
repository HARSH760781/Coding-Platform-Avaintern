// backend/utils/excelParser.js
import XLSX from "xlsx";
import fs from "fs";

class ExcelParser {
  static generateTemplate() {
    return {
      problemId: "PROB001",
      title: "Two Sum",
      description:
        "Given an array of integers, return indices of two numbers that add up to a target.",
      difficulty: "Easy",
      tags: "array,hash-table",
      companies: "Google,Amazon",
      constraints: "2 <= nums.length <= 10^4",
      examples:
        '[{"input":"[2,7,11,15]\\n9","output":"[0,1]","explanation":"2+7=9"}]',
      timeLimit: 2,
      memoryLimit: 256,
      testCases:
        '[{"input":"[2,7,11,15]\\n9","expectedOutput":"[0,1]","isHidden":false}]',
      hints: "Try using a hash map",
      starterCode: '{"python":"def solve():\\n    pass"}',
    };
  }

  static parseProblemsFromExcel(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const problems = [];
    for (const row of data) {
      try {
        const problem = {
          problemId: row.problemId || row.ProblemId,
          title: row.title || row.Title,
          description: row.description || row.Description,
          difficulty: row.difficulty || row.Difficulty || "Easy",
          tags: row.tags ? row.tags.split(",").map((t) => t.trim()) : [],
          companies: row.companies
            ? row.companies.split(",").map((c) => c.trim())
            : [],
          constraints: row.constraints || "",
          examples: row.examples ? JSON.parse(row.examples) : [],
          timeLimit: parseInt(row.timeLimit) || 2,
          memoryLimit: parseInt(row.memoryLimit) || 256,
          testCases: row.testCases ? JSON.parse(row.testCases) : [],
          hints: row.hints ? row.hints.split(",").map((h) => h.trim()) : [],
          starterCode: row.starterCode ? JSON.parse(row.starterCode) : {},
        };
        problems.push(problem);
      } catch (error) {
        console.error("Error parsing row:", error);
      }
    }
    return problems;
  }
}

export default ExcelParser;
