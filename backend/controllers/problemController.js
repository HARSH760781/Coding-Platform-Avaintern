const Problem = require("../models/Problem");
const XLSX = require("xlsx");

exports.getAllProblems = async (req, res) => {
  try {
    const problems = await Problem.find(
      {},
      "problemId title difficulty tags acceptanceRate totalSubmissions",
    );
    res.json({ success: true, problems });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getProblemById = async (req, res) => {
  try {
    const problem = await Problem.findOne({ problemId: req.params.problemId });
    if (!problem) {
      return res.status(404).json({ error: "Problem not found" });
    }

    // Return only non-hidden test cases for students
    const visibleTestCases = problem.testCases.filter((tc) => !tc.isHidden);

    res.json({
      success: true,
      problem: {
        ...problem.toObject(),
        testCases: visibleTestCases,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.importProblemsFromExcel = async (req, res) => {
  try {
    const workbook = XLSX.readFile(req.file.path);

    const problemsSheet = workbook.Sheets["Problems"];
    const problems = XLSX.utils.sheet_to_json(problemsSheet);

    const testCasesSheet = workbook.Sheets["TestCases"];
    const testCases = XLSX.utils.sheet_to_json(testCasesSheet);

    const testCasesByProblem = {};
    testCases.forEach((tc) => {
      if (!testCasesByProblem[tc["Problem ID"]]) {
        testCasesByProblem[tc["Problem ID"]] = [];
      }
      testCasesByProblem[tc["Problem ID"]].push({
        input: tc["Input"].toString(),
        expectedOutput: tc["Expected Output"].toString(),
        isHidden: tc["Is Hidden"] === "TRUE" || tc["Is Hidden"] === true,
        explanation: tc["Explanation"] || "",
      });
    });

    for (const problem of problems) {
      const problemData = {
        problemId: problem["Problem ID"],
        title: problem["Title"],
        description: problem["Description"],
        difficulty: problem["Difficulty"],
        tags: problem["Tags"]?.split(",").map((t) => t.trim()) || [],
        companies: problem["Companies"]?.split(",").map((c) => c.trim()) || [],
        constraints: problem["Constraints"],
        examples: JSON.parse(problem["Examples"] || "[]"),
        timeLimit: problem["Time Limit"] || 2,
        memoryLimit: problem["Memory Limit"] || 256,
        testCases: testCasesByProblem[problem["Problem ID"]] || [],
        starterCode: {
          python: problem["Python Starter Code"] || "",
          javascript: problem["JavaScript Starter Code"] || "",
          java: problem["Java Starter Code"] || "",
          cpp: problem["C++ Starter Code"] || "",
          c: problem["C Starter Code"] || "",
        },
        hints: problem["Hints"]?.split("\n") || [],
      };

      await Problem.findOneAndUpdate(
        { problemId: problemData.problemId },
        problemData,
        { upsert: true, new: true },
      );
    }

    res.json({
      success: true,
      message: `Imported ${problems.length} problems`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
