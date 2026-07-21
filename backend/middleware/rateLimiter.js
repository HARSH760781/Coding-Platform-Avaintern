// backend/middleware/rateLimiter.js

import rateLimit from "express-rate-limit";

// ✅ General rate limiter for all submissions
export const submissionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // Limit each user to 15 submissions per minute
  message: {
    success: false,
    error:
      "Too many submission attempts. Please wait a moment before trying again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.userId || req.ip;
  },
  skip: (req) => {
    return req.user?.role === "admin";
  },
});

// ✅ Strict rate limiter for the same problem
export const sameProblemLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: 3,
  message: {
    success: false,
    error:
      "Too many submissions for this problem. Please wait before trying again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `${req.userId}_${req.body.problemId}`;
  },
});

// ✅ Per test rate limiter
export const testSubmissionLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 5,
  message: {
    success: false,
    error:
      "Too many submissions for this test. Please wait before trying again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return `${req.userId}_${req.body.testId}`;
  },
});

// ✅ Daily submission limit
export const dailySubmissionLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 100,
  message: {
    success: false,
    error: "Daily submission limit reached. Please try again tomorrow.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.userId || req.ip;
  },
});
