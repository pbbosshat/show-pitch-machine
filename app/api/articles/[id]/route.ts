/**
 * GET /api/articles/[id]
 * Called by: article detail modal, ingestion pipeline (re-embed check)
 * Auth: none
 * Response: { data: TradeArticle } — includes full body text
 *
 * Returns the complete trade article record including the raw body field.
 * The body is stored verbatim from the scraper so we can re-parse without re-scraping.
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import type { TradeArticle } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const row = queryOne<TradeArticle>(
      `SELECT * FROM trade_articles WHERE id = ?`,
      [id]
    );

    if (!row) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ data: row });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
