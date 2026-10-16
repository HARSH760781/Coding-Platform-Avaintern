// backend/models/Problem.js
import mongoose from "mongoose";

const testCaseSchema = new mongoose.Schema({
  input: { type: String, required: false },
  expectedOutput: { type: String, required: false },
  isHidden: { type: Boolean, default: false },
  explanation: { type: String },
  weightage: { type: Number, default: 1 },
});

const solutionSchema = new mongoose.Schema({
  language: { type: String, required: true },
  code: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

const problemSchema = new mongoose.Schema({
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

  // NOT globally unique — unique per college (see compound index)
  problemId: { type: String, required: true },

  testId: {
    type: String,
    required: true,
    default: "DEFAULT_TEST",
    index: true,
  },

  title: { type: String, required: true },
  description: { type: String, required: true },
  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"],
    required: true,
  },
  tags: [{ type: String }],
  companies: [{ type: String }],
  constraints: { type: String },
  examples: [
    {
      input: String,
      output: String,
      explanation: String,
    },
  ],
  timeLimit: { type: Number, default: 2 },
  memoryLimit: { type: Number, default: 256 },
  totalSubmissions: { type: Number, default: 0 },
  acceptedSubmissions: { type: Number, default: 0 },
  acceptanceRate: { type: Number, default: 0 },
  testCases: [testCaseSchema],
  solutions: [solutionSchema],
  hints: [{ type: String }],
  starterCode: {
    python: { type: String, default: "" },
    javascript: { type: String, default: "" },
    java: { type: String, default: "" },
    cpp: { type: String, default: "" },
    c: { type: String, default: "" },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Unique per college, not globally
problemSchema.index({ collegeId: 1, problemId: 1 }, { unique: true });
problemSchema.index({ testId: 1, problemId: 1 });

export default mongoose.model("Problem", problemSchema);
