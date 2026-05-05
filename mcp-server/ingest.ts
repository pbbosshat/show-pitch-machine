// ingest.ts — HTTP handlers for Bang (scraper machine) to POST daily data.
//
// Bang runs overnight scrapers and pushes results here via authenticated POST requests.
// All routes use INGEST_API_KEY (separate from the MCP key so you can rotate independently).
//
// Each handler uses PostgreSQL's ON CONFLICT DO UPDATE (upsert) to make
// re-pushes idempotent — Bang can re-send the same data safely.
//
// Response shape: { inserted: N, updated: M } where N+M = total rows processed.

import type { IncomingMessage, ServerResponse } from 'node:http';
import { checkIngestAuth, readJsonBody } from './auth';
import { pool } from './db';
import { v4 as uuidv4 } from 'uuid';

// ── Type stubs for ingest payloads ────────────────────────────────────────────
// These mirror the SQLite schema columns that Bang knows about.
// Only the fields Bang actually sends need to be here — extra fields are ignored.

interface TradeArticle {
  id?: string;
  source?: string;
  url: string;           // unique dedup key
  headline?: string;
  body?: string;
  item_type?: string;
  scraped_at?: number;
}

interface MarketOrder {
  id?: string;
  show_title?: string;
  network?: string;
  format?: string;
  genre?: string;
  episode_count?: number;
  order_type?: string;
  order_date?: number;
  source?: string;
  source_url?: string;
}

interface Show {
  id?: string;
  title: string;
  title_normalized: string;
  network?: string;
  production_company?: string;
  showrunner?: string;
  host?: string;
  format?: string;
  genre?: string;
  status?: string;
  greenlit_date?: number;
  source?: string;
  source_url?: string;
  data_source?: string;
}

interface BuyerContact {
  id?: string;
  company_id?: string;
  name: string;
  email?: string;
  title?: string;
  mandate_statement?: string;
  activity_status?: string;
  last_greenlit_date?: number;
}

interface BuyerCompany {
  id?: string;
  name: string;
  type?: string;
  tier?: string;
}

interface Package {
  id?: string;
  name: string;
  ip_id?: string;
  target_company_id?: string;
  target_contact_id?: string;
  pipeline_stage?: string;
  status?: string;
}

interface Pitch {
  id?: string;
  ip_id?: string;
  buyer_company_id?: string;
  buyer_contact_id?: string;
  pitch_date?: number;
  outcome?: string;
  pass_reason?: string;
  pass_reason_cat?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Send a JSON response with the given status code.
 */
function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

/** Current Unix time in seconds (Postgres INTEGER max is ~2.1B; nowSec() is ms). */
const nowSec = (): number => Math.floor(nowSec() / 1000);

/**
 * Normalize a timestamp that may be in milliseconds to seconds.
 * SQLite stores some dates as Unix-ms (>= 1e12); Postgres INTEGER columns need seconds.
 */
function normTs(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === 'string' ? parseInt(v, 10) : v;
  if (!Number.isFinite(n)) return null;
  return n >= 1_000_000_000_000 ? Math.floor(n / 1000) : n;
}

// ── Route handlers ────────────────────────────────────────────────────────────

/**
 * POST /ingest/articles
 * Body: { articles: TradeArticle[] }
 *
 * Upsert trade articles by URL (unique constraint on url column).
 * ON CONFLICT DO UPDATE overwrites all fields except id (preserve original).
 *
 * Called by: Bang scraper, nightly
 * Auth: INGEST_API_KEY
 */
export async function handleIngestArticles(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  if (!checkIngestAuth(req, res)) return;

  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  const { articles } = body as { articles: TradeArticle[] };
  if (!Array.isArray(articles)) {
    sendJson(res, 400, { error: 'Expected { articles: TradeArticle[] }' });
    return;
  }

  let inserted = 0;
  let updated = 0;

  // Process in a single transaction for atomicity
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const article of articles) {
      if (!article.url) continue; // url is the dedup key — skip malformed rows

      const id = article.id || uuidv4();

      const result = await client.query(
        `INSERT INTO trade_articles (id, source, url, headline, body, item_type, scraped_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (url) DO UPDATE SET
           source     = EXCLUDED.source,
           headline   = EXCLUDED.headline,
           body       = EXCLUDED.body,
           item_type  = EXCLUDED.item_type,
           scraped_at = EXCLUDED.scraped_at
         RETURNING (xmax = 0) AS was_inserted`,
        [id, article.source, article.url, article.headline, article.body, article.item_type, normTs(article.scraped_at)]
      );

      // xmax = 0 means it was a fresh INSERT; xmax != 0 means it was an UPDATE
      if (result.rows[0]?.was_inserted) {
        inserted++;
      } else {
        updated++;
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ingest/articles] Error:', err);
    sendJson(res, 500, { error: 'Database error during ingest' });
    return;
  } finally {
    client.release();
  }

  sendJson(res, 200, { inserted, updated, total: articles.length });
}

/**
 * POST /ingest/orders
 * Body: { orders: MarketOrder[] }
 *
 * Upsert market orders. No natural unique key — use show_title + network + order_date
 * as a composite dedup key. New id is generated if none provided.
 *
 * Called by: Bang scraper, nightly
 * Auth: INGEST_API_KEY
 */
export async function handleIngestOrders(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  if (!checkIngestAuth(req, res)) return;

  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  const { orders } = body as { orders: MarketOrder[] };
  if (!Array.isArray(orders)) {
    sendJson(res, 400, { error: 'Expected { orders: MarketOrder[] }' });
    return;
  }

  let inserted = 0;
  let updated = 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const order of orders) {
      const id = order.id || uuidv4();

      // Use source_url as dedup key when available; otherwise generate a new id each time
      // (market_orders has no natural unique constraint beyond id)
      if (order.source_url) {
        const existing = await client.query(
          'SELECT id FROM market_orders WHERE source_url = $1 LIMIT 1',
          [order.source_url]
        );

        if (existing.rows.length > 0) {
          await client.query(
            `UPDATE market_orders
             SET show_title = $1, network = $2, format = $3, genre = $4,
                 episode_count = $5, order_type = $6, order_date = $7,
                 source = $8
             WHERE source_url = $9`,
            [order.show_title, order.network, order.format, order.genre,
             order.episode_count, order.order_type, normTs(order.order_date),
             order.source, order.source_url]
          );
          updated++;
          continue;
        }
      }

      await client.query(
        `INSERT INTO market_orders
           (id, show_title, network, format, genre, episode_count, order_type,
            order_date, source, source_url, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [id, order.show_title, order.network, order.format, order.genre,
         order.episode_count, order.order_type, normTs(order.order_date),
         order.source, order.source_url, nowSec()]
      );
      inserted++;
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ingest/orders] Error:', err);
    sendJson(res, 500, { error: 'Database error during ingest' });
    return;
  } finally {
    client.release();
  }

  sendJson(res, 200, { inserted, updated, total: orders.length });
}

/**
 * POST /ingest/shows
 * Body: { shows: Show[] }
 *
 * Upsert shows on (title_normalized, network) — the unique dedup index.
 *
 * Called by: Bang TVMaze/trade-press scraper, nightly
 * Auth: INGEST_API_KEY
 */
export async function handleIngestShows(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  if (!checkIngestAuth(req, res)) return;

  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  const { shows } = body as { shows: Show[] };
  if (!Array.isArray(shows)) {
    sendJson(res, 400, { error: 'Expected { shows: Show[] }' });
    return;
  }

  let inserted = 0;
  let updated = 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const show of shows) {
      if (!show.title || !show.title_normalized) continue;

      const id = show.id || uuidv4();

      const result = await client.query(
        `INSERT INTO shows
           (id, title, title_normalized, network, production_company, showrunner,
            host, format, genre, status, greenlit_date, source, source_url,
            data_source, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15)
         ON CONFLICT (title_normalized, network) DO UPDATE SET
           title             = EXCLUDED.title,
           production_company = EXCLUDED.production_company,
           showrunner        = EXCLUDED.showrunner,
           host              = EXCLUDED.host,
           format            = EXCLUDED.format,
           genre             = EXCLUDED.genre,
           status            = EXCLUDED.status,
           greenlit_date     = EXCLUDED.greenlit_date,
           source            = EXCLUDED.source,
           source_url        = EXCLUDED.source_url,
           updated_at        = EXCLUDED.updated_at
         RETURNING (xmax = 0) AS was_inserted`,
        [id, show.title, show.title_normalized, show.network ?? null,
         show.production_company ?? null, show.showrunner ?? null,
         show.host ?? null, show.format ?? null, show.genre ?? null,
         show.status ?? null, normTs(show.greenlit_date),
         show.source ?? null, show.source_url ?? null,
         show.data_source ?? 'trade', nowSec()]
      );

      if (result.rows[0]?.was_inserted) {
        inserted++;
      } else {
        updated++;
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ingest/shows] Error:', err);
    sendJson(res, 500, { error: 'Database error during ingest' });
    return;
  } finally {
    client.release();
  }

  sendJson(res, 200, { inserted, updated, total: shows.length });
}

/**
 * POST /ingest/buyers
 * Body: { contacts: BuyerContact[], companies: BuyerCompany[] }
 *
 * Upsert buyer companies by name, then buyer contacts by email.
 * Companies are processed first because contacts FK to companies.
 *
 * Called by: Bang contact scraper, nightly
 * Auth: INGEST_API_KEY
 */
export async function handleIngestBuyers(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  if (!checkIngestAuth(req, res)) return;

  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  const { contacts = [], companies = [] } = body as {
    contacts: BuyerContact[];
    companies: BuyerCompany[];
  };

  let inserted = 0;
  let updated = 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Upsert companies first (contacts FK to companies)
    for (const company of companies) {
      if (!company.name) continue;
      const id = company.id || uuidv4();

      const result = await client.query(
        `INSERT INTO buyer_companies (id, name, type, tier, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $5)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           type = COALESCE(EXCLUDED.type, buyer_companies.type),
           tier = COALESCE(EXCLUDED.tier, buyer_companies.tier),
           updated_at = EXCLUDED.updated_at
         RETURNING (xmax = 0) AS was_inserted`,
        [id, company.name, company.type ?? null, company.tier ?? null, nowSec()]
      );

      if (result.rows[0]?.was_inserted) inserted++;
      else updated++;
    }

    // Upsert contacts by email (most reliable dedup key for buyer contacts)
    for (const contact of contacts) {
      if (!contact.name) continue;
      const id = contact.id || uuidv4();

      if (contact.email) {
        // Dedup by email — update all fields that Bang knows about
        const existing = await client.query(
          'SELECT id FROM buyer_contacts WHERE email = $1 LIMIT 1',
          [contact.email]
        );

        if (existing.rows.length > 0) {
          await client.query(
            `UPDATE buyer_contacts
             SET name = $1, title = COALESCE($2, title),
                 company_id = COALESCE($3, company_id),
                 mandate_statement = COALESCE($4, mandate_statement),
                 activity_status = COALESCE($5, activity_status),
                 last_greenlit_date = COALESCE($6, last_greenlit_date),
                 updated_at = $7
             WHERE email = $8`,
            [contact.name, contact.title ?? null, contact.company_id ?? null,
             contact.mandate_statement ?? null, contact.activity_status ?? null,
             normTs(contact.last_greenlit_date), nowSec(), contact.email]
          );
          updated++;
          continue;
        }
      }

      // New contact — insert
      await client.query(
        `INSERT INTO buyer_contacts
           (id, name, email, title, company_id, mandate_statement,
            activity_status, last_greenlit_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
         ON CONFLICT (id) DO NOTHING`,
        [id, contact.name, contact.email ?? null, contact.title ?? null,
         contact.company_id ?? null, contact.mandate_statement ?? null,
         contact.activity_status ?? 'unknown', normTs(contact.last_greenlit_date),
         nowSec()]
      );
      inserted++;
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ingest/buyers] Error:', err);
    sendJson(res, 500, { error: 'Database error during ingest' });
    return;
  } finally {
    client.release();
  }

  sendJson(res, 200, {
    inserted,
    updated,
    total: contacts.length + companies.length,
  });
}

/**
 * POST /ingest/pipeline
 * Body: { packages: Package[], pitches: Pitch[] }
 *
 * Upsert packages and pitches by id (Bang generates stable ids).
 *
 * Called by: Bang pipeline sync, nightly
 * Auth: INGEST_API_KEY
 */
export async function handleIngestPipeline(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  if (!checkIngestAuth(req, res)) return;

  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body' });
    return;
  }

  const { packages = [], pitches = [] } = body as {
    packages: Package[];
    pitches: Pitch[];
  };

  let inserted = 0;
  let updated = 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const pkg of packages) {
      if (!pkg.name) continue;
      const id = pkg.id || uuidv4();

      const result = await client.query(
        `INSERT INTO packages
           (id, name, ip_id, target_company_id, target_contact_id,
            pipeline_stage, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
         ON CONFLICT (id) DO UPDATE SET
           name              = EXCLUDED.name,
           pipeline_stage    = COALESCE(EXCLUDED.pipeline_stage, packages.pipeline_stage),
           status            = COALESCE(EXCLUDED.status, packages.status),
           updated_at        = EXCLUDED.updated_at
         RETURNING (xmax = 0) AS was_inserted`,
        [id, pkg.name, pkg.ip_id ?? null, pkg.target_company_id ?? null,
         pkg.target_contact_id ?? null, pkg.pipeline_stage ?? 'proposal',
         pkg.status ?? 'draft', nowSec()]
      );

      if (result.rows[0]?.was_inserted) inserted++;
      else updated++;
    }

    for (const pitch of pitches) {
      const id = pitch.id || uuidv4();

      const result = await client.query(
        `INSERT INTO pitches
           (id, ip_id, buyer_company_id, buyer_contact_id, pitch_date,
            outcome, pass_reason, pass_reason_cat, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           outcome        = COALESCE(EXCLUDED.outcome, pitches.outcome),
           pass_reason    = COALESCE(EXCLUDED.pass_reason, pitches.pass_reason),
           pass_reason_cat = COALESCE(EXCLUDED.pass_reason_cat, pitches.pass_reason_cat)
         RETURNING (xmax = 0) AS was_inserted`,
        [id, pitch.ip_id ?? null, pitch.buyer_company_id ?? null,
         pitch.buyer_contact_id ?? null, normTs(pitch.pitch_date),
         pitch.outcome ?? null, pitch.pass_reason ?? null,
         pitch.pass_reason_cat ?? null, nowSec()]
      );

      if (result.rows[0]?.was_inserted) inserted++;
      else updated++;
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ingest/pipeline] Error:', err);
    sendJson(res, 500, { error: 'Database error during ingest' });
    return;
  } finally {
    client.release();
  }

  sendJson(res, 200, {
    inserted,
    updated,
    total: packages.length + pitches.length,
  });
}
