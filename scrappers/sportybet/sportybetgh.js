const puppeteer = require('puppeteer-core');
const aviatorbot = require('../aviatorbot');

async function startScraper() {
    console.log("Attaching Puppeteer to Electron’s existing BrowserView...");

    const browser = await puppeteer.connect({
        browserURL: 'http://localhost:9222',
        defaultViewport: null,
        ignoreHTTPSErrors: true
    });

    console.log("Puppeteer connected to Electron browser.");

    try {
        const target = await browser.waitForTarget(target => target.type() === "page", { timeout: 10000 });

        if (!target) throw new Error("No BrowserView page found.");

        const page = await target.page();

        // Trigger UI refresh every 2 seconds
        setInterval(async () => {
            await page.evaluate(() => {
                window.dispatchEvent(new Event('resize')); // Triggers a UI refresh
            });
        }, 2000);

        console.log("Attached to BrowserView tab:", page.url());

            // ✅ **Check if user is already logged in**
            let isUserLoggedIn = await page.evaluate(() => {
                return document.querySelector("#j_balance") !== null;
            });

            if (!isUserLoggedIn) {
                console.log("User is NOT logged in. Waiting for user to log in manually...");

                const maxRetries = 60; // 60 retries * 7 seconds = 3 minutes
                let retryCount = 0;

                while (!isUserLoggedIn && retryCount < maxRetries) {
                    try {
                        // Wait for the #j_balance element to appear (with a shorter timeout for each attempt)
                        await page.waitForSelector("#j_balance", { visible: true, timeout: 7000 });
                        console.log("User logged in! Balance detected.");
                        isUserLoggedIn = true; // Exit the loop
                    } catch (error) {
                        retryCount++;
                        console.log(`Retry ${retryCount}: User still not logged in. Retrying in 5 seconds...`);
                        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 5 seconds before retrying
                    }
                }

                if (!isUserLoggedIn) {
                    console.error("User did not log in within the expected time.");
                    alert("User did not log in within the expected time. Close the application and try again.");
                    throw new Error("Login timeout: User did not log in.");
                }
            } else {
                console.log("User is already logged in!");
            }
                    // ✅ **Proceed to Games**
        console.log("Proceeding to More Games...");

        // ✅ Wait for the "More" element and hover over it
        let GamesMenuItem = null;
        for (let i = 0; i < 9; i++) { // Retry up to 3 times
            GamesMenuItem = await page.waitForSelector('#header_nav_games', { visible: true, timeout: 10000 }).catch(() => null);
            if (GamesMenuItem) break; // Exit the loop if the element is found
            await new Promise(resolve => setTimeout(resolve, 4000)); // Wait for 4 seconds before retrying
        }

        if (GamesMenuItem) {
            await GamesMenuItem.click();
            console.log("Clicked 'Games' menu item...");
        } else {
            console.error("Games Menu item not found.");
        }

        // **Find and click "Aviator"**


        // **Find and click "Aviator"**
        console.log("Finding the Aviator tab...");
        let aviatorLink = null;
        for (let i = 0; i < 36; i++) {
            try {
                aviatorLink = await page.waitForSelector('#game_item19', { visible: true, timeout: 12000 });
                if (aviatorLink) {
                    await aviatorLink.click();
                    console.log("Clicked the Aviator tab.");
                    await aviatorbot(page, ipcMain);
                    break;
                }
            } catch (error) {
                console.log("Aviator tab not found. Retrying in 5 seconds...");
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
  

    } catch (error) {
        console.error("Error during scraping:", error);
    }
}

module.exports = { startScraper };