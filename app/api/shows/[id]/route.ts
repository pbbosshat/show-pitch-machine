/**
 * GET /api/shows/[id]
 * Called by: show detail modal, comp show detail view
 * Auth: none
 * Response: { data: Show }
 *
 * Returns the full show record from the universal shows database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import type { Show } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const row = queryOne<Show>(
      `SELECT * FROM shows WHERE id = ?`,
      [id]
    );

    if (!row) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    return NextResponse.json({ data: row });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
