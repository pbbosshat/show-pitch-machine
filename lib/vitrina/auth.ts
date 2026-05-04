// Manages Vitrina API tokens.
// Strategy 1: Read from an existing Chrome session via CDP (port 9222 or 19223).
//   The browser's Amplify session auto-refreshes Cognito tokens — we just grab
//   whatever valid token is sitting in localStorage.
// Strategy 2: Headless Puppeteer login with stored credentials.
//   Used when no Chrome session is available.
// Tokens cached in memory for their lifetime (Cognito issues 1-hour tokens).

import puppeteer from 'puppeteer';

const VITRINA_EMAIL    = process.env.VITRINA_EMAIL    ?? 'sm@gototeam.com';
const VITRINA_PASSWORD = process.env.VITRINA_PASSWORD ?? '';

// CDP ports to try in order — local DevProfile first, Bang tunnel second
const CDP_PORTS = [9222, 19223];

interface TokenCache {
  accessToken: string;
  expiresAt: number; // ms
}

let _cache: TokenCache | null = null;

export async function getVitrinaToken(): Promise<string> {
  if (_cache && _cache.expiresAt - Date.now() > 5 * 60 * 1000) {
    return _cache.accessToken;
  }

  const token = await fetchFreshToken();
  _cache = { accessToken: token, expiresAt: jwtExp(token) };
  return token;
}

// Decode JWT exp claim (returns ms timestamp)
function jwtExp(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    return (payload.exp ?? 0) * 1000;
  } catch {
    return Date.now() + 3_600_000; // assume 1h if unreadable
  }
}

function isExpiredSoon(token: string): boolean {
  return jwtExp(token) - Date.now() < 5 * 60 * 1000;
}

async function fetchFreshToken(): Promise<string> {
  // Try CDP first — fastest path when a browser session exists
  for (const port of CDP_PORTS) {
    try {
      const token = await getTokenViaCDP(port);
      if (token) return token;
    } catch { /* try next */ }
  }

  // Fall back to headless Puppeteer login
  if (!VITRINA_PASSWORD) {
    throw new Error('[vitrina] No Chrome session found and VITRINA_PASSWORD not set — cannot authenticate');
  }
  return loginHeadless();
}

async function getTokenViaCDP(port: number): Promise<string | null> {
  const browser = await puppeteer.connect({
    browserURL: `http://localhost:${port}`,
    defaultViewport: null,
  });

  try {
    const pages = await browser.pages();

    // Prefer an already-open Vitrina tab — the Amplify session is warm
    let page = pages.find(p => p.url().includes('vitrina.ai'));

    if (!page) {
      // No Vitrina tab — open one and wait for Amplify to hydrate localStorage
      page = await browser.newPage();
      await page.goto('https://app.vitrina.ai/viqi', {
        waitUntil: 'networkidle0',
        timeout: 15_000,
      });
      // Brief pause for Amplify's token refresh cycle
      await new Promise(r => setTimeout(r, 2_000));
    }

    const token = await page.evaluate(
      () => window.localStorage.getItem('vtr_auth_access_token') ?? ''
    );

    if (token && !isExpiredSoon(token)) return token;

    // Token is stale — reload the page to trigger Amplify refresh
    await page.reload({ waitUntil: 'networkidle0', timeout: 15_000 });
    await new Promise(r => setTimeout(r, 2_000));

    const refreshed = await page.evaluate(
      () => window.localStorage.getItem('vtr_auth_access_token') ?? ''
    );
    return refreshed && !isExpiredSoon(refreshed) ? refreshed : null;
  } finally {
    await browser.disconnect();
  }
}

async function loginHeadless(): Promise<string> {
  console.log('[vitrina] Starting headless login...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.goto('https://app.vitrina.ai/', { waitUntil: 'networkidle0', timeout: 20_000 });

    // Click "Login with Email & Password"
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')]
        .find(b => b.textContent?.trim().includes('Login with Email'));
      (btn as HTMLElement | undefined)?.click();
    });
    await new Promise(r => setTimeout(r, 1_000));

    // Fill credentials using React-compatible value setter
    await page.evaluate((email: string, password: string) => {
      function setInput(selector: string, value: string) {
        const el = document.querySelector(selector) as HTMLInputElement | null;
        if (!el) return;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        setter?.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      setInput('input[name=email]', email);
      setInput('input[name=password]', password);
    }, VITRINA_EMAIL, VITRINA_PASSWORD);

    await new Promise(r => setTimeout(r, 500));

    // Submit form
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')]
        .find(b => b.textContent?.trim() === 'Login');
      (btn as HTMLElement | undefined)?.click();
    });

    // Wait for dashboard redirect
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 20_000 });

    const token = await page.evaluate(
      () => window.localStorage.getItem('vtr_auth_access_token') ?? ''
    );

    if (!token) throw new Error('[vitrina] No token found after headless login');
    console.log('[vitrina] Headless login successful');
    return token;
  } finally {
    await browser.close();
  }
}
