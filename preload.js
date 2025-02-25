const { contextBridge, ipcRenderer } = require('electron');

console.log("Hello from preload.js!");

contextBridge.exposeInMainWorld('electron', {
  updateURL: (url) => ipcRenderer.send('update-url', url),
  getCurrentURL: () => ipcRenderer.invoke('get-current-url'),
  onLoadURL: (callback) => ipcRenderer.on('load-url', (event, url) => callback(url)),
  submitProductKey: (key) => ipcRenderer.send('submit-product-key', key),
  getMappings: () => ipcRenderer.invoke('get-mappings'),
  scrapePage: (currentUrl, scraperName) => ipcRenderer.invoke('scrape-page', currentUrl, scraperName),
  onUpdateBalance: (callback) => ipcRenderer.on('update-balance', (event, balance) => callback(balance)),
  onPredictionUpdate: (callback) => ipcRenderer.on('prediction-update', (event, prediction) => callback(prediction)),
  stopBrowserView: () => ipcRenderer.send('stop-browser-view'),
});