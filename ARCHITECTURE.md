# MY Entertainment — ARCHITECTURE.md
*Living reference document. Update this file rather than re-reading raw source files.*
*Last updated: 2026-05-02*

---

## CTO AI Model Routing

This project uses Claude Code as the development engine. The CTO (Claude Opus) creates task lists and routes work to specialized models:

| Task Type | Model | Why |
|-----------|-------|-----|
| Architecture decisions, feature planning | **Opus 4.7** | Highest reasoning for design tradeoffs |
| Pitch narrative generation, buyer briefings | **Opus 4.7** | Strategic + nuanced output |
| Page/component builds, API routes | **Sonnet 4.6** | Balanced speed + code quality |
| Email classification, search queries, data transforms | **Haiku 4.5** | Speed + cost for high-volume ops |
| Parallel agent workstreams | **Multiple Sonnets** | Zero-conflict file separation |

**Agent parallelization rules:**
- Split agents by *directory* — never let two agents touch the same file
- Agent A: `app/(public)/` + `components/site/`
- Agent B: `app/(internal)/marketing/` + `app/api/marketing/`
- Agent C: Dynamic route reconstruction + docs
- CTO (main thread): Foundation files (layouts, Nav, migrations, ARCHITECTURE.md)

---

## Site Metadata

| Property | Value |
|----------|-------|
| App name | MY Entertainment — Show Pitch Machine + Marketing CMS |
| Local URL | http://mye.local (or http://localhost:3000) |
| Public URL | https://myentertainment.tv (Vercel deploy from `(public)` route group) |
| Source (original) | myentertainment.tv on Webflow |
| Framework | Next.js 16.2.4 (App Router) |
| Database | SQLite via node:sqlite (Node 24 built-in), WAL mode |
| Styling | Tailwind v4 + CSS custom properties |
| Fonts | Inter (UI), Barlow Condensed (display), JetBrains Mono (data) |

---

## Route Architecture

### Internal App — `app/(internal)/`
All routes require the `(internal)` layout which renders `Nav` with Shows/Marketing toggle.

| Route | File | Description |
|-------|------|-------------|
| `/` | `(internal)/page.tsx` | Dashboard — bento grid |
| `/intelligence` | `(internal)/intelligence/page.tsx` | Market intel, scraper status |
| `/buyers` | `(internal)/buyers/page.tsx` | Buyer CRM directory |
| `/buyers/[id]` | `(internal)/buyers/[id]/page.tsx` | Buyer profile, 4 tabs |
| `/pipeline` | `(internal)/pipeline/page.tsx` | Kanban board (dnd-kit) |
| `/build` | `(internal)/build/page.tsx` | 5-step package builder |
| `/build/[id]` | `(internal)/build/[id]/page.tsx` | View/edit package |
| `/sizzles` | `(internal)/sizzles/page.tsx` | Sizzle Asset Catalog — all produced reels, split by has-URL / confirmed-exists |
| `/shows` | `(internal)/shows/page.tsx` | Internal show DB |
| `/shows/[id]` | `(internal)/shows/[id]/page.tsx` | Show detail |
| `/pitch/[slug]` | `(internal)/pitch/[slug]/page.tsx` | Buyer-facing portal (light mode) |
| `/marketing` | `(internal)/marketing/page.tsx` | Marketing CMS dashboard |
| `/marketing/shows` | `(internal)/marketing/shows/page.tsx` | Manage public show listings |
| `/marketing/press` | `(internal)/marketing/press/page.tsx` | Manage press releases |
| `/marketing/available` | `(internal)/marketing/available/page.tsx` | Available titles |
| `/marketing/genres` | `(internal)/marketing/genres/page.tsx` | Genre management |
| `/marketing/content` | `(internal)/marketing/content/page.tsx` | Editable site copy |

### Public Site — `app/(public)/site/`
No sidebar. Dark cinematic theme (`data-theme="dark"` wrapper). Served at `/site/*` locally; rewrite to `/` on production domain.

| Route | File | Description |
|-------|------|-------------|
| `/site` | `(public)/site/page.tsx` | Homepage — hero, stats, shows, networks |
| `/site/shows` | `(public)/site/shows/page.tsx` | Shows grid with genre filter |
| `/site/genres` | `(public)/site/genres/page.tsx` | 6 genre cards |
| `/site/reel` | `(public)/site/reel/page.tsx` | YouTube sizzle reel embed |
| `/site/about` | `(public)/site/about/page.tsx` | Company history, credentials |
| `/site/available` | `(public)/site/available/page.tsx` | Rights catalog |
| `/site/international` | `(public)/site/international/page.tsx` | International partners |
| `/site/press-releases` | `(public)/site/press-releases/page.tsx` | Press releases |
| `/site/faq` | `(public)/site/faq/page.tsx` | FAQ accordion |
| `/site/contact` | `(public)/site/contact/page.tsx` | Contact info |

### API Routes — `app/api/`
All existing internal API routes unchanged. New marketing API:

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/marketing/shows` | GET, POST | Public show listings |
| `/api/marketing/press` | GET, POST | Press releases |
| `/api/marketing/available` | GET, POST | Available titles |
| `/api/marketing/genres` | GET | Genre list |
| `/api/marketing/content` | GET, PATCH | Key-value site copy |
| `/api/sizzles` | GET | Sizzle reel inventory — JOIN ip_catalog + project_email_threads. Params: `q`, `has_url`. Sorted: URLs first, then alpha. |

---

## Design System

### Internal App (Light Mode — default `:root`)
| Token | Value | Use |
|-------|-------|-----|
| `--bg-app` | `#F7F8FC` | Page background |
| `--bg-surface` | `#FFFFFF` | Card/panel background |
| `--bg-surface-alt` | `#F1F5F9` | Hover/selected |
| `--border-subtle` | `#E2E8F0` | Card borders |
| `--text-primary` | `#0F172A` | Body copy |
| `--text-secondary` | `#475569` | Secondary |
| `--text-muted` | `#94A3B8` | Labels, hints |
| `--accent` | `#CC1212` | MYE crimson — CTAs, active states |

### Public Site (Dark Mode — `[data-theme="dark"]` wrapper)
| Token | Value | Use |
|-------|-------|-----|
| `--bg-app` | `#080D18` | Page background |
| `--bg-surface` | `#0F1729` | Card background |
| `--text-primary` | `#FFFFFF` | Body copy |
| `--text-secondary` | `#8A9DC0` | Secondary |
| `--accent` | `#CC1212` | MYE crimson |

**Public site uses `#0A0A0F` (near-black warm) for the hero background** — slightly warmer than `--bg-app` for cinematic feel.

### Typography
| Role | Font | Weight |
|------|------|--------|
| Page headings | Barlow Condensed | 800 |
| UI labels / body | Inter | 400–700 |
| Data / IDs | JetBrains Mono | 400–500 |

---

## Database Schema

### Internal Pitch Machine Tables (001_schema.sql)
`team_users`, `buyer_companies`, `buyer_contacts`, `mandate_updates`, `ip_catalog`, `talent`, `ip_talent`, `content_partners`, `ip_content_partners`, `pitches`, `packages`, `package_talent`, `package_content_partners`, `package_emails`, `pitch_portals`, `shows`, `shows_fts` (FTS5), `trade_articles`, `market_orders`, `scraper_runs`, `scraper_source_status`, `ingestion_log`

### Email Threading Tables (003_email_threads.sql)
`project_email_threads` — links Gmail thread IDs to `ip_catalog` entries. Columns: `ip_catalog_id`, `thread_id`, `subject`, `participants`, `first_message_date`, `last_message_date`, `message_count`, `direction`, `snippet`, `match_confidence`.

### Sizzle Reels Table (004_sizzle_reels.sql)
`sizzle_reels` — catalog of produced sizzle reels parsed from Google Sheets. Columns: `id`, `ip_catalog_id` (FK → ip_catalog), `title`, `vimeo_url` (nullable), `vimeo_password` (nullable), `platform` (`vimeo`/`youtube`/`other`), `raw_value` (original cell text), `sheet_source`, `notes`, `created_at`.

**Sizzle design principle:** Sizzle reels are first-class brand assets. `has_sizzle` and `sizzle_count` are returned by `/api/projects` via LEFT JOIN. `ProjectCard` renders a solid crimson `▶ SIZZLE` badge (above the title) for any project with `sizzle_count > 0`.

### Marketing CMS Tables (002_marketing.sql)
`site_shows`, `site_genres`, `site_show_genres`, `site_networks`, `press_releases`, `available_titles`, `site_content`

**`site_content` key conventions:**
- `homepage.tagline` — hero tagline
- `homepage.description` — company description block
- `about.founded` — year founded
- `about.acquired` — acquisition note
- `about.offices` — office city list
- `contact.email` — contact email
- `contact.address` — mailing address
- `site.ga4_id` — GA4 Measurement ID (set this after obtaining)

---

## Nav Sidebar Toggle

`components/ui/Nav.tsx` — client component with `localStorage` persistence.

**Shows mode** (default): Dashboard, Intelligence, Buyers, Pipeline, **Sizzles**, Pitch Board, Build, Show DB
**Marketing mode**: Site Overview, Shows, Press, Available, Genres, Content, ↗ Preview Site

Auto-switches to Marketing when `pathname.startsWith('/marketing')`.

---

## Key Content Data (from Webflow scrape)

**Shows (45+ titles including):** Ghost Adventures, Legacy List, Uninterrupted, Pros vs Joes, Destination Fear, Sin City Justice, Baggage Battles, Breaking Borders, The Jane Doe Murders, Food Boats, Paranormal Challenge, Billy Buys Brooklyn, Deadly Possessions, Framed, Charles Manson: The Funeral, Hall Pass, Sherman's Warriors, World's Edge...

**Genres (6):** Paranormal · Sports + Competition · Home + Lifestyle · Crime · Comedy · Food + Travel

**Networks (30+):** Discovery, A&E, PBS, BBC, Lifetime, MTV, Comedy Central, Travel Channel, Investigation Discovery, Oxygen, Nickelodeon, Food Network, Animal Planet, TruTV, Reelz, CMT, Max, Discovery+, Vice, IFC, Logo, NBC Sports, Spike/Paramount Network, Really, The Story Lab, Factual Studios, National Geographic

**Company:** MY Entertainment · 235 E 45th St., Floor 14 West, NY 10017 · info@myentertainment.tv · Founded 2000 · Acquired by Media Content Services 2022 · Offices: Manhattan, Toronto, London

---

## Google Analytics (TODO)

- [ ] Obtain GA4 Measurement ID (G-XXXXXXXXXX) from MYE's Google Analytics account
- [ ] Add to `site_content` table via Marketing → Content → GA4 Measurement ID field
- [ ] Add gtag.js to `app/(public)/site/layout.tsx`
- [ ] Add `NEXT_PUBLIC_GA_ID` to `.env.local` and Vercel env vars
- [ ] Smoke-test: Network tab → filter `collect?v=2` on any `/site/*` page

---

## Migrations

Migrations run automatically via `lib/db.ts initDb()` at app start.
All *.sql files in `/migrations/` are executed in alphabetical order.
All DDL uses `IF NOT EXISTS`; all inserts use `OR IGNORE`. **Safe to re-run.**

| File | Description |
|------|-------------|
| `001_schema.sql` | Internal pitch machine schema (22 tables) |
| `002_marketing.sql` | Marketing CMS schema (7 tables + seed data) |
| `003_email_threads.sql` | project_email_threads — Gmail thread → ip_catalog linking |
| `004_sizzle_reels.sql` | sizzle_reels — produced reel inventory from Google Sheets parse |
| `011_show_db.sql` | Adds `air_status`, `is_our_show`, `total_seasons`, `schedule`, `off_air_date`, `tvmaze_id`, `notes` to shows table |

---

## Show DB Enrichment (scripts/enrich-tvmaze.ts)

Standalone enrichment script that populates the Show DB with market intelligence data.

**Run:**
```
npx tsx scripts/enrich-tvmaze.ts [flags]
```

**Flags:**
| Flag | Behavior |
|------|----------|
| `--dry-run` | Log all actions but make zero DB writes |
| `--all` | Re-enrich all shows in TVMaze step (not just those missing tvmaze_id) |
| `--pw-only` | Skip Steps 1 and 2, run Production Weekly integration only |
| `--our-shows-only` | Run Step 1 only (mark MYE shows) |
| `--skip-pw` | Run Steps 1 and 2 but skip Production Weekly |

**Steps:**
1. **Mark our shows** — Matches `site_shows` titles (MYE-produced catalog) against the `shows` comp table. Sets `is_our_show = 1`. Tries exact match, then contains match for spinoffs.
2. **TVMaze enrichment** — For each show missing `tvmaze_id`, calls `https://api.tvmaze.com/search/shows?q=<title>` (score ≥ 0.7 threshold), then `https://api.tvmaze.com/shows/<id>?embed=seasons`. Populates `tvmaze_id`, `schedule`, `total_seasons`, `air_status`, `off_air_date`. Rate-limited to 100ms between shows. No API key required.
3. **Production Weekly** — Calls the PW scraper which fetches issue pages and calls `parsePWTitles()` + `upsertPWShows()` on each page's HTML. New titles get `source='production_weekly'`, `data_source='trade'`, `air_status='on_air'`. Newly inserted shows get immediate TVMaze enrichment.

**Key files:**
- `scripts/enrich-tvmaze.ts` — main script + exported functions `markOurShows`, `enrichTVMaze`, `parsePWTitles`, `upsertPWShows`
- `scrapers/production-weekly.ts` — imports `parsePWTitles` + `upsertPWShows` from enrich script; calls them after each page fetch during live scrape runs

**air_status mapping:**
- TVMaze `Running` → `on_air`
- TVMaze `In Development` → `available`
- TVMaze `Ended` / `Canceled` / anything else → `off_air`

---

## Seed Script

Run `npx tsx scripts/seed-marketing.ts` to populate all 45+ shows, 6 genres, and 30+ networks from the Webflow scrape data. Safe to re-run (uses INSERT OR IGNORE).

---

## Session Scratchpad

*Use this section for findings between messages. Clear when stale.*

- Route group refactor complete: all internal pages moved to `(internal)/`; public site in `(public)/site/`
- `initDb()` now runs all *.sql files in migrations/ in order
- Marketing CMS: 6 admin pages + 5 API routes created
- Public site: 10 pages + SiteHeader + SiteFooter created
- Dynamic route pages reconstructed: buyers/[id], shows/[id], build/[id], pitch/[slug]
- **NEXT: Run seed script, get GA4 ID, add gtag.js, run CDP scrape for pixel comparison**
