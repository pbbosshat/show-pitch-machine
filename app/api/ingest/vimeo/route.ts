/**
 * POST /api/ingest/vimeo
 * Called by: scripts/sync-to-railway.ts (run from Bang or dev machine)
 * Auth: INGEST_API_KEY in Authorization: Bearer header
 * Body:
 *   {
 *     ip_catalog?:  IpCatalogRow[],     // ip_catalog upserts — keyed on id
 *     videos?:      VimeoVideoRow[],    // rows for vimeo_library — keyed on clip_id
 *     show_videos?: ShowVideoRow[],     // join rows tying ip_catalog ↔ vimeo_library
 *   }
 *
 * Upserts scraped Vimeo metadata + show links into Postgres.
 *
 * ip_catalog is accepted alongside the vimeo data because show_videos rows have
 * a FK on ip_catalog(id) — pushing show_videos for a show that doesn't exist in
 * live's ip_catalog yet would 500. Sending the parent rows in the same body
 * lets a single sync push the whole graph (per-row, not in one transaction).
 * The Vimeo Library page reads directly from vimeo_library + show_videos, so
 * this is what populates the live /vimeo-library view after a local scrape.
 *
 * Idempotent — ON CONFLICT updates the fields that can change (title, privacy,
 * duration, last_modified, drive_file_id) but preserves immutable identifiers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';
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

// Mirror of migrations/001_schema.sql ip_catalog. Only `id` and `title` are
// required — everything else is COALESCE'd against the existing row so partial
// updates don't blank out fields we don't ship.
interface IpCatalogRow {
  id: string;
  title: string;
  logline?: string | null;
  format?: string | null;
  genre?: string | null;
  subgenre?: string | null;
  episode_count?: number | null;
  status?: string | null;
  rights_status?: string | null;
  rights_expiry?: number | null;
  seasons_count?: number | null;
  is_library?: number | null;
  notes?: string | null;
  created_at?: number | null;
  updated_at?: number | null;
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

  let body: { ip_catalog?: unknown; videos?: unknown; show_videos?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const ipCatalog   = Array.isArray(body.ip_catalog) ? body.ip_catalog as IpCatalogRow[] : [];
  const videos      = Array.isArray(body.videos)     ? body.videos     as VimeoVideoRow[] : [];
  const showVideos  = Array.isArray(body.show_videos) ? body.show_videos as ShowVideoRow[] : [];

  let ipInserted    = 0;
  let ipUpdated     = 0;
  let videosInserted = 0;
  let videosUpdated  = 0;
  let linksInserted  = 0;
  let linksSkipped   = 0;

  // ── ip_catalog upsert ──────────────────────────────────────────────────────
  // Runs FIRST so any show_videos rows that reference these ids in the same
  // request body succeed. ON CONFLICT(id) updates only the human-editable
  // fields — rights/library flags are deliberately COALESCE'd to keep
  // server-side admin edits from being clobbered by a stale sync push.
  for (const ip of ipCatalog) {
    if (!ip.id || !ip.title) continue;
    const result = await run(
      `INSERT INTO ip_catalog
         (id, title, logline, format, genre, subgenre, episode_count, status,
          rights_status, rights_expiry, seasons_count, is_library, notes,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title         = excluded.title,
         logline       = COALESCE(excluded.logline,       ip_catalog.logline),
         format        = COALESCE(excluded.format,        ip_catalog.format),
         genre         = COALESCE(excluded.genre,         ip_catalog.genre),
         subgenre      = COALESCE(excluded.subgenre,      ip_catalog.subgenre),
         episode_count = COALESCE(excluded.episode_count, ip_catalog.episode_count),
         status        = COALESCE(excluded.status,        ip_catalog.status),
         rights_status = COALESCE(excluded.rights_status, ip_catalog.rights_status),
         rights_expiry = COALESCE(excluded.rights_expiry, ip_catalog.rights_expiry),
         seasons_count = COALESCE(excluded.seasons_count, ip_catalog.seasons_count),
         is_library    = COALESCE(excluded.is_library,    ip_catalog.is_library),
         notes         = COALESCE(excluded.notes,         ip_catalog.notes),
         updated_at    = COALESCE(excluded.updated_at,    ip_catalog.updated_at)`,
      [
        ip.id, ip.title,
        ip.logline ?? null, ip.format ?? null, ip.genre ?? null, ip.subgenre ?? null,
        ip.episode_count ?? null, ip.status ?? null,
        ip.rights_status ?? null, ip.rights_expiry ?? null,
        ip.seasons_count ?? null, ip.is_library ?? null,
        ip.notes ?? null, ip.created_at ?? null, ip.updated_at ?? null,
      ]
    );
    // Postgres pg driver doesn't distinguish insert from update via rowCount;
    // we settle for a single counter that captures "rows touched".
    if (result.changes > 0) ipInserted++;
  }

  // ── vimeo_library upsert ───────────────────────────────────────────────────
  // Keyed on clip_id (UNIQUE in migration 026). Re-pushes safely refresh
  // title/privacy/etc. without orphaning show_videos rows.
  for (const v of videos) {
    if (!v.clip_id || !v.url || !v.title) continue;

    // Use RETURNING (xmax = 0) AS inserted to distinguish a real INSERT from
    // an ON CONFLICT UPDATE. In Postgres, xmax = 0 means no prior row version
    // exists (fresh INSERT); ON CONFLICT UPDATE sets xmax to the old row's
    // transaction id (non-zero). This is the same pattern used by the articles
    // route — see app/api/ingest/articles/route.ts for the rationale.
    // The old `if (!v.id) videosInserted++` heuristic was wrong because Bang
    // always sends v.id, so it always reported 0 new videos.
    const row = await queryOne<{ inserted: boolean }>(
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
         size_bytes      = COALESCE(excluded.size_bytes,      vimeo_library.size_bytes)
       RETURNING (xmax = 0) AS inserted`,
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

    if (row?.inserted) {
      videosInserted++;
    } else {
      videosUpdated++;
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
    inserted: ipInserted + videosInserted + linksInserted,
    updated:  ipUpdated + videosUpdated,
    total:    ipCatalog.length + videos.length + showVideos.length,
    detail: {
      ip_catalog:  { inserted: ipInserted,    updated: ipUpdated,     total: ipCatalog.length },
      videos:      { inserted: videosInserted, updated: videosUpdated, total: videos.length },
      show_videos: { inserted: linksInserted,  skipped: linksSkipped,  total: showVideos.length },
    },
  });
}
