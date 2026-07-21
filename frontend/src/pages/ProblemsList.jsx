// frontend/src/pages/ProblemsList.jsx

import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProblems } from "../services/api";
import toast from "react-hot-toast";
import {
  Code2,
  ChevronRight,
  CheckCircle2,
  Circle,
  Zap,
  Sparkles,
  Award,
  Flame,
  Search,
  TrendingUp,
  Clock,
  Target,
  Medal,
  Star,
  Eye,
  AlertTriangle,
  Timer,
  X,
  Loader2,
  Send,
  Trophy,
  BarChart3,
} from "lucide-react";
import { useTimer } from "../context/TimerContext";

// ✅ Utility: Get user ID
const getUserId = () => localStorage.getItem("userId") || "anonymous";

const ProblemsList = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("All");
  const [solvedProblems, setSolvedProblems] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    easy: 0,
    medium: 0,
    hard: 0,
    solvedCount: 0,
  });
  const [hoveredProblem, setHoveredProblem] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // ✅ USE TIMER CONTEXT (READ ONLY)
  const {
    timeRemaining,
    isTestEnded,
    isTimerRunning,
    isEndedRef,
    isSubmittingRef,
    testId: contextTestId,
  } = useTimer();

  // ✅ Test tracking states (local to this component)
  const [testAttempt, setTestAttempt] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testSolvedProblems, setTestSolvedProblems] = useState([]);
  const [isTestMode, setIsTestMode] = useState(false);
  const [testId, setTestId] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const navigate = useNavigate();
  const serverURL = import.meta.env.VITE_API_URL || "";
  const MAIN_APP_URL = "https://avainternlms.in";

  // ✅ Format time remaining
  const formatTime = (ms) => {
    if (!ms || ms <= 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (num) => String(num).padStart(2, "0");
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  // ✅ Redirect to Main App and Close Current Tab
  const redirectToMainAppAndClose = useCallback(() => {
    try {
      // Clear test data (timer is cleared by Header via context)
      localStorage.removeItem("currentTestId");
      localStorage.removeItem("testId");
      localStorage.removeItem("testTitle");
      localStorage.removeItem("currentTestTitle");

      if (testId) {
        localStorage.removeItem(`test_start_time_${testId}`);
        localStorage.removeItem(`test_end_time_${testId}`);
      }

      clearTestSolvedProblems();

      // Send message to parent window
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "TEST_COMPLETED",
            data: {
              testId: testId,
              status: "completed",
              timestamp: new Date().toISOString(),
            },
          },
          MAIN_APP_URL,
        );
      }

      // Close the tab
      window.close();

      // Fallback
      setTimeout(() => {
        if (!window.closed) {
          window.location.href = "about:blank";
        }
      }, 300);
    } catch (error) {
      console.error("❌ Error closing tab:", error);
      window.location.href = "about:blank";
    }
  }, [testId]);

  // ✅ Clear test solved problems
  const clearTestSolvedProblems = useCallback(() => {
    const userId = getUserId();
    const currentTestId = localStorage.getItem("currentTestId");
    if (currentTestId) {
      const key = `user_${userId}_solvedProblems_${currentTestId}`;
      localStorage.removeItem(key);
      setTestSolvedProblems([]);
      setSolvedProblems([]);
    }
  }, []);

  // ✅ Confirm submission
  const confirmSubmit = useCallback(
    async (isAuto = false) => {
      if (isSubmittingRef.current) return;

      try {
        isSubmittingRef.current = true;
        setSubmitting(true);

        const token = localStorage.getItem("token");

        const response = await fetch(`${serverURL}/coding/submit-test`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            testId,
            endTime: new Date().toISOString(),
            isAuto,
          }),
        });

        const data = await response.json();

        if (data.success) {
          toast.success(
            isAuto
              ? "⏰ Test auto-submitted successfully! Closing..."
              : "✅ Test submitted successfully! Closing...",
          );
          setShowSubmitModal(false);

          // Clear start time from localStorage
          if (testId) {
            localStorage.removeItem(`test_start_time_${testId}`);
          }

          setTimeout(() => {
            redirectToMainAppAndClose();
          }, 2000);
        } else {
          toast.error(data.error || "Failed to submit test");
          setShowSubmitModal(false);
        }
      } catch (error) {
        console.error("Error submitting test:", error);
        toast.error("Failed to submit test");
        setShowSubmitModal(false);
      } finally {
        setSubmitting(false);
        isSubmittingRef.current = false;
      }
    },
    [testId, serverURL, redirectToMainAppAndClose, isSubmittingRef],
  );

  // ✅ Handle test submission
  const handleSubmitTest = useCallback(
    async (isAuto = false) => {
      if (isSubmittingRef.current) return;

      if (
        testAttempt?.status === "submitted" ||
        testAttempt?.status === "completed"
      ) {
        toast.info("Test has already been submitted");
        return;
      }

      if (testAttempt?.status === "in_progress") {
        if (isAuto) {
          await confirmSubmit(true);
          return;
        }
        setShowSubmitModal(true);
      } else {
        toast.error("Test is not in progress");
      }
    },
    [testAttempt, confirmSubmit, isSubmittingRef],
  );

  // ✅ Check test attempt
  const checkTestAttempt = useCallback(
    async (testIdToCheck) => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${serverURL}/coding/attempt-status/${testIdToCheck}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();

        if (data.success) {
          const status = data.status || "in_progress";
          const solutions = data.solutions || [];
          const passedCount = data.passedCount || 0;
          const totalProblems = data.totalProblems || 0;
          const percentage = data.percentage || 0;
          const passed = data.passed || false;
          const hasAttempted = data.hasAttempted || false;

          setTestAttempt({
            status: status,
            solutions: solutions,
            passedCount: passedCount,
            totalProblems: totalProblems,
            percentage: percentage,
            passed: passed,
            hasAttempted: hasAttempted,
            message: data.message,
          });

          if (status === "submitted" || status === "completed") {
            toast.error("You have already submitted this test!");
            setTimeout(() => {
              redirectToMainAppAndClose();
            }, 1500);
          }
        }
      } catch (error) {
        console.error("❌ ProblemsList - Error checking attempt:", error);
      }
    },
    [serverURL, redirectToMainAppAndClose],
  );

  // ✅ Fetch problems
  const fetchProblems = useCallback(async () => {
    try {
      const response = await getProblems();
      const problemsData = response.data.problems || [];
      setProblems(problemsData);

      const easy = problemsData.filter((p) => p.difficulty === "Easy").length;
      const medium = problemsData.filter(
        (p) => p.difficulty === "Medium",
      ).length;
      const hard = problemsData.filter((p) => p.difficulty === "Hard").length;
      setStats({
        total: problemsData.length,
        easy,
        medium,
        hard,
        solvedCount: 0,
      });
    } catch (error) {
      console.error("Error fetching problems:", error);
      toast.error("Failed to load problems");
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Load test-specific solved problems
  const checkSolvedProblems = useCallback((testIdOverride = null) => {
    const userId = getUserId();
    const currentTestId =
      testIdOverride || localStorage.getItem("currentTestId");

    let solved = [];
    if (currentTestId) {
      const key = `user_${userId}_solvedProblems_${currentTestId}`;
      solved = JSON.parse(localStorage.getItem(key) || "[]");
      setTestSolvedProblems(solved);
      setSolvedProblems(solved);
    } else {
      const key = `user_${userId}_solvedProblems_global`;
      solved = JSON.parse(localStorage.getItem(key) || "[]");
      setSolvedProblems(solved);
      setTestSolvedProblems([]);
    }

    setStats((prev) => ({
      ...prev,
      solvedCount: solved.length,
    }));
  }, []);

  // ✅ Load existing solutions
  const loadExistingSolutions = useCallback(
    async (attemptId) => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${serverURL}/coding/get-attempt/${attemptId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();
        if (data.success && data.attempt) {
          const solutions = data.attempt.solutions || [];

          const userId = getUserId();
          const currentTestId = localStorage.getItem("currentTestId");
          if (currentTestId) {
            const key = `user_${userId}_solvedProblems_${currentTestId}`;
            const solvedIds = solutions
              .filter((s) => s.status === "accepted")
              .map((s) => s.problemId);
            localStorage.setItem(key, JSON.stringify(solvedIds));
            setSolvedProblems(solvedIds);
            setTestSolvedProblems(solvedIds);

            setStats((prev) => ({
              ...prev,
              solvedCount: solvedIds.length,
            }));
          }
        }
      } catch (error) {
        console.error("Error loading existing solutions:", error);
      }
    },
    [serverURL],
  );

  // ✅ Get problem stats
  const getProblemStats = useCallback(
    (problem) => {
      const isSolved = solvedProblems.includes(problem.problemId);
      const acceptanceRate = problem.acceptanceRate || 0;
      const submissions = problem.totalSubmissions || 0;
      return { isSolved, acceptanceRate, submissions };
    },
    [solvedProblems],
  );

  // ✅ Get progress percentage
  const getProgressPercentage = useCallback(() => {
    if (stats.total === 0) return 0;
    return Math.round((solvedProblems.length / stats.total) * 100);
  }, [stats.total, solvedProblems.length]);

  // ✅ Get difficulty styles
  const getDifficultyStyles = useCallback((difficulty) => {
    switch (difficulty) {
      case "Easy":
        return {
          bg: "bg-emerald-50",
          text: "text-emerald-700",
          border: "border-emerald-200",
          dot: "bg-emerald-500",
          glow: "shadow-emerald-100",
          icon: <Zap className="w-3 h-3 text-emerald-500" />,
        };
      case "Medium":
        return {
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-200",
          dot: "bg-amber-500",
          glow: "shadow-amber-100",
          icon: <Flame className="w-3 h-3 text-amber-500" />,
        };
      case "Hard":
        return {
          bg: "bg-rose-50",
          text: "text-rose-700",
          border: "border-rose-200",
          dot: "bg-rose-500",
          glow: "shadow-rose-100",
          icon: <Award className="w-3 h-3 text-rose-500" />,
        };
      default:
        return {
          bg: "bg-gray-50",
          text: "text-gray-700",
          border: "border-gray-200",
          dot: "bg-gray-500",
          glow: "shadow-gray-100",
          icon: <Circle className="w-3 h-3 text-gray-400" />,
        };
    }
  }, []);

  // ✅ Calculate success rate
  const calculateSuccessRate = useCallback(() => {
    if (problems.length === 0) return 0;
    const totalAcceptance = problems.reduce(
      (acc, p) => acc + (p.acceptanceRate || 0),
      0,
    );
    return Math.round(totalAcceptance / problems.length);
  }, [problems]);

  // ✅ Get solutions count
  const solutionsCount = testAttempt?.solutions?.length || 0;

  // ============================================
  // ✅ INITIALIZATION
  // ============================================

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlTestId = urlParams.get("testId");
        const storedTestId = localStorage.getItem("currentTestId");
        const finalTestId = urlTestId || storedTestId;

        if (finalTestId) {
          setTestId(finalTestId);
          setIsTestMode(true);
          localStorage.setItem("currentTestId", finalTestId);
        }

        // Check admin status
        try {
          const role = localStorage.getItem("role");
          setIsAdmin(role === "admin");
          setAuthChecked(true);
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
          setAuthChecked(true);
        }

        // Fetch problems
        await fetchProblems();

        // Load solved problems
        await checkSolvedProblems(finalTestId);

        // If in test mode, check attempt
        if (finalTestId) {
          await checkTestAttempt(finalTestId);
          // Timer is started by Header, not here!
        }

        // console.log("🎉 App initialized successfully!");
      } catch (error) {
        console.error("❌ Error initializing app:", error);
        toast.error("Failed to load test. Please refresh.");
      }
    };

    initializeApp();

    // ✅ Cleanup - no timer to clear here (Header handles it)
    return () => {
      // Nothing to clean up here
    };
  }, []); // Run once

  // ✅ Refresh event listener
  useEffect(() => {
    const handleTestRefresh = () => {
      const currentTestId = localStorage.getItem("currentTestId");
      if (currentTestId) {
        setTestId(currentTestId);
        setIsTestMode(true);
        setIsInitialLoad(false);
        checkTestAttempt(currentTestId);
        checkSolvedProblems(currentTestId);
        fetchProblems();
      }
    };

    window.addEventListener("refreshTestAttempt", handleTestRefresh);

    return () => {
      window.removeEventListener("refreshTestAttempt", handleTestRefresh);
    };
  }, [checkTestAttempt, checkSolvedProblems, fetchProblems]);

  // ============================================
  // ✅ RENDER
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30">
        <div className="text-center relative">
          <div className="absolute -inset-20 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="relative">
            <div className="w-20 h-20 mx-auto relative">
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 border-r-purple-500 animate-spin"></div>
              <div
                className="absolute inset-2 rounded-full border-4 border-transparent border-b-purple-500 border-l-indigo-400 animate-spin animation-delay-200"
                style={{ animationDuration: "1.2s" }}
              ></div>
              <div
                className="absolute inset-4 rounded-full border-4 border-transparent border-t-pink-400 border-r-indigo-300 animate-spin animation-delay-400"
                style={{ animationDuration: "1.5s" }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-pulse">
                  <Code2 className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
            <div className="mt-8 space-y-3">
              <div className="relative inline-block">
                <p className="text-lg font-semibold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] text-transparent bg-clip-text animate-shimmer">
                  Loading challenges...
                </p>
                <span className="absolute -inset-x-0 -inset-y-2 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div
                  className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-pink-500 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                  style={{ animationDelay: "450ms" }}
                ></div>
              </div>
              <p className="text-xs text-gray-400 font-medium tracking-wide animate-pulse">
                Preparing your coding arena...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredProblems = problems.filter((problem) => {
    const matchesSearch = problem.title
      ?.toLowerCase()
      .includes(search.toLowerCase());
    const matchesDifficulty =
      difficulty === "All" || problem.difficulty === difficulty;
    return matchesSearch && matchesDifficulty;
  });

  const progressPercentage = getProgressPercentage();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* ============================================ */}
        {/* ✅ PROFESSIONAL HEADER WITH STATS */}
        {/* ============================================ */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Code2 className="w-7 h-7 text-indigo-600" />
                Problems
                {isTestMode && (
                  <span className="ml-2 text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                    📝 Test Mode
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {filteredProblems.length} problems • {solvedProblems.length}{" "}
                solved
              </p>
            </div>

            {/* ✅ Progress Stats */}
            <div className="flex items-center gap-4 bg-white rounded-xl px-4 py-2 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-gray-700">
                  {solvedProblems.length}
                </span>
                <span className="text-xs text-gray-400">/ {stats.total}</span>
              </div>
              <div className="w-px h-6 bg-gray-200"></div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-medium text-gray-700">
                  {progressPercentage}%
                </span>
                <span className="text-xs text-gray-400">completed</span>
              </div>
            </div>
          </div>

          {/* ✅ Progress Bar */}
          <div className="mt-3 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Test Mode Banner */}
        {isTestMode && testAttempt?.status === "in_progress" && (
          <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-purple-700">
                📝 Test in Progress
              </span>
              <span className="text-xs text-gray-500">
                {solutionsCount} problems solved
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-red-600">
                <Timer className="w-4 h-4" />
                <span className="font-mono font-bold text-xl">
                  {formatTime(timeRemaining)}
                </span>
              </div>

              {/* ✅ Submit Button */}
              {/* <button
                onClick={() => handleSubmitTest(false)}
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Test
                  </>
                )}
              </button> */}
            </div>
          </div>
        )}

        {/* Test Ended Banner */}
        {isTestMode && isTestEnded && (
          <div className="mb-4 p-3 bg-green-50 rounded-xl border border-green-200 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-700">
              ✅ Test submitted successfully! Closing tab...
            </span>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 sm:mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider">
                  Total
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-800 mt-0.5">
                  {stats.total}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Code2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider">
                  Solved
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-800 mt-0.5">
                  {solvedProblems.length}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              </div>
            </div>
            <div className="mt-1 flex items-center gap-1">
              <Target className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] text-gray-500">
                {progressPercentage}% complete
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider">
                  Acceptance
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-800 mt-0.5">
                  {calculateSuccessRate()}%
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Medal className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider">
                  Remaining
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-800 mt-0.5">
                  {stats.total - solvedProblems.length}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search challenges..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
            />
          </div>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm cursor-pointer w-full sm:w-auto"
          >
            <option value="All">📊 All Levels</option>
            <option value="Easy">🟢 Easy</option>
            <option value="Medium">🟡 Medium</option>
            <option value="Hard">🔴 Hard</option>
          </select>
        </div>

        {/* Problems List */}
        <div className="space-y-2 sm:space-y-3">
          {filteredProblems.map((problem, idx) => {
            const { isSolved, acceptanceRate, submissions } =
              getProblemStats(problem);
            const difficultyStyle = getDifficultyStyles(problem.difficulty);
            const isHovered = hoveredProblem === problem._id;

            return (
              <div
                key={problem._id}
                className={`group relative bg-white border rounded-xl overflow-hidden transition-all duration-300 ${
                  isSolved
                    ? "border-emerald-200"
                    : isHovered
                      ? `border-indigo-300 shadow-lg ${difficultyStyle.glow}`
                      : "border-gray-200 shadow-sm hover:shadow-md"
                } ${isSolved ? "hover:shadow-md" : ""}`}
                onMouseEnter={() => setHoveredProblem(problem._id)}
                onMouseLeave={() => setHoveredProblem(null)}
              >
                {/* ✅ Solved ribbon */}
                {isSolved && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-emerald-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-lg flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      SOLVED
                    </div>
                  </div>
                )}

                <div className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    {/* Problem Number with Status */}
                    <div className="relative flex-shrink-0">
                      <div
                        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-mono text-xs sm:text-sm transition-all ${
                          isSolved
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : isHovered
                              ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                              : "bg-gray-50 text-gray-500 border border-gray-100"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      {isSolved && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                          <CheckCircle2 className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Problem Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          className={`text-sm sm:text-base font-semibold transition-colors ${
                            isSolved
                              ? "text-gray-600"
                              : isHovered
                                ? "text-indigo-700"
                                : "text-gray-800"
                          } truncate max-w-[120px] xs:max-w-[200px] sm:max-w-none`}
                        >
                          {problem.title}
                        </h3>
                        {isSolved && (
                          <span className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] sm:text-[10px] font-medium rounded-full border border-emerald-200 whitespace-nowrap">
                            ✅ Solved
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-gray-400 text-[8px] sm:text-[10px] whitespace-nowrap">
                          <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          {problem.timeLimit || 2}s
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-0.5 sm:mt-1">
                        {problem.tags?.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 sm:px-2 py-0.5 bg-gray-50 rounded-full text-gray-500 text-[8px] sm:text-[10px] border border-gray-100"
                          >
                            #{tag}
                          </span>
                        ))}
                        {problem.tags?.length > 2 && (
                          <span className="text-gray-400 text-[8px] sm:text-[10px]">
                            +{problem.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Difficulty Badge */}
                    <div
                      className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 ${difficultyStyle.bg} ${difficultyStyle.text} rounded-full border ${difficultyStyle.border}`}
                    >
                      {difficultyStyle.icon}
                      <span className="text-[9px] sm:text-[11px] font-medium">
                        {problem.difficulty}
                      </span>
                    </div>

                    {/* Acceptance Rate */}
                    <div className="hidden sm:flex items-center gap-1 text-gray-400 text-xs">
                      <TrendingUp className="w-3 h-3" />
                      <span className="font-mono">
                        {acceptanceRate.toFixed(1)}%
                      </span>
                    </div>

                    {/* Solve/Review Button */}
                    <Link
                      to={`/problem/${problem.problemId}`}
                      className={`group/btn flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-medium text-xs sm:text-sm transition-all duration-300 ${
                        isSolved
                          ? "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
                          : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/25"
                      }`}
                    >
                      {isSolved ? (
                        <>
                          <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="hidden xs:inline">Review</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="hidden xs:inline">Solve</span>
                        </>
                      )}
                      <ChevronRight
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${
                          isSolved ? "" : "group-hover/btn:translate-x-1"
                        }`}
                      />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProblems.length === 0 && (
          <div className="text-center py-12 sm:py-16 bg-white rounded-xl border border-gray-200">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-50 rounded-full flex items-center justify-center border border-gray-200">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 text-base font-medium">
              No challenges found
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* ✅ Submit Confirmation Modal */}
      {/* ============================================ */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center border border-amber-200">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Submit Test?
                  </h3>
                  <p className="text-sm text-gray-500">
                    You have {solutionsCount} solutions
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-500">Attempted</p>
                  <p className="text-lg font-bold text-gray-800">
                    {solutionsCount}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Solved</p>
                  <p className="text-lg font-bold text-emerald-600">
                    {testAttempt?.passedCount || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Score</p>
                  <p className="text-lg font-bold text-indigo-600">
                    {testAttempt?.percentage?.toFixed(1) || 0}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-lg font-bold text-gray-800">
                    {testAttempt?.passed ? "✅ Passed" : "❌ Failed"}
                  </p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Once submitted, you cannot make any more changes to your
                    test. This tab will close automatically.
                  </span>
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmSubmit(false)}
                disabled={submitting}
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                  submitting
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:shadow-lg hover:shadow-emerald-500/25"
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit & Close
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProblemsList;
