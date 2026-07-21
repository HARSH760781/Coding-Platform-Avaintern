// frontend/src/components/Header.jsx

import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTimer } from "../context/TimerContext"; // ✅ Import useTimer
import Logo from "../assets/logo.png";
import {
  Brain,
  Award,
  Timer,
  Send,
  Loader2,
  Shield,
  CheckCircle2,
  Zap,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { getProblems } from "../services/api";
import toast from "react-hot-toast";
import { useRole } from "../Hooks/useRole";

// ✅ Utility: Get user ID
const getUserId = () => localStorage.getItem("userId") || "anonymous";

// ✅ Utility: Clear old test data for this user
const clearOldTestData = (newTestId) => {
  const userId = getUserId();
  const userPrefix = `user_${userId}_`;

  const testIds = new Set();
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith(userPrefix)) {
      const parts = key.split("_");
      const testIdIndex = parts.findIndex(
        (p) => p === "editor" || p === "solvedProblems",
      );
      if (testIdIndex !== -1 && parts[testIdIndex + 1]) {
        testIds.add(parts[testIdIndex + 1]);
      }
    }
  });

  testIds.forEach((testId) => {
    if (testId !== newTestId) {
      Object.keys(localStorage).forEach((key) => {
        if (key.includes(`_${testId}_`) || key.includes(`_${testId}`)) {
          localStorage.removeItem(key);
        }
      });
    }
  });
};

const Header = () => {
  const [problems, setProblems] = useState([]);
  const [solvedProblems, setSolvedProblems] = useState([]);
  const [stats, setStats] = useState({ total: 0, easy: 0, medium: 0, hard: 0 });

  // ✅ Use the hook instead of localStorage
  const { isAdmin, loading: roleLoading } = useRole();
  const [authChecked, setAuthChecked] = useState(false);

  // ✅ USE THE TIMER CONTEXT - Remove local timer states
  const {
    timeRemaining, // ✅ From context
    isTestEnded, // ✅ From context
    isTimerRunning, // ✅ From context
    startTimer, // ✅ From context
    resetTimer, // ✅ From context
    clearTimer, // ✅ From context
    submitTest, // ✅ From context
    setIsTestEnded, // ✅ From context
    isEndedRef, // ✅ From context
    isSubmittingRef, // ✅ From context
    testId: contextTestId, // ✅ From context
  } = useTimer();

  // ❌ REMOVE these local states - they're now in context
  // const [timeRemaining, setTimeRemaining] = useState(0);
  // const [testTimer, setTestTimer] = useState(null);
  // const [isTestEnded, setIsTestEnded] = useState(false);

  const [isTestMode, setIsTestMode] = useState(false);
  const [testId, setTestId] = useState(null);
  const [testAttempt, setTestAttempt] = useState(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isTestModeLoading, setIsTestModeLoading] = useState(true);

  const navigate = useNavigate();
  const serverURL = import.meta.env.VITE_API_URL || "";

  // ✅ Main app URL
  const MAIN_APP_URL = "https://avainternlms.in";

  // ✅ Use ref to store testId for event listener
  const testIdRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      await fetchProblems();
      checkSolvedProblems();

      const urlParams = new URLSearchParams(window.location.search);
      const urlTestId = urlParams.get("testId");
      const storedTestId = localStorage.getItem("currentTestId");
      const finalTestId = urlTestId || storedTestId;

      if (finalTestId) {
        setTestId(finalTestId);
        testIdRef.current = finalTestId;
        setIsTestMode(true);
        setIsTestModeLoading(true);
        localStorage.setItem("currentTestId", finalTestId);

        // ✅ Clear old test data for this user
        clearOldTestData(finalTestId);

        // ✅ Wait for both to complete
        await Promise.all([
          checkTestAttempt(finalTestId),
          startTestWithTimer(finalTestId), // ✅ Use the new function
        ]);

        setIsTestModeLoading(false);
      } else {
        setIsTestModeLoading(false);
      }
    };

    init();

    // ✅ Add refresh event listener using ref
    const handleTestRefresh = () => {
      const currentTestId = testIdRef.current;
      if (currentTestId) {
        checkTestAttempt(currentTestId);
      }
    };

    window.addEventListener("refreshTestAttempt", handleTestRefresh);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("refreshTestAttempt", handleTestRefresh);
    };
  }, []);

  // ✅ Set authChecked when role loading completes
  useEffect(() => {
    if (!roleLoading) {
      setAuthChecked(true);
    }
  }, [roleLoading]);

  // ✅ Update ref whenever testId changes
  useEffect(() => {
    testIdRef.current = testId;
  }, [testId]);

  const fetchProblems = async () => {
    try {
      const response = await getProblems();
      const problemsData = response.data.problems || [];
      setProblems(problemsData);

      const easy = problemsData.filter((p) => p.difficulty === "Easy").length;
      const medium = problemsData.filter(
        (p) => p.difficulty === "Medium",
      ).length;
      const hard = problemsData.filter((p) => p.difficulty === "Hard").length;
      setStats({ total: problemsData.length, easy, medium, hard });
    } catch (error) {
      console.error("Error fetching problems:", error);
    }
  };

  const checkSolvedProblems = () => {
    const userId = getUserId();
    const currentTestId = localStorage.getItem("currentTestId");

    if (currentTestId) {
      const key = `user_${userId}_solvedProblems_${currentTestId}`;
      const solved = JSON.parse(localStorage.getItem(key) || "[]");
      setSolvedProblems(solved);
    } else {
      const solved = JSON.parse(localStorage.getItem("solvedProblems") || "[]");
      setSolvedProblems(solved);
    }
  };

  // ✅ NEW: Start test with timer using Context
  const startTestWithTimer = async (testIdToStart) => {
    if (!testIdToStart) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${serverURL}/coding/test-status/${testIdToStart}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = await response.json();

      if (data.success && data.status === "active") {
        const durationMs = data.duration || 60 * 60 * 1000;

        // ✅ Start timer in context (this will only run once)
        await startTimer(testIdToStart, durationMs, () =>
          handleSubmitTest(true),
        );
      } else if (data.status === "ended") {
        toast.error("⏰ Test has already ended!");
        setIsTestEnded(true);
        isEndedRef.current = true;
        await handleSubmitTest(true);
      }
    } catch (error) {
      console.error("❌ Error starting test:", error);
      const defaultDuration = 60 * 60 * 1000;
      await startTimer(testIdToStart, defaultDuration, () =>
        handleSubmitTest(true),
      );
    }
  };

  // ✅ Redirect to Main App and Close Current Tab
  const redirectToMainAppAndClose = () => {
    try {
      const currentTestId =
        testId || testIdRef.current || localStorage.getItem("currentTestId");

      // ✅ Clear timer using context
      clearTimer();
      resetTimer();

      // ✅ Clear localStorage
      localStorage.removeItem("currentTestId");
      localStorage.removeItem("testId");
      localStorage.removeItem("testTitle");
      localStorage.removeItem("currentTestTitle");

      if (currentTestId) {
        localStorage.removeItem(`test_start_time_${currentTestId}`);
        localStorage.removeItem(`test_end_time_${currentTestId}`);
      }

      // ✅ Send message to parent window
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "TEST_COMPLETED",
            data: {
              testId: currentTestId,
              status: "completed",
              timestamp: new Date().toISOString(),
            },
          },
          MAIN_APP_URL,
        );
      }

      window.close();

      setTimeout(() => {
        if (!window.closed) {
          window.location.href = "about:blank";
        }
      }, 300);
    } catch (error) {
      console.error("❌ Error closing tab:", error);
      window.location.href = "about:blank";
    }
  };

  // ✅ Check test attempt
  const checkTestAttempt = async (testIdToCheck, showToast = true) => {
    try {
      const token = localStorage.getItem("token");
      const url = `${serverURL}/coding/attempt-status/${testIdToCheck}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        let solutions = [];

        if (data.solutions && Array.isArray(data.solutions)) {
          solutions = data.solutions;
        } else if (
          data.attemptData?.solutions &&
          Array.isArray(data.attemptData.solutions)
        ) {
          solutions = data.attemptData.solutions;
        } else if (data.data?.solutions && Array.isArray(data.data.solutions)) {
          solutions = data.data.solutions;
        } else if (data.solutions && typeof data.solutions === "object") {
          solutions = Object.values(data.solutions);
        }

        const passedCount =
          data.passedCount || data.attemptData?.totalSolved || 0;
        const totalProblems =
          data.totalProblems || data.attemptData?.totalProblems || 0;
        const percentage = data.percentage || data.attemptData?.percentage || 0;
        const passed = data.passed || data.attemptData?.passed || false;

        if (data.startTime) {
          const startTimeKey = `test_start_time_${testIdToCheck}`;
          if (!localStorage.getItem(startTimeKey)) {
            const startTimeMs = new Date(data.startTime).getTime();
            localStorage.setItem(startTimeKey, startTimeMs.toString());
          }
        }

        const attemptData = {
          status: data.status || data.attemptStatus || "in_progress",
          solutions: solutions,
          passedCount: passedCount,
          totalProblems: totalProblems,
          percentage: percentage,
          passed: passed,
          hasAttempted: data.hasAttempted || false,
          startTime: data.startTime,
        };

        setTestAttempt(attemptData);

        if (
          showToast &&
          !isRedirecting &&
          (data.status === "submitted" || data.status === "completed")
        ) {
          toast.error("You have already submitted this test!");
          setIsRedirecting(true);
          setTimeout(() => {
            redirectToMainAppAndClose();
          }, 1500);
        }

        return attemptData;
      }
    } catch (error) {
      console.error("❌ Header - Error checking test attempt:", error);
      throw error;
    }
  };

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

  // ✅ Handle test submission
  const handleSubmitTest = async (isAuto = false) => {
    if (isSubmittingRef.current) return;

    const currentTestId =
      testId || testIdRef.current || localStorage.getItem("currentTestId");
    if (!currentTestId) {
      console.error("❌ Header - No testId available!");
      toast.error("No test ID found. Please refresh the page.");
      return;
    }

    if (
      testAttempt?.status === "submitted" ||
      testAttempt?.status === "completed"
    ) {
      toast.info("Test has already been submitted");
      return;
    }

    if (isAuto) {
      setSubmitting(true);
      const result = await submitTest(currentTestId, true);
      setSubmitting(false);

      if (result?.success) {
        toast.success("⏰ Test auto-submitted successfully! Closing...");
        setTimeout(() => redirectToMainAppAndClose(), 2000);
      }
      return;
    }

    setShowSubmitModal(true);
  };

  // ✅ Confirm submission
  const confirmSubmit = async (isAuto = false) => {
    const currentTestId =
      testId || testIdRef.current || localStorage.getItem("currentTestId");

    if (!currentTestId) {
      console.error("❌ Header - No testId available!");
      toast.error("No test ID found. Please refresh the page.");
      return;
    }

    if (isSubmittingRef.current) return;

    setSubmitting(true);
    const result = await submitTest(currentTestId, isAuto);
    setSubmitting(false);

    if (result?.success) {
      toast.success(
        isAuto
          ? "⏰ Test auto-submitted successfully! Closing..."
          : "✅ Test submitted successfully! Closing...",
      );
      setShowSubmitModal(false);
      setTimeout(() => redirectToMainAppAndClose(), 2000);
    }
  };

  // Calculate completion percentage
  const completionPercentage =
    stats.total > 0
      ? Math.round((solvedProblems.length / stats.total) * 100)
      : 0;

  // ✅ Check if should show test mode
  const shouldShowTestMode =
    isTestMode || localStorage.getItem("currentTestId");

  return (
    <header
      className={`bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50 transition-all duration-300 ${
        isScrolled ? "shadow-md" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Left - Logo & Brand - Keep as is */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div
              className="flex-shrink-0 cursor-pointer hover:scale-105 transition-transform duration-200"
              onClick={() => navigate("/problems")}
            >
              <img
                src={Logo}
                alt="CodeArena"
                className="h-10 sm:h-12 w-auto object-contain"
              />
            </div>

            <div className="hidden sm:block border-l border-gray-200 pl-3">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-800 tracking-tight">
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    CodeArena
                  </span>
                </h1>
                <span className="text-[8px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                  Beta
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-gray-500 text-[9px] font-medium uppercase tracking-wider">
                    Live
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Brain className="w-3 h-3 text-indigo-500" />
                  <span className="text-gray-700 text-xs font-medium">
                    {problems.length}
                  </span>
                  <span className="text-gray-400 text-[9px] hidden xs:inline">
                    Challenges
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Award className="w-3 h-3 text-amber-500" />
                  <span className="text-gray-700 text-xs font-medium">
                    {solvedProblems.length}
                  </span>
                  <span className="text-gray-400 text-[9px] hidden xs:inline">
                    Solved
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-gray-500 font-medium">
                    {completionPercentage}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Center - Timer - Uses timeRemaining from context */}
          {shouldShowTestMode && testAttempt?.status === "in_progress" && (
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border-2 border-red-300 shadow-lg shadow-red-100/50">
              <div className="relative">
                <Timer className="w-5 h-5 text-red-600 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[8px] text-red-500 font-medium uppercase tracking-wider">
                  Time Remaining
                </span>
                <span className="text-red-700 font-mono font-bold text-lg tracking-wider tabular-nums leading-none">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
          )}

          {/* Mobile Timer */}
          {shouldShowTestMode && testAttempt?.status === "in_progress" && (
            <div className="md:hidden flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg border border-red-200">
              <Timer className="w-4 h-4 text-red-600 animate-pulse" />
              <span className="text-red-700 font-mono font-bold text-sm">
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}

          {/* Right - Actions - Keep as is */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                <span className="text-emerald-600 font-semibold text-xs">
                  {stats.easy}
                </span>
              </div>
              <div className="w-px h-4 bg-gray-200"></div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                <span className="text-amber-600 font-semibold text-xs">
                  {stats.medium}
                </span>
              </div>
              <div className="w-px h-4 bg-gray-200"></div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                <span className="text-rose-600 font-semibold text-xs">
                  {stats.hard}
                </span>
              </div>
            </div>

            {/* ✅ SUBMIT TEST BUTTON */}
            {shouldShowTestMode && testAttempt?.status === "in_progress" && (
              <button
                onClick={() => handleSubmitTest(false)}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-105 active:scale-95"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Submit Test</span>
                    <span className="sm:hidden">Submit</span>
                  </>
                )}
              </button>
            )}

            {shouldShowTestMode &&
              (testAttempt?.status === "submitted" ||
                testAttempt?.status === "completed") && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-xl border border-gray-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-gray-600 text-sm font-medium hidden sm:inline">
                    Submitted
                  </span>
                </div>
              )}

            {/* Admin Button */}
            {!roleLoading && isAdmin && authChecked && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-all duration-300 text-sm font-medium hover:scale-105 active:scale-95"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-gray-600" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu - Keep as is */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-gray-200 animate-slideDown">
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  <span className="text-emerald-600 font-semibold text-sm">
                    {stats.easy}
                  </span>
                </div>
                <div className="w-px h-4 bg-gray-200"></div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                  <span className="text-amber-600 font-semibold text-sm">
                    {stats.medium}
                  </span>
                </div>
                <div className="w-px h-4 bg-gray-200"></div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                  <span className="text-rose-600 font-semibold text-sm">
                    {stats.hard}
                  </span>
                </div>
                <div className="flex-1"></div>
                <span className="text-xs text-gray-400">
                  {completionPercentage}% complete
                </span>
              </div>

              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>

              {!roleLoading && isAdmin && authChecked && (
                <Link
                  to="/admin"
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200 w-full justify-center"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Shield className="w-4 h-4" />
                  <span className="font-medium">Admin Panel</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Submit Confirmation Modal - Keep as is */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-scaleIn">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center border-2 border-amber-200">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Submit Test?
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-700 flex items-start gap-2">
                <span className="text-lg">⚠️</span>
                <span>
                  Are you sure you want to submit this test? Once you submitted,
                  you cannot make any more changes to your test. This tab will
                  close automatically.
                </span>
              </p>
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
                    : "bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-105 active:scale-95"
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting....
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Yes, Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
