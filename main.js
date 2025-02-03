const { app, BrowserWindow, BrowserView, ipcMain, dialog } = require('electron');
const path = require('path');
const scrapers = require('./scrapers'); // ✅ Import all scrapers dynamically

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
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  askForProductKey();
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

  sidebarView = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  browserView = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
  });

  mainWindow.addBrowserView(sidebarView);
  mainWindow.addBrowserView(browserView);

  sidebarView.setBounds({ x: 0, y: 0, width: 280, height });
  sidebarView.setAutoResize({ width: false, height: true });

  browserView.setBounds({ x: 280, y: 0, width: width - 280, height });
  browserView.setAutoResize({ width: true, height: true });

  sidebarView.webContents.loadFile('sidebar.html');
  browserView.webContents.loadFile('browser.html');

  mainWindow.on('resize', () => {
    const { width, height } = mainWindow.getBounds();
    sidebarView.setBounds({ x: 0, y: 0, width: 280, height });
    browserView.setBounds({ x: 280, y: 0, width: width - 280, height });
  });
}

// ✅ Handle URL updates from sidebar
ipcMain.on('update-url', (event, url) => {
  if (browserView) {
    console.log("URL received in main process:", url);
    browserView.webContents.loadURL(url);
  } else {
    console.error("BrowserView is not available.");
  }
});

// ✅ Start the appropriate scraper when "Load" is clicked
ipcMain.handle('start-scraper', async (event, scraperName) => {
  try {
    console.log("Starting scraper:", scraperName);

    // ✅ Use the dynamic import from `scrapers/index.js`
    const scraper = scrapers[scraperName];

    if (!scraper || typeof scraper.startScraper !== 'function') {
      throw new Error(`Scraper '${scraperName}' not found or missing startScraper()`);
    }

    const result = await scraper.startScraper();
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

// 🚀 Start Electron App
app.whenReady().then(createWindow);

// 🛑 Quit when all windows are closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
