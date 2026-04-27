let scraping = false;
let scrapedData = [];
let seenKeys = new Set();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "START_SCRAPING") {
    if (!scraping) {
      scraping = true;
      scrapedData = [];
      seenKeys.clear();
      startHarvest();
    }
  } else if (request.action === "STOP_SCRAPING") {
    stopHarvest();
  }
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function startHarvest() {
  updateStatus("Starting harvest...");
  
  // Find the scrollable list container
  let feedContainer = getFeedContainer();
  if (!feedContainer) {
    updateStatus("Could not find results list.");
    scraping = false;
    return;
  }

  let index = 0;
  
  while (scraping) {
    let items = document.querySelectorAll('a[href*="/maps/place/"]');
    
    if (index >= items.length) {
      // Try scrolling to load more
      let previousCount = items.length;
      feedContainer.scrollTop = feedContainer.scrollHeight;
      updateStatus("Loading more results...");
      await sleep(2000); // Give DOM time to update
      
      items = document.querySelectorAll('a[href*="/maps/place/"]');
      if (items.length === previousCount) {
        // End of list reached or lazy-load failed
        break;
      }
    }
    
    let item = items[index];
    if (!item) break;
    
    // Click the item to load details pane
    item.click();
    await sleep(2500); // Wait for details panel to load
    
    if (!scraping) break;
    
    const details = extractDetails();
    const key = details.company + "|" + details.phone;
    
    // Deduplicate by name and phone
    if (!seenKeys.has(key) && details.company) {
      seenKeys.add(key);
      
      // Fetch external data if website exists
      if (details.website) {
        updateStatus(`Fetching website for ${details.company}...`);
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
      updateStatus(`Scraped ${scrapedData.length} results...`);
    }
    
    index++;
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
  chrome.runtime.sendMessage({ action: "UPDATE_PROGRESS", text });
}
