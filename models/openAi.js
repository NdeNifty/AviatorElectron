// openAi.js
const { OpenAI } = require("openai");

const baseURL = "https://api.aimlapi.com/v1";
const apiKey = "885e67b944414d9fbbf8c3d1c7886ea1"; // Your AIML API Key
const systemPrompt = "You can predict next numbers in a sequence.";

const api = new OpenAI({
  apiKey,
  baseURL,
});
 let results = [ 1.4, 12.68,   1.1,  1.19, 3.77,
    1.31,  2.17,   1.2,   2.3, 1.42,
    1.14,  2.01,   2.6,  1.96,  1,
    2.28,  1.41,  1.56, 13.67, 1.27,
     1.4,  5.21, 18.84,  3.86, 3.25,
     1.4,  1.45,  1.29];
async function openAiPredictNextPayout(results) {
  const userPrompt = `What is the next number in the array? ${results.join(", ")}`;
  
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

module.exports = { openAiPredictNextPayout };