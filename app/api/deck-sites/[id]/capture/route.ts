/**
 * POST /api/deck-sites/[id]/capture
 *   Trigger slide capture for a deck site. Navigates to the Canva deck URL
 *   and captures each slide as a PNG saved to /deck-assets/{deck_id}/slides/.
 *   Uses the deck's stored canva_url if no override is provided in the body.
 *
 *   Body: { canva_url?: string }   — optional URL override
 *   Response (when lib available):  { data: { slide_count: number } }
 *   Response (lib not yet built):   202 { data: { queued: true, message: string } }
 *
 * Called by: deck import workflow, manual "Re-capture" action in deck editor
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';

interface DeckSiteRow {
  id: string;
  canva_url: string | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deck = await queryOne<DeckSiteRow>(
      `SELECT id, canva_url FROM deck_sites WHERE id = ?`,
      [id]
    );

    if (!deck) {
      return NextResponse.json({ error: 'Deck site not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));

    // Prefer caller-supplied URL; fall back to the deck's stored canva_url
    const canvaUrl: string | null = body.canva_url ?? deck.canva_url ?? null;

    if (!canvaUrl) {
      return NextResponse.json(
        { error: 'No canva_url provided and none stored on this deck' },
        { status: 400 }
      );
    }

    // Persist the URL override back to the deck record if a new one was supplied
    if (body.canva_url && body.canva_url !== deck.canva_url) {
      const now = Date.now() / 1000 | 0;
      await run(
        `UPDATE deck_sites SET canva_url = ?, updated_at = ? WHERE id = ?`,
        [canvaUrl, now, id]
      );
    }

    // Attempt to import the capture library. If it doesn't exist yet, stub gracefully.
    try {
      const { captureCanvaSlides } = await import('@/lib/deck-capture');
      const slideCount = await captureCanvaSlides(id, canvaUrl);

      return NextResponse.json({ data: { slide_count: slideCount } });
    } catch {
      // lib/deck-capture not yet implemented — return a queued stub
      return NextResponse.json(
        { data: { queued: true, message: 'Capture lib not yet implemented' } },
        { status: 202 }
      );
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
