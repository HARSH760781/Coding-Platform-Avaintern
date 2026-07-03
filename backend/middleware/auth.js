// // backend/middleware/auth.js
// import jwt from "jsonwebtoken";
// import User from "../models/User.js";

// export const protect = async (req, res, next) => {
//   const token = req.header("Authorization")?.replace("Bearer ", "");

//   if (!token) {
//     return res.status(401).json({ error: "No token provided" });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const user = await User.findById(decoded.id).select("-password");

//     if (!user) {
//       return res.status(401).json({ error: "Invalid token" });
//     }

//     req.user = user;
//     req.userId = user._id;
//     next();
//   } catch (error) {
//     res.status(401).json({ error: "Invalid token" });
//   }
// };

// backend/middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  // ============================================
  // TEMPORARY BYPASS FOR TESTING
  // Remove this when integrating with main website
  // ============================================
  const bypassAuth = true; // Set to false when done testing

  if (bypassAuth) {
    console.log("🔓 Auth bypassed - using test user");
    // Create a dummy user for testing
    req.user = {
      _id: "test_user_123",
      id: "test_user_123",
      fullName: "Test User",
      email: "test@example.com",
      role: "admin",
    };
    req.userId = "test_user_123";
    return next();
  }

  // ============================================
  // REAL AUTHENTICATION (Keep this for production)
  // ============================================
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};
