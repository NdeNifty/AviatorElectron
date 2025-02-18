async function aviatorBotBetika(aviatorIframe, ipcMain) {
    console.log("Aviator Bot started...");

    try {
        // Wait for the Aviator game to load dynamically within the iframe
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Check if 'amount' is in the HTML
        const iframeHtml = await aviatorIframe.evaluate(() => document.documentElement.outerHTML);
        const htmlContainsAmount = iframeHtml.includes('amount') || iframeHtml.includes('"amount"');

        if (htmlContainsAmount) {
            console.log("Aviator game loaded and amount element found.");
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
                        throw new Error("Aviator game not loaded correctly. '.amount' not found after retries.");
                    }
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }
            }

            if (!amountElement) {
                throw new Error("Aviator game not loaded correctly. '.amount' not found.");
            }

            // Get the initial balance from the iframe
            let lastBalance = await aviatorIframe.evaluate(() => {
                const amount = document.querySelector('span.amount');
                return amount ? amount.textContent.trim() : null;
            });
            console.log("Initial Balance:", lastBalance);

            // Check if balance is valid
            if (lastBalance === null || lastBalance === '') {
                throw new Error("Invalid balance detected.");
            }

            // Emit the initial balance
            ipcMain.emit('balance-updated', null, lastBalance);

            // Monitor balance changes within the iframe
            while (true) {
                try {
                    await aviatorIframe.waitForFunction(
                        (prevBalance) => {
                            const balanceElement = document.querySelector('span.amount');
                            return balanceElement && balanceElement.textContent.trim() !== prevBalance;
                        },
                        { timeout: 60000 },
                        lastBalance
                    );

                    // Get the updated balance from the iframe
                    const newBalance = await aviatorIframe.evaluate(() => document.querySelector('span.amount').textContent.trim());
                    console.log("Balance Updated:", newBalance);

                    // Emit the updated balance
                    ipcMain.emit('balance-updated', null, newBalance);

                    // Update lastBalance for the next comparison
                    lastBalance = newBalance;
                } catch (error) {
                    if (error.name === 'TimeoutError') {
                        console.log("Balance unchanged. Retrying...");
                    } else {
                        console.error("Error detecting balance change:", error);
                        break;
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 10000)); // 10-second delay
            }
        } else {
            throw new Error("The 'amount' class was not found in the iframe HTML. Please check if the element's class or structure has changed.");
        }
    } catch (error) {
        console.error("Error in Aviator Bot:", error);
        throw error;
    }
}

module.exports = aviatorBotBetika;