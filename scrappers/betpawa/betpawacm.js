const puppeteer = require('puppeteer-core');

async function startScraper() {
    console.log("Attaching Puppeteer to Electron’s existing BrowserView...");

    const browser = await puppeteer.connect({
        browserURL: 'http://localhost:9222',
        defaultViewport: null
    });

    console.log("Puppeteer connected to Electron browser.");

    try {
        // ✅ Attach Puppeteer to the first available page
        const target = await browser.waitForTarget(target => target.type() === "page", { timeout: 10000 });

        if (!target) {
            throw new Error("No BrowserView page found.");
        }

        const page = await target.page();
        console.log("Attached to BrowserView tab:", page.url());

        console.log("Checking if user is already logged in...");

        // ✅ Check if balance is already visible (user is already logged in)
        const isUserLoggedIn = (await page.$("div.balance")) !== null;

        if (!isUserLoggedIn) {
            console.log("User is NOT logged in. Checking for login button...");

            // ✅ Wait for the "Login" button if it exists (handle timeout gracefully)
            const loginButton = await page.waitForSelector("a.button[href='/login']", { visible: true, timeout: 5000 }).catch(() => null);

            if (loginButton) {
                console.log("Login button found, clicking...");
                await loginButton.click();
                console.log("Clicked the Login button. Waiting for user to log in...");

                // ✅ Wait for user to log in (wait for .balance to appear)
                await page.waitForSelector("div.balance", { visible: true, timeout: 180000 });
                console.log("User logged in! Balance div detected.");
            } else {
                console.log("Login button NOT found. Maybe already logged in. Proceeding...");
            }
        } else {
            console.log("User is already logged in!");
        }

        console.log("Finding the Aviator tab...");
        // ✅ Use CSS selector for the Aviator tab
        const aviatorSelector = "span.tab-text";

        // ✅ Wait for the Aviator tab (check visibility)
        await page.waitForSelector(aviatorSelector, { visible: true, timeout: 60000 });

        // ✅ Select the tab element
        const aviatorTab = await page.$(aviatorSelector);
        
        if (aviatorTab) {
            // ✅ Check if the text content is "Aviator"
            const textContent = await aviatorTab.evaluate(el => el.textContent.trim());

            if (textContent === 'Aviator') {
                // ✅ Click the tab if it matches
                await aviatorTab.click();
                console.log("Aviator tab clicked!");
            } else {
                console.error("Aviator tab text does not match.");
            }
        } else {
            console.error("Aviator tab not found.");
        }

    } catch (error) {
        console.error("Error during scraping:", error);
    }
}

module.exports = { startScraper };
