/**
 * GET /api/vimeo-thumb?url=<vimeo_url>
 * Called by: SizzleCard (client), any component needing a Vimeo thumbnail
 * Auth: none (internal tool only)
 *
 * Proxies the Vimeo oEmbed API to retrieve a thumbnail URL.
 * Running server-side avoids CORS issues and lets Next.js cache the response.
 * oEmbed respects private hash links (vimeo.com/ID/HASH) so password-protected
 * videos still return a thumbnail.
 *
 * Response: { thumbnail_url: string | null }
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'url param required' }, { status: 400 });
  }

  try {
    const oembedEndpoint = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
    const res = await fetch(oembedEndpoint, {
      // Cache thumbnail lookups for 1 hour — Vimeo thumbnails are stable
      next: { revalidate: 3600 },
      headers: { 'User-Agent': 'ShowPitchMachine/1.0' },
    });

    if (!res.ok) {
      return NextResponse.json({ thumbnail_url: null });
    }

    const data = await res.json() as { thumbnail_url?: string };
    return NextResponse.json({ thumbnail_url: data.thumbnail_url ?? null });
  } catch {
    return NextResponse.json({ thumbnail_url: null });
  }
}
