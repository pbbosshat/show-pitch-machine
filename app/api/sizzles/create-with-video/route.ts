/**
 * POST /api/sizzles/create-with-video
 * Called by: AddSizzleModal on /sizzles (internal team only)
 * Auth: none — internal app, no auth middleware
 *
 * Single-shot endpoint that creates a new sizzle_reels row, uploads the video
 * file to the "Sizzle Reels" Google Drive folder, and persists either a
 * user-picked thumbnail (frame capture or uploaded graphic) or whatever
 * Drive has already generated. Replaces the older two-step flow
 * (create-empty-row → /api/videos/upload) for the "Add Video" use case.
 *
 * Body: multipart/form-data
 *   file           — File (video — mp4, mov, avi, mkv)            REQUIRED
 *   ip_catalog_id  — string (must match an existing ip_catalog.id) REQUIRED
 *   thumbnail      — File (image/jpeg|png|webp)                    optional
 *   vimeo_password — string                                         optional
 *   notes          — string                                         optional
 *   sheet_source   — string                                         optional
 *   raw_value      — string (free-text cell value)                  optional
 *
 * Response: 200 → SizzleCardData (shape consumed by SizzleCard.tsx)
 *           4xx → { error: string }
 *
 * Runs on Railway (no Vercel 4MB body limit). maxDuration covers the long
 * Drive upload window for large video buffers (50-500MB is normal).
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';
import { uploadVideoToDrive, getDriveThumbnail } from '@/lib/google-drive-video';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

export const maxDuration = 300;

// Video file constraints — kept in sync with /api/videos/upload so both endpoints
// reject the same set of files and the UX is consistent.
const ALLOWED_VIDEO_PREFIXES = ['video/'];
const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv'];

// Thumbnail constraints — only accept image bytes the browser can render directly
// from the public/sizzle-thumbs URL. WebP included since modern <video> capture
// often produces webp blobs via canvas.toBlob('image/webp').
const ALLOWED_THUMB_PREFIXES = ['image/'];
const ALLOWED_THUMB_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg':  '.jpg',
  'image/png':  '.png',
  'image/webp': '.webp',
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file        = formData.get('file') as File | null;
    const thumbnail   = formData.get('thumbnail') as File | null;
    const ipCatalogId = (formData.get('ip_catalog_id') as string | null)?.trim() || null;

    // Optional metadata — empty strings are normalised to null so the DB doesn't
    // store noise like '' that confuses LIKE searches downstream.
    const vimeoPassword = ((formData.get('vimeo_password') as string | null) || '').trim() || null;
    const notes         = ((formData.get('notes')          as string | null) || '').trim() || null;
    const sheetSource   = ((formData.get('sheet_source')   as string | null) || '').trim() || null;
    const rawValue      = ((formData.get('raw_value')      as string | null) || '').trim() || null;

    // ── Required-field guards ────────────────────────────────────────────────
    if (!ipCatalogId) {
      return NextResponse.json({ error: 'ip_catalog_id is required' }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    // ── Video validation (MIME + extension as belt-and-braces check) ─────────
    if (!ALLOWED_VIDEO_PREFIXES.some((prefix) => file.type.startsWith(prefix))) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Must be a video file (mp4, mov, avi, mkv).` },
        { status: 400 }
      );
    }
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_VIDEO_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Invalid file extension: ${ext}. Allowed: ${ALLOWED_VIDEO_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // ── Verify the project exists and grab its title for the cached `title` col ─
    const project = await queryOne<{ id: string; title: string }>(
      'SELECT id, title FROM ip_catalog WHERE id = ?',
      [ipCatalogId]
    );
    if (!project) {
      return NextResponse.json(
        { error: `No ip_catalog row found with id: ${ipCatalogId}` },
        { status: 404 }
      );
    }

    // ── Insert the sizzle row up-front so we have a stable id for thumbnail filename
    //    and so downstream queries see this sizzle even if upload fails halfway. ──
    const sizzleId = randomUUID();
    await run(
      `INSERT INTO sizzle_reels
         (id, ip_catalog_id, title, platform, vimeo_password, notes, sheet_source, raw_value)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [sizzleId, ipCatalogId, project.title, 'drive', vimeoPassword, notes, sheetSource, rawValue]
    );

    // ── Upload video to Drive ────────────────────────────────────────────────
    // arrayBuffer() pulls the whole file into RAM — Railway has the headroom,
    // and Drive's resumable API isn't worth the complexity for this use case.
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { fileId, shareableUrl } = await uploadVideoToDrive(buffer, file.name, file.type);

    // ── Resolve the thumbnail URL ────────────────────────────────────────────
    // Priority:
    //   1. User-supplied thumbnail (scrubbed frame OR uploaded graphic)
    //   2. Drive's auto-generated thumbnail (usually null right after upload)
    //   3. null — the page falls back to its placeholder card
    let thumbnailUrl: string | null = null;

    if (thumbnail) {
      // Validate thumbnail MIME — extension comes from the MIME map so we never
      // trust the client-supplied filename for the destination path.
      if (!ALLOWED_THUMB_PREFIXES.some((prefix) => thumbnail.type.startsWith(prefix))) {
        return NextResponse.json(
          { error: `Invalid thumbnail type: ${thumbnail.type}. Must be an image.` },
          { status: 400 }
        );
      }
      const thumbExt = ALLOWED_THUMB_EXTENSIONS[thumbnail.type] || '.jpg';

      const thumbBuf = Buffer.from(await thumbnail.arrayBuffer());
      const thumbDir = path.join(process.cwd(), 'public', 'sizzle-thumbs');
      fs.mkdirSync(thumbDir, { recursive: true });

      // Stable, predictable filename so re-uploads overwrite the prior thumb instead
      // of leaving orphan files in the public folder.
      const thumbFilename = `${sizzleId}${thumbExt}`;
      fs.writeFileSync(path.join(thumbDir, thumbFilename), thumbBuf);

      thumbnailUrl = `/sizzle-thumbs/${thumbFilename}`;
    } else {
      // No user thumbnail — try Drive (typically returns null until 1-5min post-upload;
      // the client can poll /api/videos/thumbnail/[fileId] if it wants to wait).
      thumbnailUrl = await getDriveThumbnail(fileId);
    }

    // ── Persist video + thumbnail back to the sizzle row ─────────────────────
    await run(
      `UPDATE sizzle_reels
       SET vimeo_url = ?, platform = 'drive', drive_file_id = ?, thumbnail_url = ?
       WHERE id = ?`,
      [shareableUrl, fileId, thumbnailUrl, sizzleId]
    );

    // ── Return the full SizzleCardData shape so the client can prepend the new
    //    card to the page without an extra round-trip. Email aggregates are 0/null
    //    because a brand-new sizzle has no email-thread history yet.
    return NextResponse.json({
      id: sizzleId,
      ip_catalog_id: ipCatalogId,
      project_title: project.title,
      sheet_source: sheetSource,
      vimeo_url: shareableUrl,
      vimeo_password: vimeoPassword,
      platform: 'drive',
      raw_value: rawValue,
      notes,
      thumbnail_url: thumbnailUrl,
      last_email_date: null,
      email_thread_count: 0,
      // Echo back the Drive fileId so the client can poll for the auto-thumbnail
      // if it didn't supply one of its own.
      drive_file_id: fileId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/sizzles/create-with-video]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
