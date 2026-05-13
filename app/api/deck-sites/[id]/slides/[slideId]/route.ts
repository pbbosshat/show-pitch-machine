/**
 * PUT /api/deck-sites/[id]/slides/[slideId]
 *   Update any writable fields on a single slide row.
 *   Body: any subset of { section_label, section_type, heading, body, ai_prompt, stats_json }
 *   Response: { data: DeckSlide }
 *
 * DELETE /api/deck-sites/[id]/slides/[slideId]
 *   Remove a single slide from a deck by its UUID.
 *   Scopes the WHERE to `id AND deck_site_id` so a caller cannot delete a slide
 *   belonging to a different deck.
 *   After deletion, syncs deck_sites.slide_count to reflect the new total.
 *   Response: { data: { success: true } }
 *
 * Called by: deck editor slide panel (edit, remove actions), import bots
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';

// ---------------------------------------------------------------------------
// Row type
// ---------------------------------------------------------------------------

interface DeckSlide {
  id: string;
  deck_site_id: string;
  slide_order: number;
  slide_image_path: string | null;
  ai_image_path: string | null;
  ai_prompt: string | null;
  section_label: string | null;
  section_type: string;
  heading: string | null;
  body: string | null;
  stats_json: string | null;
  created_at: number;
}

// ---------------------------------------------------------------------------
// PUT — partial update of a single slide's editable content fields
// ---------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; slideId: string }> }
) {
  try {
    const { id: deckId, slideId } = await params;

    // Verify parent deck exists
    const deck = await queryOne<{ id: string }>(
      `SELECT id FROM deck_sites WHERE id = ?`,
      [deckId]
    );

    if (!deck) {
      return NextResponse.json({ error: 'Deck site not found' }, { status: 404 });
    }

    // Verify the slide belongs to this deck
    const existing = queryOne<{ id: string }>(
      `SELECT id FROM deck_slides WHERE id = ? AND deck_site_id = ?`,
      [slideId, deckId]
    );

    if (!existing) {
      return NextResponse.json({ error: 'Slide not found' }, { status: 404 });
    }

    const body = await request.json();

    // Only allow known, safe columns — never let callers overwrite image paths
    // or structural fields like deck_site_id / slide_order
    const allowed = ['section_label', 'section_type', 'heading', 'body', 'ai_prompt', 'stats_json'] as const;
    const setClauses: string[] = [];
    const values: unknown[] = [];

    for (const col of allowed) {
      if (col in body) {
        setClauses.push(`${col} = ?`);
        values.push(body[col] ?? null);
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
    }

    values.push(slideId);
    values.push(deckId);

    await run(
      `UPDATE deck_slides SET ${setClauses.join(', ')} WHERE id = ? AND deck_site_id = ?`,
      values
    );

    const updated = await queryOne<DeckSlide>(
      `SELECT * FROM deck_slides WHERE id = ?`,
      [slideId]
    );

    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; slideId: string }> }
) {
  try {
    const { id: deckId, slideId } = await params;

    // Verify the parent deck exists before touching child rows
    const deck = await queryOne<{ id: string }>(
      `SELECT id FROM deck_sites WHERE id = ?`,
      [deckId]
    );

    if (!deck) {
      return NextResponse.json({ error: 'Deck site not found' }, { status: 404 });
    }

    // Delete only if the slide belongs to this deck (prevents cross-deck deletion)
    const result = await run(
      `DELETE FROM deck_slides WHERE id = ? AND deck_site_id = ?`,
      [slideId, deckId]
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Slide not found' }, { status: 404 });
    }

    // Keep deck_sites.slide_count in sync after removing a slide
    const now = Date.now() / 1000 | 0;
    await run(
      `UPDATE deck_sites
          SET slide_count = (SELECT COUNT(*) FROM deck_slides WHERE deck_site_id = ?),
              updated_at  = ?
        WHERE id = ?`,
      [deckId, now, deckId]
    );

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}