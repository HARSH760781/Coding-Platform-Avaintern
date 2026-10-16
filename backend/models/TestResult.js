// backend/models/TestResult.js
import mongoose from "mongoose";

const testResultSchema = new mongoose.Schema({
  testId: {
    type: String,
    required: true,
    unique: true,
    // index: true,
  },
  testTitle: {
    type: String,
    required: true,
  },
  subject: String,
  topic: String,
  college: String,

  // ✅ Multi-tenant fields (mirror CodingTest)
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "College",
    default: null,
    index: true,
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    default: null,
  },

  totalQuestions: {
    type: Number,
    default: 0,
  },
  passingPercentage: {
    type: Number,
    default: 40,
  },

  students: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      userEmail: String,
      userName: String,

      solutions: [
        {
          problemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Problem",
          },
          problemTitle: String,
          status: String,
          code: String,
          language: String,
          passedTests: Number,
          totalTests: Number,
          executionTime: Number,
          submittedAt: Date,
        },
      ],

      totalSolved: {
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

      // ✅ Status enum — keep all four variants
      status: {
        type: String,
        enum: ["in_progress", "completed", "timed_out", "submitted"],
        default: "in_progress",
      },

      // ✅ Lifecycle timestamps
      startTime: Date,
      endTime: Date,
      submittedAt: Date, // NEW — was missing, silently dropped
      timeTaken: Number, // minutes
      autoSubmitted: { type: Boolean, default: false }, // NEW — tracks auto vs manual
    },
  ],

  stats: {
    totalStudents: { type: Number, default: 0 },
    passedStudents: { type: Number, default: 0 },
    failedStudents: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    passRate: { type: Number, default: 0 },
  },

  generatedAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// =============================
// Indexes
// =============================
testResultSchema.index({ "students.userId": 1 });
testResultSchema.index({ collegeId: 1, testId: 1 });
testResultSchema.index({ "students.status": 1 });

export default mongoose.model("TestResult", testResultSchema);
