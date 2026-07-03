// backend/models/Problem.js
import mongoose from "mongoose";

const testCaseSchema = new mongoose.Schema({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true },
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
  problemId: { type: String, unique: true, required: true },

  // ✅ NEW: Add testId field
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

// ✅ Add index for faster queries
problemSchema.index({ testId: 1, problemId: 1 });

export default mongoose.model("Problem", problemSchema);
