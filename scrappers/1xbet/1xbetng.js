const puppeteer = require('puppeteer-core');
const aviatorbot = require('../aviatorbot');
const {ipcMain} = require('electron');

async function startScraper() {
    console.log("Attaching Puppeteer to Electron’s existing BrowserView...");

    const browser = await puppeteer.connect({
        browserURL: 'http://localhost:9222',
        defaultViewport: null,
        ignoreHTTPSErrors: true,
        args: ['--disable-cache', '--no-sandbox']
    });

    console.log("Puppeteer connected to Electron browser.");

    try {
        // Get all targets and log their URLs
        const targets = await browser.targets();
        console.log("Available targets:");
        targets.forEach(target => {
            console.log(`Target URL: ${target.url()}, Type: ${target.type()}`);
        });

        // Wait for the BrowserView target (not sidebar.html)
        const target = await browser.waitForTarget(
            target => target.type() === "page" && !target.url().includes("sidebar.html"),
            { timeout: 10000 }
        );
        if (!target) throw new Error("No BrowserView page found.");

        const page = await target.page();
        console.log("Attached to BrowserView tab:", page.url());

        // Wait for the page to stabilize (initial load)
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => console.log("Initial navigation timeout, proceeding..."));

        // ✅ **Check if user is already logged in**
        console.log("Checking login status...");
        let isUserLoggedIn = await page.evaluate(() => {
            const balance = document.querySelector(".balance-currency__name");
            console.log("Balance element:", balance);
            return balance !== null;
        });

        if (!isUserLoggedIn) {
            console.log("User is NOT logged in. Checking for login button...");

            let loginButton = null;
            for (let i = 0; i < 3; i++) { // Retry up to 3 times
                // 🔄 **Re-check login status**
                isUserLoggedIn = await page.evaluate(() => {
                    const balance = document.querySelector(".balance-currency__name");
                    console.log("Balance element:", balance);
                    return balance !== null;
                });

                if (isUserLoggedIn) {
                    console.log("User logged in while waiting. Exiting login loop.");
                    break;
                }

                // 🔎 **Find the login button**
                try {
                    loginButton = await page.waitForSelector('span ::-p-text(Log in)', { visible: true, timeout: 10000 });
                    if (loginButton) {
                        await loginButton.click();
                        console.log("Login button clicked! Waiting for user...");

                        // 🔄 **Wait for user to log in**
                        await page.waitForSelector(".balance-currency__name", { visible: true, timeout: 180000 }); // 3 minutes
                        console.log("User logged in!");
                        break;
                    }
                } catch (error) {
                    console.log("LOG IN button not found. Retrying in 10 seconds...");
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }
            }
        } else {
            console.log("User is already logged in!");
        }

        // ✅ **Proceed to More Games**
        console.log("Proceeding to More Games...");
        // ✅ Wait for the "More" element and hover over it
        let moreMenuItem = null;
        for (let i = 0; i < 3; i++) { // Retry up to 3 times
            moreMenuItem = await page.waitForSelector('span ::-p-text(More)', { visible: true, timeout: 10000 }).catch(() => null);
            if (moreMenuItem) break; // Exit the loop if the element is found
            await page.waitForTimeout(4000); // Wait for 4 seconds before retrying
        }

        if (moreMenuItem) {
            await moreMenuItem.hover();
            console.log("Hovered over the 'More' element.");
        } else {
            console.error("'More' element not found.");
        }

        // **Find and click "Other Games"**
        let otherGames = null;
        for (let i = 0; i < 3; i++) {
            try {
                otherGames = await page.waitForSelector('span ::-p-text(Other games)', { visible: true, timeout: 10000 });
                if (otherGames) {
                    await otherGames.click();
                    console.log("Clicked the Other Games link.");
                    break;
                }
            } catch (error) {
                console.log("Other Games not found. Retrying in 5 seconds...");
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        // **Find and click "Aviator"**
        console.log("Finding the Aviator tab...");
        let aviatorLink = null;
        for (let i = 0; i < 3; i++) {
            try {
                aviatorLink = await page.waitForSelector('h2 ::-p-text(Aviator)', { visible: true, timeout: 10000 });
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