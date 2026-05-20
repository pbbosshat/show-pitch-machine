# GA4 Conversion Tracking — myentertainment.tv

**Added:** 2026-05-19
**Property:** properties/486537975 (`G-5M15CDKBGQ`)
**Branch:** `feature/ga4-conversions` → target `master`

---

## What was built

A new client-side analytics module (`lib/analytics.ts`) plus four conversion
events wired across the contact and show-detail pages. The GA4 script was
already loaded in `app/(public)/layout.tsx`; this PR adds the first custom
event tracking layer on top of it.

---

## Events wired

| Event name | Trigger | File | GA4 Key Event? |
|---|---|---|---|
| `submit_pitch` | Contact form API success | `app/(public)/contact/ContactForm.tsx` | **Yes — mark in GA4 UI** |
| `contact_form_submit` | Contact form API success (same handler) | `app/(public)/contact/ContactForm.tsx` | **Yes — mark in GA4 UI** |
| `request_buyers_pack` | "Contact Us" CTA click on any show detail page | `components/shows/ShowPageTracker.tsx` | **Yes — mark in GA4 UI** |
| `download_epk` | Submission Release Form PDF download click | `app/(public)/contact/SubmissionDownloadLink.tsx` | **Yes — mark in GA4 UI** |
| `view_show_page` | Show detail page mount | `components/shows/ShowPageTracker.tsx` | No — engagement only |

---

## Files touched

- `lib/analytics.ts` — **new file**: central client-side GA4 module with
  typed wrappers for all five events, full WHY-comments, no-op SSR guard
- `app/(public)/contact/ContactForm.tsx` — imported and called
  `trackShowPitchSubmit` + `trackContactFormSubmit` on API success
- `app/(public)/contact/SubmissionDownloadLink.tsx` — **new client component**:
  wraps the submission release form download anchor with `trackEpkDownload`
- `app/(public)/contact/page.tsx` — replaced static `<a>` with
  `<SubmissionDownloadLink>`; imported new component
- `components/shows/ShowPageTracker.tsx` — **new client component**: fires
  `view_show_page` on mount and `request_buyers_pack` on CTA click; replaces
  the static `Link` in the show detail CTA section
- `app/(public)/shows/[slug]/page.tsx` — imported `ShowPageTracker`;
  replaced static `<Link href="/contact">` CTA with `<ShowPageTracker>`

---

## Key Events to flip in GA4 Admin

Go to: **GA4 Admin → Properties/486537975 → Events**

Toggle "Mark as conversion" (Key Event) on:
1. `submit_pitch` — primary pitch/lead intent
2. `contact_form_submit` — general inquiry lead
3. `request_buyers_pack` — TV buyer/distributor contact intent from show pages
4. `download_epk` — submission form download (high-intent pitch signal)

Do NOT mark as conversion:
- `view_show_page` — engagement only; marking it would inflate conversion rate

---

## Why conversions weren't firing before

The GA4 script (`G-5M15CDKBGQ`) was loaded in layout.tsx but no `gtag('event', ...)`
calls existed anywhere in the codebase. The existing `lib/ga.ts` is a
server-side GA4 Data API client for reading analytics — it has no client-side
event firing capability. This PR adds the first client-side event layer.

---

## Architecture note: Server Component + client tracker pattern

`app/(public)/shows/[slug]/page.tsx` is a Server Component (no `'use client'`).
GA4 events require `useEffect` and `onClick` — browser APIs unavailable on the
server. The solution is `ShowPageTracker`, a minimal `'use client'` component
that receives `showSlug` and `showGenre` as props from the server component and
handles all analytics for that page. This avoids converting the entire 800-line
server component to a client component just for analytics.

Same pattern used for `SubmissionDownloadLink` — contact/page.tsx stays a
Server Component; only the download anchor is extracted to a client wrapper.

---

## How to verify in GA4 DebugView

1. Open Chrome with GA4 DebugView active:
   `https://analytics.google.com/analytics/web/#/p486537975/debugview/overview`
2. Navigate to `https://www.myentertainment.tv/shows/ghost-adventures`.
3. Within 30 seconds, `view_show_page` should appear with
   `show_slug: "ghost-adventures"`.
4. Click the "Contact Us" CTA — `request_buyers_pack` should appear with
   `source_section: "show-detail-cta"`.
5. Navigate to `/contact` and submit the form.
6. `submit_pitch` and `contact_form_submit` should both appear.
7. Click "Download Submission Release Form" — `download_epk` should appear
   with `show_slug: "submission-release-form"`.

---

## Future: /buyers page

The taxonomy spec references a `/buyers` page that does not yet exist. When
that page is built, add a `trackBuyersPackRequest` call to its primary CTA
with `sourceSection: 'buyers-page'`. The helper is already exported from
`lib/analytics.ts`.
