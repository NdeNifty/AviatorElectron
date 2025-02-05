const puppeteer = require('puppeteer-core');

async function startScraper() {
    console.log("Attaching Puppeteer to Electrons existing BrowserView...");

    const browser = await puppeteer.connect({
        browserURL: 'http://localhost:9222',
        defaultViewport: null
    });

    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();

    console.log("Using existing BrowserView tab for scraping...");
    console.log("Page URL:", page.url());

    try {
        // Get the locator for the login button
        const loginButtonLocator = page.locator("a.button[href='/login']");

        // Wait for the button to be visible
        //await loginButtonLocator.waitFor({ timeout: 90000 });
        if (loginButtonLocator) {
            console.log("Login button located");
            loginButtonLocator.click();
            console.log("Clicked the Login button.");
        } else {
            console.log("Login button not located");
        }
        // Click the login button
        await loginButtonLocator.click();
        console.log("Clicked the Login button.");

        console.log("Scraping completed!");

    } catch (error) {
        console.error("Error during scraping:", error);
    }
}

module.exports = { startScraper };
