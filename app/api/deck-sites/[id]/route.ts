/**
 * GET /api/deck-sites/[id]
 *   Fetch a single deck site with all its slides.
 *   Response: { data: { site: DeckSite, slides: DeckSlide[] } }
 *
 * PUT /api/deck-sites/[id]
 *   Update any writable fields on a deck site.
 *   Body: partial DeckSite fields (title, subtitle, logline, canva_url, genre,
 *         format, ep_count, network_target, ep_name, status, visibility, gate_password, slug)
 *   Response: { data: DeckSite }
 *
 * DELETE /api/deck-sites/[id]
 *   Delete a deck site — cascades to deck_slides via FK ON DELETE CASCADE.
 *   Response: { data: { deleted: true } }
 *
 * Called by: deck editor page, deck preview page, import workflow, admin bots
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, run } from '@/lib/db';

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

interface DeckSite {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  logline: string | null;
  canva_url: string | null;
  genre: string | null;
  format: string | null;
  ep_count: string | null;
  network_target: string | null;
  ep_name: string | null;
  status: string;
  visibility: string;
  gate_password: string | null;
  slide_count: number;
  created_at: number;
  updated_at: number;
}

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

    const site = queryOne<DeckSite>(
      `SELECT * FROM deck_sites WHERE id = ?`,
      [id]
    );

    if (!site) {
      return NextResponse.json({ error: 'Deck site not found' }, { status: 404 });
    }

    const slides = query<DeckSlide>(
      `SELECT * FROM deck_slides WHERE deck_site_id = ? ORDER BY slide_order ASC`,
      [id]
    );

    return NextResponse.json({ data: { site, slides } });
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

    // Verify record exists before attempting update
    const existing = queryOne<{ id: string }>(
      `SELECT id FROM deck_sites WHERE id = ?`,
      [id]
    );

    if (!existing) {
      return NextResponse.json({ error: 'Deck site not found' }, { status: 404 });
    }

    const body = await request.json();
    const now = Date.now() / 1000 | 0;

    // Build a dynamic SET clause from whichever fields the caller provided.
    // Always update updated_at. Only include known, safe columns.
    const allowed = [
      'slug', 'title', 'subtitle', 'logline', 'canva_url', 'genre', 'format',
      'ep_count', 'network_target', 'ep_name', 'status', 'visibility', 'gate_password',
      'image_url', 'vimeo_url', 'description', 'runtime_mins', 'episode_count',
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

    // Always bump updated_at
    setClauses.push('updated_at = ?');
    values.push(now);
    values.push(id); // WHERE clause

    run(
      `UPDATE deck_sites SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    const updated = queryOne<DeckSite>(
      `SELECT * FROM deck_sites WHERE id = ?`,
      [id]
    );

    return NextResponse.json({ data: updated });
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

    const existing = queryOne<{ id: string }>(
      `SELECT id FROM deck_sites WHERE id = ?`,
      [id]
    );

    if (!existing) {
      return NextResponse.json({ error: 'Deck site not found' }, { status: 404 });
    }

    // CASCADE on deck_slides FK handles child row deletion automatically
    run(`DELETE FROM deck_sites WHERE id = ?`, [id]);

    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
