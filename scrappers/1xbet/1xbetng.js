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

        

        // Check if user is logged in (arrow next to account balance is visible)
        const isUserLoggedIn = (await page.$("span.account-select-toggle_content")) !== null;

        if (!isUserLoggedIn) {
            console.log("User is NOT logged in. Checking for login button...");
            //Problem with 1xbet. Login button takes time to laod. Even with fast internet connection.
            // ✅ Wait for the login button if it exists (gracefully handle timeout for 600 seconds)
            
            //Wait for Log in Buttn to load
            let loginButton = null;
        for (let i = 0; i < 3; i++) { // Retry up to 3 times
            //const elements = await page.$x("//span[text()='Log in']");
            console.log("To to to ...");
            const elements = await page.waitForSelector("//span[text()='Log in']", { visible: true, timeout: 600000 }).catch(() => null);
            console.log("Bla bla bla");
            
            if (elements.length > 0) {
                console.log("Login elements found!");
                loginButton = elements[0];
                break; // Exit loop if found
            }

            console.log(`LOG IN button not found. Retrying in 4 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 4000)); // Wait for 4 seconds before retrying
        }
            if (loginButton) {
                console.log("Login button found, clicking...");
                await loginButton.click();
                console.log("Clicked the Login button. Waiting for user to log in...");

                // ✅ Wait for the page to load after login attempt
                await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => null);

                // ✅ Wait for user to log in (detect arrow next to user balance)
                await page.waitForSelector("span.account-select-toggle_content", { visible: true, timeout: 180000 });
                console.log("User logged in! Balance div detected.");
            } else {
                console.log(" Login button NOT found! Maybe already logged in. Proceeding...");
            }
        } else {
            console.log("User is already logged in!");
        }
        //Locate over more games on menu 

        

        //hover over the more games menu
        await page.hover("span ::-p-text(More games)");

       
        //find the other games link
        let othergames = null;
        for (let i = 0; i < 3; i++) {
            othergames = await page.waitForSelector("span ::-p-text(Other games)", { visible: true, timeout: 10000 }).catch(() => null);
            if (othergames) break;
            await page.waitForTimeout(4000); // Wait for 4 seconds before retrying
        }

        if (othergames) {
            //click the other games link
            await othergames.click();
            console.log("Clicked the other games link.");
            
        } else {
            console.error("Other games not found");
        }


        //
        console.log("Finding the Aviator tab...");

          // ✅ Wait for the Aviator tab to load
          let aviatorLink = null;
          for (let i = 0; i < 3; i++) {
              aviatorLink = await page.waitForSelector('//h2[contains(text(), "Aviator")', { visible: true, timeout: 10000 }).catch(() => null);
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
