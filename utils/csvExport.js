export function exportToCsv(data) {
  if (!data || !data.length) return;

  const headers = [
    "company", "phone", "website", "email", "reviews", 
    "review_score", "instagram", "facebook", "linkedin"
  ];
  
  const csvRows = [];

  // Add headers
  csvRows.push(headers.map(header => `"${header}"`).join(','));

  // Add rows
  for (const row of data) {
    const values = headers.map(header => {
      let val = row[header] === null || row[header] === undefined ? "" : String(row[header]);
      
      if (header === 'phone' && val) {
        // Strip everything except numbers and +
        val = val.replace(/[^\d+]/g, '');
        // Prepend + if missing
        if (!val.startsWith('+')) {
          val = '+' + val;
        }
        // Use Excel CSV formula trick to force text parsing and avoid scientific notation
        return `"=""${val}"""`;
      }

      // Escape quotes for normal fields
      val = val.replace(/"/g, '""');
      return `"${val}"`;
    });
    csvRows.push(values.join(','));
  }

  // Use Data URI for downloading in Manifest V3 Service Worker
  const csvString = csvRows.join('\n');
  const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvString);
  
  chrome.downloads.download({
    url: dataUrl,
    filename: `map_harvest_${new Date().getTime()}.csv`,
    saveAs: true
  });
}
