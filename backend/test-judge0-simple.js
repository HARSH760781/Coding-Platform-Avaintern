const axios = require("axios");
require("dotenv").config();

async function testJudge0() {
  console.log("Testing Judge0 connection...");

  try {
    const response = await axios.post(
      "https://judge029.p.rapidapi.com/submissions",
      {
        source_code: "print('Hello')",
        language_id: 71,
      },
      {
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
          "X-RapidAPI-Host": "judge029.p.rapidapi.com",
          "Content-Type": "application/json",
        },
        params: { base64_encoded: false, wait: true },
      },
    );

    console.log("Status:", response.data.status.description);
    console.log("Output:", response.data.stdout);
    console.log("✅ Judge0 is working!");
  } catch (error) {
    console.log("❌ Judge0 error:", error.message);
  }
}

testJudge0();
