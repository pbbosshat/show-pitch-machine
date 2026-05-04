# Show Pitch Machine — Standalone MCP Server

## What This Is

A standalone Node.js/TypeScript HTTP service that exposes Show Pitch Machine data to Claude Code via the MCP (Model Context Protocol). Deployed separately from the main Next.js app on Railway with its own PostgreSQL database.

## Why It Exists

The original MCP server (`lib/mcp/server.ts`) ran embedded inside the Next.js app and queried SQLite synchronously. This extraction makes the MCP layer independently deployable, accessible to Sean's Mac-based Claude Code without VPN, and gives Bang a clean HTTP API to push scraped data into (replacing direct SQLite access).

## Key Files

```
mcp-server/
├── server.ts              # Entry point — HTTP server + MCP tool registration
├── db.ts                  # Postgres pool, query helpers, migration runner
├── auth.ts                # Bearer token auth for /mcp and /ingest/* routes
├── ingest.ts              # POST handlers for Bang's daily data push
├── tools/
│   ├── buyers.ts          # Tools 1-3: get_active_buyers, get_buyer_profile, get_buyer_intelligence
│   ├── shows.ts           # Tools 4-5: search_shows, get_market_orders
│   ├── articles.ts        # Tool 6:   search_articles (Postgres FTS replacing LanceDB)
│   ├── pipeline.ts        # Tools 7-8: get_pipeline, get_pitch_history
│   ├── catalog.ts         # Tool 9:   get_ip_detail
│   └── dev-pipeline.ts    # Tools 10-12: get_development_pipeline, get_project_timeline, get_sizzle_inventory
├── migrations/
│   └── 001_schema.sql     # Full Postgres schema (consolidated from all SQLite migrations)
├── railway.toml           # Railway build + deploy config
├── .env.example           # Required env vars
└── package.json
```

## Environment Variables

| Variable | Who sets it | Purpose |
|---|---|---|
| `DATABASE_URL` | Railway (auto) | Postgres connection string from linked addon |
| `MCP_API_KEY` | You | Secret token Sean puts in his Claude Code config |
| `INGEST_API_KEY` | You | Secret token Bang uses to POST scraped data |
| `PORT` | Railway (auto) | HTTP port (default 3001 locally) |
| `NODE_ENV` | Railway (auto) | `production` in deployed environment |

Generate strong keys: `openssl rand -hex 32`

## API Endpoints

### `GET /health`
No auth. Returns `{ status, db, tools }`. Railway calls this for healthchecks.

### `POST /mcp` / `GET /mcp`
Auth: `Authorization: Bearer <MCP_API_KEY>`

MCP StreamableHTTP transport. Sean's Claude Code connects here. Exposes 12 tools.

### `POST /ingest/articles`
Auth: `Authorization: Bearer <INGEST_API_KEY>`
Body: `{ articles: TradeArticle[] }`
Upserts trade articles by URL.

### `POST /ingest/orders`
Body: `{ orders: MarketOrder[] }`
Upserts market orders (dedup by source_url when available).

### `POST /ingest/shows`
Body: `{ shows: Show[] }`
Upserts shows by (title_normalized, network).

### `POST /ingest/buyers`
Body: `{ contacts: BuyerContact[], companies: BuyerCompany[] }`
Upserts companies first (FK dep), then contacts by email.

### `POST /ingest/pipeline`
Body: `{ packages: Package[], pitches: Pitch[] }`
Upserts packages and pitches by id.

All ingest routes return `{ inserted: N, updated: M, total: T }`.

## MCP Tools (12 total)

| # | Tool | Description |
|---|---|---|
| 1 | `get_active_buyers` | All active buyer contacts sorted by greenlit date |
| 2 | `get_buyer_profile` | Full profile: contact + company + mandate history + pitches |
| 3 | `get_buyer_intelligence` | Structured briefing: mandate, greenlits, pass patterns, days since contact |
| 4 | `search_shows` | FTS over show title/genre/network/production company |
| 5 | `get_market_orders` | Recent market orders filterable by network/genre/format/date |
| 6 | `search_articles` | FTS over trade articles (headline + body) with ts_rank relevance |
| 7 | `get_pipeline` | All active packages sorted by pipeline stage + staleness |
| 8 | `get_pitch_history` | All pitches to a specific buyer contact |
| 9 | `get_ip_detail` | IP record + full pitch history + talent + content partners |
| 10 | `get_development_pipeline` | Sheet-imported projects grouped by tab with email activity |
| 11 | `get_project_timeline` | Full project detail: email threads + sizzles + story scout |
| 12 | `get_sizzle_inventory` | Complete sizzle reel inventory with Vimeo URLs + passwords |

## Data Flow

```
Bang (10.0.0.208)
  → POST /ingest/* with INGEST_API_KEY
  → Postgres upsert (ON CONFLICT DO UPDATE)
  → search_vector tsvector regenerated automatically (GENERATED ALWAYS AS)

Sean's Claude Code (Mac)
  → POST /mcp with MCP_API_KEY
  → StreamableHTTP → McpServer → tool function → async Postgres query → JSON response
```

## SQLite → Postgres Key Differences

- **Parameter syntax**: `?` → `$1, $2, $3`
- **FTS**: `CREATE VIRTUAL TABLE fts5` → `tsvector GENERATED ALWAYS AS ... STORED` + GIN index
- **Case-insensitive search**: `UPPER(x) LIKE UPPER(?)` → `x ILIKE $1`
- **NULL ordering**: `NULLS LAST` works identically in Postgres
- **Date functions**: `datetime('now')` → `NOW()`, `unixepoch()` → `EXTRACT(EPOCH FROM NOW())::INTEGER`
- **Upsert**: `INSERT OR IGNORE` → `ON CONFLICT DO NOTHING`; `INSERT OR REPLACE` → `ON CONFLICT DO UPDATE SET ...`
- **No LanceDB**: Article search is now Postgres `ts_rank` + `plainto_tsquery`. Semantic similarity is lower but zero dependencies and zero GPU.

## Sean's Claude Code Config (Mac)

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "show-pitch-machine": {
      "url": "https://your-service.up.railway.app/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_API_KEY_HERE"
      }
    }
  }
}
```

## Railway Deployment

1. Create a new Railway project
2. Add a PostgreSQL addon — Railway injects `DATABASE_URL` automatically
3. Set `MCP_API_KEY` and `INGEST_API_KEY` in Railway environment variables
4. Deploy from this `mcp-server/` directory (or set root directory in Railway settings)
5. First deploy runs `initDb()` which applies `migrations/001_schema.sql`
6. Healthcheck at `/health` tells Railway when the service is ready

## Local Dev

```bash
cd mcp-server
npm install
cp .env.example .env   # fill in DATABASE_URL and both keys
npm run dev            # uses tsx for hot reload
```

## Gotchas

- **`GENERATED ALWAYS AS ... STORED` requires Postgres 12+** — Railway's default Postgres version is fine.
- **SSL on Railway**: `ssl: { rejectUnauthorized: false }` is required for Railway's managed Postgres. Do not set `ssl: true` (strict) — it will reject Railway's self-signed cert.
- **search_vector is auto-maintained** — you never INSERT into it. On upsert, Postgres recomputes it from the source columns automatically.
- **Bang's ingest keys never expire** — rotate `INGEST_API_KEY` in Railway env vars if Bang is compromised; restart service to pick up the new value.
- **Vitrina/VIQI tool not included** — the `query_vitrina` tool from the original server requires internal `lib/vitrina/client` which is not available in the standalone service. Sean can add it back if Vitrina provides a standalone API key.
