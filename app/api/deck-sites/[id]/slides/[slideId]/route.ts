/**
 * PUT /api/deck-sites/[id]/slides/[slideId]
 *   Update specific fields on a single slide. Only the fields listed below
 *   are writable via this endpoint (image paths, copy, section metadata).
 *   Body: { heading?, body?, section_label?, section_type?,
 *            ai_image_path?, ai_prompt?, stats_json? }
 *   Response: { data: DeckSlide }
 *
 * Called by: deck editor inline slide editor, AI copy generation pipeline,
 *            image generation pipeline writing back ai_image_path
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; slideId: string }> }
) {
  try {
    const { id, slideId } = await params;

    // Confirm the slide exists AND belongs to the specified deck
    const existing = queryOne<DeckSlide>(
      `SELECT * FROM deck_slides WHERE id = ? AND deck_site_id = ?`,
      [slideId, id]
    );

    if (!existing) {
      return NextResponse.json(
        { error: 'Slide not found for this deck' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Whitelist of columns writable through this endpoint
    const allowed = [
      'heading', 'body', 'section_label', 'section_type',
      'ai_image_path', 'ai_prompt', 'stats_json',
    ] as const;

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

    values.push(slideId); // WHERE clause

    run(
      `UPDATE deck_slides SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    const updated = queryOne<DeckSlide>(
      `SELECT * FROM deck_slides WHERE id = ?`,
      [slideId]
    );

    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
