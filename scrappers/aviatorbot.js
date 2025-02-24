// aviatorBot.js
const { openAiPredictNextPayout } = require("../models/openAi");

async function aviatorBot(page, ipcMain) {
    console.log("Aviator Bot started...");

    // Ensure the Aviator game is loaded
    await page.waitForSelector(".bet-block", { visible: true });

    // Wait for balance element
    await page.waitForSelector('.amount', { visible: true });

    console.log("Fetching initial balance...");

    // Function to fetch and emit balance every 3 seconds to the renderer
    async function fetchBalance() {
        try {
            let balance = await page.evaluate(() => document.querySelector('.amount')?.textContent.trim() || "Balance not found");
            console.log("Current Balance:", balance);
            // Send balance update to the renderer via ipcMain
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

    // Initialize results array with all existing payouts
    let results = await fetchAllExistingPayouts();

    // Function to fetch all existing payouts and initialize the results array
    async function fetchAllExistingPayouts() {
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
                        initialResults.push(numericValue);
                    } else {
                        initialResults.push(value); // Keep as string if not numeric
                    }
                } else {
                    console.log("No .bubble-multiplier.font-weight-bold found in this payout.");
                    let payoutContent = await page.evaluate(el => el.innerHTML, payout);
                    console.log("Payout content:", payoutContent);
                }
            }
            console.log("Initial payouts:", initialResults);
            return initialResults;
        } catch (error) {
            console.error("Error fetching existing payouts:", error);
            return initialResults;
        }
    }

    // Function to fetch the latest payout (first .payout element)
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

            // Get the first payout (latest multiplier, assuming it's at the start)
            let latestPayout = payoutElements[0];
            let multiplierValue = await latestPayout.$('.bubble-multiplier.font-weight-bold');
            if (multiplierValue) {
                let value = await page.evaluate(el => el.textContent.trim(), multiplierValue);
                console.log("Found latest multiplier value:", value);
                let numericValue = parseFloat(value);
                if (!isNaN(numericValue)) {
                    return numericValue;
                } else {
                    return value; // Keep as string if not numeric
                }
            } else {
                console.log("No .bubble-multiplier.font-weight-bold found in latest payout.");
                let payoutContent = await page.evaluate(el => el.innerHTML, latestPayout);
                console.log("Latest payout content:", payoutContent);
                return null;
            }
        } catch (error) {
            console.error("Error fetching latest payout:", error);
            return null;
        }
    }

    // Function to continuously monitor for updates to the latest payout, print results, and call OpenAI API
    async function monitorPayouts() {
        let lastPayoutValue = null; // Track the last seen payout value
        while (true) { // Run indefinitely until stopped
            try {
                // Wait for changes in the first payout's value
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
                    { timeout: 30000 }, // 30 seconds timeout
                    lastPayoutValue
                );

                // Fetch the updated latest payout
                let newPayout = await fetchLatestPayout();
                if (newPayout !== null && newPayout !== lastPayoutValue) {
                    results.push(newPayout);
                    console.log("Updated payouts:", results); // Print the full results array to the console

                    // Call OpenAI API to predict the next payout and log the response
                    try {
                        const apiResponse = await openAiPredictNextPayout(results);
                        console.log("API Response:", apiResponse); // Log the API response
                    } catch (error) {
                        console.error("Failed to get API response:", error.message);
                    }

                    lastPayoutValue = newPayout; // Update the last seen value
                }

                // Small delay to avoid excessive CPU usage
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (error) {
                if (error.name === 'TimeoutError') {
                    console.log("No new payout detected within 30 seconds. Retrying...");
                } else {
                    console.error("Error monitoring payouts:", error);
                    break; // Exit on critical errors
                }
            }
        }
    }

    // Click on the results trigger to open the payout block (if needed)
    let results_trigger = await page.waitForSelector('.trigger', { visible: true });
    await results_trigger.click();
    console.log("Results trigger clicked...");

    // Start monitoring payouts indefinitely
    monitorPayouts().catch(error => console.error("Payout monitoring failed:", error));

    // Keep the function running indefinitely (no timeout, as monitoring is continuous)
    await new Promise(() => {}); // Keep the function running indefinitely

    // Cleanup (this will only be reached if the loop breaks, e.g., on error)
    clearInterval(balanceInterval);

    return results; // This return is technically unreachable due to the infinite promise, but included for completeness
}

module.exports = aviatorBot;