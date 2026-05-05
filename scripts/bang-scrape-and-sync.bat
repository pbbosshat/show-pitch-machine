@echo off
:: Show Pitch Machine — daily scraper + seed enrichment run on Bang (10.0.0.208)
:: Scheduled at 6am daily.
::   - Scrapes all trade sources (Deadline, Variety, THR, Realscreen, C21, etc.)
::   - Reclassifies articles with latest rules
::   - Enriches show DB: season counts, air status, schedules from TVMaze
::   - Runs network press scrapers (Discovery, A+E, NBCUniversal)
::   - On Sundays: re-seeds from TVMaze + runs IMDb/Wikidata/Episodate bulk importers
::   - Checkpoints WAL so PB can safely pull the DB via pull-db-from-bang.ps1
::
:: Data sources active:
::   TVMaze      — 7k+ unscripted shows, air status, schedule, genres (seed + daily enrich)
::   IMDb        — showrunner names, ratings, season counts via free bulk TSV datasets
::   Wikidata    — production company names, co-production countries via SPARQL
::   Episodate   — episode/season gap-fill for titles TVMaze misses
::   Network Press — Discovery/A+E/NBCUniversal official press announcements
::   Deadline, Variety, THR — trade articles, greenlit orders, cancellations
::   Realscreen, C21 — unscripted-focused trades, format sales, international co-pros
::   Cynopsis, TVLine, IndieWire, B&C, Production Weekly — supplemental trades
::   Gmail newsletters — sm@gototeam.com newsletter label scrape
::
:: API keys active (set in .env):
::   TMDB — prodco linkage, streaming originals (TMDB_API_KEY)
::   TVDB — authoritative episode/season data (TVDB_API_KEY)
::
:: IMPORTANT: All npx/python calls must use CALL prefix.
::   npx is npx.cmd on Windows; a .cmd called without CALL terminates the parent bat.

set PROJECT=C:\Users\bang\show-pitch-machine
set LOG=%PROJECT%\data\scrape.log
set PUPPETEER_CACHE_DIR=C:\Users\BubbaBang_old\.cache\puppeteer
set RAILWAY_MCP_URL=https://mcp-server-production-f138.up.railway.app
set RAILWAY_INGEST_KEY=ingest_dd8210af261f2c8053f6d38e5ca6217cd215340e73b7746e767123d6f43ae796
set RAILWAY_APP_URL=https://app-production-1ac7.up.railway.app
set RAILWAY_APP_KEY=ingest_dd8210af261f2c8053f6d38e5ca6217cd215340e73b7746e767123d6f43ae796

echo [%DATE% %TIME%] ===== Daily run starting ===== >> %LOG%

cd /d %PROJECT%

:: ── 1. Trade scrapers ────────────────────────────────────────────────────────
echo [%DATE% %TIME%] Step 1: Trade scrapers >> %LOG%
CALL npx tsx --env-file=.env scripts\scrape-all.ts >> %LOG% 2>&1
echo [%DATE% %TIME%] Scrapers complete >> %LOG%

:: ── 2. Reclassify articles with latest rules ─────────────────────────────────
echo [%DATE% %TIME%] Step 2: Reclassify >> %LOG%
CALL npx tsx scripts\reclassify.ts >> %LOG% 2>&1
echo [%DATE% %TIME%] Reclassify complete >> %LOG%

:: ── 3. Network press scrapers — official show announcements ──────────────────
:: Authoritative premiere dates and orders from Discovery/A+E/NBCUniversal press sites.
echo [%DATE% %TIME%] Step 3: Network press scrapers >> %LOG%
CALL npx tsx scripts\scrape-network-press.ts --source=all >> %LOG% 2>&1
echo [%DATE% %TIME%] Network press scrapers complete >> %LOG%

:: ── 4. TVMaze enrichment — update air_status, season counts, schedules ───────
:: Runs daily. Safe to re-run — uses COALESCE so it never overwrites manual edits.
echo [%DATE% %TIME%] Step 4: TVMaze enrichment >> %LOG%
CALL npx tsx scripts\enrich-tvmaze.ts --all --skip-pw >> %LOG% 2>&1
echo [%DATE% %TIME%] TVMaze enrichment complete >> %LOG%

:: ── 5. Classify shows — sets format_type + relevance_tier on all shows/articles ──
:: Fast (SQL-only, no external calls). Safe to run daily — idempotent UPDATEs.
echo [%DATE% %TIME%] Step 5: Classify shows >> %LOG%
CALL npx tsx scripts\classify-shows.ts >> %LOG% 2>&1
echo [%DATE% %TIME%] Classify complete >> %LOG%

:: ── 6. Weekly bulk importers (Sundays only) ──────────────────────────────────
:: These run weekly rather than daily because they're slow/large:
::   IMDb: downloads 585MB TSV.gz files (cached 24h), fills ratings + showrunner names
::   Wikidata: 25 SPARQL batches against wikidata.org, fills prodco + countries
for /f %%d in ('powershell -Command "(Get-Date).DayOfWeek"') do set DOW=%%d
if "%DOW%"=="Sunday" (
    echo [%DATE% %TIME%] Step 6a: Sunday full TVMaze reseed >> %LOG%
    CALL npx tsx scripts\seed-tvmaze-networks.ts --all --no-detail >> %LOG% 2>&1
    echo [%DATE% %TIME%] Reseed complete >> %LOG%

    echo [%DATE% %TIME%] Step 6b: IMDb bulk import >> %LOG%
    CALL npx tsx scripts\import-imdb-datasets.ts >> %LOG% 2>&1
    echo [%DATE% %TIME%] IMDb import complete >> %LOG%

    echo [%DATE% %TIME%] Step 6c: Wikidata SPARQL import >> %LOG%
    CALL npx tsx scripts\import-wikidata.ts >> %LOG% 2>&1
    echo [%DATE% %TIME%] Wikidata import complete >> %LOG%
)

:: ── 7. Episodate gap-fill — runs daily at limit=300 ──────────────────────────
:: Fills episode_count + total_seasons for shows that TVMaze missed.
:: 1.5s delay between API calls (~15 min/day for 300 shows).
:: Running daily fills the full backlog in weeks rather than months.
echo [%DATE% %TIME%] Step 7: Episodate gap-fill >> %LOG%
CALL npx tsx scripts\import-episodate.ts --limit=300 >> %LOG% 2>&1
echo [%DATE% %TIME%] Episodate import complete >> %LOG%

:: ── 8. TMDB seed — prodco linkage + confidence promotion ────────────────────
:: Adds prodco linkage and promotes pending→confirmed via second-source verification.
echo [%DATE% %TIME%] Step 8: TMDB seed >> %LOG%
CALL npx tsx scripts\seed-tmdb.ts >> %LOG% 2>&1
echo [%DATE% %TIME%] TMDB seed complete >> %LOG%

:: ── 9. TVDB enrichment — episode/season counts, air status ──────────────────
:: Runs daily with limit=500 until all 7k+ shows are enriched (COALESCE guards).
:: Full reseed (--all) runs on Sundays to pick up status changes on matched shows.
echo [%DATE% %TIME%] Step 9: TVDB enrichment >> %LOG%
CALL npx tsx scripts\import-tvdb.ts --limit=500 >> %LOG% 2>&1
echo [%DATE% %TIME%] TVDB enrichment complete >> %LOG%
if "%DOW%"=="Sunday" (
    echo [%DATE% %TIME%] Step 9b: TVDB full reseed >> %LOG%
    CALL npx tsx scripts\import-tvdb.ts --all --limit=1000 >> %LOG% 2>&1
    echo [%DATE% %TIME%] TVDB full reseed complete >> %LOG%
)

:: ── 10. WAL checkpoint — must run last so the DB file is safe to copy ────────
echo [%DATE% %TIME%] Step 10: WAL checkpoint >> %LOG%
CALL npx tsx -e "import { initDb, run } from './lib/db.ts'; initDb(); run('PRAGMA wal_checkpoint(TRUNCATE)'); console.log('WAL checkpointed');" >> %LOG% 2>&1

echo [%DATE% %TIME%] ===== Daily run complete ===== >> %LOG%

:: ── 11. Email run report to patrickbryant@gototeam.com ───────────────────────
:: Sends stats summary (TVDB progress, new articles, steps completed).
:: Stops automatically once TVDB enrichment is complete.
echo [%DATE% %TIME%] Step 11: Sending run report >> %LOG%
CALL python scripts\send-run-report.py >> %LOG% 2>&1
echo [%DATE% %TIME%] Report sent >> %LOG%

:: ── 12. Sync to Railway MCP server ───────────────────────────────────────────
:: Pushes articles, shows, orders, buyers, and pipeline data from local SQLite
:: to the Railway-hosted MCP server so Sean's Claude Code stays current.
:: Safe to re-run — all ingest endpoints use ON CONFLICT DO UPDATE (upsert).
echo [%DATE% %TIME%] Step 12: Syncing to Railway MCP server >> %LOG%
CALL npx tsx --env-file=.env scripts\sync-to-railway.ts >> %LOG% 2>&1
echo [%DATE% %TIME%] Railway sync complete >> %LOG%

echo [%DATE% %TIME%] ===== All steps complete ===== >> %LOG%
