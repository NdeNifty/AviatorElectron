// openAi.js (using axios with .env)
require("dotenv").config({ path: "../.env" }); // Load environment variables from .env

const axios = require("axios");

const baseURL = "https://api.x.ai/v1/chat/completions";
const apiKey = process.env.XAI_API_KEY; // Load API key from .env
const systemPrompt = "You can predict next numbers in a sequence.";

let results = [
  1.4, 12.68, 1.1, 1.19, 3.77,
  1.31, 2.17, 1.2, 2.3, 1.42,
  1.14, 2.01, 2.6, 1.96, 1,
  2.28, 1.41, 1.56, 13.67, 1.27,
  1.4, 5.21, 18.84, 3.86, 3.25,
  1.4, 1.45, 1.29
];

async function openAiPredictNextPayout(results) {
  const userPrompt = `What is the next number in the array? ${results.join(", ")}`;

  try {
    const response = await axios.post(
      baseURL,
      {
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        model: "grok-2-latest",
        stream: false,
        temperature: 0,
        max_tokens: 256,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
      }
    );

    const apiResponse = response.data.choices[0].message.content;
    console.log("API Response:", apiResponse); // Log the raw API response
    return apiResponse;
  } catch (error) {
    console.error("Error predicting next number:", error.response ? error.response.data : error.message);
    throw new Error("Failed to predict the next number.");
  }
}

// Mock test script to run when file is executed directly
if (require.main === module) {
  console.log("Running openAi.js with Grok 2 (axios) and mock results...");
  console.log("Mock Results:", results);

  if (!apiKey) {
    console.error("Error: XAI_API_KEY not found in .env file");
    process.exit(1);
  }

  openAiPredictNextPayout(results)
    .then(response => {
      console.log("Predicted Next Payout:", response);
    })
    .catch(error => {
      console.error("Error during mock test:", error.message);
    });
}

module.exports = { openAiPredictNextPayout };