const puppeteer = require('puppeteer-core');
const aviatorbot = require('./aviatorbotsporty');
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
        const target = await browser.waitForTarget(
            target => target.type() === "page" && !target.url().includes("sidebar.html"),
            { timeout: 10000 }
        );
        if (!target) throw new Error("No BrowserView page found.");

        const page = await target.page();
       // console.log("Attached to BrowserView tab:", page.url());

        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 }).catch(() => console.log("Initial navigation timeout, proceeding..."));

        // Proceed to the 'Games' menu
        console.log("Opening 'Games' menu...");
        const gamesMenuItem = await page.waitForSelector('#header_nav_games', { visible: true, timeout: 15000 });

        if (gamesMenuItem) {
            await gamesMenuItem.click();
           // console.log("Clicked 'Games' menu.");

            console.log("Waiting for the games iframe...");
            const gameIframe = await page.waitForSelector('#games-lobby', { visible: true, timeout: 15000 });
           // console.log("Games iframe detected.");

            await new Promise(resolve => setTimeout(resolve, 2000));
            //console.log("Games iframe stabilized.");

            const iframe = await gameIframe.contentFrame();
            if (!iframe) {
                console.error("Failed to get iframe content.");
                return;
            }

           // console.log("Interacting with the iframe...");

            async function interactWithAviator(iframe, page) {
                try {
                    console.log("Looking for 'Aviator' tab...");
                    await iframe.waitForSelector('span.name[data-cms-key="aviator"]', { visible: true, timeout: 10000 });
                    console.log("Found 'Aviator' tab.");
                    const aviatorLink = await iframe.$('span.name[data-cms-key="aviator"]');
                    if (aviatorLink) {
                        await iframe.evaluate(el => el.scrollIntoView(), aviatorLink);
                        await iframe.evaluate(el => el.click(), aviatorLink);
                        console.log("Clicked 'Aviator' tab.");

                        console.log("Waiting for Aviator game to load...");
                        await new Promise(resolve => setTimeout(resolve, 8000));

                        console.log("Looking for the 'games-lobby' iframe...");
                        const gamesLobbyIframe = await page.waitForSelector('#games-lobby', { timeout: 10000 });
                        if (gamesLobbyIframe) {
                            const gamesLobbyFrame = await gamesLobbyIframe.contentFrame();
                            if (gamesLobbyFrame) {
                                console.log("Found 'games-lobby' iframe, looking for Aviator game iframe...");
                                let correctIframe = null;
                                const MAX_RETRIES = 3;
                                let attempts = 0;
                                
                                while (attempts < MAX_RETRIES && !correctIframe) {
                                    try {
                                        correctIframe = await gamesLobbyFrame.waitForSelector('iframe[src*="launch.spribegaming.com/aviator"]', { timeout: 20000 });
                                        console.log("Found Aviator game iframe after attempt:", attempts + 1);
                                    } catch (error) {
                                        console.log("Aviator game iframe not found, retrying in 5 seconds...");
                                        attempts++;
                                        await new Promise(resolve => setTimeout(resolve, 5000));
                                    }
                                }

                                if (correctIframe) {
                                    const aviatorFrame = await correctIframe.contentFrame();
                                    if (aviatorFrame) {
                                        console.log("Found correct Aviator game iframe:", aviatorFrame.url());
                                        await aviatorbot(aviatorFrame, ipcMain);
                                    } else {
                                        console.error("Could not access content of the Aviator game iframe.");
                                    }
                                } else {
                                    console.error("Could not find the iframe with the Aviator game after retries.");
                                }
                            } else {
                                console.error("Could not access content of the 'games-lobby' iframe.");
                            }
                        } else {
                            console.error("Could not find the 'games-lobby' iframe.");
                        }
                    } else {
                        console.warn("'Aviator' tab not found.");
                    }
                } catch (error) {
                    console.error("Error finding 'Aviator' tab:", error);
                }
            }

            // Call interactWithAviator
            await interactWithAviator(iframe, page);

            // Switch back to the main page
            await page.bringToFront();
            console.log("Returned to main page.");
        } else {
            console.error("'Games' menu not found.");
            return;
        }

    } catch (error) {
        console.error("Error during scraping:", error);
    }
}

module.exports = { startScraper };