/**
 * GET /api/intelligence/briefing
 * Called by: Daily Briefing panel on the dashboard
 * Auth: spm_session cookie (route is auth-gated via the (internal) layout)
 * Query params:
 *   days=N           — look back N days (1-14, default 1). Clamped to range.
 *   include_skip=1   — include tier-3 scripted/irrelevant items (default: 0)
 * Response: { data: BriefingItem[], window: { days: number; sinceMs: number },
 *             sources: string[], total: number, skip_count: number }
 *
 * Aggregates actionable trade_articles (greenlits, cancellations, exec moves,
 * mandate statements) over the requested window, sorted relevance-first.
 *
 * Sort order:
 *   1. Tier 1-direct items (MYE's exact lane) — top
 *   2. exec-move and mandate items — always surfaced (not content-classified)
 *   3. Tier 2-adjacent items
 *   4. Tier 3-skip (hidden by default — scripted drama, wrong formats)
 *   Within tier: scraped_at DESC (newest first)
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export interface BriefingItem {
  id: string;
  source: string | null;
  headline: string | null;
  url: string | null;
  item_type: string | null;
  format_type: string | null;
  relevance_tier: string | null;
  signal_type: string | null;
  tier_reason: string | null;
  scraped_at: number | null;
  // Enrichment fields — populated lazily by /api/intelligence/briefing/enrich
  body_snippet: string | null;
  brief: string | null;
  production_company: string | null;
  buyer_name: string | null;
  buyer_company: string | null;
}

// Sort weight: lower = higher in feed
const TIER_ORDER = `
  CASE
    WHEN item_type IN ('exec-move', 'mandate-statement') AND relevance_tier IS NULL THEN 1
    WHEN relevance_tier = '1-direct'   THEN 0
    WHEN relevance_tier = '2-adjacent' THEN 2
    WHEN item_type = 'exec-move'       THEN 1
    WHEN item_type = 'mandate-statement' THEN 1
    ELSE 3
  END
`;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeSkip = searchParams.get('include_skip') === '1';

    // Parse and clamp the user-supplied window. The dropdown controls this
    // explicitly, so there is no auto-fallback — if nothing matches for the
    // chosen window, we return an empty array and let the UI inform the user.
    const rawDays = parseInt(searchParams.get('days') ?? '1', 10);
    const days = Number.isFinite(rawDays) ? Math.min(14, Math.max(1, rawDays)) : 1;

    const now = Date.now();
    const sinceMs = now - days * 24 * 60 * 60 * 1000;

    // Exec moves and mandate statements are always shown regardless of content tier.
    // For content items (greenlit/cancelled/other), hide tier-3 by default.
    //
    // Use `IS DISTINCT FROM` instead of `<>` because Postgres three-valued logic
    // would otherwise silently drop rows where `relevance_tier IS NULL`:
    //   NULL = '3-skip'  → UNKNOWN
    //   greenlit AND UNKNOWN → UNKNOWN
    //   NOT UNKNOWN → UNKNOWN → treated as FALSE in WHERE → row excluded.
    // `IS DISTINCT FROM` returns TRUE when either side is NULL and they differ,
    // which is what we want (an unclassified greenlit is not 3-skip).
    const skipFilter = includeSkip
      ? ''
      : `AND (
           item_type NOT IN ('greenlit', 'cancelled', 'other')
           OR relevance_tier IS DISTINCT FROM '3-skip'
         )`;

    // Include 'other' items only when they passed the relevance filter (1-direct or 2-adjacent).
    // Raw 'other' with no classification or 3-skip are excluded unless include_skip is set.
    const base = `
      SELECT id, source, headline, url, item_type,
             format_type, relevance_tier, signal_type, tier_reason, scraped_at,
             SUBSTR(body, 1, 300) AS body_snippet,
             brief, production_company, buyer_name, buyer_company
      FROM trade_articles
      WHERE (
        item_type IN ('greenlit', 'cancelled', 'exec-move', 'mandate-statement')
        OR (item_type = 'other' AND relevance_tier IN ('1-direct', '2-adjacent'))
      )
        AND headline IS NOT NULL
        AND length(trim(headline)) > 4
        ${skipFilter}
        AND scraped_at >= ?
      ORDER BY ${TIER_ORDER}, scraped_at DESC
      LIMIT 300
    `;

    const rows = await query<BriefingItem>(base, [sinceMs]);

    // Count tier-3 skip items in the same window (for the "Not relevant" toggle badge).
    // Uses sinceMs so the badge count always matches what the data query covers.
    const skipCountRows = await query<{ cnt: number }>(
      `SELECT COUNT(*) AS cnt FROM trade_articles
       WHERE item_type IN ('greenlit', 'cancelled', 'other')
         AND relevance_tier = '3-skip'
         AND scraped_at >= ?`,
      [sinceMs]
    );
    const skip_count = skipCountRows[0]?.cnt ?? 0;

    // Collect unique sources present in the result (for filter pills in UI)
    const sources = [...new Set(rows.map((r) => r.source).filter(Boolean))] as string[];

    return NextResponse.json({
      data: rows,
      window: { days, sinceMs },
      sources,
      total: rows.length,
      skip_count,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
