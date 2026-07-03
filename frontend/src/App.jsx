import React from "react";
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
  const isAdmin = true;
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
