# Show Pitch Machine — Setup Guide

**MY Entertainment | Internal Intelligence & Pitch Platform**

---

## Requirements

| | |
|---|---|
| Node.js | 22 or 24 LTS (24.x recommended) |
| npm | 10+ |
| OS | Windows 10/11 or macOS 12+ |
| Disk | ~2GB (Chromium + vector model download on first run) |

---

## Installation

### 1. Install Node.js 24

Download from [nodejs.org](https://nodejs.org). Verify:
```
node --version   # should show v24.x
```

### 2. Copy the app folder

Put the `Show Pitch Machine` folder anywhere on your machine. Recommended:
- **Windows**: `C:\ShowPitchMachine\`
- **Mac**: `~/ShowPitchMachine/`

### 3. Install dependencies

Open a terminal in the app folder:
```
npm install
```
This takes 2-3 minutes the first time (downloads Chromium for PDF export).

### 4. Configure environment

Copy `.env.example` to `.env`:
```
cp .env.example .env
```

Open `.env` and fill in:

| Variable | Where to get it |
|---|---|
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) — free tier works |
| `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` | Path to `service_account.json` (Patrick provides) |
| `GMAIL_NEWSLETTER_USER` | `sm@gototeam.com` (already set in example) |
| `BROWSER_MODE` | `local` for Shawn's machine, `bang-tunnel` for Patrick's |

**Gmail pipeline poller** (optional — enables auto-moving pipeline cards):
1. Run `npx tsx scripts/gmail-auth.ts` (one-time)
2. Paste the `GMAIL_REFRESH_TOKEN` into `.env`

### 5. Run migrations and seed

```
npm run migrate
npm run seed
```

This creates the database and loads the MYE pitch history from the CSV.

### 6. First run

```
npm run dev       # development mode (hot reload)
npm run start     # production mode (faster)
```

Open [http://localhost:3000](http://localhost:3000).

---

## Daily Use

### Windows
Double-click `ShowPitchMachine.bat` — it migrates, seeds, starts the server, and opens the browser automatically.

### Mac
Double-click `ShowPitchMachine.command`.

---

## Shawn's Claude Code Setup (MCP)

Add one entry to your Claude Code config (`~/Library/Application Support/Claude/claude_desktop_config.json` on Mac):

```json
{
  "mcpServers": {
    "show-pitch-machine": {
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

The MCP server starts automatically with the app. From any Claude Code session:
> "What buyers are active right now and what should we pitch WBD?"

---

## Data

| File | What it is |
|---|---|
| `data/db.sqlite` | All structured data — buyers, pitches, packages, shows |
| `data/vectors/` | LanceDB — trade article embeddings for semantic search |
| `data/pdfs/` | Exported pitch portal PDFs |
| `data/backups/` | Automated daily backups (30-day retention) |

**Backup**: Run `npm run backup` or it runs automatically on the daily cron.

---

## Scraping

The scraper runs at **6am every day** automatically. To run manually:
- Click **Scrape All Now** in the Intelligence tab
- Or: `curl -X POST http://localhost:3000/api/scraper/run -d '{"sources":"all"}'`

---

## Troubleshooting

**Port 3000 already in use**
```
npx kill-port 3000
```

**Database errors**
```
npm run migrate     # re-run migrations (safe, idempotent)
```

**Scraper fails on paywalled sites**
Normal — rule-based extraction does best-effort. Raw article text is always stored when accessible. Claude Code reasons over what we have.

**PDF export hangs**
Ensure Chrome is running with debug port open. For `BROWSER_MODE=local`:
- Start Chrome with: `chrome --remote-debugging-port=9222`
- Or the app will launch headless Chromium automatically

---

## Architecture

The app has no AI calls. Intelligence comes from two places:
1. **Shawn's Claude Code** — queries the MCP server at `localhost:3001`
2. **Groq** — classifies pipeline emails to move kanban cards automatically

Everything else is pure data: SQLite + LanceDB, scraped nightly, queryable via API.

---

*Show Pitch Machine v1.0 — MY Entertainment Internal Platform*
