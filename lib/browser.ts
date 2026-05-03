// Puppeteer browser routing — connects to an existing Chrome DevTools endpoint rather
// than launching a new browser. This preserves the user's logged-in sessions (Gmail,
// trade sites, etc.) without storing credentials in the app.
// BROWSER_MODE='bang-tunnel' routes through the SSH tunnel opened by lib/tunnel.ts.

import puppeteer, { type Browser, type Page } from 'puppeteer';

const BROWSER_MODE = process.env.BROWSER_MODE || 'bang-tunnel';

// Resource types blocked in newPage() — we only need DOM/JS text for scraping
const BLOCKED_TYPES = new Set(['image', 'font', 'media', 'stylesheet']);

let _browser: Browser | null = null;

// Return a connected Browser, creating one if needed.
// For bang-tunnel mode the tunnel must already be open (lib/tunnel.ts openTunnel()).
export async function getBrowser(): Promise<Browser> {
  // Reuse the existing browser if it's still connected
  if (_browser && _browser.connected) return _browser;

  if (BROWSER_MODE === 'bang-tunnel') {
    // Bang machine Chrome is exposed via SSH tunnel on localhost:19223
    _browser = await puppeteer.connect({
      browserURL: 'http://localhost:19223',
      // Don't close the remote Chrome when we disconnect
      defaultViewport: null,
    });
  } else {
    // Local DevProfile Chrome on port 9222 — fall back to launching headless if not running
    try {
      _browser = await puppeteer.connect({
        browserURL: 'http://localhost:9222',
        defaultViewport: null,
      });
    } catch {
      // Chrome isn't running locally; launch a headless instance for scripted runs
      console.warn('[browser] Local Chrome unavailable, launching headless Chromium');
      _browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
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
