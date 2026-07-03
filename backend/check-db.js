const mongoose = require("mongoose");
require("dotenv").config();

async function checkDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const Problem = require("./models/Problem");
    const problem = await Problem.findOne({ problemId: "PROB001" });

    if (!problem) {
      console.log("Problem PROB001 not found!");
      return;
    }

    console.log("Problem Title:", problem.title);
    console.log("\nTest Cases:");
    console.log("-------------");

    for (let i = 0; i < problem.testCases.length; i++) {
      const tc = problem.testCases[i];
      console.log(`\nTest Case ${i + 1}:`);
      console.log("  Input:", JSON.stringify(tc.input));
      console.log("  Expected Output:", JSON.stringify(tc.expectedOutput));
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
  }
}

checkDB();
