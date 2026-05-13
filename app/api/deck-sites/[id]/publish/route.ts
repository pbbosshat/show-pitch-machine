/**
 * POST /api/deck-sites/[id]/publish
 *   Set a deck site's status to 'published' and record the current timestamp.
 *   No request body required.
 *   Response: { data: DeckSite }
 *
 * Called by: deck editor publish button, automation bots pushing a deck live
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';

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

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM deck_sites WHERE id = ?`,
      [id]
    );

    if (!existing) {
      return NextResponse.json({ error: 'Deck site not found' }, { status: 404 });
    }

    const now = Date.now() / 1000 | 0;

    await run(
      `UPDATE deck_sites SET status = 'published', updated_at = ? WHERE id = ?`,
      [now, id]
    );

    const updated = await queryOne<DeckSite>(
      `SELECT * FROM deck_sites WHERE id = ?`,
      [id]
    );

    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
