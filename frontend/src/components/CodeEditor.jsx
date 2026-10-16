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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  submitCodingSolution,
  runSamples,
  getSampleTestCases,
} from "../services/api";
import toast from "react-hot-toast";

// ✅ Utility: Get user ID
const getUserId = () => localStorage.getItem("userId") || "anonymous";
const getCurrentTestId = () =>
  localStorage.getItem("currentTestId") || "default";

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
  const [outputHeight, setOutputHeight] = useState(350);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingType, setLoadingType] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHoveringRun, setIsHoveringRun] = useState(false);
  const [isHoveringSubmit, setIsHoveringSubmit] = useState(false);
  const [isHoveringReset, setIsHoveringReset] = useState(false);
  const [isHoveringDrag, setIsHoveringDrag] = useState(false);

  // ✅ New states for LeetCode-style UI
  const [selectedTestCase, setSelectedTestCase] = useState(0);
  const [testCaseDetails, setTestCaseDetails] = useState([]);

  const outputRef = useRef(null);
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  // Language templates
  const templates = {
    python: `def solve():\n    # Write your solution here\n    pass\n\nif __name__ == "__main__":\n    solve()`,
    cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}`,
    java: `class Solution\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}`,
    c: `#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}`,
    javascript: `function solve() {\n    // Write your solution here\n}\n\nsolve();`,
  };

  // ============================================
  // ✅ USER + TEST SPECIFIC PERSISTENCE
  // ============================================

  const saveEditorState = (problemId, language, code, isAccepted = false) => {
    try {
      const userId = getUserId();
      const testId = getCurrentTestId();

      const state = {
        language,
        code,
        isAccepted,
        timestamp: new Date().toISOString(),
        userId: userId,
        testId: testId,
      };

      const key = `user_${userId}_editor_${testId}_${problemId}`;
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error("Error saving editor state:", error);
    }
  };

  const loadEditorState = (problemId) => {
    try {
      const userId = getUserId();
      const testId = getCurrentTestId();

      const key = `user_${userId}_editor_${testId}_${problemId}`;
      let saved = localStorage.getItem(key);

      if (!saved) {
        const oldKey = `editor_${testId}_${problemId}`;
        saved = localStorage.getItem(oldKey);
        if (saved) {
          localStorage.setItem(key, saved);
          localStorage.removeItem(oldKey);
        }
      }

      if (saved) {
        const data = JSON.parse(saved);
        if (data.userId && data.userId !== userId) {
          return null;
        }
        if (data.testId && data.testId !== testId) {
          return null;
        }
        return data;
      }
    } catch (error) {
      console.error("Error loading editor state:", error);
    }
    return null;
  };

  const clearEditorState = (problemId) => {
    try {
      const userId = getUserId();
      const testId = getCurrentTestId();
      const key = `user_${userId}_editor_${testId}_${problemId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error("Error clearing editor state:", error);
    }
  };

  const markProblemSolved = (problemId) => {
    const userId = getUserId();
    const currentTestId = localStorage.getItem("currentTestId");

    if (currentTestId) {
      const key = `user_${userId}_solvedProblems_${currentTestId}`;
      const testSolved = JSON.parse(localStorage.getItem(key) || "[]");
      if (!testSolved.includes(problemId)) {
        testSolved.push(problemId);
        localStorage.setItem(key, JSON.stringify(testSolved));
      }
    }
  };

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

      // Load saved output height
      const savedHeight = localStorage.getItem("outputHeight");
      if (savedHeight) {
        setOutputHeight(parseInt(savedHeight));
      }

      setHasLoaded(true);
    }
  }, [problemId]);

  // ============================================
  // ✅ AUTO-SAVE ON CODE CHANGE
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

  useEffect(() => {
    if (problemId && hasLoaded) {
      saveEditorState(problemId, language, code, isAccepted);
    }
  }, [language]);

  useEffect(() => {
    if (outputRef.current && isOutputExpanded) {
      setTimeout(() => {
        outputRef.current.scrollTop = outputRef.current.scrollHeight;
      }, 100);
    }
  }, [output, isOutputExpanded]);

  // ============================================
  // ✅ PROFESSIONAL DRAG TO RESIZE OUTPUT PANEL
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

    containerRef.current?.classList.add("dragging");
  };

  const handleDragMove = (e) => {
    e.preventDefault();
    const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
    const deltaY = dragStartY.current - clientY;
    const newHeight = Math.min(
      Math.max(dragStartHeight.current + deltaY, 200),
      700,
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

    containerRef.current?.classList.remove("dragging");
    localStorage.setItem("outputHeight", outputHeight.toString());
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

  // ✅ Update test case details when results change
  // Only non-hidden (example) test cases become tabs
  useEffect(() => {
    if (testResults.length > 0) {
      const details = testResults
        .filter((tc) => !tc.isHidden)
        .map((tc) => ({
          input: tc.input || "(empty)",
          output: tc.output || "(no output)",
          expected: tc.expected || "",
          passed: tc.passed,
          error: tc.error || "",
          status: tc.status || "",
        }));
      setTestCaseDetails(details);
      setSelectedTestCase(0);
    } else {
      setTestCaseDetails([]);
    }
  }, [testResults]);

  // ✅ RUN SAMPLES — only example test cases
  const handleRunSamples = async () => {
    if (!code.trim()) {
      setOutput("⚠️ Please write some code first");
      toast.error("Please write some code first");
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
    setTestCaseDetails([]);
    setSelectedTestCase(0);

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
      const errorMsg =
        error.response?.data?.error || error.message || "Failed to run samples";
      setOutput(`❌ Error: ${errorMsg}`);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  // ✅ SUBMIT — examples (visible) + hidden (count only)
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
    setTestCaseDetails([]);
    setSelectedTestCase(0);

    try {
      const response = await submitCodingSolution({
        problemId,
        code,
        language,
        testId: testId,
      });

      const data = response.data;

      if (data.success) {
        // Backend sends exampleResults (with input/output/expected)
        // plus hiddenSummary (counts only)
        const exampleResults = data.exampleResults || data.testResults || [];
        const hiddenSummary = data.hiddenSummary || {
          passed: data.hiddenPassed || 0,
          total: data.hiddenCount || 0,
        };

        setTestResults(exampleResults);
        setStatus(data.status);
        setScore(data.score || 0);
        setIsSaved(data.isSaved || false);
        setPassedCount(data.passedTests || 0);
        setTotalCount(data.totalTests || 0);
        setHiddenResults(hiddenSummary);

        if (onRefreshTestAttempt) {
          await onRefreshTestAttempt();
        }
        if (onSubmissionComplete) {
          onSubmissionComplete(data.status, data.score);
        }

        if (data.status === "Accepted") {
          setIsAccepted(true);
          saveEditorState(problemId, language, code, true);
          markProblemSolved(problemId);

          if (onRefreshTestAttempt) {
            await onRefreshTestAttempt();
          }
        }

        // Build formatted output for summary
        let outputText = `📊 Results: ${data.status.toUpperCase()}\n`;
        outputText += `Score: ${(data.score || 0).toFixed(2)}%\n`;
        outputText += `Passed: ${data.passedTests}/${data.totalTests} test cases\n`;
        outputText += `Execution Time: ${(data.executionTime || 0).toFixed(3)}s\n\n`;

        if (exampleResults.length > 0) {
          outputText += `--- Sample Test Cases ---\n`;
          exampleResults.forEach((tc, idx) => {
            const icon = tc.passed ? "✅" : "❌";
            outputText += `${icon} Test Case ${idx + 1}: ${tc.passed ? "PASSED" : "FAILED"}\n`;
          });
          outputText += `\n`;
        }

        if (hiddenSummary.total > 0) {
          outputText += `🔒 ${hiddenSummary.passed}/${hiddenSummary.total} hidden test cases passed\n\n`;
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

  // ✅ Render test case tabs — one per example
  const renderTestCaseTabs = () => {
    if (testCaseDetails.length === 0) return null;

    return (
      <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-800/80 border-b border-gray-700 overflow-x-auto hide-scrollbar">
        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mr-2 flex-shrink-0">
          Testcases
        </span>
        {testCaseDetails.map((tc, idx) => {
          const isActive = selectedTestCase === idx;
          const isPassed = tc.passed;

          return (
            <button
              key={idx}
              onClick={() => setSelectedTestCase(idx)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 flex-shrink-0 ${
                isActive
                  ? "bg-gray-700 text-white border border-gray-600"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
              }`}
            >
              <span>Case {idx + 1}</span>
              {isPassed !== undefined && (
                <span className={isPassed ? "text-green-400" : "text-red-400"}>
                  {isPassed ? "✅" : "❌"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  // ✅ Render test case details
  // ✅ Render test case details
  const renderTestCaseDetails = () => {
    if (testCaseDetails.length === 0) {
      // When loading, let the parent's loading block handle the UI
      if (loading) return null;

      return (
        <div className="hide-scrollbar flex flex-col items-center justify-center h-full text-gray-500">
          <Terminal className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">
            💡 Write code and click "Run" to test, or "Submit" for full
            evaluation
          </p>
        </div>
      );
    }

    const tc = testCaseDetails[selectedTestCase];
    if (!tc) return null;

    return (
      <div className="p-3 space-y-2.5 overflow-y-auto h-full hide-scrollbar">
        {/* Input */}
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              📥 Input:
            </span>
          </div>
          <div className="bg-gray-800/80 rounded-md p-2.5 border border-gray-700">
            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
              {tc.input}
            </pre>
          </div>
        </div>

        {/* Output */}
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              📤 Output:
            </span>
          </div>
          <div className="bg-gray-800/80 rounded-md p-2.5 border border-gray-700">
            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
              {tc.output}
            </pre>
          </div>
        </div>

        {/* Expected */}
        {tc.expected && (
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                🎯 Expected:
              </span>
            </div>
            <div className="bg-gray-800/80 rounded-md p-2.5 border border-gray-700">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                {tc.expected}
              </pre>
            </div>
          </div>
        )}

        {/* Error */}
        {tc.error && (
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">
                ⚠️ Error:
              </span>
            </div>
            <div className="bg-red-900/20 rounded-md p-2.5 border border-red-800/50">
              <pre className="text-xs text-red-400 whitespace-pre-wrap font-mono">
                {tc.error}
              </pre>
            </div>
          </div>
        )}

        {/* Status Badge */}
        <div className="pt-1">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              tc.passed
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-red-500/20 text-red-400 border border-red-500/30"
            }`}
          >
            {tc.passed ? "✅ Passed" : "❌ Failed"}
          </span>
        </div>
      </div>
    );
  };

  if (!problemId) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <p>No problem selected</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col bg-gray-900 overflow-hidden"
      style={{ height: "100%", minHeight: 0 }}
    >
      {/* ============================================
        TOOLBAR (fixed height)
    ============================================ */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gradient-to-r from-gray-800 to-gray-850 border-b border-gray-700 flex-shrink-0">
        {/* Left Section */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-shrink-0">
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

          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {status && (
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor()} bg-gray-700/30 border border-gray-600/30 whitespace-nowrap`}
              >
                {getStatusIcon()}
                <span>{getStatusDisplay()}</span>
              </div>
            )}

            {score !== null && status && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium whitespace-nowrap">
                <Sparkles className="w-3 h-3" />
                <span>{score.toFixed(0)}%</span>
              </div>
            )}

            {isSaved && (
              <div className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 whitespace-nowrap">
                <CheckCircle className="w-3 h-3" />
                <span className="hidden sm:inline">Saved</span>
              </div>
            )}

            {isAccepted && (
              <div className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 animate-pulse whitespace-nowrap">
                <CheckCircle className="w-3 h-3" />
                <span className="hidden sm:inline">Solved ✅</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0 ml-auto pr-2">
          <button
            onClick={() => {
              setIsAccepted(false);
              clearEditorState(problemId);
              loadStarterCode();
              toast.info("Reset to starter code");
            }}
            onMouseEnter={() => setIsHoveringReset(true)}
            onMouseLeave={() => setIsHoveringReset(false)}
            className={`px-2.5 py-1.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-1.5 ${
              isHoveringReset
                ? "bg-red-500/20 text-red-400 border border-red-500/30 scale-105"
                : "bg-gray-700/50 text-gray-300 border border-gray-600/50 hover:bg-gray-700"
            }`}
            title="Reset Code"
          >
            <RotateCcw
              className={`w-4 h-4 transition-transform duration-300 ${isHoveringReset ? "rotate-180" : ""}`}
            />
            <span>Reset</span>
          </button>

          <button
            onClick={handleRunSamples}
            disabled={loading}
            onMouseEnter={() => setIsHoveringRun(true)}
            onMouseLeave={() => setIsHoveringRun(false)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              loading && loadingType === "run"
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : loading
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
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run</span>
              </>
            )}
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            onMouseEnter={() => setIsHoveringSubmit(true)}
            onMouseLeave={() => setIsHoveringSubmit(false)}
            className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 mr-1 ${
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
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ============================================
        EDITOR (flex-grow)
    ============================================ */}
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

      {/* ============================================
        OUTPUT PANEL (fixed at bottom, resizable)
    ============================================ */}
      <div
        className="hide-scrollbar flex-shrink-0 border-t border-gray-700 bg-gray-900 flex flex-col"
        style={{
          height: isOutputExpanded ? `${outputHeight}px` : "44px",
          minHeight: isOutputExpanded ? "150px" : "44px",
          maxHeight: isOutputExpanded ? "70vh" : "44px",
        }}
      >
        {/* Drag Handle — only visible when expanded */}
        {isOutputExpanded && (
          <div
            className={`h-1.5 cursor-ns-resize flex-shrink-0 transition-colors ${
              isDragging ? "bg-blue-500" : "bg-gray-700 hover:bg-gray-600"
            }`}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            title="Drag to resize"
          />
        )}

        {/* Header — always visible */}
        <div
          className="flex items-center justify-between px-4 h-11 bg-gray-800 border-b border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors flex-shrink-0 select-none"
          onClick={() => setIsOutputExpanded(!isOutputExpanded)}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-300 font-medium text-sm whitespace-nowrap">
                Output
              </span>
              {!isOutputExpanded && (
                <span className="text-[10px] text-blue-400 ml-1 animate-pulse font-medium">
                  ▼ Click to expand
                </span>
              )}
            </div>

            {/* {loading && (
              <div className="flex items-center gap-2">
                <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                <span className="text-blue-400 text-xs">
                  {loadingType === "run" ? "Running..." : "Submitting..."}
                </span>
              </div>
            )} */}

            {!loading && testResults.length > 0 && (
              <div className="flex gap-3 text-sm items-center">
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
                {hiddenResults && hiddenResults.total > 0 && (
                  <span className="text-yellow-400 whitespace-nowrap text-xs flex items-center gap-1">
                    🔒 {hiddenResults.passed}/{hiddenResults.total} hidden
                  </span>
                )}
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

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOutputExpanded(!isOutputExpanded);
            }}
            className="p-1 rounded-md hover:bg-gray-700/50 transition-colors text-gray-400 hover:text-white flex-shrink-0"
            title={isOutputExpanded ? "Collapse Output" : "Expand Output"}
          >
            {isOutputExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Content — only rendered when expanded */}
        {isOutputExpanded && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Test Case Tabs */}
            {renderTestCaseTabs()}

            {/* Test Case Details / Summary */}
            <div className="flex-1 overflow-y-auto min-h-0 hide-scrollbar">
              {renderTestCaseDetails()}

              {/* Fallback summary text */}
              {testCaseDetails.length === 0 && !loading && output && (
                <div className="p-4">
                  <pre
                    className={`whitespace-pre-wrap break-words ${
                      errorDetails ? "text-red-400" : "text-gray-300"
                    } leading-relaxed text-sm font-mono`}
                  >
                    {output}
                  </pre>
                </div>
              )}

              {/* Loading state */}
              {loading && testCaseDetails.length === 0 && (
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeEditor;
