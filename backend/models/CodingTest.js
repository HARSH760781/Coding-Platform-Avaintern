// server/models/CodingTest.js
import mongoose from "mongoose";

const testCaseSchema = new mongoose.Schema(
  {
    input: { type: String, default: "" },
    expectedOutput: { type: String, default: "" },
    isHidden: { type: Boolean, default: false },
    explanation: { type: String, default: "" },
    weightage: { type: Number, default: 1 },
  },
  { _id: false },
);

const exampleSchema = new mongoose.Schema(
  {
    input: { type: String, default: "" },
    output: { type: String, default: "" },
    explanation: { type: String, default: "" },
  },
  { _id: false },
);

const embeddedProblemSchema = new mongoose.Schema(
  {
    problemId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      required: true,
    },
    tags: [{ type: String }],
    companies: [{ type: String }],
    constraints: { type: String, default: "" },
    examples: [exampleSchema],
    testCases: [testCaseSchema],
    hints: [{ type: String }],
    timeLimit: { type: Number, default: 2 },
    memoryLimit: { type: Number, default: 256 },
    starterCode: {
      python: { type: String, default: "" },
      javascript: { type: String, default: "" },
      java: { type: String, default: "" },
      cpp: { type: String, default: "" },
      c: { type: String, default: "" },
    },
    // ✅ NEW: acceptance stats
    submissions: { type: Number, default: 0 },
    accepted: { type: Number, default: 0 },
  },
  { _id: true },
);

const codingTestSchema = new mongoose.Schema({
  testId: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "", trim: true },
  subject: { type: String, required: true, trim: true },
  topic: { type: String, required: true, trim: true },

  // Multi-tenant fields
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
  college: { type: String, required: true },

  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  duration: { type: Number, required: true },
  totalQuestions: { type: Number, default: 0 },
  passingPercentage: { type: Number, default: 40 },
  isActive: { type: Boolean, default: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  // ── NEW: embedded problems ──
  problems: {
    type: [embeddedProblemSchema],
    default: [],
    validate: [
      (arr) => arr.length <= 500,
      "Cannot exceed 500 problems per test",
    ],
  },
});

codingTestSchema.index({ collegeId: 1, testId: 1 }, { unique: true });

export default mongoose.model("CodingTest", codingTestSchema);
