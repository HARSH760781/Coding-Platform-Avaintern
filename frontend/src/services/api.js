// frontend/src/services/api.js
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://coding-platform-avaintern.onrender.com/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Attach Authorization from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    console.warn("⚠️ [api] No token in localStorage when calling", config.url);
  }
  return config;
});

// ============================================
// ✅ FIXED: current testId resolver
// Priority: URL → currentTestId → testStringId → testId
// Filters out literal "undefined"/"null" strings
// Syncs URL value back into localStorage so all reads agree
// ============================================
const getCurrentTestId = () => {
  // 1. URL param always wins
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const urlTestId = urlParams.get("testId");

    if (urlTestId && urlTestId !== "undefined" && urlTestId !== "null") {
      // Keep localStorage in sync so subsequent reads use the same value
      if (localStorage.getItem("currentTestId") !== urlTestId) {
        localStorage.setItem("currentTestId", urlTestId);
      }
      return urlTestId;
    }
  } catch (e) {
    // window not available (SSR) — fall through
  }

  // 2. Then localStorage candidates in priority order
  const candidates = [
    localStorage.getItem("currentTestId"),
    localStorage.getItem("testStringId"),
    localStorage.getItem("testId"),
  ];

  for (const id of candidates) {
    if (id && id !== "undefined" && id !== "null") {
      return id;
    }
  }

  return null;
};

// ============================================
// PROBLEMS API
// ============================================

// ✅ Accepts optional testIdOverride (used by ProblemsList on init)
export const getProblems = (testIdOverride) => {
  const testId = testIdOverride || getCurrentTestId();
  if (!testId) {
    console.warn("⚠️ [api] getProblems called without testId");
    return Promise.resolve({ data: { success: true, problems: [] } });
  }
  return api.get(`/problems?testId=${encodeURIComponent(testId)}`);
};

// ✅ Accepts optional testIdOverride too
export const getProblem = (problemId, testIdOverride) => {
  const testId = testIdOverride || getCurrentTestId();
  if (!testId) {
    return Promise.reject(new Error("No testId available"));
  }
  return api.get(`/problems/${problemId}?testId=${encodeURIComponent(testId)}`);
};

// ============================================
// CODING TESTS API
// ============================================

// ✅ getCurrentTestId now prioritizes URL, so the comment below still holds:
// the string testId always wins over the ObjectId prop.
export const submitCodingSolution = (data) =>
  api.post("/coding/submit", {
    ...data,
    testId: getCurrentTestId() || data.testId,
  });

export const runSamples = (data) =>
  api.post("/coding/run-samples", {
    ...data,
    testId: getCurrentTestId() || data.testId,
  });

export const getSampleTestCases = (problemId, testIdOverride) => {
  const testId = testIdOverride || getCurrentTestId();
  if (!testId) {
    console.warn("⚠️ [api] getSampleTestCases called without testId");
    return Promise.reject(new Error("No testId available"));
  }
  return api.get(
    `/coding/problem/${problemId}/testcases?testId=${encodeURIComponent(testId)}`,
  );
};

export const getSubmissions = (userId) =>
  api.get(`/coding/submissions/${userId}`);

export default api;
