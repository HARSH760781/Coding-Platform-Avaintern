const mongoose = require("mongoose");
require("dotenv").config();

async function fixTestCases() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const Problem = require("./models/Problem");

    // Update test cases to proper format
    await Problem.updateOne(
      { problemId: "PROB001" },
      {
        $set: {
          testCases: [
            {
              input: "[2,7,11,15]\n9",
              expectedOutput: "[0,1]",
              isHidden: false,
            },
            {
              input: "[3,2,4]\n6",
              expectedOutput: "[1,2]",
              isHidden: false,
            },
          ],
        },
      },
    );

    console.log("✅ Test cases fixed!");

    // Verify the fix
    const problem = await Problem.findOne({ problemId: "PROB001" });
    console.log("\nUpdated Test Cases:");
    problem.testCases.forEach((tc, i) => {
      console.log(`Test Case ${i + 1}:`);
      console.log("  Input:", tc.input);
      console.log("  Expected:", tc.expectedOutput);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error.message);
  }
}

fixTestCases();
