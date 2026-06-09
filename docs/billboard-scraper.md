# Billboard Scraper

**File:** `scrapers/billboard.ts`
**Registered in:** `scripts/scrape-all.ts` (`ALL_SOURCES` + `importScraper` switch)

---

## What It Scrapes

### Charts (24 slugs, all confirmed working as of June 2026)

One `ScrapedArticle` per working chart. The `CHARTS` array in the scraper is the single place to add/remove slugs.

| Slug | Chart Name | Genre Tag | Notes |
|------|-----------|-----------|-------|
| hot-100 | Hot 100 | Music | |
| billboard-200 | Billboard 200 | Music | |
| artist-100 | Artist 100 | Music | |
| billboard-global-200 | Global 200 | Music | |
| billboard-global-excl-us | Global Excl. US | Music | |
| streaming-songs | Streaming Songs | Music | |
| radio-songs | Radio Songs | Music | |
| digital-song-sales | Digital Song Sales | Music | |
| top-album-sales | Top Album Sales | Music | |
| country-songs | Hot Country Songs | Country | |
| country-albums | Top Country Albums | Country | |
| rock-songs | Hot Rock Songs | Rock | |
| rock-albums | Top Rock Albums | Rock | |
| hot-alternative-songs | Hot Alternative Songs | Rock | |
| r-b-hip-hop-songs | Hot R&B/Hip-Hop Songs | R&B/Hip-Hop | |
| r-b-hip-hop-albums | Top R&B/Hip-Hop Albums | R&B/Hip-Hop | fixed June 2026 (was `r-and-b-hip-hop-albums`) |
| rap-song | Hot Rap Songs | R&B/Hip-Hop | |
| latin-songs | Hot Latin Songs | Latin | fixed June 2026 (was `hot-latin-songs` → 301) |
| latin-albums | Top Latin Albums | Latin | |
| dance-electronic-songs | Hot Dance/Electronic | Music | fixed June 2026 (was `hot-dance-electronic-songs` → 301) |
| christian-songs | Hot Christian Songs | Music | fixed June 2026 (was `hot-christian-songs` → 301) |
| gospel-songs | Hot Gospel Songs | Music | fixed June 2026 (was `hot-gospel-songs` → 301) |
| pop-songs | Pop Airplay | Music | fixed June 2026 (was `pop-airplay` → 404) |
| adult-contemporary | Adult Contemporary | Music | |

**Retired slug:** `tiktok-billboard-top-50` — Billboard ended the TikTok chart partnership in 2024. All candidate slugs return 404. Removed from `CHARTS` with an inline comment. If Billboard launches a successor, add it there.

**Self-healing:** if a slug returns non-200 or has no `.o-chart-results-list-row-container` rows, it is skipped with a `console.warn` and the run continues.

### News Listings (2 sources)

| URL | Purpose |
|-----|---------|
| `https://www.billboard.com/c/business/` | Industry/trade news — deals, exec moves, chart analysis. **Priority.** |
| `https://www.billboard.com/c/music/` | General music industry coverage — trend context. |

Up to 20 articles per listing, deduplicated across listings by URL. Each article is fetched individually for full body text.

---

## Data Flow

```
scrape() in scrapers/billboard.ts
    → ScrapedArticle[]
    → persist() in scripts/scrape-all.ts
        → trade_articles (SQLite via lib/db.ts)
        → classify() sets format_type / relevance_tier / signal_type
    → embedArticles() in scripts/embed-articles.ts
        → LanceDB vector store (fastembed)
```

---

## Field Mapping

| ScrapedArticle field | Chart articles | News articles |
|---------------------|---------------|---------------|
| `source` | `'billboard'` | `'billboard'` |
| `url` | Chart page URL | Article page URL |
| `headline` | `"Billboard {name} — Top {N} (week of {date})"` | Article title from listing card |
| `body` | Ranked list: `"{rank}. {title} — {artist} (LW X, Peak Y, Z wks)"` | Full article body text (plain fetch + cheerio); falls back to listing dek if paywalled |
| `item_type` | `'chart'` | `extractItemType(headline)` — greenlit/cancelled/exec-move/other |
| `genre` | Chart genre tag from `CHARTS` array | `extractGenre(headline+body)` ?? `'Music'` |
| `network` | not set | `extractNetwork(headline+body)` |
| `scraped_at` | `Date.now()` | `Date.now()` |

---

## Auth / Technical Notes

- **No login required** for current chart pages and general news articles. Plain `fetch()` with a desktop `User-Agent` returns HTTP 200 with full HTML.
- **No Puppeteer / Bang machine needed.** This scraper runs on the local workstation without any Chrome CDP dependency.
- **Rate limiting:** `rateLimit('billboard.com')` (2s gap between requests to the same domain) is applied before every fetch. `withRetry()` wraps all fetches with 3 attempts and exponential backoff.
- **Detail panel stripping:** each chart row container includes a hidden `.charts-result-detail` credits accordion. It is removed via cheerio before text extraction to prevent "Songwriter(s) / Producer(s) / Imprint/Label" labels from bleeding into title/artist fields.
- **Artist selector:** Billboard renders the artist in `span.c-label.a-no-trucate` (note Billboard's own typo — "trucate" not "truncate"). A DOM-order fallback is also in place for resilience against future class renames.
- **Stats extraction:** Billboard renders each row with a hidden mobile duplicate of the LW/PEAK/WEEKS stats block. Regex on full row text (`/LW\s+([\d-]+)/` etc.) correctly grabs the first match regardless of which copy appears first.

---

## Recommended Refresh Cadence

| Run type | Frequency | Reason |
|----------|-----------|--------|
| Charts | **Weekly, Tuesday AM** | Billboard publishes new chart data every Tuesday |
| News | **Daily** | `/c/business/` publishes multiple trade stories per day |

To run just Billboard: `npx tsx --env-file=.env scripts/scrape-all.ts billboard`

---

## Historical Backfill

**Script:** `scripts/backfill-billboard-charts.ts`

Fetches all weekly Billboard chart archives for a date range and upserts them into `trade_articles` exactly as the live scraper does. Billboard chart archive pages are **public** — no login required. Verified June 2026: `https://www.billboard.com/charts/hot-100/2020-01-04/` returns HTTP 200 with 100 chart rows and no paywall.

### How to run

```bash
npx tsx --env-file=.env scripts/backfill-billboard-charts.ts \
  [--slugs=hot-100,billboard-200,artist-100] \
  [--from=YYYY-MM-DD] \
  [--to=YYYY-MM-DD] \
  [--delay=2500]
```

| Arg | Default | Notes |
|-----|---------|-------|
| `--slugs` | `hot-100,billboard-200,artist-100` | Comma-separated list of verified slugs from the table above |
| `--from` | Saturday ~5 years ago | Must be `YYYY-MM-DD`; snapped to nearest preceding Saturday |
| `--to` | Most recent Saturday | Must be `YYYY-MM-DD`; snapped to nearest preceding Saturday |
| `--delay` | `2500` | Milliseconds between HTTP requests — be polite to Billboard's servers |

### Saturday dating

Billboard chart weeks are dated on **Saturdays**. The script generates every Saturday in `[from, to]` and fetches:

```
https://www.billboard.com/charts/{slug}/{YYYY-MM-DD}/
```

A chart that launched after `--from` will return 404 for early weeks — those are silently skipped with `console.warn` and counted as "skipped" in the final summary. This is normal, not an error.

### Idempotency

The dated URL (`/charts/hot-100/2020-01-04/`) is globally unique per chart-week. The upsert uses `ON CONFLICT(url) DO UPDATE` so reruns and mid-run restarts are fully safe — no duplicate rows, existing rows updated with fresh data.

### DB compatibility

The script detects the active database at runtime:
- `DATABASE_URL` set → Railway Postgres (`lib/db.ts`) — used on Bang prod and Railway
- `DATABASE_URL` unset → SQLite (`DATABASE_PATH`, default `./data/db.sqlite`) — used locally

### Rate-limit / volume warning

| Scope | Requests | Time at 2.5s delay |
|-------|----------|-------------------|
| 3 charts × 5 years | ~780 | ~33 minutes |
| 10 charts × 5 years | ~2,600 | ~1h 50m |
| 24 charts × 5 years | ~6,240 | ~4h 20m |

**Run on the Bang machine overnight — not on PB's workstation.** The Bang SQLite file at `C:/Users/bang/show-pitch-machine/data/db.sqlite` is the one the Railway sync reads from.

### Recommended one-time seed + ongoing cadence

```bash
# One-time full seed (run on Bang, screen or nohup):
npx tsx --env-file=.env scripts/backfill-billboard-charts.ts \
  --slugs=hot-100,billboard-200,artist-100,streaming-songs,radio-songs,r-b-hip-hop-songs,country-songs,rock-songs,latin-songs,pop-songs \
  --from=2021-06-05 \
  --to=2026-06-07 \
  --delay=2500

# Ongoing: scrape-all.ts already fetches the current week on its normal daily run.
# No need to re-run backfill unless adding a new slug to CHARTS.
```

After the backfill completes, run `scripts/embed-articles.ts` to vector-embed the new rows so they appear in RAG results.

---

## FOLLOW-UP (a): Pro Login for Historical Data

Billboard Pro archives (historical chart weeks back beyond the current week, Pro-only articles) require authentication.

**Stored credentials:** `BILLBOARD_EMAIL` and `BILLBOARD_PASSWORD` env vars (add to `.env`).

**To implement:** add a `loginBillboard()` function in `scrapers/billboard.ts` that:
1. POSTs to Billboard's auth endpoint (find via network tab on billboard.com/login)
2. Captures the returned session cookie
3. Threads the cookie through all subsequent `fetch()` calls via a `Cookie` header

The `TODO` stub is marked in the scraper file top-level comment. Do not implement until the env vars are populated and Pro access is confirmed.

---

## FOLLOW-UP (b): Structured `billboard_chart_entries` Table

Currently each chart is stored as one `trade_articles` row with a plain-text ranked list in `body`. This is sufficient for RAG retrieval and trend summaries.

If per-song chart analytics are wanted later (e.g. "show me all songs that peaked at #1 this month", "track Ella Langley's chart positions over time"), add a dedicated Drizzle migration:

```sql
CREATE TABLE billboard_chart_entries (
  id          TEXT PRIMARY KEY,
  chart_slug  TEXT NOT NULL,
  chart_date  TEXT NOT NULL,   -- "YYYY-MM-DD" of chart week
  rank        INTEGER NOT NULL,
  title       TEXT NOT NULL,
  artist      TEXT NOT NULL,
  last_week   INTEGER,         -- NULL = new entry
  peak        INTEGER,
  weeks       INTEGER,
  scraped_at  INTEGER NOT NULL
);
CREATE INDEX idx_bce_chart_date ON billboard_chart_entries(chart_slug, chart_date);
CREATE INDEX idx_bce_artist     ON billboard_chart_entries(artist);
```

The scraper already parses all entry fields — persisting them to this table would be an additive change requiring a new migration and a second persist path in `scrapeChart()`.
