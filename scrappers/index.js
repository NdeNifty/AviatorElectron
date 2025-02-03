const fs = require('fs');
const path = require('path');

const scrapers = {};

// Function to recursively get all JavaScript files
function loadScrapers(directory) {
  fs.readdirSync(directory).forEach(file => {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      loadScrapers(fullPath); // 🔁 Recursively load subfolders
    } else if (file.endsWith('.js')) {
      const scraperName = path.relative(__dirname, fullPath).replace(/\\/g, '/').replace('scrappers/', '').replace('.js', '');
      scrapers[scraperName] = require(fullPath);
    }
  });
}

// Start loading all scrapers
const scrappersDir = path.join(__dirname, 'scrappers');
loadScrapers(scrappersDir);

module.exports = scrapers;
