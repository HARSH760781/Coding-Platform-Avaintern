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
import Header from "./components/Header"; // ✅ Import Header

// ✅ Layout Component
const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>{children}</main>
    </div>
  );
};

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
      }
      setIsLoading(false);
    };

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
        const { token, role, userId, email, testId, testTitle } =
          event.data.data;

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
      }
    };

    checkExistingAuth();
    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

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
        {/* ✅ Routes WITH Header */}
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
