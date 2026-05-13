/**
 * GET /api/shows/similar
 * Called by: package editor — comp show suggestions panel
 * Auth: none
 * Query params:
 *   ip_id — required — the IP catalog ID to find comps for
 * Response: { data: Show[] } — top 10 comp shows by genre/format match
 *
 * Uses Postgres tsvector full-text search via shows.search_vector GIN index,
 * building the query from the IP's genre and format fields.
 * Falls back to genre-only match if no format is set on the IP.
 * If the IP has neither, returns the 10 most recent shows.
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';
import type { Show, IpCatalog } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ipId = searchParams.get('ip_id');

    if (!ipId) {
      return NextResponse.json({ error: 'ip_id query param is required' }, { status: 400 });
    }

    const ip = await queryOne<IpCatalog>(`SELECT * FROM ip_catalog WHERE id = ?`, [ipId]);

    if (!ip) {
      return NextResponse.json({ error: 'IP not found' }, { status: 404 });
    }

    // Build a plain-English search query from the IP's genre + format fields.
    // plainto_tsquery handles OR-style matching for multiple terms naturally.
    const queryTerms = [ip.genre, ip.format]
      .filter(Boolean)
      .map((t) => t!.trim())
      .join(' ');

    if (!queryTerms) {
      // If the IP has no genre or format, return recent shows as a fallback
      const fallback = await query<Show>(
        `SELECT * FROM shows ORDER BY greenlit_date DESC NULLS LAST LIMIT 10`
      );
      return NextResponse.json({ data: fallback });
    }

    // search_vector is a GIN-indexed tsvector column on shows — no join needed
    const rows = await query<Show>(
      `SELECT *
       FROM shows
       WHERE search_vector @@ plainto_tsquery('english', ?)
       ORDER BY greenlit_date DESC NULLS LAST
       LIMIT 10`,
      [queryTerms]
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
