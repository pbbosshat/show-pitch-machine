# TV Distribution Company Pillar — Enhancement + Internal-Link Fix (2026-07-01)

**Branch:** `seo/mye-tv-distribution-pillar-2026-07-01` → `master`
**Date:** 2026-07-01
**Change type:** FRONTEND-ONLY — no API changes, no DB schema changes, no migrations.
Two of the touched sections *read* from the existing `deck_sites` table via the
existing `lib/db.ts` `query()`/`initDb()` helpers (same functions `/available/page.tsx`
already uses) — this is a read-only query against an existing table, not a schema
or data-write change.

---

## Why This Exists

The 2026-07-01 SEO nightly flagged all 5 My Entertainment focus keywords as
unranked with **0 impressions**:

- "tv distribution company"
- "how to distribute a tv show"
- "reality tv distribution company"
- "tv show available for distribution"
- "unscripted formats for sale"

The brief assumed this meant a missing pillar page. **It was not a missing-page
problem.** Investigation before writing any code found:

1. `app/(public)/tv-distribution-company/page.tsx` already existed — live since
   `seo/mye-pitch-money-2026-06-04` (PR #13, merged 2026-06-04).
2. It was already in `middleware.ts` `PUBLIC_PATHS` (publicly crawlable, no
   auth-redirect problem).
3. It was already in `app/sitemap.ts` at **priority 1.0** (the highest
   priority on the whole site, explicitly commented as "PRIMARY DISTRIBUTION
   MONEY-KEYWORD PILLAR").
4. It already had Organization + Service + FAQPage + BreadcrumbList JSON-LD
   and ~980 lines of substantive, factual content.

So the page was live, indexable, and submitted — yet had zero impressions
after ~4 weeks. The real causes, found by tracing the site's own internal-link
architecture (documented in `docs/show-page-feeders.md`):

- **`components/shows/BuyerCTA.tsx`** — the feeder block rendered on every one
  of the ~60 `/available/[slug]` show pages — funneled link equity into 4 B2B
  money pages (`/sizzle-reel`, `/how-to-pitch-a-tv-show`,
  `/tv-production-company`, `/tv-show-pitch-deck`) but **never** into
  `/tv-distribution-company`, even though that page became the "PRIMARY"
  pillar a month after `BuyerCTA` shipped and was never updated.
- **`components/site/SiteFooter.tsx`** `BUYER_LINKS` — the sitewide "FOR
  BUYERS" footer column, rendered on literally every page — had the same gap.
  The repo's own `docs/show-page-feeders.md` calls this footer column *"the
  single highest-leverage change"* for internal PageRank flow, and it was
  missing the one page that most needed it.
- **`components/site/SiteHeader.tsx`** `BUYER_NAV_LINKS` — the mobile nav "For
  Buyers" section — same gap.
- **`components/shows/ShowPageWrapper.tsx`** `MONEY_PAGE_URLS` — the
  structured-data `WebPage.relatedLink` array injected on every show page —
  same gap.

In short: the pillar page existed and was submitted to Google, but received
**zero internal link equity from any of the site's four established
link-feeder mechanisms.** That is a fully sufficient, checkable explanation
for 0 impressions on a page that otherwise looks complete.

Separately, two of the five focus keywords — **"tv show available for
distribution"** and **"unscripted formats for sale"** — had no verbatim
on-page coverage anywhere in the existing 982-line file (checked via full
read + grep). Those gaps are closed directly.

---

## What Was Built

### 1. `app/(public)/tv-distribution-company/page.tsx` (enhanced, not replaced)

Chose to **enhance the existing pillar** rather than create a second,
competing page at a different URL — creating a duplicate page targeting the
same primary keyword ("tv distribution company") would cause keyword
cannibalization, which is a worse SEO outcome than the current under-linking
problem.

New sections added (existing 8 sections kept intact, renumbered as
6B/6C to avoid renumbering the untouched FAQ/CTA sections):

- **Section 6B — "Distribution Case Studies"** (`id="case-studies"`).
  4 case-study cards: Ghost Adventures (Travel Channel/Discovery, 28
  seasons), Legacy List with Matt Paxton (PBS, Emmy-nominated), Pros vs Joes
  (Spike TV/Comedy Central, 4 seasons), Pregnant & Platonic (8-country format
  option). **Static data, deliberately** — every fact reuses figures already
  verified elsewhere in this same file (Section 6 credibility grid,
  `ACCEPTED_GENRES`) or on `/pitch`/`/work-with-us`/`/about`. No new claims,
  no invented deal dollar figures, no invented dates. Intro copy uses the
  exact phrase "reality TV distribution company" to close that keyword gap.
- **Section 6C — "TV Shows Available for Distribution"** (`id="show-catalog"`,
  Show Catalog). **Live-queries** the same `deck_sites` table/columns
  `/available/page.tsx` already queries (`is_active = 1`, same
  `query()`/`initDb()` helpers from `@/lib/db`), limited to 8 titles, ordered
  by `sort_order`. Renders genre/format/ep_count metadata pulled straight
  from the DB (no invented content), links each card to `/available/[slug]`
  or its `vimeo_url` (same routing-priority pattern as `/available/page.tsx`).
  Falls back to a plain "contact us" message + "Browse Full Catalog" link if
  the query throws (matches the exact try/catch → `[]` pattern already used
  by `/available/page.tsx` and `/shows/page.tsx`) — the page never 500s on a
  DB hiccup. Closes the "tv show available for distribution" and "unscripted
  formats for sale" keyword gaps in both the H2 and intro copy.
- **FAQ (`FAQ_ITEMS`)** — 2 new Q&As appended (7 → 9 total): "What TV shows
  are currently available for distribution from MY Entertainment?" and "Do
  you sell unscripted formats for sale, or only finished episodes?" — both
  use the exact target phrases and feed the existing `FAQPage` JSON-LD
  (unchanged mechanism, `faqSchema` derives from `FAQ_ITEMS` automatically).
- **`metadata.keywords`** — added `'tv show available for distribution'` and
  `'unscripted formats for sale'` (the 2 phrases with zero prior coverage).
- **New JSON-LD: `ItemList`** for the Show Catalog section — `itemListElement`
  built from the live-queried catalog titles, only emitted when the query
  actually returned rows (never publishes a broken/empty ItemList).
- **Page converted to an async Server Component** with
  `export const dynamic = 'force-dynamic'` (same directive `/available/page.tsx`
  uses) so the new DB query runs at request time, not at `next build` time.
- **Drive-by fix:** the page's 2 pre-existing CTA buttons used `<a href="/pitch">`
  instead of `next/link`'s `<Link>`, which is a pre-existing
  `@next/next/no-html-link-for-pages` ESLint error (present before this PR).
  Converted both to `<Link>` while already editing this file — zero
  behavior change, removes 2 lint errors.
- **Footer nav copy** — added a `#show-catalog` anchor link to the existing
  "Explore:" links row.

### 2. `components/shows/BuyerCTA.tsx` (internal-link fix)

Added `distributionCompany: '/tv-distribution-company'` to `MONEY_PAGES`, a
`distributionAnchor` field to all 4 anchor-text variants, and a 6th link in
the rendered sentence on every `/available/[slug]` show page (~60 pages).

### 3. `components/site/SiteFooter.tsx` (internal-link fix)

Added `{ href: '/tv-distribution-company', label: 'TV Distribution Company' }`
to `BUYER_LINKS` — the sitewide footer "FOR BUYERS" column rendered on every
page of the site.

### 4. `components/site/SiteHeader.tsx` (internal-link fix)

Added the same entry to `BUYER_NAV_LINKS` — the mobile nav "For Buyers"
section.

### 5. `components/shows/ShowPageWrapper.tsx` (structured-data fix)

Added `'https://www.myentertainment.tv/tv-distribution-company'` to
`MONEY_PAGE_URLS` — the `WebPage.relatedLink` structured-data array injected
on every show page.

---

## Files Touched

| File | Change |
|------|--------|
| `app/(public)/tv-distribution-company/page.tsx` | Enhanced: +2 sections (case studies, live show catalog), +2 FAQ items, +2 keywords, +ItemList schema, async/`force-dynamic`, 2 `<a>`→`<Link>` fixes |
| `components/shows/BuyerCTA.tsx` | Added `/tv-distribution-company` as a 5th feeder link (was 4) across all 4 anchor-text variants |
| `components/site/SiteFooter.tsx` | Added `/tv-distribution-company` to sitewide `BUYER_LINKS` footer column |
| `components/site/SiteHeader.tsx` | Added `/tv-distribution-company` to mobile nav `BUYER_NAV_LINKS` |
| `components/shows/ShowPageWrapper.tsx` | Added `/tv-distribution-company` to `WebPage.relatedLink` JSON-LD array |
| `docs/seo/tv-distribution-company-pillar-2026-07-01.md` | This document |

---

## Data Flow (Show Catalog section)

```
app/(public)/tv-distribution-company/page.tsx  (Server Component, force-dynamic)
  └── getCatalogTitles()
        ├── initDb()                       — lib/db.ts, same as /available/page.tsx
        ├── query<CatalogTitle>(SELECT ... FROM deck_sites WHERE is_active = 1 ...)
        └── catch → [] (graceful degrade, no 500)
  └── renders up to 8 cards, links to /available/[slug] or vimeo_url
  └── ItemList JSON-LD built from the same rows (only if rows.length > 0)
```

No new table, no new column, no new API route. Read-only `SELECT` against the
existing `deck_sites` table using the existing `query()` helper.

---

## Schema Types On This Page (after this change)

1. `Organization` (unchanged)
2. `Service` (unchanged)
3. `FAQPage` (unchanged mechanism; now sources 9 Q&As instead of 7)
4. `BreadcrumbList` (unchanged)
5. `ItemList` (**new** — Show Catalog section, conditional on live query success)

---

## Internal Links Added To/From This Pillar

- **Into** `/tv-distribution-company`: `BuyerCTA.tsx` (60+ show pages),
  `SiteFooter.tsx` (every page, sitewide), `SiteHeader.tsx` (mobile nav,
  sitewide), `ShowPageWrapper.tsx` `relatedLink` (every show page,
  structured-data signal).
- **Out of** `/tv-distribution-company`: existing `/pitch`, `/available`,
  `/how-to-pitch-a-tv-show`, `/tv-distribution-deal`,
  `/independent-film-distribution`, `/tv-buyers`, `/unscripted-tv-shows`
  links were already present and left unchanged; new Show Catalog cards
  link out to `/available/[slug]` for each live title; new `#show-catalog`
  anchor added to the existing "Explore:" footer row.

---

## Placeholder / Follow-Up Content Flagged for PB

- **None fabricated.** The Case Studies section reuses only facts already
  stated and vetted elsewhere in the repo (network names, season counts,
  format-option country count). No new testimonials, no new deal dollar
  figures, no new dates were invented.
- **Cannot verify live DB rows from this sandbox** — the Show Catalog section
  queries `deck_sites` at request time on Railway; this worktree/build has no
  connection to the production Postgres instance, so the *build* was verified
  (compiles, type-checks, and the query pattern is byte-for-byte identical to
  the already-working `/available/page.tsx`), but the actual rendered catalog
  cards on the live site should be spot-checked once deployed to confirm the
  8 titles that surface look right (image URLs, genre/format text) — this is
  the same live-data risk that already exists on `/available` today, not a
  new risk introduced here.
- **Case studies are a fixed set of 4.** If PB wants this to grow/rotate
  (e.g., pull from `site_shows` where `is_featured = 1` instead of a static
  array), that's a reasonable follow-up but was deliberately avoided here to
  keep the case-study facts 100% pre-verified rather than DB-driven.

---

## Verification Performed

- `npx tsc --noEmit -p tsconfig.json` — clean, no errors.
- `npx eslint <5 touched files>` — 0 errors, 3 warnings (all pre-existing
  `<img>`-vs-`next/image` warnings, same pattern already used by
  `/available/page.tsx`; not new).
- `npm run build` (`next build --webpack`) — succeeded, exit 0.
  `/tv-distribution-company` now correctly listed as `ƒ` (dynamic,
  server-rendered on demand) in the route output, confirming
  `force-dynamic` took effect as intended.
