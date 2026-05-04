// Puppeteer browser routing — connects to an existing Chrome DevTools endpoint rather
// than launching a new browser. This preserves the user's logged-in sessions (Gmail,
// trade sites, etc.) without storing credentials in the app.
//
// BROWSER_MODE values:
//   bang-local  — Bang machine running its own scrapers: port 9223 → headless fallback
//   bang-tunnel — PB's local machine via SSH tunnel: port 19223 → headless fallback
//   local       — PB's local DevProfile Chrome: port 9222 → headless fallback

import puppeteer, { type Browser, type Page } from 'puppeteer';

const BROWSER_MODE = process.env.BROWSER_MODE || 'bang-tunnel';

// Resource types blocked in newPage() — we only need DOM/JS text for scraping
const BLOCKED_TYPES = new Set(['image', 'font', 'media', 'stylesheet']);

let _browser: Browser | null = null;

async function launchHeadless(): Promise<Browser> {
  return puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

async function tryConnect(port: number): Promise<Browser> {
  return puppeteer.connect({ browserURL: `http://localhost:${port}`, defaultViewport: null });
}

// Return a connected Browser, creating one if needed.
export async function getBrowser(): Promise<Browser> {
  // Reuse the existing browser if it's still connected
  if (_browser && _browser.connected) return _browser;

  if (BROWSER_MODE === 'bang-local') {
    // Running ON Bang — use Bang's own Chrome at 9223, fall back to headless
    try {
      _browser = await tryConnect(9223);
    } catch {
      console.warn('[browser] Bang local Chrome (9223) unavailable, launching headless Chromium');
      _browser = await launchHeadless();
    }
  } else if (BROWSER_MODE === 'bang-tunnel') {
    // PB's local machine — SSH tunnel to Bang's Chrome on port 19223, fall back to headless
    try {
      _browser = await tryConnect(19223);
    } catch {
      console.warn('[browser] SSH tunnel (19223) unavailable, launching headless Chromium');
      _browser = await launchHeadless();
    }
  } else {
    // Local DevProfile Chrome on port 9222 — fall back to headless
    try {
      _browser = await tryConnect(9222);
    } catch {
      console.warn('[browser] Local Chrome (9222) unavailable, launching headless Chromium');
      _browser = await launchHeadless();
    }
  }

  // Clear the cached reference when Chrome closes so the next call reconnects cleanly
  _browser.on('disconnected', () => { _browser = null; });

  return _browser;
}

// Scraping page — blocks images/fonts/media to cut page load time 60-80% on trade sites
export async function newPage(): Promise<Page> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (BLOCKED_TYPES.has(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });

  // Plausible user agent so trade sites don't fingerprint-block the scraper
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  );

  return page;
}

// Full-resource page for PDF portal export — needs CSS/images for correct rendering
export async function newFullPage(): Promise<Page> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  );

  return page;
}
