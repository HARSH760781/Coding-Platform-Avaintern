const axios = require("axios");
require("dotenv").config();

async function testSimple() {
  console.log("\n🔍 SIMPLE DIRECT TEST\n");

  // The exact code to test
  const code = `def two_sum(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []

result = two_sum([2,7,11,15], 9)
print(result)`;

  console.log("Code being tested:");
  console.log(code);
  console.log("\n" + "=".repeat(50));

  try {
    const response = await axios.post(
      "https://judge029.p.rapidapi.com/submissions",
      {
        source_code: code,
        language_id: 71,
        stdin: "",
        expected_output: "[0,1]",
      },
      {
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
          "X-RapidAPI-Host": "judge029.p.rapidapi.com",
          "Content-Type": "application/json",
        },
        params: { base64_encoded: false, wait: true, fields: "*" },
      },
    );

    console.log("\n📊 RESULT:");
    console.log("Status:", response.data.status.description);
    console.log("Output:", JSON.stringify(response.data.stdout));
    console.log("Expected:", JSON.stringify("[0,1]"));
    console.log("Stderr:", response.data.stderr);

    if (response.data.stdout?.trim() === "[0,1]") {
      console.log("\n✅ SUCCESS!");
    } else {
      console.log("\n❌ FAILED!");
    }
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
  }
}

testSimple();
