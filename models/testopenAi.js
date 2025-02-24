// openAi.js
const { OpenAI } = require("openai");
require("punycode"); 

// Note: If punycode warning persists, update `openai` with `npm install openai@latest`
// or run with `node --no-deprecation openAi.js` to suppress it.

const baseURL = "https://api.aimlapi.com/v1";
const apiKey = "885e67b944414d9fbbf8c3d1c7886ea1"; // Your AIML API Key
const systemPrompt = "You can predict next numbers in a sequence.";

const api = new OpenAI({
  apiKey,
  baseURL,
});

async function openAiPredictNextPayout(results) {
  const userPrompt = `Predict the next number in the array using LTSN model? ${results.join(", ")}`;
  
  try {
    const completion = await api.chat.completions.create({
      model: "mistralai/Mistral-7B-Instruct-v0.2",
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
      temperature: 0.7,
      max_tokens: 256,
    });

    const response = completion.choices[0].message.content;
    console.log("API Response:", response); // Log the raw API response
    return response;
  } catch (error) {
    console.error("Error predicting next number:", error);
    throw new Error("Failed to predict the next number.");
  }
}

// Mock test script to run when file is executed directly
if (require.main === module) {
  // Mock results array
  const mockResults = [
    18.84, 3.86, 3.25, 1.31, 1.03,
    1.01, 8.08, 1.22, 8.88, 1.21,
    2.17, 3.54, 1.39, 1, 1.06,
    93.05, 1.03, 1.15, 3.93, 2.81,
    1.1, 4.49, 21.41, 5.61, 2.33,
    18.84, 5.21, 1.4
  ];

  console.log("Running openAi.js with mock results...");
  console.log("Mock Results:", mockResults);

  // Call the function with mock results
  openAiPredictNextPayout(mockResults)
    .then(response => {
      console.log("Predicted Next Payout:", response);
    })
    .catch(error => {
      console.error("Error during mock test:", error.message);
    });
}

module.exports = { openAiPredictNextPayout };