/**
 * POST /api/intelligence/briefing/enrich
 * Called by: DailyBriefing component after data loads, for rows missing enrichment
 * Auth: none (internal; same auth boundary as the briefing endpoint)
 *
 * Accepts up to 10 article IDs. For each:
 *   - If already enriched (brief IS NOT NULL): returns cached value, no LLM call
 *   - If not enriched: calls Groq to extract brief/production_company/buyer fields,
 *     saves to trade_articles, returns result
 *
 * Body:  { article_ids: string[] }
 * Response: { enriched: Record<string, ArticleEnrichment> }
 */

import { NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';
import { enrichArticle, type ArticleEnrichment } from '@/lib/enrich';

const MAX_BATCH = 10;

interface RawArticle {
  headline: string | null;
  body: string | null;
  item_type: string | null;
  brief: string | null;
  production_company: string | null;
  buyer_name: string | null;
  buyer_company: string | null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { article_ids?: unknown };
    const ids = Array.isArray(body.article_ids)
      ? (body.article_ids as string[]).slice(0, MAX_BATCH)
      : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: 'article_ids array required' }, { status: 400 });
    }

    const enriched: Record<string, ArticleEnrichment> = {};

    for (const id of ids) {
      const row = await queryOne<RawArticle>(
        `SELECT headline, body, item_type, brief, production_company, buyer_name, buyer_company
         FROM trade_articles WHERE id = ?`,
        [id],
      );

      if (!row || !row.headline) continue;

      // Already enriched — return cached value
      if (row.brief !== null) {
        enriched[id] = {
          brief: row.brief,
          production_company: row.production_company,
          buyer_name: row.buyer_name,
          buyer_company: row.buyer_company,
        };
        continue;
      }

      // Call LLM and cache result
      const result = await enrichArticle(row.headline, row.body, row.item_type);

      await run(
        `UPDATE trade_articles
         SET brief = ?, production_company = ?, buyer_name = ?, buyer_company = ?
         WHERE id = ?`,
        [result.brief, result.production_company, result.buyer_name, result.buyer_company, id],
      );

      enriched[id] = result;
    }

    return NextResponse.json({ enriched });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
