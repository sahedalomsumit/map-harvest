let isScraping = false;

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url.includes("google.com/maps")) {
    document.getElementById('status').innerText = "Please open Google Maps.";
    return;
  }
  
  // Sync state with content script
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: "GET_STATUS" });
    if (response) {
      isScraping = response.scraping;
      if (isScraping) {
        document.getElementById('status').innerText = response.text;
      }
      updateUI();
    }
  } catch (e) {
    // Content script not injected yet
  }
});

document.getElementById('startBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url.includes("google.com/maps")) return;
  
  isScraping = true;
  updateUI();
  chrome.tabs.sendMessage(tab.id, { action: "START_SCRAPING" }).catch(() => {
    document.getElementById('status').innerText = "Please refresh the Maps page first.";
    isScraping = false;
    updateUI();
  });
});

document.getElementById('stopBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  isScraping = false;
  updateUI();
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { action: "STOP_SCRAPING" }).catch(() => {});
  }
});

function updateUI() {
  document.getElementById('startBtn').style.display = isScraping ? 'none' : 'block';
  document.getElementById('stopBtn').style.display = isScraping ? 'block' : 'none';
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "UPDATE_PROGRESS") {
    document.getElementById('status').innerText = request.text;
  } else if (request.action === "SCRAPING_DONE") {
    isScraping = false;
    updateUI();
    document.getElementById('status').innerText = "Done! Exporting CSV...";
  }
});
