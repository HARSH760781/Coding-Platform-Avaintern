// frontend/src/pages/ProblemDetail.jsx

import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getProblem } from "../services/api";
import CodeEditor from "../components/CodeEditor";
import toast from "react-hot-toast";
import { Maximize2, Minimize2, GripHorizontal } from "lucide-react";

// ✅ Utility: Get user ID
const getUserId = () => localStorage.getItem("userId") || "anonymous";

const ProblemDetail = () => {
  const { problemId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [submissionScore, setSubmissionScore] = useState(null);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);

  // ✅ Splitter state for problem/editor resize
  const [problemWidth, setProblemWidth] = useState(35); // Percentage
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [isHoveringSplit, setIsHoveringSplit] = useState(false);

  const containerRef = useRef(null);
  const splitterRef = useRef(null);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const getTestId = () => {
    const urlParams = new URLSearchParams(location.search);
    const urlTestId = urlParams.get("testId");
    if (urlTestId) return urlTestId;

    const storedTestId = localStorage.getItem("testId");
    if (
      storedTestId &&
      storedTestId !== "null" &&
      storedTestId !== "undefined"
    ) {
      return storedTestId;
    }

    const sessionTestId = sessionStorage.getItem("testId");
    if (
      sessionTestId &&
      sessionTestId !== "null" &&
      sessionTestId !== "undefined"
    ) {
      return sessionTestId;
    }

    if (location.state?.testId) {
      return location.state.testId;
    }

    return null;
  };

  const testId = getTestId();

  // ✅ Load saved split ratio
  useEffect(() => {
    const savedRatio = localStorage.getItem("problemDetailSplitRatio");
    if (savedRatio) {
      setProblemWidth(parseFloat(savedRatio));
    }
  }, []);

  // ✅ Splitter drag handlers
  const handleSplitterMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingSplit(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = problemWidth;

    document.addEventListener("mousemove", handleSplitterMouseMove);
    document.addEventListener("mouseup", handleSplitterMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const handleSplitterTouchStart = (e) => {
    e.preventDefault();
    setIsDraggingSplit(true);
    dragStartX.current = e.touches[0].clientX;
    dragStartWidth.current = problemWidth;

    document.addEventListener("touchmove", handleSplitterTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", handleSplitterTouchEnd);
    document.body.style.userSelect = "none";
  };

  const handleSplitterMouseMove = (e) => {
    if (!isDraggingSplit) return;

    // Get the container width
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const containerWidth = containerRect.width;
    // Calculate new width based on mouse position relative to container
    const relativeX = (e.clientX - containerRect.left) / containerWidth;
    const newWidth = Math.min(Math.max(relativeX * 100, 20), 80);

    setProblemWidth(newWidth);
    localStorage.setItem("problemDetailSplitRatio", newWidth.toString());
  };

  const handleSplitterTouchMove = (e) => {
    e.preventDefault();
    if (!isDraggingSplit) return;

    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const containerWidth = containerRect.width;
    const relativeX =
      (e.touches[0].clientX - containerRect.left) / containerWidth;
    const newWidth = Math.min(Math.max(relativeX * 100, 20), 80);

    setProblemWidth(newWidth);
    localStorage.setItem("problemDetailSplitRatio", newWidth.toString());
  };

  const handleSplitterMouseUp = () => {
    setIsDraggingSplit(false);
    document.removeEventListener("mousemove", handleSplitterMouseMove);
    document.removeEventListener("mouseup", handleSplitterMouseUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  const handleSplitterTouchEnd = () => {
    setIsDraggingSplit(false);
    document.removeEventListener("touchmove", handleSplitterTouchMove);
    document.removeEventListener("touchend", handleSplitterTouchEnd);
    document.body.style.userSelect = "";
  };

  useEffect(() => {
    fetchProblem();
    checkSolvedStatus();
  }, [problemId]);

  const fetchProblem = async () => {
    try {
      setLoading(true);
      const response = await getProblem(problemId);

      let problemData = null;
      if (response.data.success && response.data.problem) {
        problemData = response.data.problem;
      } else if (response.data.problem) {
        problemData = response.data.problem;
      } else if (response.data) {
        problemData = response.data;
      }

      if (problemData) {
        setProblem(problemData);
        setError(null);
      } else {
        setError("Failed to load problem data");
        toast.error("Failed to load problem");
      }
    } catch (err) {
      console.error("❌ Error fetching problem:", err);
      setError("Failed to load problem");
      toast.error("Failed to load problem");
    } finally {
      setLoading(false);
    }
  };

  const refreshTestAttempt = async () => {
    if (testId) {
      window.dispatchEvent(new CustomEvent("refreshTestAttempt"));
    }
  };

  const checkSolvedStatus = () => {
    const userId = getUserId();
    const currentTestId = localStorage.getItem("currentTestId");

    if (currentTestId) {
      const key = `user_${userId}_solvedProblems_${currentTestId}`;
      const solvedProblems = JSON.parse(localStorage.getItem(key) || "[]");
      if (solvedProblems.includes(problemId)) {
        setSubmissionStatus("Accepted");
        setSubmissionScore(100);
      }
    } else {
      const key = `user_${userId}_solvedProblems_global`;
      const solvedProblems = JSON.parse(localStorage.getItem(key) || "[]");
      if (solvedProblems.includes(problemId)) {
        setSubmissionStatus("Accepted");
        setSubmissionScore(100);
      }
    }
  };

  const handleSubmissionComplete = (status, score) => {
    setSubmissionStatus(status);
    setSubmissionScore(score);
    setSubmissionCount((prev) => prev + 1);

    if (status === "Accepted" || status === "accepted") {
      const userId = getUserId();
      const currentTestId = localStorage.getItem("currentTestId");

      if (currentTestId) {
        const key = `user_${userId}_solvedProblems_${currentTestId}`;
        const solvedProblems = JSON.parse(localStorage.getItem(key) || "[]");
        if (!solvedProblems.includes(problemId)) {
          solvedProblems.push(problemId);
          localStorage.setItem(key, JSON.stringify(solvedProblems));
        }
      } else {
        const key = `user_${userId}_solvedProblems_global`;
        const solvedProblems = JSON.parse(localStorage.getItem(key) || "[]");
        if (!solvedProblems.includes(problemId)) {
          solvedProblems.push(problemId);
          localStorage.setItem(key, JSON.stringify(solvedProblems));
        }
      }

      toast.success("🎉 Problem Solved!");
      window.dispatchEvent(new CustomEvent("refreshTestAttempt"));
    }
  };

  // ✅ Toggle Editor Fullscreen
  const toggleEditorFullscreen = () => {
    setIsEditorFullscreen(!isEditorFullscreen);
  };

  // ✅ Handle escape key to exit fullscreen
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && isEditorFullscreen) {
        setIsEditorFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isEditorFullscreen]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading problem...</p>
        </div>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold text-red-500 mb-4">
            ❌ {error || "Problem not found"}
          </h1>
          <button
            onClick={() => navigate("/problems")}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            ← Back to Problems
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      {/* Problem Panel */}
      {!isEditorFullscreen && (
        <div
          className="overflow-y-auto bg-gray-800 p-6 border-r border-gray-700 transition-all duration-300"
          style={{
            width: `${problemWidth}%`,
            minWidth: "200px",
            maxWidth: "80%",
            flexShrink: 0,
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate("/problems")}
              className="text-gray-400 hover:text-white text-sm flex items-center gap-1 transition"
            >
              ← Back to Problems
            </button>
          </div>

          {/* Status Banner */}
          <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  problem.difficulty === "Easy"
                    ? "bg-green-600"
                    : problem.difficulty === "Medium"
                      ? "bg-yellow-600"
                      : "bg-red-600"
                }`}
              >
                {problem.difficulty || "Easy"}
              </span>
              {submissionStatus === "Accepted" && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-600/20 text-green-400 border border-green-500">
                  <span>✅</span> Accepted
                </span>
              )}
              {submissionStatus === "Wrong Answer" && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-600/20 text-red-400 border border-red-500">
                  <span>❌</span> Wrong Answer
                </span>
              )}
              {submissionStatus === "Runtime Error" && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-600/20 text-yellow-400 border border-yellow-500">
                  <span>⚠️</span> Runtime Error
                </span>
              )}
              {submissionStatus === "Compilation Error" && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-orange-600/20 text-orange-400 border border-orange-500">
                  <span>🔧</span> Compilation Error
                </span>
              )}
              {submissionStatus === "Time Limit Exceeded" && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-purple-600/20 text-purple-400 border border-purple-500">
                  <span>⏰</span> Time Limit Exceeded
                </span>
              )}
            </div>
            {submissionScore !== null && (
              <span className="text-sm text-gray-400">
                Score: {submissionScore.toFixed(2)}%
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold mb-4">
            {problem.title || "Untitled Problem"}
          </h1>

          <div className="prose prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-gray-300 leading-relaxed text-sm">
              {problem.description || "No description available"}
            </div>
          </div>

          {/* Examples */}
          {problem.examples && problem.examples.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-base mb-2 text-gray-200">
                📝 Examples
              </h3>
              {problem.examples.map((example, idx) => (
                <div key={idx} className="bg-gray-700 rounded-lg p-3 mb-3">
                  <p className="text-gray-400 text-xs">Input:</p>
                  <pre className="bg-gray-900 p-2 rounded text-xs text-gray-300 overflow-x-auto">
                    {example.input || "(empty)"}
                  </pre>
                  <p className="text-gray-400 text-xs mt-2">Output:</p>
                  <pre className="bg-gray-900 p-2 rounded text-xs text-gray-300 overflow-x-auto">
                    {example.output || "(empty)"}
                  </pre>
                  {example.explanation && (
                    <p className="text-gray-400 text-xs mt-2">
                      💡 {example.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Constraints */}
          {problem.constraints && (
            <div className="mt-6">
              <h3 className="font-semibold text-base mb-2 text-gray-200">
                🔒 Constraints
              </h3>
              <div className="bg-gray-700 rounded-lg p-3 text-gray-300 text-xs">
                {problem.constraints}
              </div>
            </div>
          )}

          {/* Tags */}
          {problem.tags && problem.tags.length > 0 && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-1.5">
                {problem.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-400"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="mt-6 pt-3 border-t border-gray-700">
            <div className="flex flex-wrap gap-4 text-xs text-gray-400">
              <span>⏱ {problem.timeLimit || 2}s</span>
              <span>💾 {problem.memoryLimit || 256}MB</span>
              <span>📊 {problem.acceptanceRate?.toFixed(1) || 0}%</span>
              <span>📝 {problem.totalSubmissions || 0}</span>
              {submissionStatus === "Accepted" && (
                <span className="text-green-400">✅ Solved</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✅ Professional Splitter Handle */}
      {!isEditorFullscreen && (
        <div
          ref={splitterRef}
          className={`flex items-center justify-center w-2.5 bg-gray-800 hover:bg-gray-700 cursor-col-resize transition-all duration-200 group flex-shrink-0 relative ${
            isDraggingSplit ? "bg-blue-600" : ""
          }`}
          onMouseDown={handleSplitterMouseDown}
          onTouchStart={handleSplitterTouchStart}
          onMouseEnter={() => setIsHoveringSplit(true)}
          onMouseLeave={() => setIsHoveringSplit(false)}
        >
          {/* Decorative grip */}
          {/* <div className="flex flex-col items-center gap-1 px-1">
            <div className="w-px h-3 bg-gray-600 group-hover:bg-gray-400 transition-colors"></div>
            <GripHorizontal
              className={`w-3 h-3 text-gray-500 group-hover:text-gray-300 transition-all duration-300 rotate-90 ${
                isDraggingSplit ? "text-white rotate-180" : ""
              }`}
            />
            <div className="w-px h-3 bg-gray-600 group-hover:bg-gray-400 transition-colors"></div>
          </div> */}

          {/* Glow effects */}
          <div
            className={`absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-gray-500 to-transparent opacity-0 group-hover:opacity-50 transition-opacity ${
              isDraggingSplit ? "opacity-100 via-blue-400" : ""
            }`}
          ></div>
          <div
            className={`absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-gray-500 to-transparent opacity-0 group-hover:opacity-50 transition-opacity ${
              isDraggingSplit ? "opacity-100 via-blue-400" : ""
            }`}
          ></div>

          {isDraggingSplit && (
            <div className="absolute inset-0 bg-blue-500/10 border-x border-blue-500/30"></div>
          )}

          {/* Tooltip on hover */}
          {isHoveringSplit && !isDraggingSplit && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-700 text-[10px] text-gray-300 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              Drag to resize
            </div>
          )}
        </div>
      )}

      {/* ✅ Code Editor Panel */}
      <div
        className={`flex flex-col h-full transition-all duration-300 ${
          isEditorFullscreen ? "w-full" : ""
        }`}
        style={{
          flex: isEditorFullscreen ? "none" : "1",
          width: isEditorFullscreen ? "100%" : "auto",
        }}
      >
        {/* Editor Toolbar with Fullscreen Toggle */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 font-medium">
              {isEditorFullscreen ? "📝 Coding Editor" : "Code Editor"}
            </span>
            {isEditorFullscreen && (
              <span className="text-xs text-blue-400 animate-pulse">
                Fullscreen Mode
              </span>
            )}
          </div>
          <button
            onClick={toggleEditorFullscreen}
            className="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors text-gray-300 hover:text-white"
            title={isEditorFullscreen ? "Exit Fullscreen" : "Fullscreen Editor"}
          >
            {isEditorFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Code Editor */}
        <div className="flex-1 overflow-hidden">
          <CodeEditor
            problemId={problem.problemId}
            testId={testId}
            onSubmissionComplete={handleSubmissionComplete}
            onRefreshTestAttempt={refreshTestAttempt}
          />
        </div>
      </div>

      {/* ✅ Exit Fullscreen Floating Button */}
      {isEditorFullscreen && (
        <button
          onClick={toggleEditorFullscreen}
          className="fixed bottom-6 right-6 z-50 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg flex items-center gap-2 transition-all duration-200 hover:scale-105"
        >
          <Minimize2 className="w-4 h-4" />
          <span>Exit Fullscreen</span>
        </button>
      )}
    </div>
  );
};

export default ProblemDetail;
