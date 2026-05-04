# Railway Deployment Guide

## Deployed Project

**Railway account:** `1@gototeam.com` (pbbosshat's Projects, Hobby plan — GitHub connected)  
**Project:** show-pitch-machine  
**Project ID:** `17ea66a7-750c-4c8a-8d55-51ff0f72b56c`  
**Production environment ID:** `b85ab596-2a60-4dcf-bd44-2e00acc89b9d`  
**Workspace ID:** `27c3f0f9-b199-4fea-ba45-47eef989876d`

### Services

| Service | ID | URL |
|---------|-----|-----|
| **app** (Next.js) | `3e796e7b-29c9-4012-96f9-9a2e1cf7f718` | `https://app-production-1ac7.up.railway.app` |
| **mcp-server** | `5043177d-0bdd-408a-8291-33719ccb964a` | `https://mcp-server-production-f138.up.railway.app` |
| **Postgres** | `82504330-...` | (internal) |

**GitHub repo:** `pbbosshat/show-pitch-machine` (public)

---

## Shawn's Claude Code Configuration

Shawn runs this one command in Terminal on his Mac:

```bash
claude mcp add show-pitch-machine https://mcp-server-production-f138.up.railway.app/mcp \
  --transport http \
  --scope user \
  --header "Authorization: Bearer mcp_ca8f896dac0194b0d29260861da06c8c4fc6a07f4afafc93a89046e4d52e7ed6"
```

Verify it's working:
```bash
claude mcp list
# → show-pitch-machine  ✓ Connected

curl https://mcp-server-production-f138.up.railway.app/health
# → {"status":"ok","db":"connected","tools":12}
```

---

## API Keys

| Key | Value | Who uses it |
|-----|-------|-------------|
| `MCP_API_KEY` | `mcp_ca8f896dac0194b0d29260861da06c8c4fc6a07f4afafc93a89046e4d52e7ed6` | Shawn's Claude Code |
| `INGEST_API_KEY` | `ingest_dd8210af261f2c8053f6d38e5ca6217cd215340e73b7746e767123d6f43ae796` | Bang scraper machine |

---

## Bang Daily Ingest

After scraper runs complete, Bang POSTs data to the MCP server:

```bash
MCP_HOST="https://mcp-server-production-f138.up.railway.app"
INGEST_KEY="ingest_dd8210af261f2c8053f6d38e5ca6217cd215340e73b7746e767123d6f43ae796"

curl -X POST $MCP_HOST/ingest/articles \
  -H "Authorization: Bearer $INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d @scraped_articles.json

curl -X POST $MCP_HOST/ingest/orders \
  -H "Authorization: Bearer $INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d @market_orders.json

curl -X POST $MCP_HOST/ingest/shows \
  -H "Authorization: Bearer $INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d @shows.json

curl -X POST $MCP_HOST/ingest/buyers \
  -H "Authorization: Bearer $INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d @buyers.json
```

---

## Available MCP Tools (what Shawn can use)

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

## Environment Variables

### mcp-server service (already set in Railway)
```
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}   ← Railway reference, auto-resolved
MCP_API_KEY=mcp_ca8f896dac...             ← set
INGEST_API_KEY=ingest_dd8210af...         ← set
PORT=3001
```

### app service (partially set — fill in secrets)
```
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}   ← set
GROQ_API_KEY=                             ← fill in
GROQ_MODEL=llama-3.3-70b-versatile
GMAIL_CLIENT_ID=                          ← fill in
GMAIL_CLIENT_SECRET=                      ← fill in
GMAIL_REFRESH_TOKEN=                      ← fill in
GMAIL_NEWSLETTER_USER=sm@gototeam.com
GMAIL_NEWSLETTER_LABEL=Label_378
TMDB_API_KEY=4df7bd1c84db0adcefbfc7124c373341
TVDB_API_KEY=f72890f2-ef40-4e0f-816b-f96d11626aa1
SCRAPER_ENABLED=true
SCRAPER_CRON=0 6 * * *
```

---

## Architecture

```
GitHub (pbbosshat/show-pitch-machine) — auto-deploys on push to master
  ├─ /              → Railway "app" service (Next.js)
  └─ /mcp-server/   → Railway "mcp-server" service

Railway Postgres ← shared by both services via ${{Postgres.DATABASE_URL}}

MCP server endpoints:
  POST/GET /mcp     ← Sean's Claude Code (MCP_API_KEY)
  POST /ingest/*    ← Bang scraper machine (INGEST_API_KEY)
  GET /health       ← Railway healthcheck

Migrations run automatically on startup (mcp-server/migrations/*.sql)
```

---

## Cost

Railway Hobby plan — $5/month + usage. Account: `1@gototeam.com`.
