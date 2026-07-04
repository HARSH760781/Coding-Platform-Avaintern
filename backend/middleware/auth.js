// backend/middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    // Get token from Authorization header
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
