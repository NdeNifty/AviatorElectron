// grokAi.js (using axios with .env)
require("dotenv").config({ path: "../.env" }); // Load .env from parent directory

const axios = require("axios");

const baseURL = "https://api.x.ai/v1/chat/completions";
const apiKey = process.env.XAI_API_KEY; // Load API key from .env
const systemPrompt = "You can predict next numbers in a sequence. Give the number only. No explanations";

async function grokAiPredictNextPayout(results) {
  if (!apiKey) {
    throw new Error("XAI_API_KEY not found in .env file");
  }

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

module.exports = { grokAiPredictNextPayout };