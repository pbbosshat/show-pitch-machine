/**
 * GET /api/shows/similar
 * Called by: package editor — comp show suggestions panel
 * Auth: none
 * Query params:
 *   ip_id — required — the IP catalog ID to find comps for
 * Response: { data: Show[] } — top 10 comp shows by genre/format match
 *
 * Uses FTS5 to search the shows_fts virtual table using the IP's genre and format
 * as the query terms. Returns up to 10 most-relevant matches.
 * Falls back to genre-only match if no format is set on the IP.
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

    const ip = queryOne<IpCatalog>(`SELECT * FROM ip_catalog WHERE id = ?`, [ipId]);

    if (!ip) {
      return NextResponse.json({ error: 'IP not found' }, { status: 404 });
    }

    // Build an FTS search query from the IP's genre + format fields.
    // FTS5 OR-combines terms so partial matches still surface relevant shows.
    const queryTerms = [ip.genre, ip.format]
      .filter(Boolean)
      .map((t) => t!.trim().replace(/"/g, '""'))
      .join(' OR ');

    if (!queryTerms) {
      // If the IP has no genre or format, return recent shows as a fallback
      const fallback = query<Show>(
        `SELECT * FROM shows ORDER BY greenlit_date DESC NULLS LAST LIMIT 10`
      );
      return NextResponse.json({ data: fallback });
    }

    // FTS5 is a standalone table; join via title subquery to avoid rowid/UUID mismatch
    const rows = query<Show>(
      `SELECT s.*
       FROM shows s
       WHERE s.title IN (
         SELECT title FROM shows_fts WHERE shows_fts MATCH ?
       )
       ORDER BY s.greenlit_date DESC NULLS LAST
       LIMIT 10`,
      [queryTerms]
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
