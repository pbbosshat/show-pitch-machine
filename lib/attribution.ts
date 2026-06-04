/* ============================================================
   lib/attribution.ts — First-touch / last-touch UTM + click ID capture.

   WHY this module exists: keyword→conversion attribution requires capturing
   the UTM parameters, gclid, fbclid, referrer, and landing path at the
   moment the visitor first arrives, then attaching that data to any form
   submission that happens later in the same session (or after a return visit).

   Strategy:
   - FIRST TOUCH is stored in localStorage (persists across tabs/reloads,
     survives SPA navigation, survives browser restarts).
   - LAST TOUCH updates a sessionStorage key every page, so we always know
     the most recent landing page (useful for multi-step journeys).
   - The contact form reads localStorage first-touch + last-touch and sends
     both sets of fields to the API in a single JSON payload.

   Keys used in localStorage:
     mye_attr_first   — JSON-serialised AttributionData (written once, never
                        overwritten once set, unless explicitly cleared)
   Keys used in sessionStorage:
     mye_attr_last    — JSON-serialised AttributionData (overwritten every landing)

   WHY localStorage (not cookies): cookies are more correct for cross-domain
   attribution but require explicit SameSite/Secure flags and a consent banner
   on EU traffic. localStorage is domain-scoped by default, works without a
   banner for analytics-only use (IAB Legitimate Interest under ePrivacy for
   first-party analytics), and is easier to inspect in DevTools.

   WHY first-touch: TV show pitch leads take multiple sessions before
   converting. First-touch shows us WHICH keyword or campaign introduced the
   prospect; last-touch shows us what tipped them over. We send first-touch to
   the DB for now because it is more actionable for keyword budget decisions.
   ============================================================ */

/** Shape of the attribution blob we capture and send to the server. */
export interface AttributionData {
  utm_source:   string | null;
  utm_medium:   string | null;
  utm_campaign: string | null;
  utm_term:     string | null;
  utm_content:  string | null;
  gclid:        string | null;
  fbclid:       string | null;
  landing_page: string | null;   // absolute URL of this page
  referrer:     string | null;   // document.referrer (empty string → null)
}

const FIRST_TOUCH_KEY = 'mye_attr_first';
const LAST_TOUCH_KEY  = 'mye_attr_last';

// ── Private helpers ────────────────────────────────────────────────────────────

/**
 * Read the current page's URL search params + referrer into an AttributionData
 * object. Returns null values for any field that isn't present.
 *
 * WHY we parse manually instead of URLSearchParams.get: we need to handle
 * both the present and absent cases gracefully without throwing.
 */
function captureCurrentPage(): AttributionData {
  // Guard: never run on the server (Next.js can SSR this module if imported
  // at module scope in a Server Component — the guard ensures we never touch
  // browser APIs in that path).
  if (typeof window === 'undefined') {
    return {
      utm_source: null, utm_medium: null, utm_campaign: null,
      utm_term: null, utm_content: null, gclid: null, fbclid: null,
      landing_page: null, referrer: null,
    };
  }

  const params = new URLSearchParams(window.location.search);

  const p = (key: string): string | null => params.get(key) || null;

  return {
    utm_source:   p('utm_source'),
    utm_medium:   p('utm_medium'),
    utm_campaign: p('utm_campaign'),
    utm_term:     p('utm_term'),
    utm_content:  p('utm_content'),
    gclid:        p('gclid'),
    fbclid:       p('fbclid'),
    // Capture the full URL so we know exactly which page the visitor landed on.
    landing_page: window.location.href,
    // document.referrer is empty string for direct/typed visits — normalise to null.
    referrer:     document.referrer || null,
  };
}

/** Safe JSON.parse — returns null on any error (corrupt storage, quota exceeded). */
function safeRead(storage: Storage, key: string): AttributionData | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as AttributionData;
  } catch {
    return null;
  }
}

/** Safe JSON.stringify write — swallows quota errors silently (better than crashing the form). */
function safeWrite(storage: Storage, key: string, data: AttributionData): void {
  try {
    storage.setItem(key, JSON.stringify(data));
  } catch {
    // QuotaExceededError — silently drop; the form still submits without attribution.
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * captureAttribution — Call once per page load (e.g. from a useEffect in the
 * root layout or any page component).
 *
 * - If no first-touch record exists yet, writes one using the current page data.
 * - Always updates the last-touch record in sessionStorage.
 * - No-ops silently during SSR (typeof window === 'undefined').
 *
 * WHY idempotent first-touch: the attribution data for the first landing visit
 * is the most valuable signal for TV pitch leads (they may browse 5 pages
 * before contacting us). We must not overwrite it on the 2nd or 3rd page.
 */
export function captureAttribution(): void {
  if (typeof window === 'undefined') return;

  const current = captureCurrentPage();

  // First-touch: write only if not already set (first visit wins).
  // A visitor arriving organically via Google on page 1, then clicking to page 2,
  // should NOT have their utm_source overwritten to null on page 2.
  const existing = safeRead(localStorage, FIRST_TOUCH_KEY);
  if (!existing) {
    safeWrite(localStorage, FIRST_TOUCH_KEY, current);
  }

  // Last-touch: always update so we know the most recent page they interacted with.
  // sessionStorage clears on tab close — a new session gets a fresh last-touch.
  safeWrite(sessionStorage, LAST_TOUCH_KEY, current);
}

/**
 * readAttribution — Returns the stored first-touch AttributionData, or an
 * all-null object if nothing has been captured yet.
 *
 * WHY first-touch (not last-touch): the server persists first-touch because
 * it reveals which keyword or campaign introduced the lead. Last-touch is
 * typically an organic navigational visit to /contact that doesn't differentiate.
 *
 * Call this immediately before form submission so you always get the freshest
 * stored value (in case captureAttribution was called milliseconds before).
 */
export function readAttribution(): AttributionData {
  if (typeof window === 'undefined') {
    return {
      utm_source: null, utm_medium: null, utm_campaign: null,
      utm_term: null, utm_content: null, gclid: null, fbclid: null,
      landing_page: null, referrer: null,
    };
  }

  return safeRead(localStorage, FIRST_TOUCH_KEY) ?? {
    utm_source: null, utm_medium: null, utm_campaign: null,
    utm_term: null, utm_content: null, gclid: null, fbclid: null,
    landing_page: null, referrer: null,
  };
}

/**
 * clearAttribution — Removes both first-touch and last-touch records.
 * Useful after a successful form submission so that a future visit from a
 * different campaign gets a fresh first-touch record.
 *
 * WHY clear after submit: the visitor just converted. If they revisit the site
 * in a new session months later (perhaps via a retargeting ad), we want to
 * capture that campaign as a fresh first-touch, not attribute the new lead to
 * the old campaign that was already converted.
 */
export function clearAttribution(): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(FIRST_TOUCH_KEY); } catch { /* ignore */ }
  try { sessionStorage.removeItem(LAST_TOUCH_KEY); } catch { /* ignore */ }
}
