/**
 * PATCH /api/shows/[id]/verify
 * Called by: show detail page verify button
 * Auth: none
 * Body: { verified_by?: string }   (defaults to 'manual' if omitted)
 * Response: { data: { changes: number } }
 *
 * Sets is_verified=1, verified_at=now(), verified_by on the shows row.
 * Returns 404 if the show does not exist.
 * is_verified was added in migration 015 — safe to call any time after that migration runs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { run, queryOne } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Confirm the show exists before attempting the update
    const exists = queryOne<{ id: string }>(
      'SELECT id FROM shows WHERE id = ?',
      [id]
    );
    if (!exists) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 });
    }

    // Parse body — verified_by is optional; fall back to 'manual' for UI-triggered verifications
    let verified_by = 'manual';
    try {
      const body = await request.json();
      if (typeof body.verified_by === 'string' && body.verified_by.trim()) {
        verified_by = body.verified_by.trim();
      }
    } catch {
      // Empty or missing body is fine — we just use the default verified_by
    }

    const result = run(
      `UPDATE shows
       SET is_verified = 1,
           verified_at = ?,
           verified_by = ?
       WHERE id = ?`,
      [Date.now(), verified_by, id]
    );

    return NextResponse.json({ data: { changes: result.changes } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
