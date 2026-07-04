// frontend/src/services/api.js
import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://coding-platform-avaintern.onrender.com/api";

console.log("🔧 API_URL from env:", import.meta.env.VITE_API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================
// PROBLEMS API
// ============================================
export const getProblems = () => api.get("/problems");
export const getProblem = (problemId) => api.get(`/problems/${problemId}`);

// ============================================
// CODING TESTS API
// ============================================

// ✅ Submit - Runs ALL test cases (Sample + Hidden) and SAVES to database
export const submitCodingSolution = (data) => api.post("/coding/submit", data);

// ✅ Run Samples - Runs ONLY sample test cases, DOES NOT save
export const runSamples = (data) => api.post("/coding/run-samples", data);

// Get sample test cases for display
export const getSampleTestCases = (problemId) =>
  api.get(`/coding/problem/${problemId}/testcases`);

// Get user submissions history
export const getSubmissions = (userId) =>
  api.get(`/coding/submissions/${userId}`);

export default api;
