const axios = require("axios");

class Judge0Service {
  constructor() {
    this.apiUrl = "https://judge0-ce.p.rapidapi.com";
    this.headers = {
      "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
      "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
      "Content-Type": "application/json",
    };
  }

  getLanguageId(language) {
    const languages = {
      python: 71,
      javascript: 63,
      java: 62,
      cpp: 54,
      c: 50,
      go: 95,
      rust: 87,
    };
    return languages[language];
  }

  async executeCode(code, language, stdin = "", expectedOutput = null) {
    try {
      const payload = {
        source_code: code,
        language_id: this.getLanguageId(language),
        stdin: stdin,
        expected_output: expectedOutput,
        cpu_time_limit: 2,
        memory_limit: 256,
      };

      const response = await axios.post(`${this.apiUrl}/submissions`, payload, {
        headers: this.headers,
        params: { base64_encoded: false, wait: true, fields: "*" },
      });

      return {
        success: true,
        output: response.data.stdout,
        error: response.data.stderr || response.data.compile_output,
        status: response.data.status.description,
        executionTime: response.data.time,
        memoryUsed: response.data.memory,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: "Execution Failed",
      };
    }
  }

  async runBatchTests(code, language, testCases) {
    const batchSubmissions = testCases.map((tc) => ({
      language_id: this.getLanguageId(language),
      source_code: code,
      stdin: tc.input,
      expected_output: tc.expectedOutput,
      cpu_time_limit: 2,
      memory_limit: 256,
    }));

    try {
      const response = await axios.post(
        `${this.apiUrl}/submissions/batch`,
        { submissions: batchSubmissions },
        {
          headers: this.headers,
          params: { base64_encoded: false },
        },
      );

      const tokens = response.data.map((s) => s.token);

      // Wait a bit for processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const resultsResponse = await axios.get(
        `${this.apiUrl}/submissions/batch`,
        {
          headers: this.headers,
          params: {
            tokens: tokens.join(","),
            base64_encoded: false,
            fields: "*",
          },
        },
      );

      const results = resultsResponse.data.submissions.map((sub, index) => ({
        testCase: index + 1,
        passed:
          sub.status.id === 3 &&
          sub.stdout?.trim() === testCases[index].expectedOutput.trim(),
        input: testCases[index].input,
        expected: testCases[index].expectedOutput,
        output: sub.stdout?.trim() || "",
        error: sub.stderr || sub.compile_output,
        executionTime: sub.time,
        memoryUsed: sub.memory,
      }));

      const passedCount = results.filter((r) => r.passed).length;

      return {
        success: true,
        results,
        summary: {
          total: testCases.length,
          passed: passedCount,
          failed: testCases.length - passedCount,
          score: ((passedCount / testCases.length) * 100).toFixed(2),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new Judge0Service();
