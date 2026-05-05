// server.ts — Standalone Show Pitch Machine MCP server for Railway deployment.
//
// Architecture overview:
//   • Postgres backend (Railway-managed, connection via DATABASE_URL env var)
//   • MCP protocol at POST/GET /mcp — serves Sean's Claude Code on his Mac
//   • Ingest API at /ingest/* — Bang (scraper machine, 10.0.0.208) POSTs daily data here
//   • /health — Railway healthcheck + DB connectivity probe
//
// Sean's Claude Code config (~/Library/Application Support/Claude/claude_desktop_config.json):
//   {
//     "mcpServers": {
//       "show-pitch-machine": {
//         "url": "https://your-service.up.railway.app/mcp",
//         "headers": { "Authorization": "Bearer <MCP_API_KEY>" }
//       }
//     }
//   }
//
// Two API keys keep the trust scopes separate:
//   MCP_API_KEY    — only Sean's Claude Code uses this
//   INGEST_API_KEY — only Bang uses this

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { z } from 'zod';

import { initDb, pool } from './db';
import { checkMcpAuth } from './auth';
import { getActiveBuyers, getBuyerProfile, getBuyerIntelligence } from './tools/buyers';
import { searchShows, getMarketOrders } from './tools/shows';
import { searchArticlesTool } from './tools/articles';
import { getPipeline, getPitchHistory } from './tools/pipeline';
import { getIpDetail } from './tools/catalog';
import { getDevelopmentPipeline, getProjectTimeline, getSizzleInventory } from './tools/dev-pipeline';
import {
  handleIngestArticles,
  handleIngestOrders,
  handleIngestShows,
  handleIngestBuyers,
  handleIngestPipeline,
} from './ingest';

const PORT = parseInt(process.env.PORT || '3001', 10);
const TOOL_COUNT = 13;

// Vitrina VIQI proxy — the mcp-server calls the Next.js app service which owns Puppeteer/Chromium.
// VIQI_PROXY_URL: full URL to the /api/viqi endpoint on the app service (e.g. https://app-xxx.railway.app/api/viqi)
// VIQI_PROXY_SECRET: shared secret matching VIQI_PROXY_SECRET on the app service
const VIQI_PROXY_URL    = process.env.VIQI_PROXY_URL    ?? '';
const VIQI_PROXY_SECRET = process.env.VIQI_PROXY_SECRET ?? '';

// ── MCP server build ──────────────────────────────────────────────────────────

/**
 * Build and return a configured McpServer with all 12 Show Pitch Machine tools.
 * Tool descriptions are identical to the original lib/mcp/server.ts so Sean's
 * Claude Code gets the same capability surface after the migration.
 */
function buildMcpServer(): McpServer {
  const mcp = new McpServer({
    name: 'show-pitch-machine',
    version: '1.0.0',
  });

  // ── Tool 1: Active buyers ─────────────────────────────────────────────────
  mcp.tool(
    'get_active_buyers',
    'Returns all buyer contacts with activity_status=active, sorted by most recent greenlit date. Use this to identify the best targets for new pitches.',
    {},
    async () => {
      const buyers = await getActiveBuyers();
      return { content: [{ type: 'text', text: JSON.stringify(buyers, null, 2) }] };
    }
  );

  // ── Tool 2: Full buyer profile ────────────────────────────────────────────
  // @ts-ignore TS2589: MCP SDK v1 deep generic inference hits TypeScript's recursion limit
  mcp.tool(
    'get_buyer_profile',
    'Returns complete profile for a buyer contact: contact record, company, mandate history, and recent pitch history.',
    { contact_id: z.string().describe('Buyer contact ID from buyer_contacts table') },
    async ({ contact_id }) => {
      const profile = await getBuyerProfile(contact_id);
      return { content: [{ type: 'text', text: JSON.stringify(profile, null, 2) }] };
    }
  );

  // ── Tool 3: Buyer intelligence briefing ──────────────────────────────────
  mcp.tool(
    'get_buyer_intelligence',
    'Returns a structured intelligence briefing for a buyer: current mandate, recent greenlits, pass patterns, and days since last MYE contact. Use before drafting a pitch.',
    { contact_id: z.string().describe('Buyer contact ID') },
    async ({ contact_id }) => {
      const intel = await getBuyerIntelligence(contact_id);
      return { content: [{ type: 'text', text: JSON.stringify(intel, null, 2) }] };
    }
  );

  // ── Tool 4: Show search ───────────────────────────────────────────────────
  mcp.tool(
    'search_shows',
    'Full-text search across show titles, genres, networks, and production companies. Returns matching shows with greenlit dates and episode counts for comp building.',
    {
      query: z.string().describe('Search terms — title, genre, network, or talent name'),
      genre: z.string().optional().describe('Filter by genre (e.g. "True Crime", "Paranormal")'),
      network: z.string().optional().describe('Filter by network name'),
      status: z.string().optional().describe('Filter by status: greenlit, in-production, etc.'),
      format: z.string().optional().describe('Filter by format: docuseries, unscripted-series, etc.'),
    },
    async ({ query: q, genre, network, status, format }) => {
      const shows = await searchShows(q, { genre, network, status, format });
      return { content: [{ type: 'text', text: JSON.stringify(shows, null, 2) }] };
    }
  );

  // ── Tool 5: Market orders ─────────────────────────────────────────────────
  // @ts-ignore TS2589: MCP SDK v1 deep generic inference hits TypeScript's recursion limit
  mcp.tool(
    'get_market_orders',
    'Returns recent market orders filtered by network, genre, format, or date. Use to identify buying trends and validate pitch timing.',
    {
      network: z.string().optional().describe('Filter by buyer network name'),
      genre: z.string().optional().describe('Filter by content genre'),
      format: z.string().optional().describe('Filter by show format'),
      since_date: z.number().optional().describe('Unix timestamp — return only orders after this date'),
    },
    async ({ network, genre, format, since_date }) => {
      const orders = await getMarketOrders({ network, genre, format, since_date });
      return { content: [{ type: 'text', text: JSON.stringify(orders, null, 2) }] };
    }
  );

  // ── Tool 6: Trade article search ──────────────────────────────────────────
  // Uses Postgres full-text search (tsvector) instead of LanceDB vector search.
  // Covers the same use cases: mandate quotes, market context, competitive intel.
  mcp.tool(
    'search_articles',
    'Full-text search over ingested trade articles (Deadline, Variety, THR, etc.). Returns relevant articles with source citations. Use to find mandate quotes, market context, and competitive intel.',
    {
      query: z.string().describe('Natural language search query'),
      limit: z.number().optional().describe('Max results (default 10, max 25)'),
      genre: z.string().optional().describe('Filter to specific genre'),
      item_type: z.string().optional().describe('Filter by item type: greenlight, mandate, market-news'),
      buyer_company: z.string().optional().describe('Filter by buyer company name'),
    },
    async ({ query: q, limit, genre, item_type, buyer_company }) => {
      const results = await searchArticlesTool(q, limit ?? 10, { genre, item_type, buyer_company });
      return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
    }
  );

  // ── Tool 7: Pipeline overview ─────────────────────────────────────────────
  mcp.tool(
    'get_pipeline',
    'Returns all active packages with pipeline stage, days in stage, buyer name, and IP title. Sorted by stage priority and staleness.',
    {},
    async () => {
      const pipeline = await getPipeline();
      return { content: [{ type: 'text', text: JSON.stringify(pipeline, null, 2) }] };
    }
  );

  // ── Tool 8: Pitch history for a contact ──────────────────────────────────
  mcp.tool(
    'get_pitch_history',
    'Returns all MYE pitches to a specific buyer contact, with IP titles and outcomes. Use to avoid re-pitching passed shows and identify warm leads.',
    { contact_id: z.string().describe('Buyer contact ID') },
    async ({ contact_id }) => {
      const history = await getPitchHistory(contact_id);
      return { content: [{ type: 'text', text: JSON.stringify(history, null, 2) }] };
    }
  );

  // ── Tool 9: IP catalog detail ─────────────────────────────────────────────
  mcp.tool(
    'get_ip_detail',
    'Returns full detail for an IP in the catalog: the record, pitch history across all buyers, attached talent, and content partner relationships.',
    { ip_id: z.string().describe('IP catalog entry ID') },
    async ({ ip_id }) => {
      const detail = await getIpDetail(ip_id);
      return { content: [{ type: 'text', text: JSON.stringify(detail, null, 2) }] };
    }
  );

  // ── Tool 10: Development pipeline ────────────────────────────────────────
  mcp.tool(
    'get_development_pipeline',
    'Returns all MYE projects imported from the Google Sheet, grouped by sheet tab (priorities, bc-mye, full-dev, backburner, archived, passes, brainstorms). Each project shows point person, target networks, pitched-to networks, email thread count, and last email activity. Use this as the daily development dashboard to see what\'s active, what needs attention, and who owns what.',
    {
      sheet_source: z.string().optional().describe(
        'Filter to a single sheet tab: priorities | bc-mye | full-dev | backburner | archived | passes | brainstorms'
      ),
      status: z.string().optional().describe(
        'Filter by ip_catalog.status value (e.g. "active", "archived")'
      ),
    },
    async ({ sheet_source, status }) => {
      const text = await getDevelopmentPipeline({ sheet_source, status });
      return { content: [{ type: 'text', text }] };
    }
  );

  // ── Tool 11: Full project timeline ────────────────────────────────────────
  mcp.tool(
    'get_project_timeline',
    'Returns a full detail view for a single MYE project: spreadsheet metadata (status, point person, targets, next steps), complete Gmail thread timeline sorted newest-first, sizzle reel assets, and any linked Story Scout entries. Accepts a partial project name — use this to deep-dive on any project after spotting it in get_development_pipeline().',
    {
      project_name: z.string().describe(
        'Full or partial project title to look up (case-insensitive LIKE search). Example: "Pros vs Joes" or just "Pros".'
      ),
    },
    async ({ project_name }) => {
      const text = await getProjectTimeline(project_name);
      return { content: [{ type: 'text', text }] };
    }
  );

  // ── Tool 12: Sizzle reel inventory ────────────────────────────────────────
  mcp.tool(
    'get_sizzle_inventory',
    'Returns complete sizzle reel inventory: all recorded sizzles grouped by status (with video link vs. confirmed exists but no link yet). Shows Vimeo URLs, passwords, and latest email activity for each reel. Use this to track sizzle production progress and identify what needs video upload next.',
    {},
    async () => {
      const text = await getSizzleInventory();
      return { content: [{ type: 'text', text }] };
    }
  );

  // ── Tool 13: Vitrina VIQI ─────────────────────────────────────────────────
  // Proxies to the Next.js app service which owns Puppeteer/Chromium for auth.
  mcp.tool(
    'query_viqi',
    'Query Vitrina\'s VIQI multi-agent entertainment intelligence system. VIQI runs parallel agents (Company Profiler, Person Profiler, Deals Analyst) and synthesizes a comprehensive answer. Use for deep research on a specific buyer, company, or deal that goes beyond local data — e.g. "What is HBO\'s current unscripted mandate?" or "Who are the key buyers at Peacock right now?"',
    { query: z.string().describe('Research question about a buyer, company, show, or market trend') },
    async ({ query }) => {
      if (!VIQI_PROXY_URL || !VIQI_PROXY_SECRET) {
        return { content: [{ type: 'text', text: 'Vitrina VIQI not configured (VIQI_PROXY_URL / VIQI_PROXY_SECRET missing).' }] };
      }
      const res = await fetch(VIQI_PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${VIQI_PROXY_SECRET}`,
        },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(90_000),
      });
      if (!res.ok) {
        const err = await res.text().catch(() => '');
        return { content: [{ type: 'text', text: `VIQI proxy error ${res.status}: ${err.substring(0, 300)}` }] };
      }
      const json = await res.json() as { data?: { answer?: string }; error?: string };
      const answer = json?.data?.answer ?? json?.error ?? 'No answer returned';
      return { content: [{ type: 'text', text: answer }] };
    }
  );

  return mcp;
}

// ── HTTP server ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Run Postgres migrations before accepting any traffic
  console.log('[startup] Running database migrations...');
  await initDb();
  console.log('[startup] Migrations complete');

  const mcp = buildMcpServer();

  // StreamableHTTP transport handles both SSE (streaming) and JSON-RPC (one-shot).
  // sessionIdGenerator: undefined = stateless mode (no per-session state on server).
  // This is the correct mode for Claude Code remote MCP connections.
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  await mcp.connect(transport);
  console.log(`[startup] MCP server connected — ${TOOL_COUNT} tools registered`);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = req.url ?? '';
    const method = req.method ?? 'GET';

    // ── /health — Railway healthcheck ────────────────────────────────────────
    // No auth required — Railway calls this from its own infra.
    // Also checks DB connectivity so Railway can detect Postgres failures.
    if (url === '/health' && method === 'GET') {
      try {
        await pool.query('SELECT 1');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          db: 'connected',
          tools: TOOL_COUNT,
          server: 'show-pitch-machine-mcp',
        }));
      } catch {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', db: 'unreachable' }));
      }
      return;
    }

    // ── /mcp — MCP protocol endpoint ─────────────────────────────────────────
    // Handles both GET (SSE stream establishment) and POST (JSON-RPC calls).
    // Sean's Claude Code connects here from his Mac.
    if (url === '/mcp' && (method === 'GET' || method === 'POST' || method === 'DELETE')) {
      if (!checkMcpAuth(req, res)) return;
      await transport.handleRequest(req, res);
      return;
    }

    // ── /ingest/* — Data ingestion from Bang ──────────────────────────────────
    // Bang (10.0.0.208) pushes scraped data here nightly via its Python scripts.
    if (url === '/ingest/articles' && method === 'POST') {
      await handleIngestArticles(req, res);
      return;
    }

    if (url === '/ingest/orders' && method === 'POST') {
      await handleIngestOrders(req, res);
      return;
    }

    if (url === '/ingest/shows' && method === 'POST') {
      await handleIngestShows(req, res);
      return;
    }

    if (url === '/ingest/buyers' && method === 'POST') {
      await handleIngestBuyers(req, res);
      return;
    }

    if (url === '/ingest/pipeline' && method === 'POST') {
      await handleIngestPipeline(req, res);
      return;
    }

    // 404 for everything else
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found', url, method }));
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(PORT, () => {
      console.log(`[startup] Show Pitch Machine MCP server listening on port ${PORT}`);
      console.log(`[startup] MCP endpoint: http://localhost:${PORT}/mcp`);
      console.log(`[startup] Health check: http://localhost:${PORT}/health`);
      console.log(`[startup] Ingest endpoints: /ingest/{articles,orders,shows,buyers,pipeline}`);
      resolve();
    });
    server.on('error', reject);
  });

  // Graceful shutdown — release Postgres pool before process exits
  const shutdown = async () => {
    console.log('[shutdown] Closing Postgres pool...');
    await pool.end();
    console.log('[shutdown] Done');
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Entry point — top-level await not available in CommonJS, use .catch()
main().catch((err) => {
  console.error('[startup] Fatal error:', err);
  process.exit(1);
});
