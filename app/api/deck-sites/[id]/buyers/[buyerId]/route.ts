/**
 * PATCH /api/deck-sites/[id]/buyers/[buyerId]
 *   Update pipeline_stage, notes, or sent_at for a specific deck_buyers row.
 *   Body: any subset of { pipeline_stage, notes, sent_at }
 *   Response: { data: DeckBuyerRow }
 *
 * DELETE /api/deck-sites/[id]/buyers/[buyerId]
 *   Remove a buyer from this deck's recipient list.
 *   Response: { data: { success: true } }
 *
 * Called by: deck editor buyer panel (stage updates, remove buyer actions)
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';

// ---------------------------------------------------------------------------
// Row type
// ---------------------------------------------------------------------------

interface DeckBuyerRow {
  id: string;
  deck_id: string;
  buyer_contact_id: string | null;
  sent_at: number | null;
  pipeline_stage: string | null;
  notes: string | null;
  created_at: number | null;
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; buyerId: string }> }
) {
  try {
    const { id: deckId, buyerId } = await params;

    // Verify the parent deck exists
    const deck = queryOne<{ id: string }>(
      `SELECT id FROM deck_sites WHERE id = ?`,
      [deckId]
    );

    if (!deck) {
      return NextResponse.json({ error: 'Deck site not found' }, { status: 404 });
    }

    // Verify the deck_buyers row exists and belongs to this deck
    const existing = queryOne<{ id: string }>(
      `SELECT id FROM deck_buyers WHERE id = ? AND deck_id = ?`,
      [buyerId, deckId]
    );

    if (!existing) {
      return NextResponse.json({ error: 'Buyer record not found' }, { status: 404 });
    }

    const body = await request.json();

    // Only allow safe, known fields — never let callers overwrite id or deck_id
    const allowed = ['pipeline_stage', 'notes', 'sent_at'] as const;
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
    values.push(buyerId);
    values.push(deckId);

    run(
      `UPDATE deck_buyers SET ${setClauses.join(', ')} WHERE id = ? AND deck_id = ?`,
      values
    );

    const updated = queryOne<DeckBuyerRow>(
      `SELECT * FROM deck_buyers WHERE id = ?`,
      [buyerId]
    );

    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; buyerId: string }> }
) {
  try {
    const { id: deckId, buyerId } = await params;

    // Verify the parent deck exists
    const deck = queryOne<{ id: string }>(
      `SELECT id FROM deck_sites WHERE id = ?`,
      [deckId]
    );

    if (!deck) {
      return NextResponse.json({ error: 'Deck site not found' }, { status: 404 });
    }

    // Delete only if the row belongs to this deck (prevents cross-deck deletion)
    const result = run(
      `DELETE FROM deck_buyers WHERE id = ? AND deck_id = ?`,
      [buyerId, deckId]
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Buyer record not found' }, { status: 404 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
