#!/usr/bin/env node
// capture-vimeo-jwt.js
//
// Captures a fresh Vimeo session JWT from a logged-in Chrome instance via CDP.
// Used by the backfill script when the previous JWT expires.
//
// Strategy:
//   1. Find or create a vimeo.com tab on the target Chrome (CDP HTTP API).
//   2. Attach to the tab over WebSocket and enable Network domain.
//   3. Navigate to /manage/videos which fires a request to api.vimeo.com.
//   4. Pick the Authorization header off the first matching request.
//   5. Print just the JWT value so it can be `eval`'d into the env.
//
// Usage:
//   node scripts/capture-vimeo-jwt.js [--cdp=http://localhost:19222]
//
// Exit codes:
//   0  printed JWT to stdout
//   2  no logged-in vimeo.com session (got 401/redirect to login)
//   3  CDP not reachable
//   4  timeout waiting for api.vimeo.com request

const http = require('node:http');
// Node 22+ has WebSocket as a global — no import needed.
// `node:ws` is NOT a built-in module; the userland `ws` package isn't required here.

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const CDP_URL = args.cdp || process.env.CDP_URL || 'http://localhost:19222';
const VERBOSE = process.env.VERBOSE === '1' || !!args.verbose;
function log(...m) { if (VERBOSE) console.error('[capture-jwt]', ...m); }

// ── CDP HTTP helpers ──────────────────────────────────────────────────────────

function httpJson(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname, port: u.port, path: u.pathname + u.search, method,
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error(`Invalid JSON from ${method} ${url}: ${raw.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(5_000, () => { req.destroy(); reject(new Error('CDP HTTP timeout')); });
    req.end();
  });
}

async function listTabs() {
  return httpJson(`${CDP_URL}/json/list`);
}

// Modern Chrome (>=147) requires PUT for /json/new — older builds accept GET.
async function newTab(url) {
  return httpJson(`${CDP_URL}/json/new?${encodeURIComponent(url)}`, 'PUT');
}

// ── CDP WebSocket helpers ─────────────────────────────────────────────────────

// Native WebSocket (global since Node 22). Uses EventTarget API ('open'/'message'
// events with addEventListener), not the EventEmitter API of the `ws` package.
class CdpSession {
  constructor(wsUrl) { this.ws = new WebSocket(wsUrl); this.id = 0; this.pending = new Map(); this.handlers = new Map(); }
  ready() {
    return new Promise((resolve, reject) => {
      this.ws.addEventListener('open', () => resolve());
      this.ws.addEventListener('error', e => reject(new Error('WS error: ' + (e.message || 'unknown'))));
      this.ws.addEventListener('message', e => {
        const msg = JSON.parse(typeof e.data === 'string' ? e.data : Buffer.from(e.data).toString());
        if (msg.id != null && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(new Error(`${msg.error.code} ${msg.error.message}`));
          else resolve(msg.result);
        } else if (msg.method && this.handlers.has(msg.method)) {
          for (const h of this.handlers.get(msg.method)) h(msg.params);
        }
      });
    });
  }
  send(method, params) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }
  on(method, handler) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(handler);
  }
  close() { try { this.ws.close(); } catch {} }
}

// ── Main ──────────────────────────────────────────────────────────────────────

// Close a CDP tab via HTTP. /json/close/<id> only accepts GET in older Chrome
// builds and PUT in 147+; we try both and silently ignore failures.
async function closeTab(id) {
  for (const method of ['GET', 'PUT']) {
    try { await httpJson(`${CDP_URL}/json/close/${id}`, method); return; } catch {}
  }
}

async function main() {
  // 1. Reach CDP. We always open a FRESH tab instead of reusing existing
  // vimeo.com tabs — the SPA gets into a stuck state after repeated reloads
  // (empty body, navigation no-ops, no api.vimeo.com calls) and there's no
  // reliable in-page recovery. A fresh tab always loads cleanly.
  let tabs;
  try { tabs = await listTabs(); }
  catch (e) {
    console.error(`ERROR: cannot reach CDP at ${CDP_URL} — ${e.message}`);
    process.exit(3);
  }

  log(`opening fresh vimeo.com/manage/videos tab`);
  const target = await newTab('https://vimeo.com/manage/videos');

  // 2. Attach and enable Network domain so we can see Authorization headers
  const cdp = new CdpSession(target.webSocketDebuggerUrl);
  await cdp.ready();
  await cdp.send('Network.enable', { maxTotalBufferSize: 200_000, maxResourceBufferSize: 200_000 });

  // Promise that resolves on the first api.vimeo.com request whose Authorization
  // starts with "jwt " (user session). App-level Bearer tokens are filtered out.
  const jwtPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), 30_000);
    cdp.on('Network.requestWillBeSent', evt => {
      const url = evt.request?.url || '';
      const auth = evt.request?.headers?.Authorization
                 || evt.request?.headers?.authorization
                 || '';
      if (url.startsWith('https://api.vimeo.com/') && /^jwt /i.test(auth)) {
        clearTimeout(timer);
        resolve(auth);
      }
    });
  });

  // 3. New tab is already navigating to /manage/videos from the newTab call.
  // No explicit Page.navigate or reload needed — the initial page load fires
  // 20+ api.vimeo.com requests with the session JWT in the Authorization
  // header within the first few seconds.

  try {
    const jwt = await jwtPromise;
    // Print the full header so callers can `JWT="$value"` directly.
    process.stdout.write(jwt);
    cdp.close();
    // Clean up the tab we opened so the user doesn't end up with 100+ open
    // vimeo tabs after a long backfill. Best-effort — failure is non-fatal.
    await closeTab(target.id);
    process.exit(0);
  } catch (e) {
    console.error(`ERROR: ${e.message}`);
    cdp.close();
    await closeTab(target.id);
    process.exit(4);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
