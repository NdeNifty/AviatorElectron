const puppeteer = require('puppeteer-core');
const aviatorBotBetika = require('./aviatorbotbetika');
const { ipcMain } = require('electron');

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

        // Check if user is already logged in
        console.log("Checking login status...");
        let isUserLoggedIn = await page.evaluate(() => {
            // Check for either .user-notifications__toggle or .topnav__session__links
            const userNotificationsToggle = document.querySelector(".user-notifications__toggle");
            const topnavSessionLinks = document.querySelector(".topnav__session__links");
            console.log("User notifications toggle or Topnav session links visible. User is logged in.");
            return userNotificationsToggle !== null || topnavSessionLinks !== null;
        });

        if (!isUserLoggedIn) {
            console.log("User is NOT logged in. Checking for login button...");

            let loginButton = null;
            for (let i = 0; i < 3; i++) { // Retry up to 3 times
                // Re-check login status
                isUserLoggedIn = await page.evaluate(() => {
                    const userNotificationsToggle = document.querySelector(".user-notifications__toggle");
                    const topnavSessionLinks = document.querySelector(".topnav__session__links");
                    console.log("User notifications toggle or Topnav session links visible. User is logged in.");
                    return userNotificationsToggle !== null || topnavSessionLinks !== null;
                });

                if (isUserLoggedIn) {
                    console.log("User logged in while waiting. Exiting login loop.");
                    break;
                }

                // Find the login button
                try {
                    loginButton = await page.waitForSelector('a ::-p-text(Login)', { visible: true, timeout: 10000 });
                    if (loginButton) {
                        await loginButton.click();
                        console.log("Login button clicked! Waiting for user to login...");

                        // Wait for user to log in
                        await page.waitForFunction(() => {
                            const userNotificationsToggle = document.querySelector(".user-notifications__toggle");
                            const topnavSessionLinks = document.querySelector(".topnav__session__links");
                            return userNotificationsToggle !== null || topnavSessionLinks !== null;
                        }, { visible: true, timeout: 180000 }); // 3 minutes
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

        // Find and click "Aviator"
        console.log("Finding the Aviator link...");
        let aviatorLink = null;
        for (let i = 0; i < 3; i++) {
            try {
                // Try both selectors
                const selectors = [
                    'span.sports-list__item__label',
                    'span ::-p-text(Aviator)'
                ];

                for (let selector of selectors) {
                    if (selector === 'span.sports-list__item__label') {
                        // If we're using the class selector, we need to find all elements and check each
                        const elements = await page.$$(selector);
                        for (let element of elements) {
                            const textContent = await page.evaluate(el => el.textContent, element);
                            if (textContent.trim() === 'Aviator') {
                                aviatorLink = element;
                                await aviatorLink.click();
                                console.log("Clicked the Aviator link using class selector.");
                                break;
                            }
                        }
                    } else {
                        // For 'span ::-p-text(Aviator)', it directly finds the element
                        aviatorLink = await page.waitForSelector(selector, { visible: true, timeout: 10000 });
                        if (aviatorLink) {
                            await aviatorLink.click();
                            console.log("Clicked the Aviator link using text selector.");
                        }
                    }

                    if (aviatorLink) break; // Exit the loop if we found and clicked the link
                }

                if (aviatorLink) {
                    // Wait for the Aviator iframe to load
                    console.log("Waiting for Aviator game iframe to load...");
                    const aviatorIframe = await page.waitForSelector('#aviator-iframe', { timeout: 20000 });
                    if (aviatorIframe) {
                        const aviatorFrame = await aviatorIframe.contentFrame();
                        if (aviatorFrame) {
                            console.log("Found correct Aviator game iframe:", aviatorFrame.url());
                            await aviatorBotBetika(aviatorFrame, ipcMain);
                        } else {
                            console.error("Could not access content of the Aviator game iframe.");
                        }
                    } else {
                        console.error("Aviator game iframe not found.");
                    }
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