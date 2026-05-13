/**
 * POST /api/sizzles/[id]/capture-thumb?time={seconds}
 * Called by: ThumbnailPickerModal (browser, user-triggered)
 * Auth: internal session required (covered by middleware)
 *
 * Opens the Vimeo embed in a new tab on the user's local Chrome (port 9222),
 * seeks to `time`, screenshots the frame, saves it to public/sizzle-thumbs/,
 * updates sizzle_reels.thumbnail_url, and returns the public URL.
 *
 * Why local Chrome (not headless)? The private Vimeo videos can't be fetched
 * via the Vimeo API without auth — the user's Chrome has their Vimeo session
 * cookies, so connecting to it gives us access to all their private videos.
 *
 * Response: { thumbnail_url: string } | { error: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import path from 'node:path';
import fs from 'node:fs';
import { queryOne, run } from '@/lib/db';

interface SizzleRow {
  id: string;
  vimeo_url: string | null;
}

function parseVimeoUrl(url: string): { id: string; hash: string | null } | null {
  const m = url.match(/vimeo\.com\/(\d+)(?:\/([a-f0-9]+))?/i);
  if (!m) return null;
  return { id: m[1], hash: m[2] ?? null };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const timeParam = searchParams.get('time');
  const time = timeParam ? parseFloat(timeParam) : 0;

  if (isNaN(time) || time < 0) {
    return NextResponse.json({ error: 'Invalid time parameter' }, { status: 400 });
  }

  const sizzle = await queryOne<SizzleRow>(
    'SELECT id, vimeo_url FROM sizzle_reels WHERE id = ?',
    [id]
  );

  if (!sizzle) {
    return NextResponse.json({ error: 'Sizzle not found' }, { status: 404 });
  }
  if (!sizzle.vimeo_url) {
    return NextResponse.json({ error: 'Sizzle has no Vimeo URL' }, { status: 400 });
  }

  const parsed = parseVimeoUrl(sizzle.vimeo_url);
  if (!parsed) {
    return NextResponse.json({ error: 'Could not parse Vimeo URL' }, { status: 400 });
  }

  // Build embed URL — autoplay off so the video doesn't start playing while we seek,
  // muted so it can autoplay without user gesture (some Vimeo players require muted=1
  // to seek before first interaction)
  const embedParams = new URLSearchParams({ api: '1', autoplay: '1', muted: '1', controls: '0' });
  if (parsed.hash) embedParams.set('h', parsed.hash);
  const embedUrl = `https://player.vimeo.com/video/${parsed.id}?${embedParams}`;

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Connect to local Chrome DevProfile (port 9222) — uses user's Vimeo session cookies
    // so private videos are accessible. disconnect() leaves Chrome running; never close().
    browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null,
    });

    page = await browser.newPage();
    await page.setViewport({ width: 960, height: 540 });

    await page.goto(embedUrl, { waitUntil: 'networkidle2', timeout: 30_000 });

    // Wait for the video element to appear and be ready, then seek to the target time.
    // The video is in the top-level page (we're on player.vimeo.com directly, not inside
    // our iframe), so document.querySelector('video') reaches it without cross-origin issues.
    await page.evaluate((targetTime: number) => {
      return new Promise<void>((resolve) => {
        const trySeek = (video: HTMLVideoElement) => {
          const doSeek = () => {
            video.currentTime = targetTime;
            video.pause();
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              resolve();
            };
            video.addEventListener('seeked', onSeeked);
            // Fallback: resolve after 2s if seeked never fires
            setTimeout(resolve, 2000);
          };

          if (video.readyState >= 1) {
            doSeek();
          } else {
            video.addEventListener('loadedmetadata', doSeek, { once: true });
            // Fallback: resolve after 8s if the video never loads
            setTimeout(resolve, 8000);
          }
        };

        const video = document.querySelector('video') as HTMLVideoElement | null;
        if (video) {
          trySeek(video);
        } else {
          // Video element not in DOM yet — wait for it
          const observer = new MutationObserver(() => {
            const v = document.querySelector('video') as HTMLVideoElement | null;
            if (v) { observer.disconnect(); trySeek(v); }
          });
          observer.observe(document.body, { childList: true, subtree: true });
          setTimeout(resolve, 10000); // hard timeout
        }
      });
    }, time);

    // Extra settle time so the decoded frame is fully painted
    await new Promise<void>((r) => setTimeout(r, 800));

    const screenshotBuffer = await page.screenshot({ type: 'jpeg', quality: 88 }) as Buffer;

    const filename = `${id}-${Math.round(time)}s.jpg`;
    const thumbDir = path.join(process.cwd(), 'public', 'sizzle-thumbs');
    fs.mkdirSync(thumbDir, { recursive: true });
    fs.writeFileSync(path.join(thumbDir, filename), screenshotBuffer);

    const thumbnailUrl = `/sizzle-thumbs/${filename}`;
    await run('UPDATE sizzle_reels SET thumbnail_url = ? WHERE id = ?', [thumbnailUrl, id]);

    return NextResponse.json({ thumbnail_url: thumbnailUrl });
  } catch (err) {
    console.error('[capture-thumb]', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  } finally {
    if (page) await page.close().catch(() => {});
    // disconnect() not close() — we must not kill the user's Chrome
    if (browser) browser.disconnect();
  }
}
