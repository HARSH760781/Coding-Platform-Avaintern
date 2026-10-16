// frontend/src/context/TimerContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import toast from "react-hot-toast";

const TimerContext = createContext(null);

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error("useTimer must be used within TimerProvider");
  }
  return context;
};

export const TimerProvider = ({ children }) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTestEnded, setIsTestEnded] = useState(false);
  const [testId, setTestId] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [testDuration, setTestDuration] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const timerRef = useRef(null);
  const isEndedRef = useRef(false);
  const isSubmittingRef = useRef(false);

  const serverURL = import.meta.env.VITE_API_URL || "";

  // ✅ Clear timer
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      setIsTimerRunning(false);
    }
  }, []);

  // ✅ Calculate remaining time (unchanged)
  const calculateRemaining = useCallback((startTimeMs, durationMs) => {
    if (!startTimeMs || !durationMs) return 0;
    const endTimeMs = startTimeMs + durationMs;
    return Math.max(0, endTimeMs - Date.now());
  }, []);

  // ✅ Fetch student data from backend (unchanged)
  const fetchStudentData = useCallback(
    async (testIdToFetch) => {
      if (!testIdToFetch) return null;

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${serverURL}/coding/attempt-status/${testIdToFetch}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const data = await response.json();

        if (data.success) {
          return {
            startTime: data.startTime,
            status: data.status,
            solutions: data.solutions || [],
            passedCount: data.passedCount || 0,
            totalProblems: data.totalProblems || 0,
            percentage: data.percentage || 0,
            passed: data.passed || false,
          };
        }
        return null;
      } catch (error) {
        console.error("❌ Error fetching student data:", error);
        return null;
      }
    },
    [serverURL],
  );

  // ============================================
  // ✅ START TIMER — now supports effective deadline
  // ============================================
  //
  //  NEW signature: startTimer(testId, durationMs, onTimeUp, options)
  //
  //  options = {
  //    testEndTimeMs: number | null   // Date.now()-style timestamp of when the TEST ends
  //  }
  //
  //  Effective countdown = min(studentStart + duration, testEndTime)
  //
  const startTimer = useCallback(
    async (testIdToStart, durationMs, onTimeUp, options = {}) => {
      const { testEndTimeMs = null } = options;

      // If timer is already running for this test, don't restart
      if (timerRef.current && testId === testIdToStart) {
        console.log(
          "🎬 [TimerContext] Returning early — timer already running",
        );
        return;
      }

      // Clear any existing timer
      clearTimer();
      setTestId(testIdToStart);

      let startTimeMs = null;

      // ✅ STEP 1: Try localStorage first
      const localStartTime = localStorage.getItem(
        `test_start_time_${testIdToStart}`,
      );
      if (localStartTime) {
        startTimeMs = parseInt(localStartTime);
      }

      // ✅ STEP 2: Fetch from backend
      if (!startTimeMs) {
        const studentData = await fetchStudentData(testIdToStart);
        if (studentData && studentData.startTime) {
          startTimeMs = new Date(studentData.startTime).getTime();
          localStorage.setItem(
            `test_start_time_${testIdToStart}`,
            startTimeMs.toString(),
          );
        }
      }

      // ✅ STEP 3: Create new start time
      if (!startTimeMs) {
        startTimeMs = Date.now();
        localStorage.setItem(
          `test_start_time_${testIdToStart}`,
          startTimeMs.toString(),
        );

        try {
          const token = localStorage.getItem("token");
          await fetch(`${serverURL}/coding/update-start-time`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              testId: testIdToStart,
              startTime: new Date(startTimeMs).toISOString(),
            }),
          });
        } catch (error) {
          console.error("❌ Failed to save start time to backend:", error);
        }
      }

      setStartTime(startTimeMs);

      // ============================================
      // ✅ EFFECTIVE DEADLINE
      // ============================================
      const studentDeadlineMs = startTimeMs + durationMs;
      const testEndMs = testEndTimeMs || Infinity;
      const effectiveEndMs = Math.min(studentDeadlineMs, testEndMs);
      const effectiveDurationMs = effectiveEndMs - startTimeMs;

      // Store the EFFECTIVE duration so getRemainingTime() stays correct
      setTestDuration(effectiveDurationMs);
      setEndTime(effectiveEndMs);

      const remaining = Math.max(0, effectiveEndMs - Date.now());

      if (remaining <= 0) {
        setIsTestEnded(true);
        isEndedRef.current = true;
        setTimeRemaining(0);
        toast.error("⏰ Time's up! Auto-submitting...");
        onTimeUp?.();
        return;
      }

      setTimeRemaining(remaining);
      setIsTimerRunning(true);

      localStorage.setItem(
        `test_end_time_${testIdToStart}`,
        effectiveEndMs.toString(),
      );

      // ✅ Start the timer (SINGLE instance)
      timerRef.current = setInterval(() => {
        const newRemaining = Math.max(0, effectiveEndMs - Date.now());

        if (newRemaining <= 0) {
          clearTimer();
          if (!isEndedRef.current && !isSubmittingRef.current) {
            isEndedRef.current = true;
            setIsTestEnded(true);
            setTimeRemaining(0);
            toast.error("⏰ Time's up! Auto-submitting...");
            onTimeUp?.();
          }
          return;
        }

        setTimeRemaining(newRemaining);
      }, 1000);
    },
    [testId, clearTimer, fetchStudentData],
  );

  // ✅ Submit test (unchanged)
  const submitTest = useCallback(
    async (testIdToSubmit, isAuto = false) => {
      if (isSubmittingRef.current) return;

      try {
        isSubmittingRef.current = true;

        const token = localStorage.getItem("token");
        const response = await fetch(`${serverURL}/coding/submit-test`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            testId: testIdToSubmit,
            endTime: new Date().toISOString(),
            isAuto: isAuto,
          }),
        });

        const data = await response.json();

        if (data.success) {
          clearTimer();
          setIsTestEnded(true);
          isEndedRef.current = true;

          localStorage.removeItem(`test_start_time_${testIdToSubmit}`);
          localStorage.removeItem(`test_end_time_${testIdToSubmit}`);
          localStorage.removeItem("currentTestId");

          return { success: true, data };
        } else {
          return { success: false, error: data.error };
        }
      } catch (error) {
        console.error("❌ Error submitting test:", error);
        return { success: false, error: error.message };
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [serverURL, clearTimer],
  );

  // ✅ Reset timer (unchanged)
  const resetTimer = useCallback(() => {
    clearTimer();
    setTimeRemaining(0);
    setIsTestEnded(false);
    isEndedRef.current = false;
    isSubmittingRef.current = false;
    setIsTimerRunning(false);
    if (testId) {
      localStorage.removeItem(`test_start_time_${testId}`);
      localStorage.removeItem(`test_end_time_${testId}`);
    }
  }, [testId, clearTimer]);

  // ✅ Handle visibility change (uses testDuration which is now the effective one)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (
        document.visibilityState === "visible" &&
        testId &&
        timerRef.current
      ) {
        if (startTime && testDuration) {
          const remaining = calculateRemaining(startTime, testDuration);
          if (remaining <= 0 && !isEndedRef.current) {
            isEndedRef.current = true;
            setIsTestEnded(true);
            setTimeRemaining(0);
            toast.error("⏰ Time's up! Auto-submitting...");
          } else {
            setTimeRemaining(remaining);
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [testId, startTime, testDuration, calculateRemaining]);

  // ✅ Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  const value = {
    timeRemaining,
    isTestEnded,
    isTimerRunning,
    startTimer,
    resetTimer,
    clearTimer,
    submitTest,
    setIsTestEnded,
    isEndedRef,
    isSubmittingRef,
    startTime,
    endTime,
    testDuration,
    testId,
    getRemainingTime: useCallback(() => {
      if (!startTime || !testDuration) return 0;
      return calculateRemaining(startTime, testDuration);
    }, [startTime, testDuration, calculateRemaining]),
  };

  return (
    <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
  );
};
