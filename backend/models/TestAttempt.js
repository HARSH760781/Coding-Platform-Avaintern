// backend/models/TestAttempt.js
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
    enum: [
      "in_progress",
      "completed",
      // ✅ All possible status values
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
      "timed_out",
    ],
    default: "in_progress",
  },
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
          // ✅ All possible status values
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

// ✅ Clear the model cache before exporting
// This ensures Mongoose uses the updated schema
if (mongoose.models.TestAttempt) {
  delete mongoose.models.TestAttempt;
}

export default mongoose.model("TestAttempt", testAttemptSchema);
