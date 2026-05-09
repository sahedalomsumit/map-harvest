let isScraping = false;

document.addEventListener('DOMContentLoaded', async () => {
  // Set version
  const manifest = chrome.runtime.getManifest();
  const versionEl = document.getElementById('version');
  if (versionEl) {
    versionEl.innerText = `Version ${manifest.version}`;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isGoogleMaps = tab && /google\.[a-z.]+\/maps/.test(tab.url);
  if (!isGoogleMaps) {
    const statusEl = document.getElementById('status');
    statusEl.innerHTML = 'Please open Google Maps';
    statusEl.style.cursor = 'pointer';
    statusEl.onclick = () => window.open('https://www.google.com/maps', '_blank');
    statusEl.title = 'Click to open Google Maps';
    return;
  }
  
  const statusEl = document.getElementById('status');
  statusEl.style.cursor = 'default';
  statusEl.onclick = null;
  statusEl.title = '';

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
  const isGoogleMaps = tab && /google\.[a-z.]+\/maps/.test(tab.url);
  if (!isGoogleMaps) return;
  
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
  const warningMsg = document.getElementById('warningMsg');
  if (warningMsg) {
    warningMsg.style.display = isScraping ? 'block' : 'none';
  }
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
