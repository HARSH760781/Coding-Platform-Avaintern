  // backend/models/Submission.js
  import mongoose from "mongoose";

  const submissionSchema = new mongoose.Schema({
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
    language: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "Accepted",
        "Wrong Answer",
        "Time Limit Exceeded",
        "Memory Limit Exceeded",
        "Runtime Error",
        "Compilation Error",
        "Pending",
      ],
      default: "Pending",
    },
    score: {
      type: Number,
      default: 0,
    },
    totalTestCases: {
      type: Number,
      default: 0,
    },
    passedTestCases: {
      type: Number,
      default: 0,
    },
    executionTime: {
      type: Number,
    },
    memoryUsed: {
      type: Number,
    },
    testResults: [
      {
        testCaseId: Number,
        passed: Boolean,
        input: String,
        expected: String,
        output: String,
        error: String,
        executionTime: Number,
      },
    ],
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  });

  export default mongoose.model("Submission", submissionSchema);
