// import mongoose from "mongoose";

// const userResultsSchema = new mongoose.Schema({
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     required: true,
//     unique: true,
//   },
//   tests: [
//     {
//       test: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Test",
//         required: true,
//       },
//       answers: { type: Object },
//       score: { type: Number, required: true },
//       total: { type: Number, required: true },
//       submittedAt: { type: Date, default: Date.now },
//       metadata: {
//         type: mongoose.Schema.Types.Mixed,
//         default: () => ({}), // Empty object by default
//       },
//     },
//   ],
// });

// export default mongoose.model("UserResults", userResultsSchema);

// backend/models/TestResult.js
import mongoose from "mongoose";

const testResultSchema = new mongoose.Schema({
  testId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  testTitle: {
    type: String,
    required: true,
  },
  subject: String,
  topic: String,
  college: String,
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
      status: {
        type: String,
        enum: ["in_progress", "completed", "timed_out"],
        default: "in_progress",
      },
      startTime: Date,
      endTime: Date,
      timeTaken: Number,
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

testResultSchema.index({ testId: 1 });
testResultSchema.index({ "students.userId": 1 });

export default mongoose.model("TestResult", testResultSchema);
