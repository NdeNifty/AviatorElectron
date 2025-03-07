const { predictPreRound, logPostRound } = require("../models/lstmPredict");

async function aviatorBot(page, ipcMain) {
    console.log("Aviator Bot started...");

    // Configuration: Toggle timestamps on or off
    const useTimestamps = false; // Set to true to enable timestamps, false to disable

    // Ensure the Aviator game is loaded
    await page.waitForSelector(".bet-block", { visible: true });

    // Wait for balance and bet elements
    await page.waitForSelector('.amount', { visible: true });
    await page.waitForSelector('.bet', { visible: true });

    console.log("Fetching initial balance and setting up...");

    // Function to fetch and emit balance every 3 seconds to the renderer
    async function fetchBalance() {
        try {
            let balance = await page.evaluate(() => document.querySelector('.amount')?.textContent.trim() || "Balance not found");
            console.log("Current Balance:", balance);
            ipcMain.emit('balance-updated', null, balance);
            return balance;
        } catch (error) {
            console.error("Error fetching balance:", error);
            return null;
        }
    }

    // Start balance fetching in the background
    let balanceInterval = setInterval(async () => await fetchBalance(), 3000);
    let lastBalance = await fetchBalance();

    // Array to store round data (with optional timestamps)
    let roundData = await fetchAllExistingPayouts(page);
    let sessionId = Date.now().toString(); // Simple session ID based on timestamp

    // Function to fetch all existing payouts at the start
    async function fetchAllExistingPayouts(page) {
        let initialResults = [];
        try {
            console.log("Fetching all existing payouts...");
            let payoutsBlock = await page.$('.payouts-block');
            if (!payoutsBlock) {
                console.log("No .payouts-block found.");
                return initialResults;
            }

            let payoutElements = await payoutsBlock.$$('.payout');
            if (payoutElements.length === 0) {
                console.log("No .payout elements found.");
                return initialResults;
            }

            for (let payout of payoutElements) {
                let multiplierValue = await payout.$('.bubble-multiplier.font-weight-bold');
                if (multiplierValue) {
                    let value = await page.evaluate(el => el.textContent.trim(), multiplierValue);
                    console.log("Found existing multiplier value:", value);
                    let numericValue = parseFloat(value);
                    if (!isNaN(numericValue)) {
                        if (useTimestamps) {
                            // Use current timestamp for historical payouts (can be improved if actual timestamps are available)
                            initialResults.push({ Multiplier_Outcome: numericValue, Timestamp: new Date().toISOString() });
                        } else {
                            initialResults.push(numericValue);
                        }
                    }
                }
            }
            console.log("Initial payouts:", initialResults);
            return initialResults;
        } catch (error) {
            console.error("Error fetching existing payouts:", error);
            return initialResults;
        }
    }

    // Function to fetch the latest payout (Multiplier_Outcome)
    async function fetchLatestPayout() {
        try {
            console.log("Checking for latest payout...");
            let payoutsBlock = await page.$('.payouts-block');
            if (!payoutsBlock) {
                console.log("No .payouts-block found.");
                return null;
            }

            let payoutElements = await payoutsBlock.$$('.payout');
            if (payoutElements.length === 0) {
                console.log("No .payout elements found.");
                return null;
            }

            let latestPayout = payoutElements[0];
            let multiplierValue = await latestPayout.$('.bubble-multiplier.font-weight-bold');
            if (multiplierValue) {
                let value = await page.evaluate(el => el.textContent.trim(), multiplierValue);
                console.log("Found latest multiplier value:", value);
                let numericValue = parseFloat(value);
                return !isNaN(numericValue) ? numericValue : null;
            } else {
                console.log("No .bubble-multiplier.font-weight-bold found in latest payout.");
                return null;
            }
        } catch (error) {
            console.error("Error fetching latest payout:", error);
            return null;
        }
    }

    // Function to fetch bet size from the .amount label
    async function getBetSize() {
        try {
            const betSizeElement = await page.$eval('.amount label span:first-child', el => el.textContent.trim());
            const numericBetSize = parseFloat(betSizeElement.replace(/[^0-9.]/g, '')) || 0.0;
            return numericBetSize;
        } catch (error) {
            console.error("Error fetching bet size:", error);
            return 0.0;
        }
    }

    // Function to detect if bet button was clicked this round
    let betClickedThisRound = false;
    page.on('click', async (element) => {
        if (element === await page.$('.bet')) {
            betClickedThisRound = true;
            console.log("Bet button clicked this round.");
        }
    });

    // Function to fetch prediction and logging data
    async function fetchRoundData(prevPayout) {
        try {
            // Stage 1: Pre-Round Prediction Data
            const latestPayout = await fetchLatestPayout();
            if (latestPayout === null || latestPayout === prevPayout) {
                console.log("No new payout detected yet.");
                return null;
            }

            // Add new payout to roundData
            if (useTimestamps) {
                const timestamp = new Date().toISOString();
                roundData.push({ Multiplier_Outcome: latestPayout, Timestamp: timestamp });
            } else {
                roundData.push(latestPayout);
            }

            // Extract Last_30_Multipliers
            const last30Multipliers = useTimestamps
                ? roundData.slice(-30).map(r => r.Multiplier_Outcome)
                : roundData.slice(-30);

            // Calculate Time_Gaps if timestamps are enabled
            let timeGaps = [];
            if (useTimestamps) {
                const highMultipliers = roundData.filter(r => r.Multiplier_Outcome > 10);
                for (let i = 1; i < highMultipliers.length; i++) {
                    const prevTime = new Date(highMultipliers[i - 1].Timestamp);
                    const currentTime = new Date(highMultipliers[i].Timestamp);
                    const gapSeconds = (currentTime - prevTime) / 1000;
                    timeGaps.push(gapSeconds);
                }
            }

            // Build predictionData with or without Time_Gaps
            const predictionData = {
                Multiplier_Outcome: latestPayout,
                Last_30_Multipliers: last30Multipliers
            };
            if (useTimestamps && timeGaps.length > 0) {
                predictionData.Time_Gaps = timeGaps;
            }

            // Wait for the round to end (new payout availability)
            await page.waitForFunction(
                (prevValue) => {
                    const payoutsBlock = document.querySelector('.payouts-block');
                    if (!payoutsBlock) return false;
                    const firstPayout = payoutsBlock.querySelector('.payout');
                    if (!firstPayout) return false;
                    const multiplier = firstPayout.querySelector('.bubble-multiplier.font-weight-bold');
                    if (!multiplier) return false;
                    const currentValue = multiplier.textContent.trim();
                    return currentValue !== prevValue && currentValue !== "";
                },
                { timeout: 3000000 },
                latestPayout
            );

            // Stage 2: Post-Round Logging Data
            const betSize = await getBetSize();
            const passiveWatching = !betClickedThisRound;
            const skippedOrPlayed = betClickedThisRound ? "Played" : "Skipped";

            const loggingData = {
                Skipped_or_Played: skippedOrPlayed,
                Your_Bet_Size: betSize,
                Passive_Watching: passiveWatching,
                Session_ID: sessionId
            };

            return { predictionData, loggingData };
        } catch (error) {
            console.error("Error fetching round data:", error);
            return null;
        }
    }

    // Function to monitor rounds
    async function monitorRounds() {
        let lastPayoutValue = null;
        while (true) {
            try {
                const result = await fetchRoundData(lastPayoutValue);
                if (!result) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                }

                const { predictionData, loggingData } = result;
                if (predictionData && predictionData.Multiplier_Outcome !== lastPayoutValue) {
                    // Stage 1: Pre-Round Prediction
                    try {
                        const predictedNumber = await predictPreRound(predictionData);
                        console.log("LSTM Prediction:", predictedNumber);
                        ipcMain.emit('prediction-update', null, predictedNumber.toString());
                    } catch (error) {
                        console.error("Failed to get LSTM prediction:", error.message);
                        ipcMain.emit('prediction-update', null, "Prediction error");
                    }

                    // Stage 2: Post-Round Logging and Training
                    try {
                        await logPostRound(loggingData);
                        console.log("Post-round data sent for training.");
                    } catch (error) {
                        console.error("Failed to log post-round data:", error.message);
                    }

                    lastPayoutValue = predictionData.Multiplier_Outcome;
                    betClickedThisRound = false; // Reset for the next round
                }

                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                if (error.name === 'TimeoutError') {
                    console.log("No new round detected within 30 seconds. Retrying...");
                } else {
                    console.error("Error monitoring rounds:", error);
                    break;
                }
            }
        }
    }

    // Click on the results trigger to open the payout block (if needed)
    let results_trigger = await page.waitForSelector('.trigger', { visible: true });
    await results_trigger.click();
    console.log("Results trigger clicked...");

    // Start monitoring rounds
    monitorRounds().catch(error => console.error("Round monitoring failed:", error));

    // Keep the function running indefinitely
    await new Promise(() => {});

    // Cleanup (unreachable unless loop breaks)
    clearInterval(balanceInterval);

    return roundData;
}

module.exports = aviatorBot;