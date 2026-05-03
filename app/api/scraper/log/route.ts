/**
 * GET /api/scraper/log
 * Called by: dashboard scraper log panel, debugging sessions
 * Auth: none
 * Query params: limit (default 50) — cap at 500 to prevent huge payloads
 * Response: { data: ScraperRun[] } ordered by started_at DESC
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { ScraperRun } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Cap limit to avoid sending thousands of rows to the UI accidentally
    const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Math.min(Math.max(1, rawLimit), 500);

    const rows = query<ScraperRun>(
      `SELECT * FROM scraper_runs ORDER BY started_at DESC LIMIT ?`,
      [limit]
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
