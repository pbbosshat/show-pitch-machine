/**
 * POST /api/ingest/articles
 * Called by: Bang (10.0.0.208) daily scrape pipeline via sync-to-railway.ts
 * Auth: INGEST_API_KEY in Authorization: Bearer header
 * Body: { articles: TradeArticle[] }
 *
 * Upserts classified trade articles into Postgres.
 * Bang runs the full scrape + reclassify pipeline locally and pushes
 * the enriched results here so the Intelligence page stays current.
 *
 * All fields from Bang's trade_articles are accepted, including the
 * classification columns (relevance_tier, signal_type, etc.) set by
 * Bang's reclassify.ts step. Existing rows are updated on URL conflict
 * so re-pushes are safe (idempotent).
 *
 * Counter accuracy: uses RETURNING (xmax = 0) AS inserted so we can
 * distinguish a true INSERT from an ON CONFLICT UPDATE without relying
 * on whether Bang sent an id field (Bang always sends ids, so the old
 * `if (!a.id)` heuristic always reported 0 new — that was the bug).
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

interface TradeArticle {
  id?: string;
  source?: string | null;
  url: string;
  headline?: string | null;
  body?: string | null;
  item_type?: string | null;
  format_type?: string | null;
  relevance_tier?: string | null;
  tier_reason?: string | null;
  signal_type?: string | null;
  scraped_at?: number | null;
  brief?: string | null;
  production_company?: string | null;
  buyer_name?: string | null;
  buyer_company?: string | null;
}

function checkAuth(request: NextRequest): boolean {
  const apiKey = process.env.INGEST_API_KEY;
  if (!apiKey) return false;
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return token === apiKey;
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { articles?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!Array.isArray(body.articles)) {
    return NextResponse.json({ error: 'articles must be an array' }, { status: 400 });
  }

  const articles = body.articles as TradeArticle[];
  let inserted = 0;
  let updated = 0;

  for (const a of articles) {
    if (!a.url) continue;

    // Use RETURNING (xmax = 0) AS inserted to distinguish a real INSERT from an
    // ON CONFLICT UPDATE. In Postgres, xmax = 0 means no prior version exists,
    // i.e. this was a fresh row. ON CONFLICT UPDATE sets xmax to the old row's
    // transaction id (non-zero), so the boolean reliably separates insert vs update.
    // This fixes the bug where Bang always sends a.id, causing the old
    // `if (!a.id) inserted++` heuristic to always report 0 new articles.
    const row = await queryOne<{ inserted: boolean }>(
      `INSERT INTO trade_articles
         (id, source, url, headline, body, item_type, format_type,
          relevance_tier, tier_reason, signal_type, scraped_at,
          brief, production_company, buyer_name, buyer_company, embedded)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
       ON CONFLICT(url) DO UPDATE SET
         headline         = excluded.headline,
         body             = excluded.body,
         item_type        = excluded.item_type,
         format_type      = excluded.format_type,
         relevance_tier   = excluded.relevance_tier,
         tier_reason      = excluded.tier_reason,
         signal_type      = excluded.signal_type,
         scraped_at       = excluded.scraped_at,
         brief            = COALESCE(excluded.brief, trade_articles.brief),
         production_company = COALESCE(excluded.production_company, trade_articles.production_company),
         buyer_name       = COALESCE(excluded.buyer_name, trade_articles.buyer_name),
         buyer_company    = COALESCE(excluded.buyer_company, trade_articles.buyer_company)
       RETURNING (xmax = 0) AS inserted`,
      [
        a.id ?? uuidv4(),
        a.source ?? null,
        a.url,
        a.headline ?? null,
        a.body ?? null,
        a.item_type ?? null,
        a.format_type ?? null,
        a.relevance_tier ?? null,
        a.tier_reason ?? null,
        a.signal_type ?? null,
        a.scraped_at ?? null,
        a.brief ?? null,
        a.production_company ?? null,
        a.buyer_name ?? null,
        a.buyer_company ?? null,
      ]
    );

    // Postgres returns xmax = 0 as boolean true for a fresh INSERT
    if (row?.inserted) {
      inserted++;
    } else {
      updated++;
    }
  }

  return NextResponse.json({ inserted, updated, total: articles.length });
}
