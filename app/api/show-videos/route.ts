/**
 * GET  /api/show-videos?ip_catalog_id=X   — list all videos linked to a show
 * POST /api/show-videos                    — link a video to a show
 *
 * Body for POST: { vimeo_library_id, ip_catalog_id, video_type?, sort_order?, notes? }
 * Response: the created show_videos row
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, run, queryOne } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const ipId = new URL(request.url).searchParams.get('ip_catalog_id') || '';
    if (!ipId) return NextResponse.json({ error: 'ip_catalog_id required' }, { status: 400 });

    const rows = query<{
      id: string;
      vimeo_library_id: string;
      ip_catalog_id: string;
      video_type: string;
      sort_order: number;
      notes: string | null;
      created_at: string;
      clip_id: string;
      url: string;
      title: string;
      duration_sec: number | null;
      privacy: string | null;
    }>(
      `SELECT sv.*, vl.clip_id, vl.url, vl.title, vl.duration_sec, vl.privacy
       FROM show_videos sv
       JOIN vimeo_library vl ON vl.id = sv.vimeo_library_id
       WHERE sv.ip_catalog_id = ?
       ORDER BY sv.sort_order ASC, sv.created_at ASC`,
      [ipId]
    );

    return NextResponse.json(JSON.parse(JSON.stringify(rows)));
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vimeo_library_id, ip_catalog_id, video_type = 'sizzle', sort_order = 0, notes = null } = body;

    if (!vimeo_library_id || !ip_catalog_id) {
      return NextResponse.json({ error: 'vimeo_library_id and ip_catalog_id are required' }, { status: 400 });
    }

    // Verify both exist
    const vid = queryOne('SELECT id FROM vimeo_library WHERE id = ?', [vimeo_library_id]);
    if (!vid) return NextResponse.json({ error: 'vimeo_library entry not found' }, { status: 404 });

    const show = queryOne('SELECT id FROM ip_catalog WHERE id = ?', [ip_catalog_id]);
    if (!show) return NextResponse.json({ error: 'ip_catalog entry not found' }, { status: 404 });

    const id = crypto.randomUUID();
    run(
      `INSERT INTO show_videos (id, ip_catalog_id, vimeo_library_id, video_type, sort_order, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, ip_catalog_id, vimeo_library_id, video_type, sort_order, notes]
    );

    const row = queryOne('SELECT * FROM show_videos WHERE id = ?', [id]);
    return NextResponse.json(JSON.parse(JSON.stringify(row)), { status: 201 });
  } catch (err) {
    const msg = (err as Error).message;
    // UNIQUE constraint — video already linked to this show
    if (msg.includes('UNIQUE')) {
      return NextResponse.json({ error: 'This video is already linked to that show' }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
