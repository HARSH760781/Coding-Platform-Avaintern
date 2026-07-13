// backend/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

// ✅ IMPORTANT: Load dotenv FIRST before any other imports
dotenv.config();

// Now import routes AFTER dotenv is configured
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import problemRoutes from "./routes/problems.js";
import submissionRoutes from "./routes/submissions.js";
import testcaseRoutes from "./routes/testcases.js";
import codingRoutes from "./routes/codingTests.js";

// ============================================
// 🔍 DEBUG: Check ALL environment variables
// ============================================
// console.log("📋 === ENVIRONMENT VARIABLES ===");
// console.log("  PORT:", process.env.PORT || "❌ NOT SET");
// console.log("  MONGODB_URI:", process.env.MONGODB_URI ? "✅ SET" : "❌ NOT SET");
// console.log("  JWT_SECRET:", process.env.JWT_SECRET ? "✅ SET" : "❌ NOT SET");
// console.log("  RAPIDAPI_KEY:", process.env.RAPIDAPI_KEY ? "✅ SET" : "❌ NOT SET");
// console.log("  RAPIDAPI_HOST:", process.env.RAPIDAPI_HOST || "❌ NOT SET");
// console.log("  JUDGE0_API_URL:", process.env.JUDGE0_API_URL || "❌ NOT SET");
// console.log("  GOOGLE_SHEETS_URL:", process.env.GOOGLE_SHEETS_URL ? "✅ SET" : "❌ NOT SET");
// console.log("================================");

// ============================================
// 🚀 Initialize Express App
// ============================================
const app = express();

app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// TEMPORARY: Bypass auth for all routes
// app.use((req, res, next) => {
//   // console.log(`📡 ${req.method} ${req.url}`);
//   req.user = { id: "test_user_123", role: "admin" };
//   req.userId = "test_user_123";
//   next();
// });

// ============================================
// 📡 Routes
// ============================================
app.use("/api/auth", authRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/testcases", testcaseRoutes);
app.use("/api/coding", codingRoutes);

// ============================================
// 🏥 Health Check Routes
// ============================================
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend is working!", timestamp: new Date() });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Coding Platform is running",
    database: mongoose.connection.name,
  });
});

// ============================================
// 🔑 Environment Debug Endpoint
// ============================================
app.get("/api/debug/env", (req, res) => {
  res.json({
    rapidapi_key: process.env.RAPIDAPI_KEY ? "✅ SET" : "❌ NOT SET",
    rapidapi_host: process.env.RAPIDAPI_HOST || "❌ NOT SET",
    judge0_api_url: process.env.JUDGE0_API_URL || "❌ NOT SET",
    key_value: process.env.RAPIDAPI_KEY
      ? process.env.RAPIDAPI_KEY.substring(0, 10) + "..."
      : "N/A",
  });
});

// ============================================
// 🚀 Start Server
// ============================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Test API: http://localhost:${PORT}/api/test`);
  console.log(`📋 Problems API: http://localhost:${PORT}/api/problems`);
  console.log(`💻 Coding API: http://localhost:${PORT}/api/coding`);
  console.log(`🔍 Debug: http://localhost:${PORT}/api/debug/env`);
});
