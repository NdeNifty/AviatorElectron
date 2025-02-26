const { lstmPredict } = require("../../models/lstmPredict"); // Adjusted import path

async function aviatorBotSporty(aviatorIframe, ipcMain) {
    console.log("Aviator Bot started...");

    try {
        // Wait for the Aviator game to load dynamically within the iframe
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Check if 'amount' is in the HTML (confirming iframe context)
        const iframeHtml = await aviatorIframe.evaluate(() => document.documentElement.outerHTML);
        const htmlContainsAmount = iframeHtml.includes('amount') || iframeHtml.includes('"amount"');

        if (htmlContainsAmount) {
            let amountElement = null;
            const MAX_RETRIES = 15;
            let attempts = 0;
            while (attempts < MAX_RETRIES) {
                try {
                    await aviatorIframe.waitForFunction(
                        () => {
                            const amount = document.querySelector('span.amount');
                            if (amount) {
                                const isInteractive = amount.offsetParent !== null &&
                                                      window.getComputedStyle(amount).display !== 'none' &&
                                                      window.getComputedStyle(amount).visibility !== 'hidden' &&
                                                      parseFloat(window.getComputedStyle(amount).opacity) > 0;
                                return isInteractive;
                            }
                            return false;
                        },
                        { timeout: 180000 }
                    );
                    amountElement = await aviatorIframe.$('span.amount');
                    break;
                } catch (error) {
                    attempts++;
                    if (attempts >= MAX_RETRIES) {
                        throw new Error("Aviator game not loaded correctly. '.amount' not found after retries in iframe.");
                    }
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }
            }

            if (!amountElement) {
                throw new Error("Aviator game not loaded correctly. '.amount' not found in iframe.");
            }

            // Get the initial balance from the iframe
            let lastBalance = await aviatorIframe.evaluate(() => {
                const amount = document.querySelector('span.amount');
                return amount ? amount.textContent.trim() : null;
            });
            console.log("Initial Balance in iframe:", lastBalance);

            if (lastBalance === null || lastBalance === '') {
                throw new Error("Invalid balance detected in iframe.");
            }

            ipcMain.emit('balance-updated', null, lastBalance);

            // Initialize results array with existing payouts
            let results = await fetchAllExistingPayouts(aviatorIframe);

            async function fetchAllExistingPayouts(iframe) {
                let initialResults = [];
                try {
                    console.log("Fetching all existing payouts in iframe...");
                    let payoutsBlock = await iframe.$('.payouts-block');
                    if (!payoutsBlock) {
                        console.log("No .payouts-block found in iframe.");
                        return initialResults;
                    }

                    let payoutElements = await payoutsBlock.$$('.payout');
                    if (payoutElements.length === 0) {
                        console.log("No .payout elements found in iframe.");
                        return initialResults;
                    }

                    for (let payout of payoutElements) {
                        let multiplierValue = await payout.$('.bubble-multiplier.font-weight-bold');
                        if (multiplierValue) {
                            let value = await iframe.evaluate(el => el.textContent.trim(), multiplierValue);
                            console.log("Found existing multiplier value in iframe:", value);
                            let numericValue = parseFloat(value);
                            if (!isNaN(numericValue)) {
                                initialResults.push(numericValue);
                            } else {
                                initialResults.push(value);
                            }
                        } else {
                            console.log("No .bubble-multiplier.font-weight-bold found in this payout in iframe.");
                            let payoutContent = await iframe.evaluate(el => el.innerHTML, payout);
                            console.log("Payout content in iframe:", payoutContent);
                        }
                    }
                    console.log("Initial payouts in iframe:", initialResults);
                    return initialResults;
                } catch (error) {
                    console.error("Error fetching existing payouts in iframe:", error);
                    return initialResults;
                }
            }

            async function fetchLatestPayout(iframe) {
                try {
                    console.log("Checking for latest payout in iframe...");
                    let payoutsBlock = await iframe.$('.payouts-block');
                    if (!payoutsBlock) {
                        console.log("No .payouts-block found in iframe.");
                        return null;
                    }

                    let payoutElements = await payoutsBlock.$$('.payout');
                    if (payoutElements.length === 0) {
                        console.log("No .payout elements found in iframe.");
                        return null;
                    }

                    let latestPayout = payoutElements[0];
                    let multiplierValue = await latestPayout.$('.bubble-multiplier.font-weight-bold');
                    if (multiplierValue) {
                        let value = await iframe.evaluate(el => el.textContent.trim(), multiplierValue);
                        console.log("Found latest multiplier value in iframe:", value);
                        let numericValue = parseFloat(value);
                        if (!isNaN(numericValue)) {
                            return numericValue;
                        } else {
                            return value;
                        }
                    } else {
                        console.log("No .bubble-multiplier.font-weight-bold found in latest payout in iframe.");
                        let payoutContent = await iframe.evaluate(el => el.innerHTML, latestPayout);
                        console.log("Latest payout content in iframe:", payoutContent);
                        return null;
                    }
                } catch (error) {
                    console.error("Error fetching latest payout in iframe:", error);
                    return null;
                }
            }

            async function monitorPayouts(iframe) {
                let lastPayoutValue = null;
                while (true) {
                    try {
                        await iframe.waitForFunction(
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
                            { timeout: 30000 },
                            lastPayoutValue
                        );

                        let newPayout = await fetchLatestPayout(iframe);
                        if (newPayout !== null && newPayout !== lastPayoutValue) {
                            results.push(newPayout);
                            console.log("Updated payouts in iframe:", results);

                            // Call LSTM predict function
                            try {
                                const predictedNumber = await lstmPredict(results);
                                console.log("LSTM Prediction:", predictedNumber);

                                // Convert to string for IPC consistency (if needed)
                                const predictedString = predictedNumber.toString();

                                // Send the prediction to the sidebar via IPC
                                ipcMain.emit('prediction-update', null, predictedString);

                            } catch (error) {
                                console.error("Failed to get LSTM response:", error.message);
                                ipcMain.emit('prediction-update', null, "Prediction error");
                            }

                            lastPayoutValue = newPayout;
                        }

                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } catch (error) {
                        if (error.name === 'TimeoutError') {
                            console.log("No new payout detected within 30 seconds in iframe. Retrying...");
                        } else {
                            console.error("Error monitoring payouts in iframe:", error);
                            break;
                        }
                    }
                }
            }

            let results_trigger = await aviatorIframe.waitForSelector('.trigger', { visible: true });
            await results_trigger.click();
            console.log("Results trigger clicked in iframe...");

            monitorPayouts(aviatorIframe).catch(error => console.error("Payout monitoring failed in iframe:", error));

            await new Promise(() => {});

            return results;
        } else {
            throw new Error("The 'amount' class was not found in the iframe HTML. Please check if the element's class or structure has changed.");
        }
    } catch (error) {
        console.error("Error in Aviator Bot:", error);
        throw error;
    }
}

module.exports = aviatorBotSporty;