# Railway Deployment Guide

## Overview

Two Railway services from one GitHub repo:
- **app** — Next.js main application (root directory)
- **mcp** — Standalone MCP server (mcp-server/ directory)

Both share one Railway Postgres database.

---

## Step 1: Create Railway Project

1. Go to [railway.app](https://railway.app) → New Project
2. Choose **"Deploy from GitHub repo"**
3. Connect GitHub and select **pbbosshat/show-pitch-machine**
4. Railway will auto-detect the Next.js app at root → name this service **app**

---

## Step 2: Add Postgres Database

In your Railway project:
1. Click **+ New** → **Database** → **PostgreSQL**
2. Railway creates a managed Postgres instance and sets `DATABASE_URL` automatically on all services in the project

---

## Step 3: Set Environment Variables for the App Service

In the **app** service → Variables tab, add:

```
NODE_ENV=production
DATABASE_PATH=./data/db.sqlite          # kept for any scripts that still reference it
GROQ_API_KEY=your_groq_key
GROQ_MODEL=llama-3.3-70b-versatile
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_secret
GMAIL_REFRESH_TOKEN=your_refresh_token
GMAIL_NEWSLETTER_USER=sm@gototeam.com
GMAIL_NEWSLETTER_LABEL=Label_378
TMDB_API_KEY=4df7bd1c84db0adcefbfc7124c373341
TVDB_API_KEY=f72890f2-ef40-4e0f-816b-f96d11626aa1
MCP_PORT=3001
SCRAPER_ENABLED=true
SCRAPER_CRON=0 6 * * *
```

`DATABASE_URL` is injected automatically by Railway from the Postgres service.

---

## Step 4: Add the MCP Server as a Second Service

1. In the Railway project → click **+ New** → **GitHub Repo** → same repo
2. When prompted for **Root Directory**, set it to: `mcp-server`
3. Name this service **mcp**
4. Railway will use `mcp-server/railway.toml` for build/start commands

---

## Step 5: Set Environment Variables for the MCP Service

In the **mcp** service → Variables tab, add:

```
NODE_ENV=production
MCP_API_KEY=           # Generate a strong random token — Sean uses this
INGEST_API_KEY=        # Generate a separate strong token — Bang uses this
PORT=3001              # Railway overrides this automatically
```

Generate secure tokens:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run this twice — one for `MCP_API_KEY`, one for `INGEST_API_KEY`. Save them somewhere secure.

`DATABASE_URL` is shared automatically from the Postgres service.

---

## Step 6: Get the MCP Service URL

After deploy:
1. Railway **mcp** service → Settings → Networking → **Generate Domain**
2. Your MCP endpoint will be: `https://mcp-xxxx.railway.app/mcp`
3. Health check: `https://mcp-xxxx.railway.app/health`

---

## Sean's Claude Code Configuration

Sean adds this to `~/.claude/settings.json` on his Mac:

```json
{
  "mcpServers": {
    "show-pitch-machine": {
      "type": "http",
      "url": "https://mcp-xxxx.railway.app/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_API_KEY"
      }
    }
  }
}
```

Replace `mcp-xxxx.railway.app` with the actual Railway domain and `YOUR_MCP_API_KEY` with the token from Step 5.

Sean can verify it's working:
```bash
curl https://mcp-xxxx.railway.app/health
# → {"status":"ok","db":"connected","tools":12}
```

---

## Bang Daily Ingest

After scraper runs complete, Bang POSTs data to the MCP server:

```bash
# Articles (run after each scraper batch)
curl -X POST https://mcp-xxxx.railway.app/ingest/articles \
  -H "Authorization: Bearer YOUR_INGEST_API_KEY" \
  -H "Content-Type: application/json" \
  -d @scraped_articles.json

# Market orders
curl -X POST https://mcp-xxxx.railway.app/ingest/orders \
  -H "Authorization: Bearer YOUR_INGEST_API_KEY" \
  -H "Content-Type: application/json" \
  -d @market_orders.json

# Buyers (updated mandate statements)
curl -X POST https://mcp-xxxx.railway.app/ingest/buyers \
  -H "Authorization: Bearer YOUR_INGEST_API_KEY" \
  -H "Content-Type: application/json" \
  -d @buyers.json
```

See `scripts/bang-scrape-and-sync.bat` for the Windows Task Scheduler wrapper.

---

## Available MCP Tools (what Sean can use)

| Tool | Description |
|------|-------------|
| `get_active_buyers` | All active buyers sorted by most recent greenlit |
| `get_buyer_profile` | Full profile: mandate history, pitch history |
| `get_buyer_intelligence` | Pre-pitch briefing: mandate, pass patterns, days since contact |
| `search_shows` | Full-text search across show database |
| `get_market_orders` | Recent orders filtered by network/genre/format |
| `search_articles` | Semantic search over trade articles |
| `get_pipeline` | All active packages with stage and staleness |
| `get_pitch_history` | History for a specific buyer contact |
| `get_ip_detail` | Full project detail with pitch history |
| `get_development_pipeline` | All MYE projects grouped by sheet tab |
| `get_project_timeline` | Deep dive on a single project |
| `get_sizzle_inventory` | All sizzle reels with Vimeo links |

---

## Cost Estimate

| Service | Monthly Cost |
|---------|-------------|
| Railway Hobby Plan | $5/seat |
| App service (Next.js) | ~$5–15 (usage-based) |
| MCP service (Node) | ~$2–5 (low traffic) |
| Postgres (1GB) | ~$5 |
| **Total** | **~$17–30/month** |
