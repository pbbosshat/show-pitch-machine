/**
 * PATCH /api/deck-sites/[id]/sizzles/[sizzleId]
 *   Update any writable fields on a sizzle video row.
 *   Body: any subset of { vimeo_url, title, password, sort_order }
 *   Response: { data: DeckSizzle }
 *
 * DELETE /api/deck-sites/[id]/sizzles/[sizzleId]
 *   Remove a sizzle video from this deck.
 *   Response: { data: { success: true } }
 *
 * Both handlers scope the WHERE clause to `id AND deck_id` so a caller cannot
 * accidentally modify a sizzle belonging to a different deck.
 *
 * Called by: deck editor sizzle panel (reorder, edit, remove actions)
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';

// ---------------------------------------------------------------------------
// Row type
// ---------------------------------------------------------------------------

interface DeckSizzle {
  id: string;
  deck_id: string;
  vimeo_url: string;
  title: string | null;
  password: string | null;
  sort_order: number | null;
  created_at: number;
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sizzleId: string }> }
) {
  try {
    const { id: deckId, sizzleId } = await params;

    // Verify the parent deck exists
    const deck = await queryOne<{ id: string }>(
      `SELECT id FROM deck_sites WHERE id = ?`,
      [deckId]
    );

    if (!deck) {
      return NextResponse.json({ error: 'Deck site not found' }, { status: 404 });
    }

    // Verify the sizzle row exists and belongs to this deck
    const existing = queryOne<{ id: string }>(
      `SELECT id FROM deck_sizzles WHERE id = ? AND deck_id = ?`,
      [sizzleId, deckId]
    );

    if (!existing) {
      return NextResponse.json({ error: 'Sizzle not found' }, { status: 404 });
    }

    const body = await request.json();

    // Only allow safe, known fields — never let callers overwrite id or deck_id
    const allowed = ['vimeo_url', 'title', 'password', 'sort_order'] as const;
    const setClauses: string[] = [];
    const values: unknown[]    = [];

    for (const col of allowed) {
      if (col in body) {
        setClauses.push(`${col} = ?`);
        values.push(body[col] ?? null);
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
    }

    // WHERE clause args follow the SET values
    values.push(sizzleId);
    values.push(deckId);

    await run(
      `UPDATE deck_sizzles SET ${setClauses.join(', ')} WHERE id = ? AND deck_id = ?`,
      values
    );

    const updated = await queryOne<DeckSizzle>(
      `SELECT id, deck_id, vimeo_url, title, password, sort_order, created_at
         FROM deck_sizzles WHERE id = ?`,
      [sizzleId]
    );

    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sizzleId: string }> }
) {
  try {
    const { id: deckId, sizzleId } = await params;

    // Verify the parent deck exists
    const deck = await queryOne<{ id: string }>(
      `SELECT id FROM deck_sites WHERE id = ?`,
      [deckId]
    );

    if (!deck) {
      return NextResponse.json({ error: 'Deck site not found' }, { status: 404 });
    }

    // Delete only if the row belongs to this deck (prevents cross-deck deletion)
    const result = await run(
      `DELETE FROM deck_sizzles WHERE id = ? AND deck_id = ?`,
      [sizzleId, deckId]
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Sizzle not found' }, { status: 404 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
