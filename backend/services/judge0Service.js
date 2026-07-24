// backend/services/judge0Service.js
import axios from "axios";

class Judge0Service {
  constructor() {
    console.log("🔧 Judge0 Service Constructor Called (waiting for init)");
  }

  init() {
    const apiKey = process.env.RAPIDAPI_KEY;
    const apiHost = process.env.RAPIDAPI_HOST;
    const apiUrl = process.env.JUDGE0_API_URL;

    console.log("🔧 === JUDGE0 SERVICE INITIALIZATION ===");
    console.log("📝 RAPIDAPI_KEY:", apiKey || "❌ NOT SET");
    console.log("📝 RAPIDAPI_HOST:", apiHost || "❌ NOT SET");
    console.log("📝 JUDGE0_API_URL:", apiUrl || "❌ NOT SET");
    console.log("=====================================");

    this.apiUrl = apiUrl || "https://judge0-ce.p.rapidapi.com";
    this.headers = {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": apiHost || "judge0-ce.p.rapidapi.com",
      "Content-Type": "application/json",
    };

    if (apiKey) {
      const maskedKey =
        apiKey.substring(0, 10) + "..." + apiKey.substring(apiKey.length - 4);
      console.log("🔑 Using API Key:", maskedKey);
    } else {
      console.log("🔑 Using API Key: ❌ MISSING");
    }
  }

  // ============================================
  // INPUT NORMALIZATION - Handles all formats
  // ============================================
  normalizeInput(input) {
    if (!input) return "";

    let normalized = input;

    // Handle literal \n (from test cases)
    normalized = normalized.replace(/\\n/g, "\n");

    // Handle actual newlines
    normalized = normalized.replace(/\r/g, "");

    // Trim extra whitespace
    normalized = normalized.trim();

    // Ensure proper ending
    if (normalized && !normalized.endsWith("\n")) {
      normalized += "\n";
    }

    console.log(`📝 Normalized input: "${normalized.replace(/\n/g, "\\n")}"`);

    return normalized;
  }

  // ============================================
  // LANGUAGE ID MAPPING
  // ============================================
  getLanguageId(language) {
    const languages = {
      python: 71,
      python3: 71,
      javascript: 63,
      js: 63,
      java: 62,
      cpp: 54,
      c: 50,
    };
    return languages[language];
  }

  // ============================================
  // EXECUTE CODE
  // ============================================
  async executeCode(code, languageId, stdin = "") {
    if (!this.headers) this.init();

    try {
      console.log(`📝 Executing code with language ID: ${languageId}`);

      // Normalize the input
      const normalizedStdin = this.normalizeInput(stdin);

      // Encode code and stdin in base64
      const encodedCode = Buffer.from(code, "utf-8").toString("base64");
      const encodedStdin = Buffer.from(normalizedStdin, "utf-8").toString(
        "base64",
      );

      const submissionResponse = await axios.post(
        `${this.apiUrl}/submissions?base64_encoded=true`,
        {
          source_code: encodedCode,
          language_id: languageId,
          stdin: encodedStdin,
          cpu_time_limit: 10,
          memory_limit: 4096,
        },
        { headers: this.headers },
      );

      const token = submissionResponse.data.token;
      console.log(`✅ Submission token: ${token}`);

      let result = null;
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        const statusResponse = await axios.get(
          `${this.apiUrl}/submissions/${token}?base64_encoded=true`,
          { headers: this.headers },
        );

        result = statusResponse.data;
        console.log(
          `⏳ Status: ${result.status?.description || "Processing..."}`,
        );

        if (result.status && result.status.id > 2) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
        attempts++;
      }

      // Decode the output from base64
      if (result && result.stdout) {
        result.stdout = Buffer.from(result.stdout, "base64").toString("utf-8");
        console.log(`📤 Output: "${result.stdout.trim()}"`);
      }
      if (result && result.stderr) {
        result.stderr = Buffer.from(result.stderr, "base64").toString("utf-8");
        console.log(`⚠️ Stderr: "${result.stderr.trim()}"`);
      }
      if (result && result.compile_output) {
        result.compile_output = Buffer.from(
          result.compile_output,
          "base64",
        ).toString("utf-8");
      }

      return result;
    } catch (error) {
      console.error(
        "❌ Judge0 API Error:",
        error.response?.data || error.message,
      );
      throw new Error(error.response?.data?.message || "Code execution failed");
    }
  }

  // ============================================
  // RUN TEST CASES
  // ============================================
  async runTestCases(code, language, testCases) {
    if (!this.headers) this.init();

    const languageId = this.getLanguageId(language);
    if (!languageId) {
      throw new Error(`Unsupported language: ${language}`);
    }

    console.log(`🧪 Running ${testCases.length} test cases for ${language}...`);

    let passedCount = 0;
    const results = [];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n📝 Test Case ${i + 1}:`);
      console.log(`   Input: ${testCase.input}`);
      console.log(`   Expected: ${testCase.expectedOutput}`);

      try {
        // Normalize the input
        const normalizedInput = this.normalizeInput(testCase.input || "");

        const result = await this.executeCode(
          code,
          languageId,
          normalizedInput,
        );

        const actualOutput = (result.stdout || "").trim();
        const expectedOutput = (testCase.expectedOutput || "").trim();
        const error = result.stderr || "";
        const compileError = result.compile_output || "";

        const statusId = result.status?.id || 0;
        const isAccepted = statusId === 3;
        const isCompilationError = statusId === 6;
        const isRuntimeError = statusId === 5;
        const isTimeLimit = statusId === 8;

        let passed = false;
        let statusMessage = "";

        console.log(`📤 Actual Output: "${actualOutput}"`);
        console.log(`📤 Expected Output: "${expectedOutput}"`);

        if (isCompilationError) {
          statusMessage = "Compilation Error";
          passed = false;
        } else if (isRuntimeError) {
          statusMessage = "Runtime Error";
          passed = false;
        } else if (isTimeLimit) {
          statusMessage = "Time Limit Exceeded";
          passed = false;
        } else if (isAccepted && actualOutput === expectedOutput) {
          passed = true;
          statusMessage = "Accepted";
        } else if (isAccepted && actualOutput !== expectedOutput) {
          passed = false;
          statusMessage = "Wrong Answer";
        } else {
          passed = false;
          statusMessage = result.status?.description || "Unknown Error";
        }

        if (passed) passedCount++;

        results.push({
          testCase: i + 1,
          passed,
          status: statusMessage,
          input: testCase.input || "",
          expected: expectedOutput,
          output: actualOutput,
          error: error || compileError,
          executionTime: result.time || 0,
          memoryUsed: result.memory || 0,
        });

        console.log(
          `   Result: ${passed ? "✅ PASSED" : "❌ FAILED"} (${statusMessage})`,
        );
      } catch (error) {
        console.error(`   ❌ ERROR: ${error.message}`);
        results.push({
          testCase: i + 1,
          passed: false,
          status: "Execution Error",
          input: testCase.input || "",
          expected: testCase.expectedOutput || "",
          output: "",
          error: error.message,
          executionTime: 0,
          memoryUsed: 0,
        });
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Passed: ${passedCount}/${testCases.length}`);
    console.log(
      `   Score: ${((passedCount / testCases.length) * 100).toFixed(2)}%`,
    );

    return {
      passedCount,
      totalCount: testCases.length,
      score: (passedCount / testCases.length) * 100,
      results,
    };
  }

  async runTestCasesBatch(code, language, testCases) {
    if (!this.headers) this.init();

    const languageId = this.getLanguageId(language);
    if (!languageId) {
      throw new Error(`Unsupported language: ${language}`);
    }

    console.log(`🧪 Running ${testCases.length} test cases in batch...`);

    try {
      const encodedCode = Buffer.from(code, "utf-8").toString("base64");

      const batchSubmissions = testCases.map((tc) => ({
        source_code: encodedCode,
        language_id: languageId,
        stdin: Buffer.from(
          this.normalizeInput(tc.input || ""),
          "utf-8",
        ).toString("base64"),
        expected_output: Buffer.from(tc.expectedOutput || "", "utf-8").toString(
          "base64",
        ),
        cpu_time_limit: 10,
        memory_limit: 4096,
      }));

      const submitResponse = await axios.post(
        `${this.apiUrl}/submissions/batch?base64_encoded=true`,
        { submissions: batchSubmissions },
        { headers: this.headers },
      );

      const tokens = submitResponse.data.map((sub) => sub.token);
      console.log(`✅ Batch submitted, tokens: ${tokens.join(", ")}`);

      await new Promise((resolve) => setTimeout(resolve, 3000));

      const resultsResponse = await axios.get(
        `${this.apiUrl}/submissions/batch?tokens=${tokens.join(",")}&base64_encoded=true&fields=*`,
        { headers: this.headers },
      );

      const submissions = resultsResponse.data.submissions || [];
      let passedCount = 0;
      const results = [];

      submissions.forEach((result, index) => {
        const testCase = testCases[index];
        const actualOutput = result.stdout
          ? Buffer.from(result.stdout, "base64").toString("utf-8").trim()
          : "";
        const expectedOutput = (testCase.expectedOutput || "").trim();
        const statusId = result.status?.id || 0;
        const isAccepted = statusId === 3;
        const passed = isAccepted && actualOutput === expectedOutput;

        if (passed) passedCount++;

        results.push({
          testCase: index + 1,
          passed,
          status: result.status?.description || "Unknown",
          input: testCase.input || "",
          expected: expectedOutput,
          output: actualOutput,
          error: result.stderr
            ? Buffer.from(result.stderr, "base64").toString("utf-8")
            : "",
          executionTime: result.time || 0,
          memoryUsed: result.memory || 0,
        });

        console.log(
          `   Test Case ${index + 1}: ${passed ? "✅ PASSED" : "❌ FAILED"}`,
        );
      });

      console.log(`📊 Summary: ${passedCount}/${testCases.length} passed`);

      return {
        passedCount,
        totalCount: testCases.length,
        score: (passedCount / testCases.length) * 100,
        results,
      };
    } catch (error) {
      console.error("❌ Batch execution error:", error.message);
      console.log("🔄 Falling back to sequential execution...");
      return this.runTestCases(code, language, testCases);
      // throw error;
    }
  }
}

const judge0Service = new Judge0Service();
export default judge0Service;
