// backend/middleware/validators.js

export const validateSubmission = (req, res, next) => {
  const { problemId, code, language, testId } = req.body;

  // ✅ Check for completely empty code
  if (!code || code.trim() === "") {
    return res.status(400).json({
      success: false,
      error: "Cannot submit empty code. Please write some code first.",
    });
  }

  // ✅ Check minimum code length (allow very short code)
  if (code.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: "Code is too short. Please write a proper solution.",
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
    "typescript",
    "php",
    "ruby",
    "swift",
    "kotlin",
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

  // ✅ Validate problemId
  if (!problemId || problemId === "undefined" || problemId === "null") {
    return res.status(400).json({
      success: false,
      error: "Invalid problem ID.",
    });
  }

  // ❌ BOILERPLATE CHECK REMOVED - Now allows any code
  // Users can submit simple code like "Hello World", "print('hi')", etc.
  // Only empty submissions are blocked

  next();
};

export const validateTestCreation = (req, res, next) => {
  const {
    title,
    subject,
    topic,
    college,
    duration,
    startTime,
    endTime,
    problems,
  } = req.body;

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
  if (!problems || !Array.isArray(problems) || problems.length === 0) {
    errors.push("At least one problem is required");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors: errors,
    });
  }

  next();
};
