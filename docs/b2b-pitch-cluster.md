# B2B Pitch Cluster — MY Entertainment

## What Was Built

A four-page SEO content cluster targeting B2B keywords for unscripted TV producers,
showrunners, and IP holders who want to pitch or co-produce a TV show with MY Entertainment.
All four pages live in `app/(public)/` as Next.js App Router Server Components.

## Why It Exists

MY Entertainment's organic search presence was entirely brand-name driven. This cluster targets
high-intent, zero-to-low competition keywords at the exact moment a creator is actively
looking for a production partner, sizzle reel producer, or pitch deck resource.

Combined keyword opportunity:
- `/sizzle-reel` — "sizzle reel" vol 3,200 / KD 1
- `/how-to-pitch-a-tv-show` — "how to pitch a tv show" vol 350 / KD 0
- `/tv-show-pitch-deck` — "tv show pitch deck" vol 70 / KD 3
- `/tv-production-company` — "tv production company" vol 100 / KD 5

## Key Files

| File | Route | Purpose |
|------|-------|---------|
| `app/(public)/sizzle-reel/page.tsx` | `/sizzle-reel` | Flagship page; definition → anatomy → examples → production process → CTA |
| `app/(public)/how-to-pitch-a-tv-show/page.tsx` | `/how-to-pitch-a-tv-show` | Pillar page; HowTo schema; 6-step pitch process; deck structure; sizzle reel role; buyer landscape |
| `app/(public)/tv-production-company/page.tsx` | `/tv-production-company` | Services positioning; Service + Organization schema; commissioning editor explainer |
| `app/(public)/tv-show-pitch-deck/page.tsx` | `/tv-show-pitch-deck` | Lead-magnet page; 8-slide annotated guide; real PDF download |
| `public/pitch-deck-template.pdf` | `/pitch-deck-template.pdf` | Static PDF served directly; downloaded via `<a download>` — no API involved |

## Internal Link Graph (A↔B↔C↔D full mesh)

```
/sizzle-reel
  → /how-to-pitch-a-tv-show  (CTA footer)
  → /tv-show-pitch-deck       (CTA footer)
  → /tv-production-company    (inline body + CTA footer)
  → /reel                     (examples section)
  → /shows                    (examples section)
  → /contact                  (primary CTA)

/how-to-pitch-a-tv-show
  → /sizzle-reel              (intro subtitle + Section 4 body × 2)
  → /tv-show-pitch-deck       (Section 3 cross-link + Section 7 CTA button)
  → /tv-production-company    (Section 5 "learn more" link)
  → /contact                  (primary CTA)

/tv-production-company
  → /how-to-pitch-a-tv-show  (Section 5 inline + CTA footer)
  → /sizzle-reel              (CTA footer)
  → /tv-show-pitch-deck       (CTA footer)
  → /shows                    (Section 6 "browse catalog")
  → /contact                  (primary CTA)

/tv-show-pitch-deck
  → /sizzle-reel              (Section 2 inline + CTA footer)
  → /how-to-pitch-a-tv-show  (Section 4 inline + CTA footer)
  → /tv-production-company    (CTA footer)
  → /contact                  (primary CTA)
```

## JSON-LD Schema by Page

| Page | Schema Types |
|------|-------------|
| `/sizzle-reel` | `Article` + `FAQPage` |
| `/how-to-pitch-a-tv-show` | `HowTo` + `FAQPage` |
| `/tv-production-company` | `Service` + `Organization` + `FAQPage` |
| `/tv-show-pitch-deck` | `Article` + `FAQPage` |

All FAQ schemas are generated from a `FAQ_ITEMS` constant defined once in each file —
the JSON-LD and visible on-page text share a single source of truth, preventing schema/content drift.

## Design Conventions (applied to all four pages)

- **Server Components** — no `'use client'`. Zero client-side JS.
- **Inline styles** — all CSS is inline or in a `<style>` block. No external CSS modules.
- **Design tokens** — `bg #000`, body `#a5a7ad`, headings `#f2f4f7`, accent `#e51d26`;
  fonts Roboto / Roboto Condensed / Oswald; exact match to Webflow source.
- **title.absolute** — all four pages use `title: { absolute: '...' }` to bypass the
  root layout's `title.template` (`'%s | MY Entertainment'`), preserving exact keyword
  strings in the `<title>` tag.
- **`paddingTop: 100px`** on hero section — clears the fixed navbar (75px + margin).
- **One H1 per page** — accessibility and SEO requirement. H2 → H3 hierarchy maintained.
- **CTA pattern** — every CTA button: leading icon + visible text label + hover/focus tooltip
  (`.mye-tooltip-wrap` + `.mye-tooltip`) + `aria-label`. Tooltip is `aria-hidden`.
  Shows on `:hover` AND `:focus-within` (keyboard accessible).
- **Descriptive link text** — no bare "click here". All `<Link>` and `<a>` elements have
  meaningful text.
- **Inline WHY-comments** — every component, section, and non-obvious block has a comment
  explaining SEO intent, keyword target, or design decision.

## PDF Template Asset

`public/pitch-deck-template.pdf` is a real, valid PDF file (not a stub). It is served
directly by Next.js from the `public/` directory. The `/tv-show-pitch-deck` page links to
it via `<a href="/pitch-deck-template.pdf" download="...">` — no API route, no server-side
logic. Browser downloads the file directly.

Content mirrors the 8-slide annotated guide on the page itself, so the template is
useful whether or not the user has JavaScript enabled.

## Error Handling Note

All four pages are static link/content pages with no interactive state or API calls.
The CLAUDE.md "show exact errors" rule applies to interactive elements that can fail.
The only interactive element (the PDF download link) uses a plain `<a download>` tag —
if the file is missing, the browser shows its native 404, which is the correct behavior
for a static asset. No client-side JS error handler is applicable or needed.

## Gotchas / Decisions

- **No `git add -A`** — the repo has unrelated modified files (`scripts/scrape-all.ts`,
  `scrapers/`, migrations). Only the four page files, this doc, and the PDF were staged.
- **No `npm run build`** — intentionally not run per task spec (server is on Bubba for
  heavy builds). `npx tsc --noEmit` and `npm run lint` both returned zero errors/warnings.
- **`tv-production-company/`** and **`tv-show-pitch-deck/`** directories pre-existed as empty
  directories (no `page.tsx`). Files were created fresh inside existing dirs.
- **Branch**: `feature/b2b-pitch-cluster` — all four pages committed together in one
  surgical commit targeting only the cluster files.
