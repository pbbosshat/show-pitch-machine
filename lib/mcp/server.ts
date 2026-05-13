// MCP HTTP server — exposes Show Pitch Machine's Postgres data as MCP tools
// so Claude (via Claude Desktop or claude-code) can query it directly.
// Runs at localhost:3001 alongside the Next.js app on 3000.
//
// Phase 1B: all tool handler callbacks already await async lib functions.
// The tool handler callbacks were already `async () => { ... }` so the only
// change needed is removing the synchronous usage assumption in comments.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { z } from 'zod';

import { getActiveBuyers, getBuyerProfile, getBuyerIntelligence } from './tools/buyers';
import { queryViqi } from '../vitrina/client';
import { searchShows, getMarketOrders } from './tools/shows';
import { searchArticlesTool } from './tools/articles';
import { getPipeline, getPitchHistory } from './tools/pipeline';
import { getIpDetail } from './tools/catalog';
import { getDevelopmentPipeline, getProjectTimeline, getSizzleInventory } from './tools/dev-pipeline';

const MCP_PORT = parseInt(process.env.MCP_PORT || '3001', 10);

let _server: ReturnType<typeof createServer> | null = null;
let _mcpServer: McpServer | null = null;

// ── Tool registration ─────────────────────────────────────────────────────────

function buildMcpServer(): McpServer {
  const mcp = new McpServer({
    name: 'show-pitch-machine',
    version: '1.0.0',
  });

  // Tool 1: Active buyers — who should we be pitching right now?
  mcp.tool(
    'get_active_buyers',
    'Returns all buyer contacts with activity_status=active, sorted by most recent greenlit date. Use this to identify the best targets for new pitches.',
    {},
    async () => {
      const buyers = await getActiveBuyers();
      return { content: [{ type: 'text', text: JSON.stringify(buyers, null, 2) }] };
    }
  );

  // Tool 2: Full buyer profile
  mcp.tool(
    'get_buyer_profile',
    'Returns complete profile for a buyer contact: contact record, company, mandate history, and recent pitch history.',
    { contact_id: z.string().describe('Buyer contact ID from buyer_contacts table') },
    async ({ contact_id }) => {
      const profile = await getBuyerProfile(contact_id);
      return { content: [{ type: 'text', text: JSON.stringify(profile, null, 2) }] };
    }
  );

  // Tool 3: Buyer intelligence briefing
  mcp.tool(
    'get_buyer_intelligence',
    'Returns a structured intelligence briefing for a buyer: current mandate, recent greenlits, pass patterns, and days since last MYE contact. Use before drafting a pitch.',
    { contact_id: z.string().describe('Buyer contact ID') },
    async ({ contact_id }) => {
      const intel = await getBuyerIntelligence(contact_id);
      return { content: [{ type: 'text', text: JSON.stringify(intel, null, 2) }] };
    }
  );

  // Tool 4: Show search — find comp shows for pitch narrative building
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

  // Tool 5: Market orders — what's been ordered recently
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

  // Tool 6: Trade article vector search
  mcp.tool(
    'search_articles',
    'Semantic search over ingested trade articles using vector similarity. Returns relevant chunks with source citations. Use to find mandate quotes, market context, and competitive intel.',
    {
      query: z.string().describe('Natural language search query'),
      limit: z.number().optional().describe('Max results (default 10)'),
      genre: z.string().optional().describe('Filter to specific genre'),
      item_type: z.string().optional().describe('Filter by item type: greenlight, mandate, market-news'),
      buyer_company: z.string().optional().describe('Filter by buyer company name'),
    },
    async ({ query: q, limit, genre, item_type, buyer_company }) => {
      const results = await searchArticlesTool(q, limit ?? 10, { genre, item_type, buyer_company });
      return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
    }
  );

  // Tool 7: Pipeline overview
  mcp.tool(
    'get_pipeline',
    'Returns all active packages with pipeline stage, days in stage, buyer name, and IP title. Sorted by stage priority and staleness.',
    {},
    async () => {
      const pipeline = await getPipeline();
      return { content: [{ type: 'text', text: JSON.stringify(pipeline, null, 2) }] };
    }
  );

  // Tool 8: Pitch history for a contact
  mcp.tool(
    'get_pitch_history',
    'Returns all MYE pitches to a specific buyer contact, with IP titles and outcomes. Use to avoid re-pitching passed shows and identify warm leads.',
    { contact_id: z.string().describe('Buyer contact ID') },
    async ({ contact_id }) => {
      const history = await getPitchHistory(contact_id);
      return { content: [{ type: 'text', text: JSON.stringify(history, null, 2) }] };
    }
  );

  // Tool 9: IP catalog detail
  mcp.tool(
    'get_ip_detail',
    'Returns full detail for an IP in the catalog: the record, pitch history across all buyers, attached talent, and content partner relationships.',
    { ip_id: z.string().describe('IP catalog entry ID') },
    async ({ ip_id }) => {
      const detail = await getIpDetail(ip_id);
      return { content: [{ type: 'text', text: JSON.stringify(detail, null, 2) }] };
    }
  );

  // Tool 10: Development pipeline — all sheet-imported projects grouped by source tab
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

  // Tool 11: Full project timeline — detail view + email history + sizzle assets + story scout links
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

  // Tool 12: Sizzle reel inventory — what assets exist and their status
  mcp.tool(
    'get_sizzle_inventory',
    'Returns complete sizzle reel inventory: all recorded sizzles grouped by status (with video link vs. confirmed exists but no link yet). Shows Vimeo URLs, passwords, and latest email activity for each reel. Use this to track sizzle production progress and identify what needs video upload next.',
    {},
    async () => {
      const text = await getSizzleInventory();
      return { content: [{ type: 'text', text }] };
    }
  );

  // Tool 13: Vitrina VIQI — external market intelligence
  // Use for: who's buying unscripted, deal trends, exec contacts at buyers,
  // acquisition counts, what's selling in a genre/market.
  // Complements search_articles (internal MYE knowledge) with Vitrina's
  // 3M+ exec profiles, licensing history, and real-time market data.
  mcp.tool(
    'query_vitrina',
    'Query Vitrina\'s entertainment industry database via VIQI AI. Use for external market intelligence: which buyers are acquiring unscripted content, acquisition counts by network, specific exec profiles (who commissions at Netflix/Peacock/Tubi/etc.), deal history, licensing trends, and what\'s selling in a genre. Complement this with search_articles for MYE\'s internal knowledge.',
    { query: z.string().describe('Natural language question about buyers, deals, execs, or market trends') },
    async ({ query }) => {
      try {
        const result = await queryViqi(query);
        return { content: [{ type: 'text', text: result }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: 'text', text: `[vitrina error] ${msg}` }] };
      }
    }
  );

  return mcp;
}

// ── HTTP server ───────────────────────────────────────────────────────────────

export async function startMcpServer(): Promise<void> {
  if (_server) {
    console.log(`[mcp] Already running on port ${MCP_PORT}`);
    return;
  }

  _mcpServer = buildMcpServer();

  // StreamableHTTP transport handles both SSE and JSON-RPC over a single endpoint
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  await _mcpServer.connect(transport);

  _server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Health check endpoint — lets Claude Desktop verify the server is alive
    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', server: 'show-pitch-machine', port: MCP_PORT }));
      return;
    }

    // All MCP traffic goes to /mcp
    if (req.url === '/mcp') {
      await transport.handleRequest(req, res);
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  await new Promise<void>((resolve, reject) => {
    _server!.listen(MCP_PORT, () => {
      console.log(`[mcp] Show Pitch Machine MCP server listening on http://localhost:${MCP_PORT}/mcp`);
      resolve();
    });
    _server!.on('error', reject);
  });
}

export function stopMcpServer(): void {
  if (_server) {
    _server.close();
    _server = null;
    _mcpServer = null;
    console.log('[mcp] Server stopped');
  }
}
