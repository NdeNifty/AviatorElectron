const { app, BrowserWindow, BrowserView, ipcMain, dialog } = require('electron');
const path = require('path');
const scrapers = require('./scrappers');

let mainWindow;
let sidebarView;
let browserView;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,  // Initial width (will be overridden by maximize)
    height: 800,  // Initial height (will be overridden by maximize)
    show: false,
    webPreferences: {
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  askForProductKey();
}

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
      mainWindow.maximize(); // Maximize the window to fill the screen
    } else {
      dialog.showErrorBox('Error', 'Invalid product key. Exiting...');
      app.quit();
    }
  });
}

function loadMainApp() {
  const { width, height } = mainWindow.getBounds();

  sidebarView = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false,
    },
  });

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

  mainWindow.setBrowserView(browserView);
  mainWindow.addBrowserView(sidebarView);

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

  // Forward prediction updates from browserView to sidebarView
  ipcMain.on('prediction-update', (event, prediction) => {
    if (sidebarView && sidebarView.webContents) {
      sidebarView.webContents.send('prediction-update', prediction);
    }
  });
}

ipcMain.on('update-url', (event, url) => {
  if (browserView) {
    console.log("Loading URL in BrowserView:", url);
    browserView.webContents.loadURL(url);
  } else {
    console.error("BrowserView is not available.");
  }
});

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

ipcMain.handle('scrape-page', async (event, url, scraperName) => {
  console.log("Starting scraper for:", scraperName);
  try {
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

ipcMain.on('stop-browser-view', () => {
  if (browserView && browserView.webContents) {
    console.log("Stopping BrowserView and resetting to browser.html");
    browserView.webContents.stop();
    browserView.webContents.loadFile('browser.html');
  } else {
    console.error("BrowserView is not available.");
  }
});

ipcMain.on('balance-updated', (event, balance) => {
  console.log("Received balance update:", balance);
  if (sidebarView && sidebarView.webContents) {
    sidebarView.webContents.send('update-balance', balance);
  }
});

app.commandLine.appendSwitch('remote-debugging-port', '9222');

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});