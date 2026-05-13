/**
 * GET /api/shows
 * Called by: shows database page, comp show search, similar show finder
 * Auth: none
 * Query params:
 *   search        — full-text search via shows.search_vector GIN index
 *   network       — exact match on shows.network
 *   genre         — exact match on shows.genre
 *   location_type — exact match on shows.location_type
 *   status        — exact match on shows.status
 * Response: { data: Show[] } sorted by greenlit_date DESC NULLS LAST
 *
 * When ?search is present, uses Postgres tsvector full-text search via
 * the search_vector GIN-indexed column on shows (replaces FTS5 shows_fts virtual table).
 * Otherwise falls back to simple WHERE filters.
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
      // Postgres tsvector path — search_vector is a GIN-indexed generated column
      // covering title, genre, network, production_company. plainto_tsquery parses
      // plain English without requiring FTS5 MATCH syntax or quote escaping.
      const conditions: string[] = [];
      const params: unknown[] = [search];

      if (network) { conditions.push('network = ?'); params.push(network); }
      if (genre) { conditions.push('genre = ?'); params.push(genre); }
      if (locationType) { conditions.push('location_type = ?'); params.push(locationType); }
      if (status) { conditions.push('status = ?'); params.push(status); }

      const extraWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

      rows = await query<Show>(
        `SELECT *
         FROM shows
         WHERE search_vector @@ plainto_tsquery('english', ?)
         ${extraWhere}
         ORDER BY greenlit_date DESC NULLS LAST`,
        params
      );
    } else {
      // Direct filter path when no search term
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (network) { conditions.push('network = ?'); params.push(network); }
      if (genre) { conditions.push('genre = ?'); params.push(genre); }
      if (locationType) { conditions.push('location_type = ?'); params.push(locationType); }
      if (status) { conditions.push('status = ?'); params.push(status); }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      rows = await query<Show>(
        `SELECT * FROM shows ${whereClause} ORDER BY greenlit_date DESC NULLS LAST`,
        params
      );
    }

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
