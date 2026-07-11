// frontend/src/components/CodeEditor.jsx
import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import {
  GripHorizontal,
  Play,
  Send,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  Terminal,
  Maximize2,
  Minimize2,
  Code2,
  Sparkles,
} from "lucide-react";
import {
  submitCodingSolution,
  runSamples,
  getSampleTestCases,
} from "../services/api";
import toast from "react-hot-toast";

const CodeEditor = ({
  problemId,
  onSubmissionComplete,
  testId,
  onRefreshTestAttempt,
}) => {
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
  const [outputHeight, setOutputHeight] = useState(200);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingType, setLoadingType] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHoveringRun, setIsHoveringRun] = useState(false);
  const [isHoveringSubmit, setIsHoveringSubmit] = useState(false);
  const [isHoveringReset, setIsHoveringReset] = useState(false);

  const outputRef = useRef(null);
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  // Language templates with better formatting
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
    } catch (error) {
      console.error("Error saving editor state:", error);
    }
  };

  const loadEditorState = (problemId) => {
    try {
      const saved = localStorage.getItem(`editor_${problemId}`);
      if (saved) {
        const data = JSON.parse(saved);
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
    } catch (error) {
      console.error("Error clearing editor state:", error);
    }
  };

  // Load sample test cases
  const loadSampleTestCases = async () => {
    try {
      const response = await getSampleTestCases(problemId);
      const testCases = response.data.testCases || [];
      setSampleTestCases(testCases);
    } catch (error) {
      console.error("Error loading test cases:", error);
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

  // ============================================
  // ✅ DRAG TO RESIZE OUTPUT PANEL
  // ============================================
  const handleDragStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartY.current = e.clientY || e.touches?.[0]?.clientY || 0;
    dragStartHeight.current = outputHeight;
    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);
    document.addEventListener("touchmove", handleDragMove, { passive: false });
    document.addEventListener("touchend", handleDragEnd);
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
  };

  const handleDragMove = (e) => {
    e.preventDefault();
    const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
    const deltaY = dragStartY.current - clientY;
    const newHeight = Math.min(
      Math.max(dragStartHeight.current + deltaY, 100),
      500,
    );
    setOutputHeight(newHeight);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragEnd);
    document.removeEventListener("touchmove", handleDragMove);
    document.removeEventListener("touchend", handleDragEnd);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

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

        if (onRefreshTestAttempt) {
          await onRefreshTestAttempt();
          console.log("✅ CodeEditor - Refreshed test attempt data");
        }
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

  const getStatusIcon = () => {
    if (!status) return <Clock className="w-4 h-4 text-gray-400" />;
    if (status === "Accepted" || status === "accepted")
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (status === "Wrong Answer" || status === "wrong_answer")
      return <XCircle className="w-4 h-4 text-red-400" />;
    if (status === "Runtime Error" || status === "runtime_error")
      return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    if (status === "Compilation Error" || status === "compilation_error")
      return <AlertCircle className="w-4 h-4 text-orange-400" />;
    if (status === "Time Limit Exceeded" || status === "time_limit_exceeded")
      return <Clock className="w-4 h-4 text-purple-400" />;
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

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
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gradient-to-r from-gray-800 to-gray-850 border-b border-gray-700 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          {/* Language Selector */}
          <div className="relative">
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
              className="bg-gray-700 text-white px-3 py-1.5 pr-8 rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm appearance-none cursor-pointer hover:bg-gray-600 transition-colors"
            >
              <option value="python">🐍 Python 3</option>
              <option value="cpp">⚙️ C++ 17</option>
              <option value="java">☕ Java 17</option>
              <option value="c">🔧 C 11</option>
              <option value="javascript">🟨 JavaScript</option>
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </div>
          </div>

          {/* Status Badge */}
          {status && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${getStatusColor()} bg-gray-700/30 border border-gray-600/30`}
            >
              {getStatusIcon()}
              <span>{getStatusDisplay()}</span>
            </div>
          )}

          {/* Score */}
          {score !== null && status && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm font-medium">
              <Sparkles className="w-3 h-3" />
              <span>{score.toFixed(2)}%</span>
            </div>
          )}

          {/* Saved Status */}
          {isSaved && (
            <div className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
              <CheckCircle className="w-3 h-3" />
              <span>Saved</span>
            </div>
          )}

          {/* Solved Status */}
          {isAccepted && (
            <div className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 animate-pulse">
              <CheckCircle className="w-3 h-3" />
              <span>Solved ✅</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Reset Button */}
          <button
            onClick={() => {
              setIsAccepted(false);
              clearEditorState(problemId);
              loadStarterCode();
              toast.info("Reset to starter code");
            }}
            onMouseEnter={() => setIsHoveringReset(true)}
            onMouseLeave={() => setIsHoveringReset(false)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-1.5 ${
              isHoveringReset
                ? "bg-red-500/20 text-red-400 border border-red-500/30 scale-105"
                : "bg-gray-700/50 text-gray-300 border border-gray-600/50 hover:bg-gray-700"
            }`}
            title="Reset Code"
          >
            <RotateCcw
              className={`w-3.5 h-3.5 transition-transform duration-300 ${isHoveringReset ? "rotate-180" : ""}`}
            />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Run Button */}
          <button
            onClick={handleRunSamples}
            disabled={loading || sampleTestCases.length === 0}
            onMouseEnter={() => setIsHoveringRun(true)}
            onMouseLeave={() => setIsHoveringRun(false)}
            className={`px-4 py-1.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 ${
              loading && loadingType === "run"
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : loading || sampleTestCases.length === 0
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : `bg-blue-600 text-white hover:bg-blue-500 ${
                      isHoveringRun
                        ? "scale-105 shadow-lg shadow-blue-500/25"
                        : ""
                    }`
            }`}
          >
            {loading && loadingType === "run" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Run</span>
                <span className="sm:hidden">▶</span>
              </>
            )}
          </button>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            onMouseEnter={() => setIsHoveringSubmit(true)}
            onMouseLeave={() => setIsHoveringSubmit(false)}
            className={`px-4 py-1.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 ${
              loading && loadingType === "submit"
                ? "bg-gray-600 cursor-not-allowed"
                : loading
                  ? "bg-gray-600 cursor-not-allowed"
                  : `bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-500 hover:to-green-500 ${
                      isHoveringSubmit
                        ? "scale-105 shadow-lg shadow-emerald-500/30"
                        : ""
                    }`
            }`}
          >
            {loading && loadingType === "submit" ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Submitting...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Submit</span>
                <span className="sm:hidden">🚀</span>
              </>
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
          isOutputExpanded ? "" : "h-10"
        }`}
        style={{
          minHeight: isOutputExpanded ? "48px" : "40px",
          height: isOutputExpanded ? `${outputHeight}px` : "40px",
        }}
      >
        {/* Drag Handle - Only show when expanded */}
        {isOutputExpanded && (
          <div
            className="flex items-center justify-center py-0.5 bg-gradient-to-r from-gray-800 to-gray-850 hover:from-gray-700 hover:to-gray-750 cursor-ns-resize transition-all duration-150 group relative select-none"
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          >
            <div className="flex items-center gap-2 px-4 py-0.5">
              <GripHorizontal className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors" />
              <span className="text-[8px] text-gray-500 group-hover:text-gray-300 transition-colors uppercase tracking-wider font-medium">
                Drag to resize
              </span>
            </div>
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-gray-500 to-transparent opacity-0 group-hover:opacity-50 transition-opacity"></div>
          </div>
        )}

        {/* Output Header */}
        <div
          className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-850 border-b border-gray-700 cursor-pointer hover:from-gray-750 hover:to-gray-800 transition-all duration-200 h-10 flex-shrink-0 group"
          onClick={() => setIsOutputExpanded(!isOutputExpanded)}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-300 font-medium text-sm whitespace-nowrap">
                Output
              </span>
            </div>
            {loading && (
              <div className="flex items-center gap-2">
                <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                <span className="text-blue-400 text-xs">
                  {loadingType === "run" ? "Running..." : "Submitting..."}
                </span>
              </div>
            )}
            {!loading && testResults.length > 0 && (
              <div className="flex gap-2 text-sm">
                <span className="text-green-400 whitespace-nowrap flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {testResults.filter((t) => t.passed).length}
                </span>
                <span className="text-red-400 whitespace-nowrap flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  {testResults.filter((t) => !t.passed).length}
                </span>
                <span className="text-gray-500 whitespace-nowrap">
                  ({passedCount}/{totalCount})
                </span>
              </div>
            )}
            {errorDetails && (
              <span className="text-red-400 text-xs whitespace-nowrap flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Error
              </span>
            )}
            {isSaved && (
              <span className="text-green-400 text-xs whitespace-nowrap flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Saved
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-gray-500 text-xs group-hover:text-gray-400 transition-colors">
              {isOutputExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronUp className="w-3 h-3" />
              )}
            </span>
          </div>
        </div>

        {/* Output Content */}
        {isOutputExpanded && (
          <div
            ref={outputRef}
            className="overflow-auto p-4 font-mono text-sm"
            style={{ height: `calc(100% - 40px - 24px)` }}
          >
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                <div className="relative">
                  <div className="w-10 h-10 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <span className="text-sm font-medium">
                  {loadingType === "run"
                    ? "Running sample tests..."
                    : "Submitting code for evaluation..."}
                </span>
                <span className="text-xs text-gray-500">
                  This may take a few seconds
                </span>
              </div>
            ) : (
              <pre
                className={`whitespace-pre-wrap break-words ${
                  errorDetails ? "text-red-400" : "text-gray-300"
                } leading-relaxed`}
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
