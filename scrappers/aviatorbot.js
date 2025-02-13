async function aviatorBot(page) {
    console.log("🚀 Aviator Bot started...");

    // ✅ Example: Wait for a critical element in the Aviator game
    await page.waitForSelector(".aviator-game-class", { visible: true, timeout: 10000 }).catch(() => {
        console.error("Aviator game did not load in time.");
        return;
    });

    console.log("Aviator game detected!");

    // ✅ Example: Click a button inside the Aviator game
    const startButton = await page.waitForSelector("button.start-game", { visible: true, timeout: 5000 }).catch(() => null);
    if (startButton) {
        await startButton.click();
        console.log("Started Aviator game!");
    } else {
        console.log("Start button not found.");
    }

    // ✅ Example: Extract some data
    const balance = await page.$eval("div.balance", el => el.innerText).catch(() => "Balance not found");
    console.log("Current balance:", balance);

    // ✅ You can add more automation logic as needed
}

module.exports =  aviatorBot ;
