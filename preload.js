const { contextBridge, ipcRenderer } = require('electron');

console.log("Hello from preload.js!");

contextBridge.exposeInMainWorld('electron', {
    // Send URL to main process
    updateURL: (url) => ipcRenderer.send('update-url', url),

    //get current URL
    getCurrentURL: () => ipcRenderer.invoke('get-current-url'),
    
    // Invoke scrape-page from main process
    // scrapePage: (url) => ipcRenderer.invoke('scrape-page', url),

    // Listen for the 'load-url' event from the main process
    onLoadURL: (callback) => ipcRenderer.on('load-url', (event, url) => callback(url)),

    // Submit product key to the main process
    submitProductKey: (key) => ipcRenderer.send('submit-product-key', key),

    // Get mappings from the main process
    getMappings: () => ipcRenderer.invoke('get-mappings'),

    // startScraper: (scraperName) => ipcRenderer.invoke('start-scraper', scraperName),
    // scrapeData: (scraperName) => ipcRenderer.invoke('scrape-data', scraperName),
    scrapePage: (currentUrl, scraperName) => ipcRenderer.invoke('scrape-page', currentUrl, scraperName),

    //send balance from browserView to sidebarView
    onUpdateBalance: (callback) => ipcRenderer.on('update-balance', (event, balance) => callback(balance))
});
