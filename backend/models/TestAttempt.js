// backend/models/TestAttempt.js
// ✅ UPDATED VERSION

import mongoose from "mongoose";

const testAttemptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  testId: {
    type: String,
    required: true,
    index: true,
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["in_progress", "completed", "timed_out"],
    default: "in_progress",
  },

  // ✅ NEW: Array of solutions (grouped)
  solutions: [
    {
      problemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Problem",
      },
      code: {
        type: String,
        default: "",
      },
      language: {
        type: String,
        default: "python",
      },
      status: {
        type: String,
        enum: [
          "accepted",
          "wrong_answer",
          "runtime_error",
          "compilation_error",
          "pending",
        ],
        default: "pending",
      },
      passedTests: {
        type: Number,
        default: 0,
      },
      totalTests: {
        type: Number,
        default: 0,
      },
      executionTime: {
        type: Number,
        default: 0,
      },
      submittedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  // ✅ NEW: Aggregated scores
  passedCount: {
    type: Number,
    default: 0,
  },
  totalProblems: {
    type: Number,
    default: 0,
  },
  percentage: {
    type: Number,
    default: 0,
  },
  passed: {
    type: Boolean,
    default: false,
  },
  submittedAt: {
    type: Date,
  },
});

testAttemptSchema.index({ userId: 1, testId: 1 }, { unique: true });
testAttemptSchema.index({ testId: 1, status: 1 });

export default mongoose.model("TestAttempt", testAttemptSchema);
