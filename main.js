const { app, BrowserWindow, BrowserView, ipcMain, dialog } = require('electron');
const path = require('path');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

let mainWindow;
let sidebarView;
let browserView;

// Function to read mappings from Python file

console.log("Hello from Electron!");
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Hide window until key validation is done
    webPreferences: {
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  askForProductKey(); // Ask for product key before loading the app
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
      loadMainApp(); // ✅ Load sidebar and browser views here
    } else {
      dialog.showErrorBox('Error', 'Invalid product key. Exiting...');
      app.quit();
    }
  });
}

// 🖥️ Load Sidebar & Browser Views After Validation
function loadMainApp() {
  const { width, height } = mainWindow.getBounds();

  // Sidebar View
  sidebarView = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Browser View
  browserView = new BrowserView({
    webPreferences: {
      contextIsolation: true,
    preload: path.join(__dirname, 'preload.js'),
    nodeIntegration: false,
    webSecurity: false,  // Disable web security
    allowRunningInsecureContent: true, // Allow loading insecure content
    },
  });

  // ✅ Attach Views Correctly
  mainWindow.addBrowserView(sidebarView);
  mainWindow.addBrowserView(browserView);

  // Set initial positions and sizes
  sidebarView.setBounds({ x: 0, y: 0, width: 280, height });
  sidebarView.setAutoResize({ width: false, height: true });

  browserView.setBounds({ x: 280, y: 0, width: width - 280, height });
  browserView.setAutoResize({ width: true, height: true });

  // Load content into views
  sidebarView.webContents.loadFile('sidebar.html');
  browserView.webContents.loadFile('browser.html');

  // Adjust views when window resizes
  mainWindow.on('resize', () => {
    const { width, height } = mainWindow.getBounds();
    sidebarView.setBounds({ x: 0, y: 0, width: 280, height });
    browserView.setBounds({ x: 280, y: 0, width: width - 280, height });
  });

  // // Handle URL updates from sidebar
  // ipcMain.on('update-url', (event, url) => {
  //   browserView.webContents.send('load-url', url);
  // });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();

// 🕵️‍♂️ Handle Scraping
ipcMain.handle('scrape-page', async (event, url) => {
  const options = new chrome.Options();
  options.addArguments('--headless');

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    await driver.get(url);
    await driver.wait(until.elementLocated(By.css('body')), 10000);
    const title = await driver.getTitle();
    return { title };
  } finally {
    await driver.quit();
  }
});
});

// listen for the 'update-url' event from the renderer process
ipcMain.once('update-url', (event, url) => {
  
  if (browserView) {
    browserView.webContents.send('load-url', url); // Send URL to browserView's renderer
    console.log("URL received in main process:", url);
    browserView.webContents.loadURL(url); // Load the URL in the BrowserView
  } else {
    console.error("BrowserView is not available.");
  }
});