const puppeteer = require('puppeteer-core');
const aviatorbot = require('../aviatorbot');
const { ipcMain } = require('electron');

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

        // ✅ **Periodic UI refresh**
        setInterval(async () => {
            await page.evaluate(() => {
                window.dispatchEvent(new Event('resize')); // Triggers UI update
            });
        }, 2000);

        console.log("Attached to BrowserView tab:", page.url());
        console.log("Checking if user is already logged in...");

        let isUserLoggedIn = await page.waitForSelector("span.balance", { visible: true, timeout: 10000 }).catch(() => false);

        if (!isUserLoggedIn) {
            console.log("❌ User is NOT logged in. Checking for login button...");

            let loginButton = null;
            for (let i = 0; i < 3; i++) { // Retry up to 3 times
                // 🔄 **Re-check login status**
                isUserLoggedIn = await page.waitForSelector("span.balance", { visible: true, timeout: 10000 }).catch(() => false);

                if (isUserLoggedIn) {
                    console.log("✅ User logged in while waiting. Exiting login loop.");
                    break;
                }

                // 🔎 **Find the login button**
                loginButton = await page.waitForSelector('button.login', { visible: true, timeout: 10000 }).catch(() => null);

                if (loginButton) {
                    await loginButton.click();
                    console.log("🔄 Login button clicked! Waiting for user...");

                    // 🔄 **Wait for user to log in**
                    await page.waitForSelector("span.balance", { visible: true, timeout: 180000 }); // 3 minutes
                    console.log("✅ User logged in!");
                    break;
                } else {
                    console.log("❌ Login button not found. Retrying in 10 seconds...");
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }
            }
        } else {
            console.log("✅ User is already logged in!");
        }

        // ✅ **Proceed to Aviator**
        console.log("Finding the Aviator tab...");
        let aviatorLink = null;
        for (let i = 0; i < 5; i++) {
            aviatorLink = await page.waitForSelector("span ::-p-text(Aviator)", { visible: true, timeout: 10000 }).catch(() => null);
            if (aviatorLink) break;
            await new Promise(resolve => setTimeout(resolve, 4000));
        }

        if (aviatorLink) {
            await aviatorLink.click();
            console.log("Clicked the Aviator tab.");

            // ✅ Start the Aviator bot and pass ipcMain
            await aviatorbot(page, ipcMain);
        } else {
            console.error("Aviator tab not found.");
        }

    } catch (error) {
        console.error("Error during scraping:", error);
    }
}

module.exports = { startScraper };