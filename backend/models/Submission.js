// backend/models/CodingTestAttempt.js
import mongoose from "mongoose";

const codingTestAttemptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },

  // ✅ Tests array - each test contains all problems
  tests: [
    {
      testId: {
        type: String,
        required: true,
      },
      testTitle: {
        type: String,
        default: "",
      },
      status: {
        type: String,
        enum: [
          "in_progress",
          "completed",
          "timed_out",
          "submitted",
          "accepted",
          "Accepted",
          "Accepted ✅",
          "wrong_answer",
          "wrong-answer",
          "Wrong Answer",
          "Wrong Answer ❌",
          "WA",
          "runtime_error",
          "runtime-error",
          "Runtime Error",
          "Runtime Error ⚠️",
          "RE",
          "compilation_error",
          "compilation-error",
          "Compilation Error",
          "Compilation Error 🔧",
          "CE",
          "time_limit",
          "time_limit_exceeded",
          "time-limit-exceeded",
          "Time Limit Exceeded",
          "TLE",
          "pending",
          "Pending",
          "Pending ⏳",
        ],
        default: "in_progress",
      },
      startTime: {
        type: Date,
        default: Date.now,
      },
      endTime: {
        type: Date,
      },
      timeTaken: {
        type: Number,
        default: 0,
      },
      autoSubmitted: {
        type: Boolean,
        default: false,
      },

      // ✅ Problems array - all solutions for this test
      solutions: [
        {
          problemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Problem",
          },
          problemTitle: {
            type: String,
            default: "",
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
              "Accepted",
              "Accepted ✅",
              "submitted",
              "wrong_answer",
              "wrong-answer",
              "Wrong Answer",
              "Wrong Answer ❌",
              "WA",
              "runtime_error",
              "runtime-error",
              "Runtime Error",
              "Runtime Error ⚠️",
              "RE",
              "compilation_error",
              "compilation-error",
              "Compilation Error",
              "Compilation Error 🔧",
              "CE",
              "time_limit",
              "time_limit_exceeded",
              "time-limit-exceeded",
              "Time Limit Exceeded",
              "TLE",
              "pending",
              "Pending",
              "Pending ⏳",
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

      // ✅ Aggregated scores for this test
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
    },
  ],

  // ✅ Overall user stats
  totalTestsTaken: {
    type: Number,
    default: 0,
  },
  totalProblemsSolved: {
    type: Number,
    default: 0,
  },
  averageScore: {
    type: Number,
    default: 0,
  },
});

// ✅ Indexes
codingTestAttemptSchema.index({ userId: 1 });
codingTestAttemptSchema.index({ "tests.testId": 1 });

export default mongoose.model("CodingTestAttempt", codingTestAttemptSchema);
