const puppeteer = require('puppeteer');

async function scrape1xBetCm(url) {
    console.log("Launching Puppeteer for 1xBetCm...");

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Example: Scrape page title
        const title = await page.title();

        // Example: Extract match data
        const matches = await page.evaluate(() => {
            let matchElements = document.querySelectorAll(".match-class"); // Update selector
            return Array.from(matchElements).map(el => el.innerText);
        });

        await browser.close();

        return { title, matches };
    } catch (error) {
        console.error("Error during scraping:", error);
        await browser.close();
        return { error: "Failed to scrape 1xBet Cameroon" };
    }
}

module.exports = { scrape1xBetCm };
