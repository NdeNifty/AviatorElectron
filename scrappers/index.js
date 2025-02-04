const fs = require('fs');
const path = require('path');

const scrapers = {};

// Get the absolute path of the `scrappers` directory
const scrappersDir = __dirname; // ✅ Now correctly points to `scrappers/`

// Function to recursively get all JavaScript files
function loadScrapers(directory) {
  fs.readdirSync(directory).forEach(file => {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      loadScrapers(fullPath); // 🔁 Recursively load subfolders
    } else if (file.endsWith('.js') && file !== 'index.js') {
      const scraperName = path.basename(file, '.js'); // ✅ Extract just the filename without extension
      scrapers[scraperName] = require(fullPath);
    }
  });
}

// Start loading all scrapers
loadScrapers(scrappersDir);

module.exports = scrapers;
