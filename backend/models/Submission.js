// backend/models/CodingTestAttempt.js
import mongoose from "mongoose";

const codingTestAttemptSchema = new mongoose.Schema({
  // ============================================
  // USER & TEST REFERENCES
  // ============================================
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

  // ============================================
  // TIMING
  // ============================================
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: {
    type: Date,
  },
  timeTaken: {
    type: Number, // in seconds
    default: 0,
  },

  // ============================================
  // STATUS
  // ============================================
  status: {
    type: String,
    enum: ["in_progress", "completed", "timed_out"],
    default: "in_progress",
  },
  autoSubmitted: {
    type: Boolean,
    default: false,
  },

  // ============================================
  // ✅ SOLUTIONS (Grouped by User)
  // ============================================
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
          // ✅ Accepted formats (all variants)
          "accepted",
          "Accepted",
          "Accepted ✅",

          // ✅ Wrong Answer formats
          "wrong_answer",
          "wrong-answer",
          "Wrong Answer",
          "Wrong Answer ❌",
          "WA",

          // ✅ Runtime Error formats
          "runtime_error",
          "runtime-error",
          "Runtime Error",
          "Runtime Error ⚠️",
          "RE",

          // ✅ Compilation Error formats
          "compilation_error",
          "compilation-error",
          "Compilation Error",
          "Compilation Error 🔧",
          "CE",

          // ✅ Time Limit formats
          "time_limit",
          "time_limit_exceeded",
          "time-limit-exceeded",
          "Time Limit Exceeded",
          "TLE",

          // ✅ Pending formats
          "pending",
          "Pending",
          "Pending ⏳",

          // ✅ Other common statuses
          "partially_accepted",
          "Partially Accepted",
          "memory_limit_exceeded",
          "Memory Limit Exceeded",
          "MLE",
          "output_limit_exceeded",
          "Output Limit Exceeded",
          "OLE",
          "internal_error",
          "Internal Error",
          "IE",
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

  // ============================================
  // ✅ AGGREGATED SCORES
  // ============================================
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

// ✅ Indexes
codingTestAttemptSchema.index({ userId: 1, testId: 1 }, { unique: true });
codingTestAttemptSchema.index({ testId: 1, status: 1 });

export default mongoose.model("CodingTestAttempt", codingTestAttemptSchema);
