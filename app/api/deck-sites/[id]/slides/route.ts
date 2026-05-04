/**
 * GET /api/deck-sites/[id]/slides
 *   List all slides for a deck site, ordered by slide_order ascending.
 *   Response: { data: DeckSlide[] }
 *
 * POST /api/deck-sites/[id]/slides
 *   Upsert a slide — creates if (deck_site_id, slide_order) doesn't exist,
 *   updates in place if it does. Also syncs deck_sites.slide_count after write.
 *   Body: { slide_order, slide_image_path?, ai_image_path?, ai_prompt?,
 *            section_label?, section_type?, heading?, body?, stats_json? }
 *   Response: { data: DeckSlide }
 *
 * Called by: slide capture pipeline, deck editor, import bots
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, run } from '@/lib/db';

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
// Route handlers
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify the parent deck exists before returning slides
    const deck = queryOne<{ id: string }>(
      `SELECT id FROM deck_sites WHERE id = ?`,
      [id]
    );

    if (!deck) {
      return NextResponse.json({ error: 'Deck site not found' }, { status: 404 });
    }

    const slides = query<DeckSlide>(
      `SELECT * FROM deck_slides WHERE deck_site_id = ? ORDER BY slide_order ASC`,
      [id]
    );

    return NextResponse.json({ data: slides });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify the parent deck exists
    const deck = queryOne<{ id: string }>(
      `SELECT id FROM deck_sites WHERE id = ?`,
      [id]
    );

    if (!deck) {
      return NextResponse.json({ error: 'Deck site not found' }, { status: 404 });
    }

    const body = await request.json();

    if (body.slide_order === undefined || body.slide_order === null) {
      return NextResponse.json({ error: 'slide_order is required' }, { status: 400 });
    }

    const slideOrder = Number(body.slide_order);
    if (!Number.isInteger(slideOrder) || slideOrder < 1) {
      return NextResponse.json(
        { error: 'slide_order must be a positive integer' },
        { status: 400 }
      );
    }

    // Check if a slide already exists for this deck + order (upsert logic)
    const existing = queryOne<DeckSlide>(
      `SELECT * FROM deck_slides WHERE deck_site_id = ? AND slide_order = ?`,
      [id, slideOrder]
    );

    const now = Date.now() / 1000 | 0;
    let slideId: string;

    if (existing) {
      // UPDATE — patch whichever fields the caller supplied
      slideId = existing.id;

      run(
        `UPDATE deck_slides
         SET
           slide_image_path = COALESCE(?, slide_image_path),
           ai_image_path    = COALESCE(?, ai_image_path),
           ai_prompt        = COALESCE(?, ai_prompt),
           section_label    = COALESCE(?, section_label),
           section_type     = COALESCE(?, section_type),
           heading          = COALESCE(?, heading),
           body             = COALESCE(?, body),
           stats_json       = COALESCE(?, stats_json)
         WHERE id = ?`,
        [
          body.slide_image_path ?? null,
          body.ai_image_path    ?? null,
          body.ai_prompt        ?? null,
          body.section_label    ?? null,
          body.section_type     ?? null,
          body.heading          ?? null,
          body.body             ?? null,
          body.stats_json       ?? null,
          slideId,
        ]
      );
    } else {
      // INSERT — create a new slide row
      slideId = crypto.randomUUID();

      run(
        `INSERT INTO deck_slides
           (id, deck_site_id, slide_order, slide_image_path, ai_image_path,
            ai_prompt, section_label, section_type, heading, body, stats_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          slideId,
          id,
          slideOrder,
          body.slide_image_path ?? null,
          body.ai_image_path    ?? null,
          body.ai_prompt        ?? null,
          body.section_label    ?? null,
          body.section_type     ?? 'content',
          body.heading          ?? null,
          body.body             ?? null,
          body.stats_json       ?? null,
          now,
        ]
      );

      // Keep deck_sites.slide_count in sync after inserting a new slide
      run(
        `UPDATE deck_sites
         SET slide_count = (SELECT COUNT(*) FROM deck_slides WHERE deck_site_id = ?),
             updated_at  = ?
         WHERE id = ?`,
        [id, now, id]
      );
    }

    const slide = queryOne<DeckSlide>(
      `SELECT * FROM deck_slides WHERE id = ?`,
      [slideId]
    );

    return NextResponse.json({ data: slide }, { status: existing ? 200 : 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
