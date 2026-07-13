// backend/middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import mongoose from "mongoose";

const BYPASS_AUTH = false;

const BYPASS_USER = {
  _id: "6921b7269beaa5aab8513024", // Your test user ID from database
  email: "test@gmail.com",
  fullName: "Harsh Jaiswal",
  role: "admin",
  college: "AKGEC",
  branch: "CS",
  phone: "7607811792",
  location: "Gorakhpur",
  isOnline: true,
};
export const protect = async (req, res, next) => {
  try {
    // ✅ BYPASS AUTH FOR TESTING
    if (BYPASS_AUTH) {
      console.log("🔓 [DEV] Authentication bypassed");

      // Create a mock user for testing
      const mockUser = {
        _id: new mongoose.Types.ObjectId(BYPASS_USER._id),
        email: BYPASS_USER.email,
        fullName: BYPASS_USER.fullName,
        role: BYPASS_USER.role,
        college: BYPASS_USER.college,
        branch: BYPASS_USER.branch || "CS",
        phone: BYPASS_USER.phone || "",
        location: BYPASS_USER.location || "",
        isOnline: BYPASS_USER.isOnline || true,
        // ✅ Add any other fields your app needs
        toObject: function () {
          return this;
        },
        toString: function () {
          return this._id.toString();
        },
      };

      req.user = mockUser;
      req.userId = mockUser._id;
      req.userRole = mockUser.role;
      req.token = "bypass-token";
      req.isBypassed = true;

      return next();
    }

    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      console.log("❌ No token provided");
      return res.status(401).json({
        success: false,
        error: "No token provided. Please login.",
      });
    }

    console.log("🔑 Token received:", token.substring(0, 20) + "...");

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("✅ Token verified:", decoded);
    } catch (error) {
      console.error("❌ Token verification failed:", error.message);
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          error: "Invalid token. Please login again.",
        });
      }
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          error: "Token expired. Please login again.",
        });
      }
      throw error;
    }

    // Get user from database
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      console.log("❌ User not found for ID:", decoded.id);
      return res.status(401).json({
        success: false,
        error: "User not found. Please login again.",
      });
    }

    console.log("✅ User found:", {
      id: user._id,
      email: user.email,
      role: user.role,
    });

    // ✅ Attach user to request
    req.user = user;
    req.userId = user._id; // This is the ObjectId
    req.userRole = user.role;
    req.token = token;

    next();
  } catch (error) {
    console.error("❌ Auth error:", error);
    res.status(500).json({
      success: false,
      error: "Authentication failed. Please try again.",
    });
  }
};
