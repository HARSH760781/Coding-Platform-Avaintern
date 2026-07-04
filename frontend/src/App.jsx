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

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 🔹 Check if we already have data in localStorage
    const checkExistingAuth = () => {
      const token = localStorage.getItem("token");
      const role = localStorage.getItem("role");

      if (token && role) {
        setIsAdmin(role === "admin");
        // console.log("📋 Existing auth found:", { role, hasToken: !!token });
      }
      setIsLoading(false);
    };

    // 🔹 Listen for auth data from parent window
    const handleMessage = (event) => {
      // 🔒 Security: Verify the sender origin
      const allowedOrigins = [
        "https://avainternlms.in", // Your main app URL
        "http://localhost:5173", // Local development
        "http://localhost:3000", // Local development alternative
        "https://coding-platform-avaintern.onrender.com", // If same domain
      ];

      if (!allowedOrigins.includes(event.origin)) {
        console.warn("⚠️ Unauthorized message origin:", event.origin);
        return;
      }

      // Check if it's our auth message
      if (event.data?.type === "USER_AUTH_DATA") {
        const { token, role, userId, email, testId, testTitle } =
          event.data.data;

        // console.log("📥 Received auth data:", {
        //   hasToken: !!token,
        //   role: role,
        //   userId: userId,
        //   testId: testId,
        //   testTitle: testTitle,
        // });

        // ✅ Store in localStorage
        if (token) localStorage.setItem("token", token);
        if (role) {
          localStorage.setItem("role", role);
          setIsAdmin(role === "admin");
        }
        if (userId) localStorage.setItem("userId", userId);
        if (email) localStorage.setItem("email", email);
        if (testId) {
          localStorage.setItem("testId", testId);
          localStorage.setItem("currentTestId", testId);
        }
        if (testTitle) {
          localStorage.setItem("testTitle", testTitle);
          localStorage.setItem("currentTestTitle", testTitle);
        }

        // 🎯 Optionally, you can trigger a re-render or fetch data
        // console.log("✅ Auth data synchronized successfully!");

        // If user is admin, they can access admin panel
        // if (role === "admin") {
        //   // console.log("👑 Admin access granted!");
        // } else {
        //   console.log("👤 User access granted!");
        // }
      }
    };

    // Check existing auth first
    checkExistingAuth();

    // Add message listener
    window.addEventListener("message", handleMessage);

    // 🧹 Cleanup
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading...</p>
        </div>
      </div>
    );
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
        <Route path="/" element={<Navigate to="/problems" />} />
        <Route path="/problems" element={<ProblemsList />} />
        <Route path="/problem/:problemId" element={<ProblemDetail />} />
        {isAdmin && <Route path="/admin" element={<AdminPanel />} />}
      </Routes>
    </Router>
  );
}

export default App;
