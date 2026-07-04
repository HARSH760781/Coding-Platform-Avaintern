// frontend/src/components/CodeEditor.jsx
import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import {
  submitCodingSolution,
  runSamples,
  getSampleTestCases,
} from "../services/api";
import toast from "react-hot-toast";

const CodeEditor = ({ problemId, onSubmissionComplete, testId }) => {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [sampleTestCases, setSampleTestCases] = useState([]);
  const [status, setStatus] = useState(null);
  const [score, setScore] = useState(null);
  const [isOutputExpanded, setIsOutputExpanded] = useState(true);
  const [errorDetails, setErrorDetails] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [passedCount, setPassedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hiddenResults, setHiddenResults] = useState(null);
  const [isAccepted, setIsAccepted] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadingType, setLoadingType] = useState(null); // 'run' or 'submit'
  const outputRef = useRef(null);
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Language templates
  const templates = {
    python: `def solve():\n    # Write your solution here\n    pass\n\nif __name__ == "__main__":\n    solve()`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}`,
    java: `class Solution\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}`,
    c: `#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}`,
    javascript: `function solve() {\n    // Write your solution here\n}\n\nsolve();`,
  };

  // ============================================
  // ✅ PERSISTENCE FUNCTIONS
  // ============================================
  const saveEditorState = (problemId, language, code, isAccepted = false) => {
    try {
      const state = {
        language,
        code,
        isAccepted,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(`editor_${problemId}`, JSON.stringify(state));
      // console.log(`💾 Saved editor state for ${problemId}`);
    } catch (error) {
      console.error("Error saving editor state:", error);
    }
  };

  const loadEditorState = (problemId) => {
    try {
      const saved = localStorage.getItem(`editor_${problemId}`);
      if (saved) {
        const data = JSON.parse(saved);
        // console.log(`📂 Loaded editor state for ${problemId}`);
        return data;
      }
    } catch (error) {
      console.error("Error loading editor state:", error);
    }
    return null;
  };

  const clearEditorState = (problemId) => {
    try {
      localStorage.removeItem(`editor_${problemId}`);
      // console.log(`🗑️ Cleared editor state for ${problemId}`);
    } catch (error) {
      console.error("Error clearing editor state:", error);
    }
  };

  // Load sample test cases
  const loadSampleTestCases = async () => {
    try {
      //   console.log("📡 Fetching sample test cases for:", problemId);
      const response = await getSampleTestCases(problemId);
      // console.log("📦 Sample test cases response:", response.data);
      const testCases = response.data.testCases || [];
      // console.log("📦 Test cases count:", testCases.length);
      setSampleTestCases(testCases);

      if (testCases.length === 0) {
        console.warn("⚠️ No sample test cases found for this problem");
      }
    } catch (error) {
      // console.error("Error loading test cases:", error);
      toast.error("Failed to load test cases");
    }
  };

  const loadStarterCode = async () => {
    try {
      const response = await getSampleTestCases(problemId);
      const starterCode = response.data.starterCode;
      if (starterCode && starterCode[language]) {
        setCode(starterCode[language]);
      } else {
        setCode(templates[language] || templates.python);
      }
    } catch (error) {
      setCode(templates[language] || templates.python);
    }
  };

  // ============================================
  // ✅ LOAD STATE ON MOUNT
  // ============================================
  useEffect(() => {
    if (problemId && !hasLoaded) {
      loadSampleTestCases();

      const savedState = loadEditorState(problemId);

      if (savedState) {
        setLanguage(savedState.language || "python");
        setCode(savedState.code || "");
        setIsAccepted(savedState.isAccepted || false);
        // console.log(`📂 Restored previous state for ${problemId}`);
      } else {
        loadStarterCode();
      }

      setHasLoaded(true);
    }
  }, [problemId]);

  // ============================================
  // ✅ AUTO-SAVE ON CODE CHANGE (Debounced)
  // ============================================
  useEffect(() => {
    if (problemId && hasLoaded) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveEditorState(problemId, language, code, isAccepted);
      }, 500);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [code, language, problemId, isAccepted, hasLoaded]);

  // ============================================
  // ✅ SAVE ON LANGUAGE CHANGE
  // ============================================
  useEffect(() => {
    if (problemId && hasLoaded) {
      saveEditorState(problemId, language, code, isAccepted);
    }
  }, [language]);

  // Scroll to bottom when output changes
  useEffect(() => {
    if (outputRef.current && isOutputExpanded) {
      setTimeout(() => {
        outputRef.current.scrollTop = outputRef.current.scrollHeight;
      }, 100);
    }
  }, [output, isOutputExpanded]);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
    setTimeout(() => {
      formatCode();
    }, 100);
  };

  const formatCode = () => {
    if (editorRef.current) {
      try {
        editorRef.current.getAction("editor.action.formatDocument").run();
      } catch (e) {
        console.log("Format not available");
      }
    }
  };

  // ✅ RUN SAMPLES
  const handleRunSamples = async () => {
    if (!code.trim()) {
      setOutput("⚠️ Please write some code first");
      toast.error("Please write some code first");
      return;
    }

    if (sampleTestCases.length === 0) {
      setOutput("⚠️ No sample test cases available");
      toast.error("No sample test cases available");
      return;
    }

    formatCode();
    setLoading(true);
    setLoadingType("run");
    // setOutput("⏳ Running sample tests...");
    setTestResults([]);
    setStatus(null);
    setScore(null);
    setErrorDetails(null);
    setIsSaved(false);
    setPassedCount(0);
    setTotalCount(0);
    setHiddenResults(null);

    try {
      const response = await runSamples({
        problemId,
        code,
        language,
      });

      const data = response.data;

      if (data.success) {
        setTestResults(data.testResults || []);
        setStatus(data.status);
        setScore(data.score || 0);
        setIsSaved(data.isSaved || false);
        setPassedCount(data.passedTests || 0);
        setTotalCount(data.totalTests || 0);

        let outputText = `🧪 Sample Test Results (${data.passedTests}/${data.totalTests} passed)\n\n`;

        if (data.testResults && data.testResults.length > 0) {
          data.testResults.forEach((tc, idx) => {
            const icon = tc.passed ? "✅" : "❌";
            outputText += `${icon} Test Case ${idx + 1}: ${tc.passed ? "PASSED" : "FAILED"}\n`;
            if (tc.expected) outputText += `   Expected: ${tc.expected}\n`;
            if (tc.output) outputText += `   Output: ${tc.output}\n`;
            if (tc.error) outputText += `   Error: ${tc.error}\n\n`;
          });
        }

        const allPassed = data.testResults?.every((tc) => tc.passed);
        outputText += `\n📊 Summary: ${data.passedTests}/${data.totalTests} passed\n`;
        outputText += allPassed
          ? "✅ All sample tests passed! Click 'Submit' for full evaluation."
          : "❌ Some sample tests failed. Check your code.";

        setOutput(outputText);
        toast.success(
          `Sample tests: ${data.passedTests}/${data.totalTests} passed`,
        );
      } else {
        setOutput(`❌ Error: ${data.error || "Failed to run samples"}`);
        toast.error(data.error || "Failed to run samples");
      }
    } catch (error) {
      const errorMsg = error.message || "Failed to run samples";
      setOutput(`❌ Error: ${errorMsg}`);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  // ✅ SUBMIT
  const handleSubmit = async () => {
    if (!code.trim()) {
      setOutput("⚠️ Please write some code first");
      toast.error("Please write some code first");
      return;
    }

    formatCode();
    setLoading(true);
    setLoadingType("submit");
    setOutput("⏳ Submitting code...");
    setTestResults([]);
    setStatus(null);
    setScore(null);
    setErrorDetails(null);
    setIsSaved(false);
    setPassedCount(0);
    setTotalCount(0);
    setHiddenResults(null);

    try {
      const response = await submitCodingSolution({
        problemId,
        code,
        language,
        testId: testId,
      });

      const data = response.data;

      if (data.success) {
        setTestResults(data.testResults || []);
        setStatus(data.status);
        setScore(data.score || 0);
        setIsSaved(data.isSaved || false);
        setPassedCount(data.passedTests || 0);
        setTotalCount(data.totalTests || 0);

        const hiddenResultsData =
          data.testResults?.filter((tc) => tc.isHidden) || [];
        setHiddenResults({
          total: hiddenResultsData.length,
          passed: hiddenResultsData.filter((tc) => tc.passed).length,
        });

        if (onSubmissionComplete) {
          onSubmissionComplete(data.status, data.score);
        }

        if (data.status === "Accepted") {
          setIsAccepted(true);
          saveEditorState(problemId, language, code, true);
        }

        let outputText = `📊 Results: ${data.status.toUpperCase()}\n`;
        outputText += `Score: ${(data.score || 0).toFixed(2)}%\n`;
        outputText += `Passed: ${data.passedTests}/${data.totalTests} test cases\n`;
        outputText += `Execution Time: ${(data.executionTime || 0).toFixed(3)}s\n\n`;

        const sampleResults =
          data.testResults?.filter((tc) => !tc.isHidden) || [];
        const hiddenCount =
          (data.testResults?.length || 0) - sampleResults.length;

        if (sampleResults.length > 0) {
          outputText += `--- Sample Test Cases ---\n`;
          sampleResults.forEach((tc, idx) => {
            const icon = tc.passed ? "✅" : "❌";
            outputText += `\n${icon} Test Case ${idx + 1}: ${tc.passed ? "PASSED" : "FAILED"}\n`;
            if (tc.expected) outputText += `   Expected: ${tc.expected}\n`;
            if (tc.output) outputText += `   Output: ${tc.output}\n`;
            if (tc.error) outputText += `   Error: ${tc.error}\n`;
          });
          outputText += `\n`;
        }

        if (hiddenCount > 0) {
          const hiddenPassed =
            data.testResults?.filter((tc) => tc.isHidden && tc.passed).length ||
            0;
          outputText += `🔒 ${hiddenCount} Hidden Test Cases: ${hiddenPassed}/${hiddenCount} passed\n\n`;
        }

        if (data.status === "Accepted") {
          outputText += `✅ All test cases passed! Solution saved. 💾`;
          toast.success("✅ All test cases passed! Solution saved.");
        } else if (data.errorMessage) {
          outputText += `❌ Error: ${data.errorMessage}`;
          toast.error("❌ " + data.errorMessage);
        } else {
          outputText += `❌ ${data.passedTests}/${data.totalTests} test cases passed. Try again.`;
          toast.error(
            `❌ ${data.passedTests}/${data.totalTests} test cases passed`,
          );
        }

        setOutput(outputText);
      } else {
        const errorMsg = data.error || "Submission failed";
        setOutput(`❌ Error: ${errorMsg}`);
        setErrorDetails(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("Submit error:", error);
      const errorMsg =
        error.response?.data?.error || error.message || "Failed to submit";
      setOutput(`❌ Error: ${errorMsg}`);
      setErrorDetails(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  const getStatusColor = () => {
    if (!status) return "text-gray-400";
    if (status === "Accepted" || status === "accepted") return "text-green-400";
    if (status === "Wrong Answer" || status === "wrong_answer")
      return "text-red-400";
    if (status === "Runtime Error" || status === "runtime_error")
      return "text-yellow-400";
    if (status === "Compilation Error" || status === "compilation_error")
      return "text-orange-400";
    if (status === "Time Limit Exceeded" || status === "time_limit_exceeded")
      return "text-purple-400";
    return "text-gray-400";
  };

  const getStatusDisplay = () => {
    if (!status) return "⏳ Pending";
    if (status === "Accepted" || status === "accepted") return "✅ Accepted";
    if (status === "Wrong Answer" || status === "wrong_answer")
      return "❌ Wrong Answer";
    if (status === "Runtime Error" || status === "runtime_error")
      return "⚠️ Runtime Error";
    if (status === "Compilation Error" || status === "compilation_error")
      return "⚠️ Compilation Error";
    if (status === "Time Limit Exceeded" || status === "time_limit_exceeded")
      return "⏰ Time Limit Exceeded";
    return "⏳ Pending";
  };

  // ✅ Loader Component
  const Loader = ({ type }) => (
    <div className="flex items-center justify-center gap-2 text-gray-400">
      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-sm">
        {type === "run" ? "Running sample tests..." : "Submitting code..."}
      </span>
    </div>
  );

  if (!problemId) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <p>No problem selected</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={language}
            onChange={(e) => {
              const newLang = e.target.value;
              setLanguage(newLang);
              const savedState = loadEditorState(problemId);
              if (savedState && savedState.language === newLang) {
                setCode(savedState.code || "");
                setIsAccepted(savedState.isAccepted || false);
              } else {
                const response = getSampleTestCases(problemId);
                response
                  .then((res) => {
                    const starterCode = res.data.starterCode || {};
                    if (starterCode[newLang]) {
                      setCode(starterCode[newLang]);
                    } else {
                      setCode(templates[newLang] || templates.python);
                    }
                  })
                  .catch(() => {
                    setCode(templates[newLang] || templates.python);
                  });
              }
            }}
            className="bg-gray-700 text-white px-3 py-1.5 rounded border border-gray-600 focus:outline-none focus:border-blue-500 text-sm"
          >
            <option value="python">🐍 Python 3</option>
            <option value="cpp">⚙️ C++ 17</option>
            <option value="java">☕ Java 17</option>
            <option value="c">🔧 C 11</option>
            <option value="javascript">🟨 JavaScript</option>
          </select>

          {status && (
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusDisplay()}
            </span>
          )}

          {score !== null && status && (
            <span className="text-sm text-gray-400">
              Score: {score.toFixed(2)}%
            </span>
          )}

          {isSaved && <span className="text-xs text-green-400">💾 Saved</span>}

          {isAccepted && (
            <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded">
              ✅ Solved
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setIsAccepted(false);
              clearEditorState(problemId);
              loadStarterCode();
              toast.info("Reset to starter code");
            }}
            className="px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-500 text-sm transition"
            title="Reset Code"
          >
            🔄 Reset
          </button>
          <button
            onClick={handleRunSamples}
            disabled={loading || sampleTestCases.length === 0}
            className={`px-4 py-1.5 rounded text-sm transition flex items-center gap-2 ${
              loading && loadingType === "run"
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : loading || sampleTestCases.length === 0
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-500"
            }`}
          >
            {loading && loadingType === "run" ? (
              <>
                <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                Running...
              </>
            ) : (
              "🧪 Run"
            )}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`px-4 py-1.5 rounded text-white text-sm transition flex items-center gap-2 ${
              loading && loadingType === "submit"
                ? "bg-gray-600 cursor-not-allowed"
                : loading
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-500"
            }`}
          >
            {loading && loadingType === "submit" ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Submitting...
              </>
            ) : (
              "🚀 Submit"
            )}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 relative min-h-0">
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={(value) => setCode(value || "")}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: true, scale: 0.8 },
            fontSize: 14,
            lineNumbers: "on",
            automaticLayout: true,
            scrollBeyondLastLine: false,
            tabSize: 4,
            wordWrap: "on",
            formatOnPaste: true,
            formatOnType: true,
            bracketPairColorization: { enabled: true },
            renderWhitespace: "selection",
            cursorBlinking: "smooth",
            smoothScrolling: true,
            cursorSmoothCaretAnimation: "on",
            fontFamily:
              "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            fontLigatures: true,
            renderLineHighlight: "all",
            lineHeight: 1.6,
            padding: { top: 8, bottom: 8 },
            suggest: {
              showKeywords: true,
              showSnippets: true,
              showFunctions: true,
              showConstructors: true,
              showDeprecated: true,
            },
            quickSuggestions: true,
            parameterHints: { enabled: true },
            autoClosingBrackets: "always",
            autoClosingQuotes: "always",
            autoIndent: "full",
            folding: true,
            foldingStrategy: "indentation",
            codeLens: true,
          }}
        />
      </div>

      {/* Output Panel */}
      <div
        ref={containerRef}
        className={`bg-gray-900 border-t border-gray-700 transition-all duration-300 overflow-hidden flex-shrink-0 ${
          isOutputExpanded ? "h-48" : "h-10"
        }`}
        style={{ minHeight: isOutputExpanded ? "48px" : "40px" }}
      >
        <div
          className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 cursor-pointer hover:bg-gray-750 h-10 flex-shrink-0"
          onClick={() => setIsOutputExpanded(!isOutputExpanded)}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="text-gray-400 font-medium text-sm whitespace-nowrap">
              📤 Output
            </span>
            {loading && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-blue-400 text-xs">
                  {loadingType === "run" ? "Running..." : "Submitting..."}
                </span>
              </div>
            )}
            {!loading && testResults.length > 0 && (
              <div className="flex gap-2 text-sm">
                <span className="text-green-400 whitespace-nowrap">
                  ✅ {testResults.filter((t) => t.passed).length}
                </span>
                <span className="text-red-400 whitespace-nowrap">
                  ❌ {testResults.filter((t) => !t.passed).length}
                </span>
                <span className="text-gray-500 whitespace-nowrap">
                  ({passedCount}/{totalCount})
                </span>
              </div>
            )}
            {errorDetails && (
              <span className="text-red-400 text-xs whitespace-nowrap">
                ⚠️ Error
              </span>
            )}
            {isSaved && (
              <span className="text-green-400 text-xs whitespace-nowrap">
                💾 Saved
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-gray-500 text-xs">
              {isOutputExpanded ? "▼ Click to collapse" : "▶ Click to expand"}
            </span>
          </div>
        </div>

        {isOutputExpanded && (
          <div
            ref={outputRef}
            className="h-[calc(100%-40px)] overflow-auto p-4"
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">
                  {loadingType === "run"
                    ? "Running sample tests"
                    : "Submitting code for evaluation..."}
                </span>
                <span className="text-xs text-gray-500">
                  This may take a few seconds
                </span>
              </div>
            ) : (
              <pre
                className={`text-sm font-mono whitespace-pre-wrap break-words ${
                  errorDetails ? "text-red-400" : "text-gray-300"
                }`}
              >
                {output ||
                  '💡 Write code and click "Run" to test, or "Submit" for full evaluation'}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeEditor;
