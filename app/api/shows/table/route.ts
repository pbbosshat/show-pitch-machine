/**
 * GET /api/shows/table
 * Called by: Show DB page (/shows) — full sortable data table
 * Auth: none
 * Query params:
 *   search      — FTS5 MATCH on shows_fts (title, genre, network, production_company, showrunner)
 *   air_status  — filter: 'on_air' | 'available' | 'off_air'
 *   is_our_show — filter: '1' to show only MYE-produced shows
 *   network     — exact match on shows.network
 *   genre       — exact match on shows.genre
 * Response: { data: Show[], total: number }
 * Default sort: is_our_show DESC, greenlit_date DESC NULLS LAST
 * Client handles column-level sorting on the already-loaded dataset.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Show } from '@/types';

// Valid air_status values — guard against arbitrary string injection into WHERE clause
const VALID_AIR_STATUSES = new Set(['on_air', 'available', 'off_air']);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search     = searchParams.get('search') || '';
    const airStatus  = searchParams.get('air_status') || '';
    const isOurShow  = searchParams.get('is_our_show') || '';
    const network    = searchParams.get('network') || '';
    const genre      = searchParams.get('genre') || '';

    let rows: Show[];

    if (search) {
      // FTS5 path — join shows to the virtual FTS table via title key for relevance-ranked results.
      // Sanitise double-quotes in the query string to avoid FTS5 parse errors.
      const ftsQuery = search.replace(/"/g, '""');

      const conditions: string[] = [];
      const params: unknown[] = [ftsQuery];

      // Only apply air_status filter when value is a known valid enum member
      if (airStatus && VALID_AIR_STATUSES.has(airStatus)) {
        conditions.push('s.air_status = ?');
        params.push(airStatus);
      }
      // Only apply is_our_show filter when the caller explicitly passes '1'
      if (isOurShow === '1') {
        conditions.push('s.is_our_show = 1');
      }
      if (network) { conditions.push('s.network = ?'); params.push(network); }
      if (genre)   { conditions.push('s.genre = ?');   params.push(genre); }

      const extraWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

      // FTS5 subquery keyed by title — avoids rowid mismatch between FTS integer rowid and shows UUID id.
      rows = query<Show>(
        `SELECT s.*
         FROM shows s
         WHERE s.title IN (
           SELECT title FROM shows_fts WHERE shows_fts MATCH ?
         )
         ${extraWhere}
         ORDER BY s.is_our_show DESC, s.greenlit_date DESC NULLS LAST`,
        params
      );
    } else {
      // Direct filter path when no search term — FTS would return everything anyway
      const conditions: string[] = [];
      const params: unknown[] = [];

      // Only apply air_status filter when value is a known valid enum member
      if (airStatus && VALID_AIR_STATUSES.has(airStatus)) {
        conditions.push('air_status = ?');
        params.push(airStatus);
      }
      // Only apply is_our_show filter when the caller explicitly passes '1'
      if (isOurShow === '1') {
        conditions.push('is_our_show = 1');
      }
      if (network) { conditions.push('network = ?'); params.push(network); }
      if (genre)   { conditions.push('genre = ?');   params.push(genre); }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      rows = query<Show>(
        `SELECT * FROM shows ${whereClause} ORDER BY is_our_show DESC, greenlit_date DESC NULLS LAST`,
        params
      );
    }

    return NextResponse.json({ data: rows, total: rows.length });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
