# Show Page Feeders — Internal-Link SEO Strategy

**PR:** `feature/show-page-feeders` → `master`
**Date:** 2026-05-19
**Change type:** FRONTEND-ONLY — no API changes, no DB schema changes, no migrations.

---

## What Was Built

Every show page at `/available/[slug]` was restructured to act as an **internal-link feeder** — a page that (a) remains fully indexable for its own long-tail brand query and (b) actively funnels link equity toward the 4 B2B money pages shipped in PR #3.

### Files Touched (6 modified, 2 created, 1 doc)

| File | Change |
|------|--------|
| `components/shows/BuyerCTA.tsx` | NEW — contextual buyer CTA block with 4 anchor-text variants |
| `components/shows/ShowPageWrapper.tsx` | NEW — server wrapper injecting WebPage JSON-LD + BuyerCTA on every show page |
| `app/(public)/available/[slug]/page.tsx` | All ~60 OneSheet branches wrapped in `ShowPageWrapper`; generic fallback uses `noExtraCta` flag |
| `app/(public)/available/[slug]/AvailablePackageClient.tsx` | `BuyerCTA` imported and rendered below show content |
| `app/sitemap.ts` | B2B money pages added at priority 0.9/weekly; show pages lowered to 0.4/monthly |
| `components/site/SiteFooter.tsx` | "FOR BUYERS" column added with all 4 money pages + catalog link |
| `components/site/SiteHeader.tsx` | Mobile nav gains "For Buyers" section with all 4 money pages |
| `docs/show-page-feeders.md` | This document |

---

## SEO Theory: Why This Works

### PageRank Flow via Internal Links

Google distributes PageRank (link equity) from every page to every page it links to. Show pages are indexed, crawled regularly, and collectively represent 60+ individual URLs. By placing consistent internal links from every show page to the 4 money pages, we create a many-to-few link topology — many feeder pages all pointing at a small cluster of destination pages — which concentrates PageRank on those destinations.

### Anchor Text Diversification

Google's Penguin algorithm penalizes sitewide identical anchor text (it reads as manipulation). `BuyerCTA` cycles through 4 copy variants determined by a deterministic hash of the show slug:

| Variant | Framing | Example sizzle anchor |
|---------|---------|----------------------|
| 0 | Acquisition | "watch sizzle reels" |
| 1 | Pitch/production | "production sizzle reels" |
| 2 | Distributor | "sizzle reel library" |
| 3 | Buyer/deal | "series sizzle reels" |

The hash is stable (no DB column needed, same output on every render), so Google sees consistent but varied anchors across the catalog rather than 60 identical blocks.

### Sitemap Priority Signaling

Sitemap `priority` is a crawl-budget hint. Before this PR, all show pages were `0.8` — the same as the money pages. After:

**Before:**
| Priority | Pages |
|----------|-------|
| 1.0 | Homepage (1) |
| 0.8 | Shows (~60), genres (6), shows index, genres index |
| 0.7 | About, available, international |
| 0.6 | Press releases, individual press pages |
| 0.5 | Reel, contact, FAQ |

**After:**
| Priority | Pages |
|----------|-------|
| 1.0 | Homepage (1) |
| 0.9 | `/sizzle-reel`, `/how-to-pitch-a-tv-show`, `/tv-production-company`, `/tv-show-pitch-deck` (4) |
| 0.8 | Shows index, genres index |
| 0.7 | About, available catalog, international |
| 0.6 | Press releases + individual press pages |
| 0.5 | Reel, contact, FAQ |
| 0.4 | Individual show pages (~60) |

Show pages dropped from `0.8` → `0.4` so Googlebot allocates proportionally more crawl budget to the 4 money pages. Individual show pages still get crawled (priority 0.4 is not excluded), but they no longer compete for crawl allocation.

Also fixed: show pages were incorrectly mapped to `/shows/${slug}` in the old sitemap. The actual route is `/available/${slug}`. This is corrected in this PR.

### JSON-LD `relatedLink`

`ShowPageWrapper` emits a `WebPage` schema on every show page with a `relatedLink` array pointing to all 4 money pages. This is a structured-data signal — stronger than an implicit `<a>` tag — that tells Google the money pages are editorially related to every show page. It also improves the chance of rich results for the money pages by demonstrating broad site-wide relevance signals.

### Footer Links (Highest Equity)

The "FOR BUYERS" footer column is the single highest-leverage change: a site-wide footer link propagates from every page on the site (homepage, about, FAQ, press releases, all 60+ show pages) to each money page. One footer edit creates 100+ internal links at no additional per-page cost.

### Mobile Nav "For Buyers" Section

The mobile nav gains a grouped "For Buyers" section with all 4 money pages. This provides a crawlable sitewide header link to each money page for mobile Googlebot (which crawls mobile-first). Desktop nav already has `/available` as an entry point to the buyer cluster.

---

## The 4 Money Pages This Funnels Into

1. `/sizzle-reel` — sizzle reel showcase; buyer-intent query "TV sizzle reel"
2. `/how-to-pitch-a-tv-show` — pitch education; buyer/creator intent
3. `/tv-production-company` — company credibility page; "TV production company NYC"
4. `/tv-show-pitch-deck` — pitch deck resource; bottom-of-funnel buyer asset

---

## Data Flow

```
Every show page (/available/[slug])
  └── page.tsx (server component)
        ├── ShowPageWrapper
        │     ├── <JsonLd> WebPage schema with relatedLink[] to 4 money pages
        │     ├── {children} — custom OneSheet or AvailablePackageClient
        │     └── <BuyerCTA> — contextual link block (4 anchor variants)
        └── (generic fallback) AvailablePackageClient
              └── <BuyerCTA> (rendered inline, ShowPageWrapper uses noExtraCta)

SiteFooter (every page)
  └── "FOR BUYERS" column → 5 links (catalog + 4 money pages)

SiteHeader mobile menu (every page)
  └── "For Buyers" section → 4 money page links
```

---

## Gotchas & Decisions

- **No noindex added.** Show pages remain fully indexable. They target show-title brand queries (qualified buyer traffic) — setting noindex would destroy that traffic. The priority reduction + BuyerCTA redirect their link equity without hiding them from search.
- **BuyerCTA is placed below show content.** The pitch experience is never interrupted. Buyers see the full show page first; the feeder block appears only after they've consumed the content.
- **`AvailablePackageClient` gets BuyerCTA inline** (client component — can't receive server children through a layout boundary cleanly). `ShowPageWrapper` uses `noExtraCta=true` for this path to prevent duplication.
- **Anchor-text variants are hash-deterministic** — no DB column, no runtime randomness. Same slug always produces the same variant, which means Google sees stable (but varied across pages) anchor text.
- **Sitemap slug bug fixed** — old sitemap mapped show pages to `/shows/${slug}` but the actual route is `/available/${slug}`. Fixed in this PR.
