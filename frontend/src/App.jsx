// frontend/src/App.jsx

import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ProblemsList from "./pages/ProblemsList";
import AdminPanel from "./pages/AdminPanel";
import ProblemDetail from "./pages/ProblemDetail";
import Header from "./components/Header";
import { Loader2, Code2 } from "lucide-react";
import { useRole } from "./Hooks/useRole";

// ✅ Layout Component
const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>{children}</main>
    </div>
  );
};

// ✅ Loading Screen Component - Professional Look
const LoadingScreen = ({ message = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30">
      <div className="text-center">
        {/* Animated Logo/Icon */}
        <div className="relative">
          <div className="w-20 h-20 mx-auto relative">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-purple-200/50 animate-pulse"></div>
            {/* Spinning ring */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-600 border-r-purple-400 animate-spin"></div>
            {/* Inner icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Code2 className="w-8 h-8 text-purple-600 animate-pulse" />
            </div>
          </div>
        </div>

        <h2 className="mt-6 text-2xl font-bold text-gray-800">
          Code<span className="text-purple-600">Arena</span>
        </h2>

        <div className="mt-4 flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
          <p className="text-gray-500 text-sm font-medium">{message}</p>
        </div>

        {/* Loading dots animation */}
        <div className="mt-3 flex justify-center gap-1">
          <div
            className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          ></div>
          <div
            className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          ></div>
          <div
            className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          ></div>
        </div>
      </div>
    </div>
  );
};

function App() {
  // const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Initializing...");

  // ✅ Use the useRole hook
  const { isAdmin, loading: roleLoading, error } = useRole();

  useEffect(() => {
    let dataReceived = false;

    // 🔹 Check if we already have data in localStorage
    const checkExistingAuth = () => {
      const token = localStorage.getItem("token");
      const role = localStorage.getItem("role");
      const testId = localStorage.getItem("currentTestId");
      const userId = localStorage.getItem("userId");

      // ✅ If we have all required data, skip loading
      if (token && userId && testId) {
        setLoadingMessage("Loading your test...");
        setIsDataLoaded(true);
        setIsLoading(false);
        return true;
      }

      // If we have token but no test data, wait for postMessage
      if (token) {
        setLoadingMessage("Waiting for test data...");
        return false;
      }

      return false;
    };

    const hasData = checkExistingAuth();

    // If no data at all, show loading and wait for postMessage
    if (!hasData) {
      setLoadingMessage("Connecting to your test...");
    }

    // 🔹 Listen for auth data from parent window
    const handleMessage = (event) => {
      // 🔒 Security: Verify the sender origin
      const allowedOrigins = [
        "https://avainternlms.in",
        "http://localhost:5173",
        "http://localhost:3000",
        "https://coding-platform-avaintern.onrender.com",
      ];

      if (!allowedOrigins.includes(event.origin)) {
        console.warn("⚠️ Unauthorized message origin:", event.origin);
        return;
      }

      if (event.data?.type === "USER_AUTH_DATA") {
        const { token, role, userId, email, testId, testTitle, college } =
          event.data.data;

        // console.log("📥 Received USER_AUTH_DATA:", {
        //   token: !!token,
        //   userId,
        //   testId,
        //   testTitle,
        // });

        // ✅ Store data
        if (token) localStorage.setItem("token", token);
        if (userId) localStorage.setItem("userId", userId);
        if (email) localStorage.setItem("email", email);
        if (college) localStorage.setItem("college", college);
        if (testId) {
          localStorage.setItem("testId", testId);
          localStorage.setItem("currentTestId", testId);
        }
        if (testTitle) {
          localStorage.setItem("testTitle", testTitle);
          localStorage.setItem("currentTestTitle", testTitle);
        }

        if (role) {
          localStorage.setItem("role", role);
        }
        // ✅ Data is now loaded
        setLoadingMessage("Loading your test content...");

        // ✅ Small delay to show loading state (makes it feel more polished)
        setTimeout(() => {
          setIsDataLoaded(true);
          setIsLoading(false);

          // ✅ Dispatch event for components to refresh
          window.dispatchEvent(new CustomEvent("refreshTestAttempt"));
          // console.log("📤 Dispatched refreshTestAttempt event");
        }, 500);
      }
    };

    // ✅ If no data received after 5 seconds, still load (fallback)
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        // console.log("⏰ Loading timeout, showing content anyway");
        setIsLoading(false);
        setIsDataLoaded(true);
      }
    }, 5000);

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(timeoutId);
    };
  }, []);

  // ✅ Show loading screen while waiting for data
  if (isLoading) {
    return <LoadingScreen message={loadingMessage} />;
  }

  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#1f2937",
            color: "#fff",
            borderRadius: "12px",
          },
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <Navigate to="/problems" />
            </Layout>
          }
        />
        <Route
          path="/problems"
          element={
            <Layout>
              <ProblemsList />
            </Layout>
          }
        />
        <Route
          path="/problem/:problemId"
          element={
            <Layout>
              <ProblemDetail />
            </Layout>
          }
        />
        {isAdmin && (
          <Route
            path="/admin"
            element={
              <Layout>
                <AdminPanel />
              </Layout>
            }
          />
        )}
      </Routes>
    </Router>
  );
}

export default App;
