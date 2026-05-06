// POST /api/videos/upload
// Called by: VideoUploader component (internal team only)
// Auth: none — internal app, no auth middleware
// Body: multipart/form-data
//   file: File (video — mp4, mov, avi, mkv)
//   sizzle_id: string (must match an existing sizzle_reels.id)
// Response: { fileId: string; url: string; thumbnail_url: string | null }
//
// Runs on Railway (no Vercel 4MB limit), so large buffers (50-500MB) are acceptable.
// maxDuration covers Railway's long-running upload window.

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';
import { uploadVideoToDrive, getDriveThumbnail } from '@/lib/google-drive-video';

export const maxDuration = 300;

const ALLOWED_MIME_PREFIXES = ['video/'];
const ALLOWED_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv'];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const sizzleId = formData.get('sizzle_id') as string | null;

    if (!sizzleId) {
      return NextResponse.json({ error: 'sizzle_id is required' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    // Validate MIME type — must be a video/* type
    if (!ALLOWED_MIME_PREFIXES.some((prefix) => file.type.startsWith(prefix))) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Must be a video file (mp4, mov, avi, mkv).` },
        { status: 400 }
      );
    }

    // Validate extension as a second layer — some clients send incorrect MIME types
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Invalid file extension: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }

    const sizzle = queryOne<{ id: string }>(
      'SELECT id FROM sizzle_reels WHERE id = ?',
      [sizzleId]
    );

    if (!sizzle) {
      return NextResponse.json(
        { error: `No sizzle_reel found with id: ${sizzleId}` },
        { status: 404 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { fileId, shareableUrl } = await uploadVideoToDrive(buffer, file.name, file.type);

    // Drive needs 1-5 minutes to process thumbnails after upload — null is expected here
    const thumbnailUrl = await getDriveThumbnail(fileId);

    run(
      `UPDATE sizzle_reels
       SET vimeo_url = ?, platform = 'drive', drive_file_id = ?, thumbnail_url = ?
       WHERE id = ?`,
      [shareableUrl, fileId, thumbnailUrl, sizzleId]
    );

    return NextResponse.json({ fileId, url: shareableUrl, thumbnail_url: thumbnailUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/videos/upload]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
