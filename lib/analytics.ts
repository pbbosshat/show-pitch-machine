/* ============================================================
   GA4 Client-Side Analytics — lib/analytics.ts
   Central event tracking module for myentertainment.tv.

   WHY this file exists: the existing lib/ga.ts is a server-side
   GA4 Data API client (reads analytics data for the dashboard).
   This module is the CLIENT-SIDE counterpart — it fires gtag()
   conversion events from browser components. Never call
   window.gtag() directly in component files; always import from
   here so event names and parameter shapes stay consistent.

   Measurement ID: G-5M15CDKBGQ (properties/486537975)
   Script loaded in app/(public)/layout.tsx via next/script afterInteractive.
   ============================================================ */

/* Extend Window so TypeScript knows gtag may exist.
   The global declaration lives here (not in a .d.ts) so it is
   co-located with the only module that uses it. */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/* ── Core gtag wrapper ───────────────────────────────────────
   No-ops silently if:
   - called during SSR (typeof window === 'undefined')
   - GA4 script blocked by an ad-blocker (window.gtag absent)
   Never throw — analytics must never crash the page. */
function gtag(...args: unknown[]): void {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag(...args);
  }
}

/* ── Standard parameter helpers ─────────────────────────────
   Every conversion event includes event_category and page_path
   per the ga4-conversion-taxonomy.md cross-cutting spec. */
function currentPath(): string {
  return typeof window !== "undefined" ? window.location.pathname : "(server)";
}

/* ── Conversion Events ───────────────────────────────────────
   Only the four events below should be marked as Key Events in
   GA4 Admin (Admin → Events → toggle "Mark as conversion"):
     submit_pitch, request_buyers_pack, download_epk, contact_form_submit
   ──────────────────────────────────────────────────────────── */

/**
 * trackShowPitchSubmit — fired when the contact/pitch form at
 * /contact is submitted successfully (API returns 200).
 *
 * WHY on success (not on submit click): firing on the API success
 * response means the event only records genuine submissions, not
 * abandoned attempts. The form has no Captcha so firing on click
 * would over-count bot submissions.
 *
 * Edge case — SPA navigation: the ContactForm component unmounts
 * after setSubmitted(true) replaces the form with a confirmation
 * message, so this event cannot fire twice from the same render.
 *
 * Mark as Key Event: YES — submit_pitch
 */
export function trackShowPitchSubmit(params: {
  showGenre?: string;
  hasSizzleReel?: boolean;
  sourceSection: string;
}): void {
  gtag("event", "submit_pitch", {
    event_category: "lead",
    show_genre: params.showGenre ?? "(not set)",
    has_sizzle_reel: params.hasSizzleReel ?? false,
    source_section: params.sourceSection,
    page_path: currentPath(),
  });
}

/**
 * trackContactFormSubmit — fired when the general contact form at
 * /contact is submitted successfully. Distinct from submit_pitch
 * because the taxonomy distinguishes pitch intent (show pitch) from
 * general inquiry (contact). In practice both come from the same
 * ContactForm component; use sourceSection to differentiate.
 *
 * WHY separate event: GA4 Explorations can then compare pitch
 * conversion rate vs. general inquiry rate, and each can be
 * configured as a Key Event independently.
 *
 * Mark as Key Event: YES — contact_form_submit
 */
export function trackContactFormSubmit(params: {
  hasPhone?: boolean;
  sourceSection: string;
}): void {
  gtag("event", "contact_form_submit", {
    event_category: "lead",
    has_phone: params.hasPhone ?? false,
    source_section: params.sourceSection,
    page_path: currentPath(),
  });
}

/**
 * trackBuyersPackRequest — fired when the "Request Buyers Pack"
 * CTA is clicked on /buyers or any show detail page.
 *
 * WHY on click (not on form submit): the buyers pack CTA links
 * directly to the contact page or opens a mailto — there is no
 * separate form submission to await. A click on this specific CTA
 * is itself the highest-intent action a TV buyer takes.
 *
 * Edge case — mailto links: onClick fires before the OS mail
 * client opens; the event lands in GA4 regardless of whether the
 * user actually sends the email. This is intentional — the click
 * itself is the conversion signal.
 *
 * Mark as Key Event: YES — request_buyers_pack
 */
export function trackBuyersPackRequest(params: {
  showSlug?: string;
  sourceSection: string;
}): void {
  gtag("event", "request_buyers_pack", {
    event_category: "lead",
    show_slug: params.showSlug ?? "(not set)",
    source_section: params.sourceSection,
    page_path: currentPath(),
  });
}

/**
 * trackEpkDownload — fired when any EPK PDF or show deck download
 * link is clicked on a /shows/[slug] page.
 *
 * WHY on click: file_download enhanced measurement fires
 * automatically on <a download> tags but does not carry show_slug
 * or show_genre parameters. This dedicated handler gives us the
 * richer parameter set for Explorations segmentation while the
 * built-in file_download still fires as a backup signal.
 *
 * Edge case — Ctrl+click (open in new tab): onClick fires in the
 * originating tab before the new tab opens. The event records once
 * per click regardless of how the user opens the file.
 *
 * Mark as Key Event: YES — download_epk
 */
export function trackEpkDownload(params: {
  showSlug: string;
  showGenre?: string;
}): void {
  gtag("event", "download_epk", {
    event_category: "lead",
    show_slug: params.showSlug,
    show_genre: params.showGenre ?? "(not set)",
    page_path: currentPath(),
    source_section: "show-detail",
  });
}

/**
 * trackShowPageView — fired on mount of any /shows/[slug] page.
 * Engagement only — do NOT mark as Key Event.
 *
 * WHY custom event (not just GA4 page_view): the built-in page_view
 * from enhanced measurement does not carry show_slug or show_genre.
 * This event enables "which shows attract the most qualified buyers"
 * analysis in Explorations without polluting the conversion count.
 */
export function trackShowPageView(params: {
  showSlug: string;
  showGenre?: string;
}): void {
  gtag("event", "view_show_page", {
    event_category: "engagement",
    show_slug: params.showSlug,
    show_genre: params.showGenre ?? "(not set)",
    page_path: currentPath(),
    source_section: "show-detail",
  });
}
