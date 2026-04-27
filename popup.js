let isScraping = false;

document.getElementById('startBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.url.includes("google.com/maps")) {
    document.getElementById('status').innerText = "Please open Google Maps.";
    return;
  }
  
  isScraping = true;
  updateUI();
  chrome.tabs.sendMessage(tab.id, { action: "START_SCRAPING" });
});

document.getElementById('stopBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  isScraping = false;
  updateUI();
  chrome.tabs.sendMessage(tab.id, { action: "STOP_SCRAPING" });
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
