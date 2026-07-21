// backend/middleware/validators.js

export const validateSubmission = (req, res, next) => {
  const { problemId, code, language, testId } = req.body;

  // ✅ Check for empty code
  if (!code || code.trim() === "") {
    return res.status(400).json({
      success: false,
      error: "Cannot submit empty code. Please write some code first.",
    });
  }

  // ✅ Check minimum code length
  if (code.trim().length < 3) {
    return res.status(400).json({
      success: false,
      error: "Code is too short. Please write a proper solution.",
    });
  }

  // ✅ Check for boilerplate code
  const boilerplatePatterns = [
    /^\/\/.*/m,
    /^\s*$/m,
    /^class\s+\w+\s*{[\s\n]*}$/m,
    /^function\s+\w+\s*\([\s\n]*\)\s*{[\s\n]*}$/m,
    /^def\s+\w+\s*\([\s\n]*\)[\s\n]*:[\s\n]*(pass|...)$/m,
    /^int\s+main\s*\([\s\n]*\)\s*{[\s\n]*return\s+0;[\s\n]*}$/m,
    /^public\s+class\s+\w+\s*{[\s\n]*public\s+static\s+void\s+main\s*\(String\[\]\s*\w+\)\s*{[\s\n]*}$/m,
  ];

  const isBoilerplate = boilerplatePatterns.some((pattern) =>
    pattern.test(code),
  );

  if (isBoilerplate) {
    return res.status(400).json({
      success: false,
      error:
        "Please write actual code. Submitting boilerplate or empty code is not allowed.",
    });
  }

  // ✅ Check code size limit (100KB max)
  const codeSize = Buffer.byteLength(code, "utf8");
  if (codeSize > 100 * 1024) {
    return res.status(400).json({
      success: false,
      error: "Code is too large. Please keep your code under 100KB.",
    });
  }

  // ✅ Check language is valid
  const validLanguages = [
    "cpp",
    "python",
    "java",
    "javascript",
    "c",
    "csharp",
    "go",
    "rust",
  ];
  if (!validLanguages.includes(language)) {
    return res.status(400).json({
      success: false,
      error: `Unsupported language. Supported: ${validLanguages.join(", ")}`,
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

  next();
};

export const validateTestCreation = (req, res, next) => {
  const { title, subject, topic, college, duration, startTime, endTime } =
    req.body;

  const errors = [];

  if (!title || title.trim() === "") {
    errors.push("Title is required");
  }
  if (!subject || subject.trim() === "") {
    errors.push("Subject is required");
  }
  if (!topic || topic.trim() === "") {
    errors.push("Topic is required");
  }
  if (!college || college.trim() === "") {
    errors.push("College is required");
  }
  if (!duration || duration < 1) {
    errors.push("Duration must be at least 1 minute");
  }
  if (!startTime) {
    errors.push("Start time is required");
  }
  if (!endTime) {
    errors.push("End time is required");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors: errors,
    });
  }

  next();
};
