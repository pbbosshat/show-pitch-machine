// GET /api/videos/thumbnail/[fileId]
// Called by: VideoUploader component polling after upload
// Auth: none — internal app
// Query: sizzle_id (optional — when present, updates sizzle_reels.thumbnail_url on hit)
// Response: { thumbnail_url: string | null; ready: boolean }
//
// Drive takes 1-5 minutes to generate thumbnails after a video is uploaded.
// The uploader polls this endpoint until ready: true, then renders the preview.

import { NextRequest, NextResponse } from 'next/server';
import { getDriveThumbnail } from '@/lib/google-drive-video';
import { run } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const sizzleId = req.nextUrl.searchParams.get('sizzle_id');

    const thumbnailUrl = await getDriveThumbnail(fileId);

    if (thumbnailUrl && sizzleId) {
      run(
        'UPDATE sizzle_reels SET thumbnail_url = ? WHERE id = ?',
        [thumbnailUrl, sizzleId]
      );
    }

    return NextResponse.json({ thumbnail_url: thumbnailUrl, ready: !!thumbnailUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[GET /api/videos/thumbnail]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
