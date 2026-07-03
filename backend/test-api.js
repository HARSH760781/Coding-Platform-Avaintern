const axios = require("axios");
require("dotenv").config();

async function testAPI() {
  console.log("\n🚀 Testing API with working endpoint...");
  console.log(
    "📋 API Key:",
    process.env.RAPIDAPI_KEY ? "✅ Present" : "❌ Missing",
  );

  if (!process.env.RAPIDAPI_KEY) {
    console.log("❌ Please add RAPIDAPI_KEY to your .env file");
    return;
  }

  const code = `print("Hello, Code Arena!")`;

  try {
    console.log("\n📤 Sending test code to judge029...");

    const response = await axios.post(
      "https://judge029.p.rapidapi.com/submissions",
      {
        source_code: code,
        language_id: 71,
        stdin: "",
      },
      {
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
          "X-RapidAPI-Host": "judge029.p.rapidapi.com",
          "Content-Type": "application/json",
        },
        params: {
          base64_encoded: false,
          wait: true,
          fields: "*",
        },
      },
    );

    console.log("\n✅ API is WORKING!");
    console.log("📊 Status:", response.data.status.description);
    console.log("📤 Output:", response.data.stdout);

    return true;
  } catch (error) {
    console.log("\n❌ API Error:");
    if (error.response) {
      console.log("   Status:", error.response.status);
      console.log("   Message:", error.response.data?.message || error.message);
    } else {
      console.log("   Message:", error.message);
    }
    return false;
  }
}

testAPI();
