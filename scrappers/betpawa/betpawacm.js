const puppeteer = require('puppeteer');

async function scrapeBetPawaCm(url) {
    console.log("Launching Puppeteer for BetPawaCm...");

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Example: Scrape page title
        const title = await page.title();

        // Example: Extract some betting data (Modify this based on actual site structure)
        const odds = await page.evaluate(() => {
            let oddsElements = document.querySelectorAll(".odd-class"); // Update selector
            return Array.from(oddsElements).map(el => el.innerText);
        });

        await browser.close();

        return { title, odds };
    } catch (error) {
        console.error("Error during scraping:", error);
        await browser.close();
        return { error: "Failed to scrape BetPawa Cameroon" };
    }
}

module.exports = { scrapeBetPawaCm };
