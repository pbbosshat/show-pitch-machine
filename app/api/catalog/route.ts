/**
 * GET /api/catalog
 * Called by: IP catalog page, package creation modal, comp search
 * Auth: none
 * Query params:
 *   search  — LIKE match on ip_catalog.title
 *   status  — exact match on ip_catalog.status (e.g. 'active', 'library')
 *   genre   — exact match on ip_catalog.genre
 * Response: { data: IpCatalog[] } sorted by title ASC
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { IpCatalog } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const genre = searchParams.get('genre') || '';

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
      conditions.push('title LIKE ?');
      params.push(`%${search}%`);
    }

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (genre) {
      conditions.push('genre = ?');
      params.push(genre);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = query<IpCatalog>(
      `SELECT * FROM ip_catalog ${whereClause} ORDER BY title ASC`,
      params
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
