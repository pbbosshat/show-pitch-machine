/**
 * GET /api/vimeo-library
 * Called by: Vimeo Library browse page
 * Auth: session required
 * Query params:
 *   q        — LIKE match on title
 *   privacy  — filter by privacy value ('unlisted','anybody','password','nobody')
 *   linked   — 'true' = only videos assigned to a show; 'false' = unassigned only
 *   page     — 1-based page number (default 1)
 *   per_page — rows per page (default 100, max 500)
 * Response: { data: VimeoVideo[], total: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

interface VimeoVideo {
  id: string;
  clip_id: string;
  hash: string | null;
  url: string;
  title: string;
  duration_sec: number | null;
  privacy: string | null;
  has_password: number;
  last_modified: string | null;
  scraped_at: string;
  // joined from show_videos + ip_catalog
  linked_show_id: string | null;
  linked_show_title: string | null;
  linked_video_type: string | null;
  show_video_id: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const sp = new URL(request.url).searchParams;
    const q       = sp.get('q') || '';
    const privacy = sp.get('privacy') || '';
    const linked  = sp.get('linked') || '';
    const page    = Math.max(1, Number(sp.get('page')) || 1);
    const perPage = Math.min(500, Math.max(1, Number(sp.get('per_page')) || 100));
    const offset  = (page - 1) * perPage;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (q) {
      conditions.push('vl.title LIKE ?');
      params.push(`%${q}%`);
    }
    if (privacy) {
      conditions.push('vl.privacy = ?');
      params.push(privacy);
    }
    if (linked === 'true') {
      conditions.push('sv.id IS NOT NULL');
    } else if (linked === 'false') {
      conditions.push('sv.id IS NULL');
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Left-join to the FIRST show_video link per clip (most recently created).
    // A video can technically be linked to multiple shows; the join shows the primary one.
    const sql = `
      SELECT
        vl.id, vl.clip_id, vl.hash, vl.url, vl.title,
        vl.duration_sec, vl.privacy, vl.has_password,
        vl.last_modified, vl.scraped_at,
        sv.id              AS show_video_id,
        sv.ip_catalog_id   AS linked_show_id,
        ip.title           AS linked_show_title,
        sv.video_type      AS linked_video_type
      FROM vimeo_library vl
      LEFT JOIN show_videos sv ON sv.vimeo_library_id = vl.id
      LEFT JOIN ip_catalog ip  ON ip.id = sv.ip_catalog_id
      ${where}
      ORDER BY vl.last_modified DESC
      LIMIT ? OFFSET ?
    `;

    const countSql = `
      SELECT COUNT(*) AS n
      FROM vimeo_library vl
      LEFT JOIN show_videos sv ON sv.vimeo_library_id = vl.id
      ${where}
    `;

    const rows  = query<VimeoVideo>(sql, [...params, perPage, offset]);
    const count = queryOne<{ n: number }>(countSql, params);

    return NextResponse.json({
      data:  JSON.parse(JSON.stringify(rows)),
      total: Number(count?.n) || 0,
      page,
      per_page: perPage,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
