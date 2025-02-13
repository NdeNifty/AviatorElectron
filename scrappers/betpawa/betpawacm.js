const puppeteer = require('puppeteer-core');
    const aviatorbot = require('../aviatorbot');

async function startScraper() {
    console.log("Attaching Puppeteer to Electron’s existing BrowserView...");

    const browser = await puppeteer.connect({
        browserURL: 'http://localhost:9222',
        defaultViewport: null,
        ignoreHTTPSErrors: true // ✅ Ignore SSL errors
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

        // ✅ Check if balance is already visible (user is logged in)
        const isUserLoggedIn = (await page.$("div.balance")) !== null;

        if (!isUserLoggedIn) {
            console.log("User is NOT logged in. Checking for login button...");

            // ✅ Wait for the login button if it exists (gracefully handle timeout)
            const loginButton = await page.waitForSelector("a.button[href='/login']", { visible: true, timeout: 600000 }).catch(() => null);

            if (loginButton) {
                console.log("Login button found, clicking...");
                await loginButton.click();
                console.log("Clicked the Login button. Waiting for user to log in...");

                // ✅ Wait for the page to load after login attempt
                await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => null);

                // ✅ Wait for user to log in (detect balance div)
                await page.waitForSelector("div.balance", { visible: true, timeout: 180000 });
                console.log("User logged in! Balance div detected.");
            } else {
                console.log(" Login button NOT found! Maybe already logged in. Proceeding...");
            }
        } else {
            console.log("User is already logged in!");
        }

        console.log("Finding the Aviator tab...");

          // ✅ Wait for the Aviator tab and click it
          let aviatorLink = null;
          for (let i = 0; i < 3; i++) {
              aviatorLink = await page.waitForSelector("span ::-p-text(Aviator)", { visible: true, timeout: 10000 }).catch(() => null);
              if (aviatorLink) break;
              await page.waitForTimeout(4000); // Wait for 2 seconds before retrying
          }
        if (aviatorLink) {
            await aviatorLink.click();
            console.log("Clicked the Aviator tab.");
            //the aviator bot
            await aviatorbot(page);
        } else {
            console.error("Aviator tab not found.");
        }
        

    } catch (error) {
        console.error("Error during scraping:", error);
    }
}

module.exports = { startScraper };
