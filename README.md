# Map Harvest 🗺️

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg?style=for-the-badge)](https://github.com/sahedalomsumit/map-harvest)
[![Landing Page](https://img.shields.io/badge/Landing_Page-Live-emerald.svg?style=for-the-badge)](https://github.com/sahedalomsumit/map-harvest-web)

> Map Harvest - The Ultimate Google Maps Scraper & Lead Generation Tool

Map Harvest is a lightweight, fully client-side Chrome Extension that scrapes Google Maps search results and exports the data directly into a cleanly formatted CSV file. No backend, no API keys, and no rate limits.

> [!TIP]
> Visit the [Map Harvest Web](https://github.com/sahedalomsumit/map-harvest-web) repository for the official landing page and documentation.

## ✨ Features

- **Automated Scraping**: Automatically scrolls through Google Maps search results, clicks each listing, and extracts the data.
- **Deep Scraping**: Fetches the business's website in the background to extract email addresses and social media links (Facebook, Instagram, LinkedIn) while avoiding CORS issues.
- **Robust Data Extraction**: Captures the business name, phone number (formatted as text for Excel), website URL, email, total reviews, review score, and social links.
- **Smart Export Naming**: Automatically names the exported CSV file based on your search query for easy organization.
- **Deduplication**: Automatically deduplicates listings by business name and phone number.
- **100% Client-Side**: All scraping and CSV generation happens directly in your browser. No data is sent to external servers.
- **Excel-Friendly CSV**: Phone numbers are automatically prepended with their country code (e.g., `+353...`) and formatted so that Excel reads them as text, preventing them from being converted into scientific notation.

## 📦 Data Collected

For every business listing, Map Harvest collects the following columns:

1. `company` — The name of the business
2. `phone` — The phone number (formatted with `+` and protected from scientific notation)
3. `website` — The business website URL
4. `email` — Scraped directly from the business's website (filters out false positives)
5. `reviews` — The total number of reviews on Google Maps
6. `review_score` — The star rating (e.g., 4.8)
7. `instagram` — Instagram profile link (if found on the website)
8. `facebook` — Facebook page link (if found on the website)
9. `linkedin` — LinkedIn company link (if found on the website)

## 🚀 Installation (Developer Mode)

Since this extension is not published on the Chrome Web Store, you'll need to load it manually:

1. Clone or download this repository to your local machine.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle switch in the top right corner.
4. Click the **Load unpacked** button in the top left corner.
5. Select the `map-harvest` folder that you downloaded.
6. The Map Harvest icon will now appear in your browser's extension toolbar!

## 🛠️ How to Use

1. Go to [Google Maps](https://www.google.com/maps).
2. Search for any query (e.g., "dentists in Helsinki", "spas in Dublin").
3. Click the **Map Harvest** extension icon in your browser toolbar.
4. Click **Start Scraping**.
5. Sit back and watch the extension scroll through the list, click on results, and scrape the data in real-time.
6. You can monitor the progress in the popup window.
7. Click **Stop & Export** at any time (or wait for the end of the list) to automatically download your data as a `.csv` file.

## 🏗️ Tech Stack

- **Vanilla JavaScript**: Pure JS with no external libraries or heavy dependencies.
- **Manifest V3**: Built using the latest standards for Chrome Extensions.
- **Service Workers**: Utilizes a background script to fetch external websites and orchestrate CSV downloads.
- **Content Scripts**: Interacts natively with the Google Maps DOM.

## 📝 Notes & Edge Cases Handled

- **Dynamic DOM**: Google Maps constantly changes its DOM classes. This extension uses multiple fallback selectors and Regex parsing to reliably pull ratings and reviews regardless of locale (e.g., works with Finnish formatting like "4,8" and "Kylpylä").
- **Missing Data**: If a business lacks an email, social links, or a website, the extension gracefully leaves the column blank without crashing.
- **CSV Escaping**: All data is properly wrapped in quotes and escaped, so internal commas (like in review scores) won't break the CSV layout.

## 👨‍💻 Author

- Built with ❤️ by [Sahed Alom Sumit](https://github.com/sahedalomsumit)
