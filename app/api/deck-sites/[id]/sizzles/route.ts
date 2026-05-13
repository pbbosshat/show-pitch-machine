/**
 * GET /api/deck-sites/[id]/sizzles
 *   List all sizzle videos attached to this pitch deck, ordered by sort_order.
 *   Response: { data: DeckSizzle[] }
 *   Each item: { id, deck_id, vimeo_url, title, password, sort_order, created_at }
 *
 * POST /api/deck-sites/[id]/sizzles
 *   Add a sizzle video to this deck.
 *   Body: { vimeo_url, title?, password?, sort_order? }
 *   Response: { data: DeckSizzle }
 *
 * Called by: deck editor sizzle panel, public deck viewer
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, run } from '@/lib/db';

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deckId } = await params;

    // Verify the parent deck exists before returning sub-resources
    const deck = queryOne<{ id: string }>(
      `SELECT id FROM deck_sites WHERE id = ?`,
      [deckId]
    );

    if (!deck) {
      return NextResponse.json({ error: 'Deck site not found' }, { status: 404 });
    }

    const rows = query<DeckSizzle>(
      `SELECT id, deck_id, vimeo_url, title, password, sort_order, created_at
         FROM deck_sizzles
        WHERE deck_id = ?
        ORDER BY sort_order ASC`,
      [deckId]
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deckId } = await params;

    // Verify the parent deck exists
    const deck = queryOne<{ id: string }>(
      `SELECT id FROM deck_sites WHERE id = ?`,
      [deckId]
    );

    if (!deck) {
      return NextResponse.json({ error: 'Deck site not found' }, { status: 404 });
    }

    const body = await request.json();

    // vimeo_url is the only required field — without it there is nothing to play
    if (!body.vimeo_url) {
      return NextResponse.json({ error: 'vimeo_url is required' }, { status: 400 });
    }

    const id  = crypto.randomUUID();
    const now = Date.now() / 1000 | 0;

    await run(
      `INSERT INTO deck_sizzles (id, deck_id, vimeo_url, title, password, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        deckId,
        body.vimeo_url,
        body.title      ?? null,
        body.password   ?? null,
        body.sort_order ?? null,
        now,
      ]
    );

    const newRow = queryOne<DeckSizzle>(
      `SELECT id, deck_id, vimeo_url, title, password, sort_order, created_at
         FROM deck_sizzles WHERE id = ?`,
      [id]
    );

    return NextResponse.json({ data: newRow }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
