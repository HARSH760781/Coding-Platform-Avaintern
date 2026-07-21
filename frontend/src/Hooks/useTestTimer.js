// frontend/src/hooks/useTestTimer.js
import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";

export const useTestTimer = (testId, onTimeUp) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTestEnded, setIsTestEnded] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [testDuration, setTestDuration] = useState(0);
  const timerRef = useRef(null);
  const isEndedRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const isInitializedRef = useRef(false);

  const serverURL = import.meta.env.VITE_API_URL || "";

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ✅ Fetch student data from backend (includes startTime)
  const fetchStudentData = useCallback(async () => {
    if (!testId) return null;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${serverURL}/coding/attempt-status/${testId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (data.success) {
        // console.log("📊 Student data fetched:", {
        //   status: data.status,
        //   startTime: data.startTime,
        //   solutions: data.solutions?.length || 0,
        //   passedCount: data.passedCount,
        // });

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
  }, [testId, serverURL]);

  // ✅ Calculate remaining time using backend startTime
  const calculateRemaining = useCallback((startTimeMs, durationMs) => {
    if (!startTimeMs || !durationMs) return 0;
    const endTimeMs = startTimeMs + durationMs;
    return Math.max(0, endTimeMs - Date.now());
  }, []);

  // ✅ Start the timer using backend startTime
  const startTimer = useCallback(
    async (durationMs) => {
      if (!testId || isEndedRef.current) return;
      if (isInitializedRef.current) {
        // console.log("⏰ Timer already initialized");
        return;
      }

      clearTimer();
      setTestDuration(durationMs);

      let startTimeMs = null;

      // ✅ STEP 1: Try to get startTime from localStorage first (for speed)
      const localStartTime = localStorage.getItem(`test_start_time_${testId}`);
      if (localStartTime) {
        startTimeMs = parseInt(localStartTime);
        // console.log(
        //   `⏰ Using cached start time: ${new Date(startTimeMs).toLocaleTimeString()}`,
        // );
      }

      // ✅ STEP 2: If not in localStorage, fetch from backend
      if (!startTimeMs) {
        const studentData = await fetchStudentData();
        if (studentData && studentData.startTime) {
          startTimeMs = new Date(studentData.startTime).getTime();
          // Cache it
          localStorage.setItem(
            `test_start_time_${testId}`,
            startTimeMs.toString(),
          );
          //   console.log(
          //     `⏰ Fetched start time from backend: ${new Date(startTimeMs).toLocaleTimeString()}`,
          //   );
        }
      }

      // ✅ STEP 3: If still no startTime, this is a new test - create one
      if (!startTimeMs) {
        // console.log("⏰ No start time found, creating new test...");
        startTimeMs = Date.now();

        // Store in localStorage
        localStorage.setItem(
          `test_start_time_${testId}`,
          startTimeMs.toString(),
        );

        // ✅ IMPORTANT: Update backend with startTime
        try {
          const token = localStorage.getItem("token");
          await fetch(`${serverURL}/coding/update-start-time`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              testId: testId,
              startTime: new Date(startTimeMs).toISOString(),
            }),
          });
          //   console.log("✅ Start time saved to backend");
        } catch (error) {
          console.error("❌ Failed to save start time to backend:", error);
          // Continue anyway - we have it in localStorage
        }
      }

      setStartTime(startTimeMs);

      // ✅ Calculate remaining time
      const endTimeMs = startTimeMs + durationMs;
      const remaining = calculateRemaining(startTimeMs, durationMs);

      //   console.log(
      //     `⏰ Test started at: ${new Date(startTimeMs).toLocaleTimeString()}`,
      //   );
      //   console.log(
      //     `⏰ Will end at: ${new Date(endTimeMs).toLocaleTimeString()}`,
      //   );
      //   console.log(`⏰ Remaining: ${Math.floor(remaining / 60000)} minutes`);

      if (remaining <= 0) {
        // Time's up!
        setIsTestEnded(true);
        isEndedRef.current = true;
        setTimeRemaining(0);
        onTimeUp?.();
        return;
      }

      setTimeRemaining(remaining);
      setEndTime(endTimeMs);
      isInitializedRef.current = true;

      // Store endTime for quick access
      localStorage.setItem(`test_end_time_${testId}`, endTimeMs.toString());

      // ✅ Start countdown timer
      timerRef.current = setInterval(() => {
        const newRemaining = calculateRemaining(startTimeMs, durationMs);

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
    [testId, clearTimer, onTimeUp, fetchStudentData, calculateRemaining],
  );

  // ✅ Submit test with endTime
  const submitTest = useCallback(
    async (isAuto = false) => {
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
            testId: testId,
            endTime: new Date().toISOString(),
            isAuto: isAuto,
          }),
        });

        const data = await response.json();

        if (data.success) {
          // Clear timer and localStorage
          clearTimer();
          setIsTestEnded(true);
          isEndedRef.current = true;

          // Remove from localStorage
          localStorage.removeItem(`test_start_time_${testId}`);
          localStorage.removeItem(`test_end_time_${testId}`);
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
    [testId, serverURL, clearTimer],
  );

  // ✅ Reset timer
  const resetTimer = useCallback(() => {
    clearTimer();
    setTimeRemaining(0);
    setIsTestEnded(false);
    isEndedRef.current = false;
    isSubmittingRef.current = false;
    isInitializedRef.current = false;
    if (testId) {
      localStorage.removeItem(`test_start_time_${testId}`);
      localStorage.removeItem(`test_end_time_${testId}`);
    }
  }, [testId, clearTimer]);

  // ✅ Handle tab visibility change - recalculate from backend
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (
        document.visibilityState === "visible" &&
        testId &&
        isInitializedRef.current
      ) {
        // console.log("👁️ Tab visible - recalculating time...");

        // Fetch latest data from backend
        const studentData = await fetchStudentData();
        if (studentData && studentData.startTime) {
          const startTimeMs = new Date(studentData.startTime).getTime();
          const remaining = calculateRemaining(startTimeMs, testDuration);

          //   console.log(
          //     `⏰ Recalculated: ${Math.floor(remaining / 60000)} minutes`,
          //   );

          if (remaining <= 0 && !isEndedRef.current) {
            isEndedRef.current = true;
            setIsTestEnded(true);
            setTimeRemaining(0);
            toast.error("⏰ Time's up! Auto-submitting...");
            onTimeUp?.();
          } else {
            setTimeRemaining(remaining);
            setStartTime(startTimeMs);
            setEndTime(startTimeMs + testDuration);
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [testId, testDuration, fetchStudentData, calculateRemaining, onTimeUp]);

  // ✅ Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  // ✅ Get remaining time (public method)
  const getRemainingTime = useCallback(() => {
    if (!startTime || !testDuration) return 0;
    return calculateRemaining(startTime, testDuration);
  }, [startTime, testDuration, calculateRemaining]);

  return {
    timeRemaining,
    isTestEnded,
    startTimer,
    resetTimer,
    clearTimer,
    setIsTestEnded,
    isEndedRef,
    isSubmittingRef,
    submitTest,
    getRemainingTime,
    startTime,
    endTime,
    testDuration,
    isInitialized: isInitializedRef.current,
  };
};
