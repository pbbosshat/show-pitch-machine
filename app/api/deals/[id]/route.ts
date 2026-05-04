/**
 * GET /api/deals/[id]
 *   Returns a single deal row.
 *   Response: { data: Deal }
 *
 * PUT /api/deals/[id]
 *   Updates the human-editable/denormalized fields of a deal.
 *   Body: { show_title?, network_name?, buyer_name?, prodco_name?, deal_type?,
 *           genre?, format?, deal_date?, source?, source_url?, notes? }
 *   Response: { data: { changes: number } }
 *
 * DELETE /api/deals/[id]
 *   Hard deletes the deal row.
 *   Response: { data: { changes: number } }
 *
 * Called by: deal detail modal, deal edit form, deal delete action
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';
import type { Deal } from '@/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const row = queryOne<Deal>('SELECT * FROM deals WHERE id = ?', [id]);

    if (!row) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
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

    // Denormalized name fields are editable directly — FK ids are considered immutable after create
    const allowed = [
      'show_title',
      'network_name',
      'buyer_name',
      'prodco_name',
      'deal_type',
      'genre',
      'format',
      'deal_date',
      'source',
      'source_url',
      'notes',
    ];

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

    values.push(id);

    const result = run(
      `UPDATE deals SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    return NextResponse.json({ data: { changes: result.changes } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = run('DELETE FROM deals WHERE id = ?', [id]);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    return NextResponse.json({ data: { changes: result.changes } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
