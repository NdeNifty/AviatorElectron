const axios = require("axios");

// Render LSTM endpoint
const renderUrl = "https://aviatorbotltsmpredict.onrender.com/predict";

async function lstmPredict(results) {
  try {
    // Prepare the payload with the sequence of game results
    const payload = {
      sequence: results, // Array of numbers, e.g., [23.0, 4.2, 1.0, 9.8, 2.4]
    };
      console.log("Results sent to LSTM:", results);
    // Send POST request to the Render LSTM endpoint
    const response = await axios.post(renderUrl, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Extract the prediction from the response
    const predictedNumber = Number(response.data.prediction.toFixed(1)); //prediction(response) rounded to one decimal place before returning
    console.log("LSTM Prediction:", predictedNumber); // Log the prediction
    return predictedNumber;
  } catch (error) {
    console.error(
      "Error predicting next number with LSTM:",
      error.response ? error.response.data : error.message
    );
    throw new Error("Failed to predict the next number with LSTM.");
  }
}

module.exports = { lstmPredict };