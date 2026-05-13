/**
 * PATCH  /api/show-videos/[id]
 * DELETE /api/show-videos/[id]
 * Called by: Vimeo Library admin page (browser, admin session)
 * Auth: spm_session cookie (admin session required)
 * PATCH body: { video_type?, sort_order?, notes? } — at least one field required
 * PATCH response: updated show_videos row
 * DELETE response: { deleted: true }
 *
 * PATCH does a partial update — only supplied fields are changed. Returns 400
 * if no fields are provided. DELETE unlinks the video from the show without
 * removing the vimeo_library row.
 */

import { NextRequest, NextResponse } from 'next/server';
import { run, queryOne } from '@/lib/db';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { video_type, sort_order, notes } = body;

    const existing = await queryOne('SELECT id FROM show_videos WHERE id = ?', [id]);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const sets: string[] = [];
    const vals: unknown[] = [];

    if (video_type !== undefined) { sets.push('video_type = ?'); vals.push(video_type); }
    if (sort_order !== undefined) { sets.push('sort_order = ?'); vals.push(sort_order); }
    if (notes      !== undefined) { sets.push('notes = ?');      vals.push(notes); }

    if (sets.length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

    vals.push(id);
    await run(`UPDATE show_videos SET ${sets.join(', ')} WHERE id = ?`, vals);

    const row = await queryOne('SELECT * FROM show_videos WHERE id = ?', [id]);
    return NextResponse.json(JSON.parse(JSON.stringify(row)));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await queryOne('SELECT id FROM show_videos WHERE id = ?', [id]);
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await run('DELETE FROM show_videos WHERE id = ?', [id]);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
