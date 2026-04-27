import { scrapeEmailsAndSocials } from './utils/emailScraper.js';
import { exportToCsv } from './utils/csvExport.js';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "FETCH_WEBSITE") {
    scrapeEmailsAndSocials(request.url)
      .then(data => sendResponse(data))
      .catch(err => sendResponse({ error: err.toString() }));
    return true; // Keep message channel open for async response
  }
  
  if (request.action === "EXPORT_CSV") {
    exportToCsv(request.data);
    sendResponse({ success: true });
  }
});
