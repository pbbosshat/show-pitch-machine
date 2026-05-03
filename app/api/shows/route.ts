/**
 * GET /api/shows
 * Called by: shows database page, comp show search, similar show finder
 * Auth: none
 * Query params:
 *   search        — FTS5 MATCH on shows_fts (title, genre, network, production_company)
 *   network       — exact match on shows.network
 *   genre         — exact match on shows.genre
 *   location_type — exact match on shows.location_type
 *   status        — exact match on shows.status
 * Response: { data: Show[] } sorted by greenlit_date DESC NULLS LAST
 *
 * When ?search is present, uses FTS5 full-text search via shows_fts virtual table
 * for relevance ranking. Otherwise falls back to simple WHERE filters.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Show } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const network = searchParams.get('network') || '';
    const genre = searchParams.get('genre') || '';
    const locationType = searchParams.get('location_type') || '';
    const status = searchParams.get('status') || '';

    let rows: Show[];

    if (search) {
      // FTS5 path — join shows to the virtual FTS table for relevance-ranked results
      // FTS5 MATCH uses the query string directly; sanitise double-quotes to avoid parse errors
      const ftsQuery = search.replace(/"/g, '""');

      const conditions: string[] = [];
      const params: unknown[] = [ftsQuery];

      if (network) { conditions.push('s.network = ?'); params.push(network); }
      if (genre) { conditions.push('s.genre = ?'); params.push(genre); }
      if (locationType) { conditions.push('s.location_type = ?'); params.push(locationType); }
      if (status) { conditions.push('s.status = ?'); params.push(status); }

      const extraWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

      // FTS5 is a standalone table keyed by title; we pull matching titles then join.
      // Using a subquery avoids the rowid mismatch between FTS integer rowid and shows UUID id.
      rows = query<Show>(
        `SELECT s.*
         FROM shows s
         WHERE s.title IN (
           SELECT title FROM shows_fts WHERE shows_fts MATCH ?
         )
         ${extraWhere}
         ORDER BY s.greenlit_date DESC NULLS LAST`,
        params
      );
    } else {
      // Direct filter path when no search term — FTS would return everything anyway
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (network) { conditions.push('network = ?'); params.push(network); }
      if (genre) { conditions.push('genre = ?'); params.push(genre); }
      if (locationType) { conditions.push('location_type = ?'); params.push(locationType); }
      if (status) { conditions.push('status = ?'); params.push(status); }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      rows = query<Show>(
        `SELECT * FROM shows ${whereClause} ORDER BY greenlit_date DESC NULLS LAST`,
        params
      );
    }

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
