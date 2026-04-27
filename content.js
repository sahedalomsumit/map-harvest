let scraping = false;
let scrapedData = [];
let seenKeys = new Set();
let lastStatusText = "Ready";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "START_SCRAPING") {
    if (!scraping) {
      scraping = true;
      scrapedData = [];
      seenKeys.clear();
      startHarvest();
    }
    sendResponse({ success: true });
  } else if (request.action === "STOP_SCRAPING") {
    stopHarvest();
    sendResponse({ success: true });
  } else if (request.action === "GET_STATUS") {
    sendResponse({ scraping: scraping, count: scrapedData.length, text: lastStatusText });
  }
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function startHarvest() {
  updateStatus("Starting harvest...");
  
  // Find the scrollable list container
  let feedContainer = getFeedContainer();
  
  // PHASE 1: SCROLL TO LOAD ALL ITEMS
  updateStatus("Scrolling to load all results...");
  let previousCount = 0;
  let noChangeCount = 0;
  let allItems = [];

  while (scraping) {
    allItems = document.querySelectorAll('a[href*="/maps/place/"]');
    updateStatus(`Scrolling to load all results... (Found ${allItems.length})`);
    
    if (allItems.length > 0) {
      // Scroll the last item into view to trigger lazy loading
      allItems[allItems.length - 1].scrollIntoView({ block: 'end' });
    }
    
    if (feedContainer) {
      feedContainer.scrollTop = feedContainer.scrollHeight;
    }
    
    await sleep(2500); // Give DOM and network time to load more
    
    let newItems = document.querySelectorAll('a[href*="/maps/place/"]');
    if (newItems.length === previousCount && newItems.length > 0) {
      noChangeCount++;
      
      // Look for Google Maps' specific end of list text
      const isEndOfList = Array.from(document.querySelectorAll('span, div')).some(el => 
        el.innerText && el.innerText.includes("You've reached the end of the list")
      );
      
      if (isEndOfList) {
        updateStatus("End of list detected.");
        break;
      }
      
      // Wait much longer for slower connections
      if (noChangeCount >= 20) {
        // End of list reached
        break;
      }
    } else {
      noChangeCount = 0;
    }
    previousCount = newItems.length;
  }

  if (!scraping) return;

  allItems = document.querySelectorAll('a[href*="/maps/place/"]');
  
  // Deduplicate items based on their href so we don't click the same place twice
  let items = [];
  let seenUrls = new Set();
  
  for (let i = 0; i < allItems.length; i++) {
    let el = allItems[i];
    let url = el.href.split('?')[0]; // Ignore query params for deduplication
    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      items.push(el);
    }
  }

  updateStatus(`Found ${items.length} unique results. Starting extraction...`);

  // PHASE 2: EXTRACT DATA
  let lastCompany = "";
  
  for (let i = 0; i < items.length; i++) {
    if (!scraping) break;
    
    let item = items[i];
    
    // Scroll the item into view without smooth animation to ensure reliable clicking
    item.scrollIntoView({ block: 'center' });
    await sleep(300); // Brief pause before click
    
    item.click();
    
    // Wait for the details panel to load by checking if the title has changed from the previous place
    let loaded = false;
    for (let wait = 0; wait < 20; wait++) { // Wait up to 5 seconds
      await sleep(250);
      const titleEl = document.querySelector('h1.DUwDvf.lfPIob');
      if (titleEl && titleEl.innerText.trim() && titleEl.innerText.trim() !== lastCompany) {
        loaded = true;
        break;
      }
    }
    
    // Wait an additional moment to let dynamic content (like phone, website, external links) render
    await sleep(1500); 
    
    if (!scraping) break;
    
    const details = extractDetails();
    if (details.company) {
      lastCompany = details.company;
    }
    
    const key = details.company + "|" + details.phone;
    
    // Deduplicate by name and phone
    if (!seenKeys.has(key) && details.company) {
      seenKeys.add(key);
      
      // Fetch external data if website exists
      if (details.website) {
        updateStatus(`Fetching website for ${details.company}... (${i + 1}/${items.length})`);
        try {
          const extra = await new Promise(resolve => {
             chrome.runtime.sendMessage({ action: "FETCH_WEBSITE", url: details.website }, response => resolve(response));
          });
          if (extra) {
            details.email = extra.email || "";
            details.facebook = extra.facebook || "";
            details.instagram = extra.instagram || "";
            details.linkedin = extra.linkedin || "";
          }
        } catch(e) {
          console.error(e);
        }
      }
      
      scrapedData.push(details);
      updateStatus(`Scraped ${scrapedData.length} of ${items.length} results...`);
    }
  }
  
  stopHarvest();
}

function stopHarvest() {
  scraping = false;
  updateStatus(`Harvest complete. Exporting ${scrapedData.length} items...`);
  if (scrapedData.length > 0) {
    chrome.runtime.sendMessage({ action: "EXPORT_CSV", data: scrapedData });
  }
  chrome.runtime.sendMessage({ action: "SCRAPING_DONE" });
}

function getFeedContainer() {
  // Google Maps DOM changes frequently, so we use multiple fallback selectors
  const possibleContainers = [
    document.querySelector('div[role="feed"]'),
    document.querySelector('.ecceSd'),
    document.querySelector('.m6QErb.DxyBCb.kA9KIf.dS8AEf.ecceSd'),
    document.querySelector('div[aria-label^="Results for"]')
  ];
  return possibleContainers.find(c => c !== null);
}

function extractDetails() {
  const data = {
    company: "", phone: "", website: "", email: "", reviews: "", 
    review_score: "", instagram: "", facebook: "", linkedin: ""
  };

  try {
    const titleEl = document.querySelector('h1.DUwDvf.lfPIob');
    if (titleEl) data.company = titleEl.innerText.trim();

    const f7nice = document.querySelector('div.F7nice');
    if (f7nice) {
      const text = f7nice.innerText.trim();
      const ratingMatch = text.match(/^[\d.,]+/);
      if (ratingMatch) data.review_score = ratingMatch[0];
      const reviewMatch = text.match(/\(([\d\s.,]+)\)/);
      if (reviewMatch) data.reviews = reviewMatch[1].trim();
    }

    const infoButtons = document.querySelectorAll('button.CsEnBe');
    infoButtons.forEach(btn => {
      const text = btn.innerText.trim();
      const ariaLabel = btn.getAttribute('aria-label') || "";
      
      if (ariaLabel.includes('Phone') || ariaLabel.includes('Puhelin') || text.match(/^[\d\s+-]{8,}$/)) {
        if (!data.phone) data.phone = text.replace(/[^+\d]/g, '');
      }
      if (ariaLabel.includes('Website') || ariaLabel.includes('Verkkosivusto') || ariaLabel.includes('Sivusto') || text.includes('.com') || text.includes('.fi') || text.includes('.ie') || text.includes('.net') || text.includes('.org')) {
        if (!data.website) {
          const hrefEl = btn.querySelector('a');
          if (hrefEl && hrefEl.href) {
            data.website = hrefEl.href;
          } else {
            data.website = `http://${text}`;
          }
        }
      }
    });

    if (!data.website) {
       const webLinks = document.querySelectorAll('a[data-item-id="authority"]');
       if (webLinks.length > 0) data.website = webLinks[0].href;
    }

  } catch (e) {
    console.error("Error extracting details:", e);
  }

  return data;
}

function updateStatus(text) {
  lastStatusText = text;
  chrome.runtime.sendMessage({ action: "UPDATE_PROGRESS", text }).catch(() => {
    // Ignore error when popup is closed
  });
}
