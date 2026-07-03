// backend/models/TestAttempt.js
import mongoose from "mongoose";

const testAttemptSchema = new mongoose.Schema({
  userId: {
    // type: mongoose.Schema.Types.ObjectId,
    type: String,
    ref: "User",
    required: true,
  },
  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Problem",
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  language: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: [
      "accepted",
      "wrong_answer",
      "runtime_error",
      "compilation_error",
      "time_limit_exceeded",
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
  testResults: {
    type: Array,
    default: [],
  },
  executionTime: {
    type: Number,
    default: 0,
  },
  memoryUsed: {
    type: Number,
    default: 0,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("TestAttempt", testAttemptSchema);
