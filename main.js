const { app, BrowserWindow, BrowserView, ipcMain, dialog } = require('electron');
const path = require('path');
const scrapers = require('./scrappers'); // ✅ Import all scrapers dynamically

let mainWindow;
let sidebarView;
let browserView;

console.log("Hello from Electron!");

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  askForProductKey();


  //  // Open Developer Tools in Electron window
  // mainWindow.webContents.openDevTools();
  // mainWindow.focus();
  setTimeout(() => {
    mainWindow.setAlwaysOnTop(false);
}, 40000); // Change 2000ms to a time that works best for you
}

// 🔑 Product Key Input
function askForProductKey() {
  let inputWindow = new BrowserWindow({
    width: 400,
    height: 300,
    modal: true,
    parent: mainWindow,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  inputWindow.loadFile('product-key.html');

  ipcMain.once('submit-product-key', (event, key) => {
    if (key === '1') {
      inputWindow.close();
      mainWindow.show();
      loadMainApp();
    } else {
      dialog.showErrorBox('Error', 'Invalid product key. Exiting...');
      app.quit();
    }
  });
}

// Load Sidebar & Browser Views
function loadMainApp() {
  const { width, height } = mainWindow.getBounds();

  // ✅ Create Sidebar View
  sidebarView = new BrowserView({
      webPreferences: {
          contextIsolation: true,
          preload: path.join(__dirname, 'preload.js'),
          backgroundThrottling: false,
      },
  });

  // ✅ Create Browser View
  browserView = new BrowserView({
      webPreferences: {
          contextIsolation: true,
          preload: path.join(__dirname, 'preload.js'),
          nodeIntegration: false,
          webSecurity: false,
          allowRunningInsecureContent: true,
          backgroundThrottling: false,
      },
  });

  // ✅ Ensure both views are added explicitly
  mainWindow.setBrowserView(browserView);  // Forces BrowserView to be active
  mainWindow.addBrowserView(sidebarView);  // Keeps SidebarView separate

  // ✅ Correct Boundaries for Sidebar & Browser View
  sidebarView.setBounds({ x: 0, y: 0, width: 280, height });
  sidebarView.setAutoResize({ width: false, height: true });

  browserView.setBounds({ x: 280, y: 0, width: width - 280, height });
  browserView.setAutoResize({ width: true, height: true });

  // ✅ Load Sidebar & Browser Separately
  sidebarView.webContents.loadFile('sidebar.html');
  browserView.webContents.loadFile('browser.html');

  // ✅ Debugging: Check Which View is Active
  console.log("SidebarView URL:", sidebarView.webContents.getURL());
  console.log("BrowserView URL:", browserView.webContents.getURL());

  // ✅ Prevent Views from Overwriting Each Other
  mainWindow.on('resize', () => {
      const { width, height } = mainWindow.getBounds();
      sidebarView.setBounds({ x: 0, y: 0, width: 280, height });
      browserView.setBounds({ x: 280, y: 0, width: width - 280, height });
  });
}


// ✅ Handle URL updates from sidebar
ipcMain.on('update-url', (event, url) => {
  if (browserView) {
      console.log("Loading URL in BrowserView:", url);
      browserView.webContents.loadURL(url); // ✅ Load website inside BrowserView
  } else {
      console.error("BrowserView is not available.");
  }
});


// Get current Url 'get-current-url' request and return the current URL
ipcMain.handle('get-current-url', async () => {
  if (browserView && browserView.webContents) {
    const currentUrl = browserView.webContents.getURL();
    console.log("Current URL:", currentUrl);
    return currentUrl;
  } else {
    console.error("No active browser view found.");
    return null;
  }
});

// ✅ Start the scraper when "Scrape" is clicked in the browser view
ipcMain.handle('scrape-page', async (event, _, scraperName) => {
  console.log("Starting scraper for:", scraperName);

  try {
      const scrapers = require('./scrappers');
      const scraper = scrapers[scraperName];

      if (!scraper || typeof scraper.startScraper !== 'function') {
          throw new Error(`Scraper '${scraperName}' not found or missing startScraper()`);
      }

      console.log("Connecting Puppeteer to BrowserView...");
      const result = await scraper.startScraper();
      
      console.log("Scraper finished:", result);
      return result;
  } catch (error) {
      console.error("Scraper failed:", error);
      return { error: error.message || "Scraper failed to start." };
  }
});


// ✅ Extract data from the already running scraper when "Scrape" is clicked
ipcMain.handle('scrape-data', async (event, scraperName) => {
  try {
    console.log("Extracting data using:", scraperName);

    const scraper = scrapers[scraperName];

    if (!scraper || typeof scraper.scrapeData !== 'function') {
      throw new Error(`Scraper '${scraperName}' not found or missing scrapeData()`);
    }

    const result = await scraper.scrapeData();
    return result;
  } catch (error) {
    console.error("Scraping failed:", error);
    return { error: error.message || "Scraping failed." };
  }
});



// ✅ **Listen for balance update from Puppeteer browserView via preload**
ipcMain.on('balance-updated', (event, balance) => {
  console.log("Received balance update:", balance);
  if (sidebarView && sidebarView.webContents) {
      sidebarView.webContents.send('update-balance', balance); // ✅ Send to sidebar
  }
});




// modifying electron to work in debig mode.
app.commandLine.appendSwitch('remote-debugging-port', '9222'); // ✅ Enable remote debugging


// 🚀 Start Electron App
app.whenReady().then(createWindow);

// 🛑 Quit when all windows are closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
