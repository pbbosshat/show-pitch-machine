# Press Release Migration — Webflow → Railway

## What This Does

`scripts/scrape-press-releases.ts` scrapes all press release detail pages from the
live Webflow site (`https://www.myentertainment.tv`) and writes a SQLite seed
migration file (`migrations/032_seed_press_releases.sql`).

## Why It Exists

The new Next.js site on Railway is replacing the Webflow site. When DNS flips,
every existing inbound link, Google index entry, and bookmark to a press release
detail page must resolve to a real page with the **same URL slug**. If slugs
differ even by one character, the URL 404s and that page loses its SEO authority.

The old approach (9 rows with broken slugs truncated to 80 chars, apostrophes
turned into hyphens) caused silent 404s. This script guarantees fidelity by
deriving slugs directly from the Webflow sitemap URLs rather than re-slugifying
headline text.

## Data Extracted from Webflow

For each press release page:

| Field | Source |
|---|---|
| `slug` | URL path segment from the Webflow sitemap XML — used as-is, byte-for-byte |
| `id` | Same as slug (unique primary key) |
| `headline` | `<h1 class="heading-7">` text content, HTML entities decoded |
| `published_at` | Text in first bare `<div>` child of `.w-container` after the h1 block (e.g. "May 25, 2017") → Unix timestamp (seconds) |
| `body` | Inner HTML of `<div class="rich-text-block w-richtext">`, Webflow class attributes stripped |
| `excerpt` | First 200 chars of body, HTML stripped to plain text |
| `source` | Literal `'myentertainment.tv'` |
| `source_url` | Full Webflow URL, e.g. `https://www.myentertainment.tv/press-releases/{slug}` |
| `is_featured` | `0` for all |

## How to Re-Run

```bash
cd "C:\Users\pb\Documents\Claude Code Local\My Entertainment\Show Pitch Machine"
npx tsx scripts/scrape-press-releases.ts
```

The script:
1. Fetches the live sitemap at `https://www.myentertainment.tv/sitemap.xml`
2. Extracts all `/press-releases/{slug}` URLs (de-duplicated, excluding 2 known internal pages)
3. Scrapes each page with a 200ms polite delay
4. Writes `migrations/032_seed_press_releases.sql`

**Expected output:** 83 rows (as of May 2026 sitemap). If the sitemap changes,
re-run the script and commit the updated migration.

## Migration File Location

`migrations/032_seed_press_releases.sql`

The migration system applies it automatically on next app start. Do **not** apply
it directly to `data/db.sqlite` — let the migration runner handle it.

The SQL is idempotent: it runs `DELETE FROM press_releases WHERE source = 'myentertainment.tv'`
before the INSERT, so re-running is always safe.

## Gotchas

**SQL escaping:** Single quotes in strings are escaped as `''` (SQLite standard).
The `sqlStr()` helper in the script handles this. Never use template literals or
string concatenation to build SQL — always route through `sqlStr()`.

**Date parsing:** Webflow displays dates as US English month names ("May 25, 2017").
`Date.parse()` handles these correctly and returns milliseconds; dividing by 1000
gives Unix seconds. If a date can't be parsed, `published_at` is set to `0` and
a warning is logged — check the log for any such rows.

**UTF-8 encoding:** Webflow pages are served as UTF-8. The Node `https` module
reads the response as `Buffer` and decodes with `.toString('utf-8')`, which
preserves smart quotes (U+2018/U+2019), em-dashes (U+2014), and other Unicode
correctly. The output SQL file is also written as UTF-8.

**Double-encoded HTML entities:** Webflow's CMS template sometimes double-encodes
entities in headlines (e.g., `&amp;quot;` → `"` after two decode passes). The
`decodeEntities()` helper in the script handles the common cases.

**Excluded slugs:** Two URL paths under `/press-releases/` are navigation/internal
pages, not articles, and are excluded:
- `film-commission-crew-directories`
- `myentertainment-careers-assignment-desk`
