const puppeteer = require('puppeteer');

async function startScraper() {
    console.log("Launching Puppeteer for BetPawaCm...");

    const browser = await puppeteer.launch({ headless: false }); // Set headless: false for debugging
    const page = await browser.newPage();

    await page.goto('https://betpawa.cm', { waitUntil: 'networkidle2' });

    try {
        // ✅ Wait for any link that contains '/login'
        await page.waitForSelector("a.button[href='/login']", { visible: true, timeout: 10000 });

        // ✅ Click on the LOGIN button using evaluate
        await page.evaluate(() => {
            const loginButton = document.querySelector("a.button[href='/login']");
            if (loginButton) {
                loginButton.click();
                console.log("Clicked the Login button.");
            } else {
                console.error("Login button not found.");
            }
        });

        // ✅ Wait for the "Aviator" link
        await page.waitForSelector("a", { visible: true, timeout: 10000 });

        // ✅ Click on the AVIATOR link
        await page.evaluate(() => {
            const aviatorLink = Array.from(document.querySelectorAll("a")).find(a => a.textContent.includes("AVIATOR"));
            if (aviatorLink) {
                aviatorLink.click();
                console.log("Clicked the Aviator Link.");
            } else {
                console.error("Aviator link not found.");
            }
        });

        console.log("Navigation complete!");

    } catch (error) {
        console.error("Error during scraping:", error);
    } finally {
        await browser.close();
    }
}

startScraper();
