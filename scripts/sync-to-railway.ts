// sync-to-railway.ts — Push Bang's local SQLite data to Railway.
//
// Sends data to TWO Railway services:
//   1. MCP server  (mcp-server-production-f138.up.railway.app) — Sean's Claude Code reads here
//   2. Next.js app (app-production-1ac7.up.railway.app)        — Intelligence page reads here
//
// Run after each daily scraper cycle. Reads all key tables from the local SQLite
// DB and POSTs them to Railway's ingest endpoints via chunked authenticated requests.
//
// Usage: npx tsx --env-file=.env scripts/sync-to-railway.ts
//
// Required env vars:
//   RAILWAY_MCP_URL    — base URL of the Railway MCP server (Sean's Claude Code)
//   RAILWAY_INGEST_KEY — INGEST_API_KEY for the MCP server
//   RAILWAY_APP_URL    — base URL of the Railway Next.js app (Intelligence page)
//   RAILWAY_APP_KEY    — INGEST_API_KEY for the Next.js app (can be same key)

import Database from 'better-sqlite3';
import * as path from 'path';

const MCP_URL = process.env.RAILWAY_MCP_URL || 'https://mcp-server-production-f138.up.railway.app';
const MCP_KEY = process.env.RAILWAY_INGEST_KEY || '';
const APP_URL = process.env.RAILWAY_APP_URL || 'https://app-production-1ac7.up.railway.app';
const APP_KEY = process.env.RAILWAY_APP_KEY || process.env.RAILWAY_INGEST_KEY || '';
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'show-pitch.db');
const CHUNK = 500; // rows per POST request

if (!MCP_KEY) {
  console.error('[sync] RAILWAY_INGEST_KEY env var is required');
  process.exit(1);
}
if (!APP_KEY) {
  console.error('[sync] RAILWAY_APP_KEY (or RAILWAY_INGEST_KEY) env var is required');
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });

async function post(baseUrl: string, apiKey: string, endpoint: string, body: unknown): Promise<void> {
  const url = `${baseUrl}${endpoint}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`POST ${endpoint} → ${resp.status}: ${text.substring(0, 200)}`);
  }
  const result = await resp.json() as { inserted: number; updated: number; total: number };
  console.log(`[sync] ${baseUrl.replace('https://', '')} ${endpoint}: inserted=${result.inserted} updated=${result.updated} total=${result.total}`);
}

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ── 1. Trade articles → both MCP server and Next.js app ──────────────────────
// Select ALL classification fields so the Intelligence page shows proper tiers/badges.
const articles = db.prepare(`
  SELECT id, source, url, headline, body, item_type,
         format_type, relevance_tier, tier_reason, signal_type,
         scraped_at, brief, production_company, buyer_name, buyer_company
  FROM trade_articles
  ORDER BY scraped_at DESC
  LIMIT 10000
`).all();
console.log(`[sync] articles: ${articles.length} rows`);

for (const chunk of chunks(articles, CHUNK)) {
  // MCP server — basic fields only (matches its ingest schema)
  const basicChunk = chunk.map((a: Record<string, unknown>) => ({
    id: a.id, source: a.source, url: a.url, headline: a.headline,
    body: a.body, item_type: a.item_type, scraped_at: a.scraped_at,
  }));
  await post(MCP_URL, MCP_KEY, '/ingest/articles', { articles: basicChunk });

  // Next.js app — full schema including classification columns
  await post(APP_URL, APP_KEY, '/api/ingest/articles', { articles: chunk });
}

// ── 2. Market orders → MCP server only ───────────────────────────────────────
const orders = db.prepare(`
  SELECT id, show_title, network, format, genre, episode_count,
         order_type, order_date, source, source_url
  FROM market_orders
  ORDER BY order_date DESC
  LIMIT 5000
`).all();
console.log(`[sync] orders: ${orders.length} rows`);
for (const chunk of chunks(orders, CHUNK)) {
  await post(MCP_URL, MCP_KEY, '/ingest/orders', { orders: chunk });
}

// ── 3. Shows → MCP server only ────────────────────────────────────────────────
const shows = db.prepare(`
  SELECT id, title, title_normalized, network, production_company, showrunner,
         host, format, genre, status, greenlit_date, source, source_url, data_source
  FROM shows
  ORDER BY updated_at DESC
  LIMIT 20000
`).all();
console.log(`[sync] shows: ${shows.length} rows`);
for (const chunk of chunks(shows, CHUNK)) {
  await post(MCP_URL, MCP_KEY, '/ingest/shows', { shows: chunk });
}

// ── 4. Buyers → MCP server only ───────────────────────────────────────────────
const companies = db.prepare(`
  SELECT id, name, type, tier FROM buyer_companies ORDER BY name
`).all();
const contacts = db.prepare(`
  SELECT id, company_id, name, email, title, mandate_statement,
         activity_status, last_greenlit_date
  FROM buyer_contacts
  ORDER BY name
`).all();
console.log(`[sync] buyer companies: ${companies.length}, contacts: ${contacts.length}`);
for (const chunk of chunks(companies, CHUNK)) {
  await post(MCP_URL, MCP_KEY, '/ingest/buyers', { companies: chunk, contacts: [] });
}
for (const chunk of chunks(contacts, CHUNK)) {
  await post(MCP_URL, MCP_KEY, '/ingest/buyers', { contacts: chunk, companies: [] });
}

// ── 5. Pipeline: packages + pitches → MCP server only ────────────────────────
const packages = db.prepare(`
  SELECT id, name, ip_id, target_company_id, target_contact_id,
         pipeline_stage, status
  FROM packages
  ORDER BY updated_at DESC
`).all();
const pitches = db.prepare(`
  SELECT id, ip_id, buyer_company_id, buyer_contact_id,
         pitch_date, outcome, pass_reason, pass_reason_cat
  FROM pitches
  ORDER BY pitch_date DESC
  LIMIT 5000
`).all();
console.log(`[sync] packages: ${packages.length}, pitches: ${pitches.length}`);
for (const chunk of chunks(packages, CHUNK)) {
  await post(MCP_URL, MCP_KEY, '/ingest/pipeline', { packages: chunk, pitches: [] });
}
for (const chunk of chunks(pitches, CHUNK)) {
  await post(MCP_URL, MCP_KEY, '/ingest/pipeline', { packages: [], pitches: chunk });
}

db.close();
console.log('[sync] Railway sync complete');
