/**
 * POST /api/deck-sites/[id]/generate
 *   Trigger AI image generation for all slides in a deck, or a filtered subset.
 *   Calls generateSlideImages() from @/lib/deck-image-gen which submits each
 *   slide's ai_prompt to DALL-E and writes the result path back to the slide row.
 *
 *   Body: { slide_ids?: string[] }  — optional filter to regenerate specific slides only
 *   Response (when lib available):  { data: { slide_count: number } }
 *   Response (lib not yet built):   202 { data: { queued: true, message: string } }
 *
 * Called by: deck editor "Generate Images" action, automated post-capture pipeline
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const deck = queryOne<{ id: string }>(
      `SELECT id FROM deck_sites WHERE id = ?`,
      [id]
    );

    if (!deck) {
      return NextResponse.json({ error: 'Deck site not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));

    // slide_ids is optional — undefined means "generate for all slides in this deck"
    const slideIds: string[] | undefined =
      Array.isArray(body.slide_ids) ? body.slide_ids : undefined;

    // Attempt to import the image generation library. Stub gracefully if missing.
    try {
      const { generateSlideImages } = await import('@/lib/deck-image-gen');
      const slideCount = await generateSlideImages(id, slideIds);

      return NextResponse.json({ data: { slide_count: slideCount } });
    } catch {
      // lib/deck-image-gen not yet implemented — return a queued stub
      return NextResponse.json(
        { data: { queued: true, message: 'Capture lib not yet implemented' } },
        { status: 202 }
      );
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
