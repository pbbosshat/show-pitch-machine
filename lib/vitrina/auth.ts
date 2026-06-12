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

interface VitrinaTokens {
  idToken: string;      // Authorization: Bearer <idToken>  (Cognito token_use=id)
  accessToken: string;  // X-vtr-auth-at: <accessToken>     (Cognito token_use=access)
}
export interface VitrinaAuth extends VitrinaTokens {
  source: string;       // X-vtr-auth-src  (always "cognito")
}

interface TokenCache extends VitrinaTokens {
  expiresAt: number; // ms
}

let _cache: TokenCache | null = null;

// Returns the full auth bundle the VIQI API requires. The scheme below was
// verified against the live app.vitrina.ai web client:
//   Authorization: Bearer <ID token>  +  X-vtr-auth-at: <access token>  +  X-vtr-auth-src: cognito
// Sending the access token in Authorization, or omitting X-vtr-auth-src,
// returns HTTP 401 {"message":"Invalid source !!"}.
export async function getVitrinaAuth(): Promise<VitrinaAuth> {
  if (_cache && _cache.expiresAt - Date.now() > 5 * 60 * 1000) {
    return { idToken: _cache.idToken, accessToken: _cache.accessToken, source: 'cognito' };
  }

  const t = await fetchFreshAuth();
  _cache = { idToken: t.idToken, accessToken: t.accessToken, expiresAt: jwtExp(t.accessToken) };
  return { ...t, source: 'cognito' };
}

// Back-compat helper: returns just the access token. Do NOT use this for the
// Authorization header (VIQI wants the ID token there) — prefer getVitrinaAuth().
export async function getVitrinaToken(): Promise<string> {
  return (await getVitrinaAuth()).accessToken;
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

async function fetchFreshAuth(): Promise<VitrinaTokens> {
  // Try CDP first — fastest path when a browser session exists
  for (const port of CDP_PORTS) {
    try {
      const t = await getAuthViaCDP(port);
      if (t) return t;
    } catch { /* try next */ }
  }

  // Fall back to headless Puppeteer login
  if (!VITRINA_PASSWORD) {
    throw new Error('[vitrina] No Chrome session found and VITRINA_PASSWORD not set — cannot authenticate');
  }
  return loginHeadless();
}

async function getAuthViaCDP(port: number): Promise<VitrinaTokens | null> {
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

    // VIQI needs BOTH the ID token (Authorization) and the access token (X-vtr-auth-at).
    const readTokens = () => page!.evaluate(() => ({
      idToken: window.localStorage.getItem('vtr_auth_id_token') ?? '',
      accessToken: window.localStorage.getItem('vtr_auth_access_token') ?? '',
    }));

    let t = await readTokens();
    if (t.idToken && t.accessToken && !isExpiredSoon(t.accessToken)) return t;

    // Token is stale — reload the page to trigger Amplify refresh
    await page.reload({ waitUntil: 'networkidle0', timeout: 15_000 });
    await new Promise(r => setTimeout(r, 2_000));

    t = await readTokens();
    return (t.idToken && t.accessToken && !isExpiredSoon(t.accessToken)) ? t : null;
  } finally {
    await browser.disconnect();
  }
}

async function loginHeadless(): Promise<VitrinaTokens> {
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

    const tokens = await page.evaluate(() => ({
      idToken: window.localStorage.getItem('vtr_auth_id_token') ?? '',
      accessToken: window.localStorage.getItem('vtr_auth_access_token') ?? '',
    }));

    if (!tokens.idToken || !tokens.accessToken) throw new Error('[vitrina] No tokens found after headless login');
    console.log('[vitrina] Headless login successful');
    return tokens;
  } finally {
    await browser.close();
  }
}
