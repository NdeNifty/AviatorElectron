const axios = require("axios");

// Endpoints
const predictUrl = "https://aviatorbotltsmpredict.onrender.com/predict";
const trainUrl = "https://aviatorbotltsmpredict.onrender.com/train";

async function predictPreRound(predictionData) {
  try {
    const payload = {
      predictionData: predictionData // { Multiplier_Outcome, Last_30_Multipliers, Time_Gaps }
    };
    console.log("Prediction data sent to LSTM:", predictionData);

    const response = await axios.post(predictUrl, payload, {
      headers: { "Content-Type": "application/json" },
    });

    // Check if the response contains the expected data
    if (!response.data || typeof response.data.predicted_multiplier === 'undefined') {
      throw new Error("Invalid response data from server");
    }

    const predictedMultiplier = Number(response.data.predicted_multiplier);
    const formattedMultiplier = predictedMultiplier.toFixed(1);
    console.log("LSTM Prediction:", formattedMultiplier);
    return Number(formattedMultiplier);
  } catch (error) {
    console.error(
      "Error predicting next number with LSTM:",
      error.response ? error.response.data : error.message
    );
    throw new Error("Failed to predict the next number with LSTM.");
  }
}

async function logPostRound(loggingData) {
  try {
    const payload = {
      loggingData: loggingData // { Skipped_or_Played, Your_Bet_Size, Passive_Watching, Session_ID }
    };
    console.log("Logging data sent to LSTM:", loggingData);

    const response = await axios.post(trainUrl, payload, {
      headers: { "Content-Type": "application/json" },
    });

    console.log("Post-round data logged successfully:", response.data.message);
    return response.data; // Could return success message or updated model info
  } catch (error) {
    console.error(
      "Error logging post-round data with LSTM:",
      error.response ? error.response.data : error.message
    );
    throw new Error("Failed to log post-round data with LSTM.");
  }
}

module.exports = { predictPreRound, logPostRound };