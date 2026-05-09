async function scrapeEmailsAndSocials(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn(`Fetch returned status ${response.status} for: ${url}`);
      return { email: "", facebook: "", instagram: "", linkedin: "" };
    }
    
    const html = await response.text();
    
    // Ensure the domain ends with at least 2 letters for a valid TLD
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/gi;
    let emails = [...new Set(html.match(emailRegex) || [])];
    
    // Filter out common false positives (image extensions, generic non-emails)
    emails = emails.filter(e => !e.match(/\.(png|jpg|jpeg|gif|css|js|webp|svg)$/i) && !e.startsWith('sentry') && !e.includes('example.com'));
    
    // Social regex patterns
    const fbMatch = html.match(/(?:https?:\/\/)?(?:www\.)?facebook\.com\/[a-zA-Z0-9.-]+/i);
    const igMatch = html.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/[a-zA-Z0-9._-]+/i);
    const inMatch = html.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9.-]+/i);
    
    return {
      email: emails.length > 0 ? emails[0] : "",
      facebook: fbMatch ? fbMatch[0] : "",
      instagram: igMatch ? igMatch[0] : "",
      linkedin: inMatch ? inMatch[0] : ""
    };
  } catch (error) {
    console.warn("Scraping failed for:", url, error.message || error);
    return { email: "", facebook: "", instagram: "", linkedin: "" };
  }
}
