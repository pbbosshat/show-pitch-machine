'use client';

/* ============================================================
   components/site/AttributionCapture.tsx

   WHY this component exists: Next.js App Router layouts are
   Server Components by default. The attribution capture logic
   (captureAttribution) accesses window.location and localStorage,
   so it must run client-side. This tiny component is the
   bridge — it is the only 'use client' island in the layout,
   keeping the rest of the layout server-rendered.

   It renders nothing to the DOM; its only job is to run the
   useEffect that records the visitor's attribution data.
   ============================================================ */

import { useEffect } from 'react';
import { captureAttribution } from '@/lib/attribution';

/**
 * AttributionCapture — renders null, triggers captureAttribution() on mount.
 *
 * WHY useEffect (not an inline script): useEffect only runs after hydration,
 * guaranteeing the browser APIs (localStorage, window.location) are available.
 * An inline <Script> would run before React hydrates, risking race conditions
 * with the GA4 gtag script that loads afterInteractive.
 *
 * WHY empty deps []: we only need to capture on initial component mount
 * (= first page load / SPA navigation to a new route). Re-running on every
 * render would call captureAttribution() redundantly without side effects,
 * but once is sufficient and cleaner.
 */
export default function AttributionCapture() {
  useEffect(() => {
    // Records first-touch to localStorage and last-touch to sessionStorage.
    // Safe to call on every route; captureAttribution() is idempotent for first-touch.
    captureAttribution();
  }, []);

  // This component is invisible — it exists purely for the side effect above.
  return null;
}
