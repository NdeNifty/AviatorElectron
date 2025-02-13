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
        console.log("Attached to BrowserView tab:", page.url());

        // Check if user is logged in
        const isUserLoggedIn = (await page.$("span.account-select-toggle_content")) !== null;

        if (!isUserLoggedIn) {
            console.log("User is NOT logged in. Checking for login button...");
            
            // Wait for Registration form
            // await page.waitForSelector('.input-phone__number', { timeout: 60000 });
            // console.log("Registration form found");
            
            let loginButton = null;
            for (let i = 0; i < 3; i++) { // Retry up to 3 times
                loginButton = await page.waitForFunction(() => {
                    return Array.from(document.querySelectorAll('span'))
                        .find(span => span.textContent.trim() === "Log in");
                }, { timeout: 60000 });
            
                if (loginButton) {
                    console.log("Login button found, clicking...");
            
                    // ✅ Click inside the page context to avoid the "not clickable" error
                    await page.evaluate(el => el.click(), loginButton);
            
                    console.log("Login button clicked!");
                    break; // Exit loop if clicked successfully
                }
            
                console.log("LOG IN button not found. Retrying in 10 seconds...");
                await new Promise(resolve => setTimeout(resolve, 10000)); // Wait before retrying
            }
            
            
            

            if (!loginButton) {
                console.log("Login button NOT found! Maybe already logged in. Proceeding...");
            }

            // Wait for user to be logged in
            await page.waitForSelector("span.account-select-toggle_content", { visible: true, timeout: 180000 });
            console.log("User logged in! Balance detected.");
        } else {
            console.log("User is already logged in!");
        }

        // Hover over "More Games"
        await page.hover("span ::-p-text(More games)");

        // Find and click "Other Games"
        let otherGames = null;
        for (let i = 0; i < 3; i++) {
            otherGames = await page.waitForSelector("span ::-p-text(Other games)", { visible: true, timeout: 10000 }).catch(() => null);
            if (otherGames) break;
            await new Promise(resolve => setTimeout(resolve, 4000));
        }

        if (otherGames) {
            await otherGames.click();
            console.log("Clicked the other games link.");
        } else {
            console.error("Other games not found.");
        }

        // Find and click "Aviator"
        console.log("Finding the Aviator tab...");
        let aviatorLink = null;
        for (let i = 0; i < 3; i++) {
            aviatorLink = await page.waitForSelector('//h2[contains(text(), "Aviator")]', { visible: true, timeout: 10000 }).catch(() => null);
            if (aviatorLink) break;
            await new Promise(resolve => setTimeout(resolve, 4000));
        }

        if (aviatorLink) {
            await aviatorLink.click();
            console.log("Clicked the Aviator tab.");
            await aviatorbot(page);
        } else {
            console.error("Aviator tab not found.");
        }

    } catch (error) {
        console.error("Error during scraping:", error);
    }
}

module.exports = { startScraper };
