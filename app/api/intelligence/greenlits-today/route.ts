/**
 * GET /api/intelligence/greenlits-today
 * Called by: dashboard intelligence panel, daily briefing widget
 * Auth: none
 * Response: { data: Show[], window: 'today' | '7days' }
 *
 * Returns shows greenlitted in the last 24 hours (from today's scrapes).
 * If nothing was scraped today, falls back to the last 7 days so the panel
 * is never empty — and signals which window was used via the `window` field.
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Show } from '@/types';

export async function GET() {
  try {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Try the 24-hour window first — this reflects actual today's scrapes
    const todayRows = query<Show>(
      `SELECT * FROM shows WHERE greenlit_date >= ? ORDER BY greenlit_date DESC`,
      [oneDayAgo]
    );

    if (todayRows.length > 0) {
      return NextResponse.json({ data: todayRows, window: 'today' });
    }

    // Fallback: last 7 days so the panel shows something meaningful
    const weekRows = query<Show>(
      `SELECT * FROM shows WHERE greenlit_date >= ? ORDER BY greenlit_date DESC`,
      [sevenDaysAgo]
    );

    return NextResponse.json({ data: weekRows, window: '7days' });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
