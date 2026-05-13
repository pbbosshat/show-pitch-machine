// sync-to-railway.ts — Push Bang's local SQLite data to Railway.
//
// Sends data to TWO Railway services:
//   1. MCP server  (mcp-server-production-f138.up.railway.app) — Sean's Claude Code reads here
//   2. Next.js app (app-production-1ac7.up.railway.app)        — Intelligence page reads here
//
// Usage: npx tsx --env-file=.env scripts/sync-to-railway.ts
//
// Required env vars (set in .env or bat file):
//   RAILWAY_MCP_URL    — base URL of the Railway MCP server
//   RAILWAY_INGEST_KEY — INGEST_API_KEY for the MCP server
//   RAILWAY_APP_URL    — base URL of the Railway Next.js app
//   RAILWAY_APP_KEY    — INGEST_API_KEY for the Next.js app
//   DATABASE_PATH      — path to local SQLite DB (defaults to ./data/db.sqlite)

import { DatabaseSync } from 'node:sqlite';
import * as path from 'path';

const MCP_URL = process.env.RAILWAY_MCP_URL || 'https://mcp-server-production-f138.up.railway.app';
const MCP_KEY = process.env.RAILWAY_INGEST_KEY || '';
const APP_URL = process.env.RAILWAY_APP_URL || 'https://app-production-1ac7.up.railway.app';
const APP_KEY = process.env.RAILWAY_APP_KEY || process.env.RAILWAY_INGEST_KEY || '';
const DB_PATH = process.env.DATABASE_PATH || process.env.DB_PATH || path.join(process.cwd(), 'data', 'db.sqlite');
const CHUNK = 500;
// Shows have more columns than articles — smaller chunks prevent Railway Postgres
// timeout and constraint errors that were killing the entire sync on 500-row payloads.
const SHOWS_CHUNK = 200;

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
  const host = baseUrl.replace('https://', '').split('.')[0];
  console.log(`[sync] ${host} ${endpoint}: inserted=${result.inserted} updated=${result.updated} total=${result.total}`);
}

// postSafe wraps post() — logs the error and returns false instead of throwing,
// so a single bad chunk doesn't abort the rest of the sync.
async function postSafe(baseUrl: string, apiKey: string, endpoint: string, body: unknown, chunkIdx: number): Promise<boolean> {
  try {
    await post(baseUrl, apiKey, endpoint, body);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[sync] chunk ${chunkIdx} failed — ${msg}`);
    return false;
  }
}

// postWithFallback: tries primarySize-row chunks; if a chunk fails it retries in
// fallbackSize-row sub-chunks so a single bad row only drops fallbackSize rows
// instead of the whole primary chunk.  Returns count of failed sub-chunks.
async function postWithFallback(
  baseUrl: string, apiKey: string, endpoint: string,
  entityKey: string, items: Record<string, unknown>[],
  primarySize: number, fallbackSize: number,
): Promise<number> {
  let failed = 0;
  let i = 0;
  for (const chunk of chunks(items, primarySize)) {
    try {
      await post(baseUrl, apiKey, endpoint, { [entityKey]: chunk });
    } catch {
      // Primary chunk failed — retry in smaller sub-chunks to isolate bad rows
      let sub = 0;
      for (const subChunk of chunks(chunk, fallbackSize)) {
        if (!await postSafe(baseUrl, apiKey, endpoint, { [entityKey]: subChunk }, i * 1000 + sub)) failed++;
        sub++;
      }
    }
    i++;
  }
  return failed;
}

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  if (!MCP_KEY) { console.error('[sync] RAILWAY_INGEST_KEY env var is required'); process.exit(1); }
  if (!APP_KEY) { console.error('[sync] RAILWAY_APP_KEY env var is required'); process.exit(1); }

  console.log(`[sync] Opening DB: ${DB_PATH}`);
  const db = new DatabaseSync(DB_PATH);

  let totalFailed = 0;

  // ── 1. Trade articles → MCP server + Next.js app ─────────────────────────
  const articles = db.prepare(`
    SELECT id, source, url, headline, body, item_type,
           format_type, relevance_tier, tier_reason, signal_type,
           scraped_at, brief, production_company, buyer_name, buyer_company
    FROM trade_articles
    ORDER BY scraped_at DESC
    LIMIT 10000
  `).all() as Record<string, unknown>[];
  console.log(`[sync] articles: ${articles.length} rows`);

  let i = 0;
  for (const chunk of chunks(articles, CHUNK)) {
    const basicChunk = chunk.map((a) => ({
      id: a.id, source: a.source, url: a.url, headline: a.headline,
      body: a.body, item_type: a.item_type, scraped_at: a.scraped_at,
    }));
    if (!await postSafe(MCP_URL, MCP_KEY, '/ingest/articles', { articles: basicChunk }, i)) totalFailed++;
    if (!await postSafe(APP_URL, APP_KEY, '/api/ingest/articles', { articles: chunk }, i)) totalFailed++;
    i++;
  }

  // ── 2. Market orders → MCP server only ───────────────────────────────────
  const orders = db.prepare(`
    SELECT id, show_title, network, format, genre, episode_count,
           order_type, order_date, source, source_url
    FROM market_orders
    ORDER BY order_date DESC
    LIMIT 5000
  `).all() as Record<string, unknown>[];
  console.log(`[sync] orders: ${orders.length} rows`);
  i = 0;
  for (const chunk of chunks(orders, CHUNK)) {
    if (!await postSafe(MCP_URL, MCP_KEY, '/ingest/orders', { orders: chunk }, i++)) totalFailed++;
  }

  // ── 3. Shows → MCP server only ────────────────────────────────────────────
  // Shows use postWithFallback: primary chunk=200, fallback=20.
  // If a 200-row chunk fails (Railway Postgres constraint/timeout), it retries
  // in 20-row sub-chunks so only the specific bad rows get dropped, not 200 at once.
  const shows = db.prepare(`
    SELECT id, title, title_normalized, network, production_company, showrunner,
           host, format, genre, status, greenlit_date, source, source_url, data_source
    FROM shows
    ORDER BY updated_at DESC
    LIMIT 20000
  `).all() as Record<string, unknown>[];
  console.log(`[sync] shows: ${shows.length} rows (primary chunk: ${SHOWS_CHUNK}, fallback: 20)`);
  totalFailed += await postWithFallback(MCP_URL, MCP_KEY, '/ingest/shows', 'shows', shows, SHOWS_CHUNK, 20);

  // ── 4. Buyers → MCP server only ───────────────────────────────────────────
  const companies = db.prepare(`SELECT id, name, type, tier FROM buyer_companies ORDER BY name`).all() as Record<string, unknown>[];
  const contacts = db.prepare(`
    SELECT id, company_id, name, email, title, mandate_statement,
           activity_status, last_greenlit_date
    FROM buyer_contacts ORDER BY name
  `).all() as Record<string, unknown>[];
  console.log(`[sync] buyer companies: ${companies.length}, contacts: ${contacts.length}`);
  i = 0;
  for (const chunk of chunks(companies, CHUNK)) {
    if (!await postSafe(MCP_URL, MCP_KEY, '/ingest/buyers', { companies: chunk, contacts: [] }, i++)) totalFailed++;
  }
  i = 0;
  for (const chunk of chunks(contacts, CHUNK)) {
    if (!await postSafe(MCP_URL, MCP_KEY, '/ingest/buyers', { contacts: chunk, companies: [] }, i++)) totalFailed++;
  }

  // ── 4b. Vimeo library + show_videos → Next.js app only ───────────────────
  // The Vimeo Library page (/vimeo-library) reads vimeo_library + show_videos
  // directly. Scraped locally via scripts/scrape-vimeo-library.js, then pushed
  // here so the live page mirrors the local catalog.
  let videos: Record<string, unknown>[] = [];
  try {
    videos = db.prepare(`
      SELECT id, clip_id, hash, url, title, duration_sec, privacy,
             has_password, last_modified,
             drive_file_id, drive_url, backfill_status, backfilled_at, size_bytes
      FROM vimeo_library
    `).all() as Record<string, unknown>[];
  } catch { /* table may not exist on older Bang installs */ }

  let showVideos: Record<string, unknown>[] = [];
  try {
    // Send clip_id (not the local UUID for vimeo_library) so the receiver
    // can re-resolve the join in case ids drift between DBs.
    showVideos = db.prepare(`
      SELECT sv.id, sv.ip_catalog_id, vl.clip_id, sv.video_type, sv.sort_order, sv.notes
      FROM show_videos sv
      JOIN vimeo_library vl ON vl.id = sv.vimeo_library_id
    `).all() as Record<string, unknown>[];
  } catch { /* table may not exist */ }

  console.log(`[sync] vimeo videos: ${videos.length}, show_video links: ${showVideos.length}`);

  i = 0;
  for (const chunk of chunks(videos, CHUNK)) {
    if (!await postSafe(APP_URL, APP_KEY, '/api/ingest/vimeo', { videos: chunk }, i++)) totalFailed++;
  }
  i = 0;
  for (const chunk of chunks(showVideos, CHUNK)) {
    if (!await postSafe(APP_URL, APP_KEY, '/api/ingest/vimeo', { show_videos: chunk }, i++)) totalFailed++;
  }

  // ── 5. Pipeline → MCP server only ────────────────────────────────────────
  let packages: Record<string, unknown>[] = [];
  try {
    packages = db.prepare(`SELECT id, name, ip_id, target_company_id, target_contact_id, pipeline_stage, status FROM packages ORDER BY updated_at DESC`).all() as Record<string, unknown>[];
  } catch { /* table may not exist on Bang */ }

  let pitches: Record<string, unknown>[] = [];
  try {
    pitches = db.prepare(`SELECT id, ip_id, buyer_company_id, buyer_contact_id, pitch_date, outcome, pass_reason, pass_reason_cat FROM pitches ORDER BY pitch_date DESC LIMIT 5000`).all() as Record<string, unknown>[];
  } catch { /* table may not exist on Bang */ }

  console.log(`[sync] packages: ${packages.length}, pitches: ${pitches.length}`);
  i = 0;
  for (const chunk of chunks(packages, CHUNK)) {
    if (!await postSafe(MCP_URL, MCP_KEY, '/ingest/pipeline', { packages: chunk, pitches: [] }, i++)) totalFailed++;
  }
  i = 0;
  for (const chunk of chunks(pitches, CHUNK)) {
    if (!await postSafe(MCP_URL, MCP_KEY, '/ingest/pipeline', { packages: [], pitches: chunk }, i++)) totalFailed++;
  }

  db.close();
  if (totalFailed > 0) {
    console.log(`[sync] Railway sync complete with ${totalFailed} failed chunk(s) — see errors above`);
  } else {
    console.log('[sync] Railway sync complete');
  }
}

main().catch((err) => { console.error('[sync] Fatal:', err.message); process.exit(1); });
