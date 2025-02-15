async function aviatorBot(page, ipcMain) {
    console.log("Aviator Bot started...");

    // ✅ Ensure the Aviator game is loaded
    await page.waitForSelector(".bet-block", { visible: true });

    // ✅ Wait for balance element
    await page.waitForSelector('.amount', { visible: true });

    console.log(" Fetching initial balance...");

    // ✅ Get the initial balance
    let lastBalance = await page.evaluate(() => document.querySelector('.amount').textContent.trim());
    console.log("Initial Balance:", lastBalance);

    // ✅ Emit the initial balance
    ipcMain.emit('balance-updated', null, lastBalance);

    // ✅ Monitor balance changes
    while (true) {
        try {
            // ✅ Wait for the balance to change (with a timeout of 30 seconds)
            await page.waitForFunction(
                (prevBalance) => {
                    const balanceElement = document.querySelector('.amount');
                    if (!balanceElement) return false;
                    return balanceElement.textContent.trim() !== prevBalance;
                },
                { timeout: 30000 }, // 30 seconds timeout
                lastBalance
            );

            // ✅ Get the updated balance
            const newBalance = await page.evaluate(() => document.querySelector('.amount').textContent.trim());
            console.log("Balance Updated:", newBalance);

            // ✅ Emit the updated balance
            ipcMain.emit('balance-updated', null, newBalance);

            // ✅ Update lastBalance for the next comparison
            lastBalance = newBalance;
        } catch (error) {
            if (error.name === 'TimeoutError') {
                // ✅ Balance hasn't changed within the timeout period
                console.log("Balance unchanged. Retrying...");
            } else {
                // ✅ Handle other errors
                console.error("Error detecting balance change:", error);
                break; // Exit the loop on critical errors
            }
        }

        // ✅ Add a delay between checks to avoid excessive CPU usage
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5-second delay
    }
}

module.exports = aviatorBot;