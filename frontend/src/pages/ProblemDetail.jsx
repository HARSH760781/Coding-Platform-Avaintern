// frontend/src/pages/ProblemDetail.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getProblem } from "../services/api";
import CodeEditor from "../components/CodeEditor";
import toast from "react-hot-toast";

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

  const getTestId = () => {
    // 1. Check URL query params
    const urlParams = new URLSearchParams(location.search);
    const urlTestId = urlParams.get("testId");
    if (urlTestId) return urlTestId;

    // 2. Check localStorage
    const storedTestId = localStorage.getItem("testId");
    if (
      storedTestId &&
      storedTestId !== "null" &&
      storedTestId !== "undefined"
    ) {
      return storedTestId;
    }

    // 3. Check sessionStorage
    const sessionTestId = sessionStorage.getItem("testId");
    if (
      sessionTestId &&
      sessionTestId !== "null" &&
      sessionTestId !== "undefined"
    ) {
      return sessionTestId;
    }

    // 4. Check if testId was passed via navigation state
    if (location.state?.testId) {
      return location.state.testId;
    }

    return null;
  };

  const testId = getTestId();
  // ✅ Debug: Log the testId
  // console.log("📝 ProblemDetail - testId:", testId);
  // console.log("📝 ProblemDetail - problemId:", problemId);

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
      console.log("🔄 ProblemDetail - Refreshing test attempt...");
      // Dispatch a custom event that ProblemsList is listening to
      window.dispatchEvent(new CustomEvent("refreshTestAttempt"));
    }
  };

  const checkSolvedStatus = () => {
    const solvedProblems = JSON.parse(
      localStorage.getItem("solvedProblems") || "[]",
    );
    if (solvedProblems.includes(problemId)) {
      setSubmissionStatus("Accepted");
      setSubmissionScore(100);
    }
  };

  const handleSubmissionComplete = (status, score) => {
    setSubmissionStatus(status);
    setSubmissionScore(score);
    setSubmissionCount((prev) => prev + 1);

    if (status === "Accepted" || status === "accepted") {
      const solvedProblems = JSON.parse(
        localStorage.getItem("solvedProblems") || "[]",
      );
      if (!solvedProblems.includes(problemId)) {
        solvedProblems.push(problemId);
        localStorage.setItem("solvedProblems", JSON.stringify(solvedProblems));
      }
      toast.success("🎉 Problem Solved!");
    }
  };

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
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Problem Panel */}
      <div className="w-1/2 overflow-y-auto bg-gray-800 p-6 border-r border-gray-700">
        <button
          onClick={() => navigate("/problems")}
          className="text-gray-400 hover:text-white mb-4 text-sm flex items-center gap-1 transition"
        >
          ← Back to Problems
        </button>

        {/* 🏆 Status Banner - Professional LeetCode Style */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
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

        <h1 className="text-3xl font-bold mb-4">
          {problem.title || "Untitled Problem"}
        </h1>

        <div className="prose prose-invert max-w-none">
          <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
            {problem.description || "No description available"}
          </div>
        </div>

        {/* Examples */}
        {problem.examples && problem.examples.length > 0 && (
          <div className="mt-8">
            <h3 className="font-semibold text-lg mb-3 text-gray-200">
              📝 Examples
            </h3>
            {problem.examples.map((example, idx) => (
              <div key={idx} className="bg-gray-700 rounded-lg p-4 mb-3">
                <p className="text-gray-400 text-sm">Input:</p>
                <pre className="bg-gray-900 p-2 rounded text-sm text-gray-300 overflow-x-auto">
                  {example.input || "(empty)"}
                </pre>
                <p className="text-gray-400 text-sm mt-2">Output:</p>
                <pre className="bg-gray-900 p-2 rounded text-sm text-gray-300 overflow-x-auto">
                  {example.output || "(empty)"}
                </pre>
                {example.explanation && (
                  <p className="text-gray-400 text-sm mt-2">
                    💡 {example.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Constraints */}
        {problem.constraints && (
          <div className="mt-8">
            <h3 className="font-semibold text-lg mb-2 text-gray-200">
              🔒 Constraints
            </h3>
            <div className="bg-gray-700 rounded-lg p-3 text-gray-300 text-sm">
              {problem.constraints}
            </div>
          </div>
        )}

        {/* Tags */}
        {problem.tags && problem.tags.length > 0 && (
          <div className="mt-6">
            <div className="flex flex-wrap gap-2">
              {problem.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-400"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 pt-4 border-t border-gray-700">
          <div className="flex flex-wrap gap-6 text-sm text-gray-400">
            <span>⏱ Time Limit: {problem.timeLimit || 2}s</span>
            <span>💾 Memory Limit: {problem.memoryLimit || 256}MB</span>
            <span>
              📊 Acceptance: {problem.acceptanceRate?.toFixed(1) || 0}%
            </span>
            <span>📝 Submissions: {problem.totalSubmissions || 0}</span>
            {submissionStatus === "Accepted" && (
              <span className="text-green-400">✅ Solved</span>
            )}
          </div>
        </div>
      </div>
      {/* {console.log(testId)} */}
      {/* Code Editor Panel */}
      <div className="w-1/2">
        <CodeEditor
          problemId={problem.problemId}
          testId={testId}
          onSubmissionComplete={handleSubmissionComplete}
          onRefreshTestAttempt={refreshTestAttempt}
        />
      </div>
    </div>
  );
};

export default ProblemDetail;
