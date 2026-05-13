/**
 * POST /api/ingest/vimeo
 * Called by: scripts/sync-to-railway.ts (run from Bang or dev machine)
 * Auth: INGEST_API_KEY in Authorization: Bearer header
 * Body:
 *   {
 *     videos?:      VimeoVideoRow[],    // rows for vimeo_library — keyed on clip_id
 *     show_videos?: ShowVideoRow[],     // join rows tying ip_catalog ↔ vimeo_library
 *   }
 *
 * Upserts scraped Vimeo metadata + show links into the production SQLite DB.
 * The Vimeo Library page reads directly from vimeo_library + show_videos, so
 * this is what populates the live /vimeo-library view after a local scrape.
 *
 * Idempotent — ON CONFLICT updates the fields that can change (title, privacy,
 * duration, last_modified, drive_file_id) but preserves immutable identifiers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { run, queryOne } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

interface VimeoVideoRow {
  id?: string;
  clip_id: string;
  hash?: string | null;
  url: string;
  title: string;
  duration_sec?: number | null;
  privacy?: string | null;
  has_password?: number | null;
  last_modified?: string | null;
  drive_file_id?: string | null;
  drive_url?: string | null;
  backfill_status?: string | null;
  backfilled_at?: string | null;
  size_bytes?: number | null;
}

interface ShowVideoRow {
  id?: string;
  ip_catalog_id: string;
  // Caller may know vimeo_library.id directly, or send clip_id and we resolve it
  vimeo_library_id?: string;
  clip_id?: string;
  video_type?: string;
  sort_order?: number;
  notes?: string | null;
}

function checkAuth(request: NextRequest): boolean {
  const apiKey = process.env.INGEST_API_KEY;
  if (!apiKey) return false;
  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return token === apiKey;
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { videos?: unknown; show_videos?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const videos      = Array.isArray(body.videos)      ? body.videos      as VimeoVideoRow[] : [];
  const showVideos  = Array.isArray(body.show_videos) ? body.show_videos as ShowVideoRow[]  : [];

  let videosInserted = 0;
  let videosUpdated  = 0;
  let linksInserted  = 0;
  let linksSkipped   = 0;

  // ── vimeo_library upsert ───────────────────────────────────────────────────
  // Keyed on clip_id (UNIQUE in migration 026). Re-pushes safely refresh
  // title/privacy/etc. without orphaning show_videos rows.
  for (const v of videos) {
    if (!v.clip_id || !v.url || !v.title) continue;

    const result = await run(
      `INSERT INTO vimeo_library
         (id, clip_id, hash, url, title, duration_sec, privacy,
          has_password, last_modified, drive_file_id, drive_url,
          backfill_status, backfilled_at, size_bytes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(clip_id) DO UPDATE SET
         hash            = excluded.hash,
         url             = excluded.url,
         title           = excluded.title,
         duration_sec    = excluded.duration_sec,
         privacy         = excluded.privacy,
         has_password    = excluded.has_password,
         last_modified   = excluded.last_modified,
         drive_file_id   = COALESCE(excluded.drive_file_id,   vimeo_library.drive_file_id),
         drive_url       = COALESCE(excluded.drive_url,       vimeo_library.drive_url),
         backfill_status = COALESCE(excluded.backfill_status, vimeo_library.backfill_status),
         backfilled_at   = COALESCE(excluded.backfilled_at,   vimeo_library.backfilled_at),
         size_bytes      = COALESCE(excluded.size_bytes,      vimeo_library.size_bytes)`,
      [
        v.id ?? uuidv4(),
        v.clip_id,
        v.hash ?? null,
        v.url,
        v.title,
        v.duration_sec ?? null,
        v.privacy ?? null,
        v.has_password ?? 0,
        v.last_modified ?? null,
        v.drive_file_id ?? null,
        v.drive_url ?? null,
        v.backfill_status ?? null,
        v.backfilled_at ?? null,
        v.size_bytes ?? null,
      ]
    );

    if (result.changes > 0) {
      if (!v.id) videosInserted++; else videosUpdated++;
    }
  }

  // ── show_videos upsert ─────────────────────────────────────────────────────
  // Each row links one Vimeo clip to one show. Caller may send either
  // vimeo_library_id (preferred — direct FK) or clip_id (we look up the id).
  // UNIQUE(ip_catalog_id, vimeo_library_id) makes the upsert safe to re-run.
  for (const sv of showVideos) {
    if (!sv.ip_catalog_id) { linksSkipped++; continue; }

    let vimeoLibraryId = sv.vimeo_library_id ?? null;
    if (!vimeoLibraryId && sv.clip_id) {
      const row = await queryOne<{ id: string }>(
        'SELECT id FROM vimeo_library WHERE clip_id = ?',
        [sv.clip_id]
      );
      vimeoLibraryId = row?.id ?? null;
    }
    if (!vimeoLibraryId) { linksSkipped++; continue; }

    const result = await run(
      `INSERT INTO show_videos
         (id, ip_catalog_id, vimeo_library_id, video_type, sort_order, notes)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(ip_catalog_id, vimeo_library_id) DO UPDATE SET
         video_type = excluded.video_type,
         sort_order = excluded.sort_order,
         notes      = COALESCE(excluded.notes, show_videos.notes)`,
      [
        sv.id ?? uuidv4(),
        sv.ip_catalog_id,
        vimeoLibraryId,
        sv.video_type ?? 'sizzle',
        sv.sort_order ?? 0,
        sv.notes ?? null,
      ]
    );

    if (result.changes > 0) linksInserted++;
  }

  // Response shape matches the other /api/ingest/* endpoints so sync-to-railway.ts
  // can log uniformly across entity types.
  return NextResponse.json({
    inserted: videosInserted + linksInserted,
    updated:  videosUpdated,
    total:    videos.length + showVideos.length,
    detail: {
      videos:      { inserted: videosInserted, updated: videosUpdated, total: videos.length },
      show_videos: { inserted: linksInserted,  skipped: linksSkipped,  total: showVideos.length },
    },
  });
}
