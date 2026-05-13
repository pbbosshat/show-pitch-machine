/**
 * GET /api/scraper/status
 * Called by: dashboard scraper panel, cron health checks
 * Auth: none
 * Response: Array of scraper source status rows joined with their most recent run.
 *   Each row: ScraperSourceStatus fields + { last_run_status, last_run_items, ran_today }
 *
 * Sorted by display_name ASC so the dashboard table is alphabetically stable.
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface StatusRow {
  source: string;
  display_name: string | null;
  enabled: number;
  last_run_at: number | null;
  last_success_at: number | null;
  last_items: number;
  consecutive_failures: number;
  // from latest scraper_run row
  last_run_status: string | null;
  last_run_items: number | null;
  last_run_error: string | null;
  ran_today: boolean;
}

export async function GET() {
  try {
    // Left-join on a subquery that selects only the latest run per source —
    // avoids a GROUP BY on the full table which can be slow with many run rows.
    const rows = await query<StatusRow>(`
      SELECT
        sss.source,
        sss.display_name,
        sss.enabled,
        sss.last_run_at,
        sss.last_success_at,
        sss.last_items,
        sss.consecutive_failures,
        lr.status        AS last_run_status,
        lr.items_found   AS last_run_items,
        lr.error_msg     AS last_run_error,
        lr.started_at    AS latest_run_started_at
      FROM scraper_source_status sss
      LEFT JOIN (
        SELECT source, status, items_found, error_msg, started_at
        FROM scraper_runs sr1
        WHERE sr1.started_at = (
          SELECT MAX(sr2.started_at)
          FROM scraper_runs sr2
          WHERE sr2.source = sr1.source
        )
      ) lr ON lr.source = sss.source
      ORDER BY sss.display_name ASC
    `);

    // Add ran_today boolean in JS — avoids SQLite date math timezone edge cases
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    const data = rows.map((r) => ({
      ...r,
      ran_today: r.last_run_at != null && r.last_run_at >= todayMs,
    }));

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
