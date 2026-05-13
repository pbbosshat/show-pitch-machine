/**
 * GET /api/shows/table
 * Called by: Show DB page (/shows) — full sortable data table
 * Auth: none
 * Query params:
 *   search      — full-text search via shows.search_vector GIN index
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
      // Postgres tsvector path — search_vector is a GIN-indexed generated column
      // on shows covering title, genre, network, production_company, showrunner.
      // plainto_tsquery parses plain English without requiring FTS5 MATCH syntax.
      const conditions: string[] = [];
      const params: unknown[] = [search];

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

      const extraWhere = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

      rows = await query<Show>(
        `SELECT *
         FROM shows
         WHERE search_vector @@ plainto_tsquery('english', ?)
         ${extraWhere}
         ORDER BY is_our_show DESC, greenlit_date DESC NULLS LAST`,
        params
      );
    } else {
      // Direct filter path when no search term
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

      rows = await query<Show>(
        `SELECT * FROM shows ${whereClause} ORDER BY is_our_show DESC, greenlit_date DESC NULLS LAST`,
        params
      );
    }

    return NextResponse.json({ data: rows, total: rows.length });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
