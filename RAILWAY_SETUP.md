# Railway Deployment Guide

## Deployed Project

**Railway project:** show-pitch-machine  
**Account:** pb@gototeam.com  
**Project ID:** `94debf51-8a7f-4b85-b18b-51e69ad60540`  
**Production environment ID:** `98e05f84-4bd0-4b81-969f-ed277f8383e9`

### Services

| Service | ID | URL |
|---------|-----|-----|
| **app** (Next.js) | `a27e2e23-cfd4-445a-a2ec-c5d3c691b971` | `https://app-production-22fa.up.railway.app` |
| **mcp-server** | `d9937ae3-1230-4eb8-bab0-12e7d06127fd` | `https://mcp-server-production-22c9.up.railway.app` |
| **Postgres** | `7a196923-96c6-4be7-9abb-100bef62bb3d` | (internal) |

**GitHub repo:** `pbbosshat/show-pitch-machine` (public)

---

## Sean's Claude Code Configuration

Sean adds this to `~/.claude/settings.json` on his Mac:

```json
{
  "mcpServers": {
    "show-pitch-machine": {
      "type": "http",
      "url": "https://mcp-server-production-22c9.up.railway.app/mcp",
      "headers": {
        "Authorization": "Bearer mcp_ca8f896dac0194b0d29260861da06c8c4fc6a07f4afafc93a89046e4d52e7ed6"
      }
    }
  }
}
```

Verify it's working:
```bash
curl https://mcp-server-production-22c9.up.railway.app/health
# → {"status":"ok","db":"connected","tools":12}
```

---

## API Keys

| Key | Value | Who uses it |
|-----|-------|-------------|
| `MCP_API_KEY` | `mcp_ca8f896dac0194b0d29260861da06c8c4fc6a07f4afafc93a89046e4d52e7ed6` | Sean's Claude Code |
| `INGEST_API_KEY` | `ingest_dd8210af261f2c8053f6d38e5ca6217cd215340e73b7746e767123d6f43ae796` | Bang scraper machine |

---

## Bang Daily Ingest

After scraper runs complete, Bang POSTs data to the MCP server:

```bash
MCP_HOST="https://mcp-server-production-22c9.up.railway.app"
INGEST_KEY="ingest_dd8210af261f2c8053f6d38e5ca6217cd215340e73b7746e767123d6f43ae796"

# Articles (run after each scraper batch)
curl -X POST $MCP_HOST/ingest/articles \
  -H "Authorization: Bearer $INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d @scraped_articles.json

# Market orders
curl -X POST $MCP_HOST/ingest/orders \
  -H "Authorization: Bearer $INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d @market_orders.json

# Shows
curl -X POST $MCP_HOST/ingest/shows \
  -H "Authorization: Bearer $INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d @shows.json

# Buyers (updated mandate statements)
curl -X POST $MCP_HOST/ingest/buyers \
  -H "Authorization: Bearer $INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d @buyers.json
```

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

## Environment Variables

### mcp-server service (already set in Railway)
```
NODE_ENV=production
DATABASE_URL=${{Postgres.DATABASE_URL}}   ← Railway injects automatically
MCP_API_KEY=mcp_ca8f896dac...             ← set
INGEST_API_KEY=ingest_dd8210af...         ← set
PORT=3001                                 ← Railway overrides anyway
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
GitHub (pbbosshat/show-pitch-machine)
  ├─ /                → Railway "app" service (Next.js)
  └─ /mcp-server/     → Railway "mcp-server" service

Railway Postgres ← shared by both services via DATABASE_URL

MCP server:
  POST/GET /mcp       ← Sean's Claude Code (MCP_API_KEY)
  POST /ingest/*      ← Bang scraper machine (INGEST_API_KEY)
  GET /health         ← Railway healthcheck
  
Migrations run automatically on startup (mcp-server/migrations/*.sql)
```

---

## Cost Estimate

| Service | Monthly Cost |
|---------|-------------|
| Railway Hobby Plan | $5/seat |
| App service (Next.js) | ~$5–15 (usage-based) |
| MCP service (Node) | ~$2–5 (low traffic) |
| Postgres (1GB) | ~$5 |
| **Total** | **~$17–30/month** |

Note: Account currently on trial ($5 credit). Add a credit card in Railway account settings to continue after trial.
