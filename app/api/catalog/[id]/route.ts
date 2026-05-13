/**
 * GET /api/catalog/[id]
 *   Returns full ip_catalog record.
 *   Response: { data: IpCatalog }
 *
 * PUT /api/catalog/[id]
 *   Updates human-editable fields on an IP record.
 *   Body: { logline?, format?, genre?, status?, notes? }
 *   Response: { data: { changes: number } }
 *
 * Called by: IP detail page, package editor
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';
import type { IpCatalog } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const row = await queryOne<IpCatalog>(
      `SELECT * FROM ip_catalog WHERE id = ?`,
      [id]
    );

    if (!row) {
      return NextResponse.json({ error: 'IP not found' }, { status: 404 });
    }

    return NextResponse.json({ data: row });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Restrict to fields a producer would legitimately edit; rights/library fields are admin-only
    const allowed = ['logline', 'format', 'genre', 'status', 'notes'];
    const fields: string[] = [];
    const values: unknown[] = [];

    for (const key of allowed) {
      if (key in body) {
        fields.push(`${key} = ?`);
        values.push(body[key]);
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
    }

    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    const result = await run(
      `UPDATE ip_catalog SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'IP not found' }, { status: 404 });
    }

    return NextResponse.json({ data: { changes: result.changes } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
