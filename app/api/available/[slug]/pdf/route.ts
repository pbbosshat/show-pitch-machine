/**
 * POST /api/available/[slug]/pdf
 * Called by: "Export PDF" button on the available show one-sheet page
 * Auth: none (page is public)
 * Response: application/pdf binary stream — browser downloads directly
 *
 * Puppeteer navigates to /available/[slug]/pdf-render, waits for [data-pdf-ready],
 * then exports a full-color Letter-size PDF that it streams back to the client.
 * No file is saved to disk — the buffer is returned directly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, initDb } from '@/lib/db';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Both initDb and queryOne are async — without await, title is a Promise
    // (always truthy), the 404 guard is bypassed, and Puppeteer fires for every slug.
    await initDb();

    // Verify the title exists and is active before spinning up Puppeteer
    const title = await queryOne<{ id: string; title: string }>(
      `SELECT id, title FROM deck_sites WHERE slug = ? AND is_active = 1 AND status = 'published'`,
      [slug]
    );

    if (!title) {
      return NextResponse.json({ error: 'Title not found' }, { status: 404 });
    }

    const { getBrowser } = await import('@/lib/browser');
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      // Set viewport to Letter width so the layout renders at the correct scale
      await page.setViewport({ width: 816, height: 1056, deviceScaleFactor: 1 });

      const renderUrl = `http://localhost:${process.env.PORT || 3000}/available/${slug}/pdf-render`;
      await page.goto(renderUrl, { waitUntil: 'networkidle0', timeout: 30000 });

      // Wait for the layout sentinel — gives React time to fully hydrate
      await page.waitForSelector('[data-pdf-ready]', { timeout: 10000 }).catch(() => {
        // Proceed even if sentinel never fires — static server component won't need it
      });

      // Hide the site chrome and force the main container to exactly Letter width
      // so the 816px PDF root div isn't clipped by the site layout's max-width.
      await page.evaluate(() => {
        document.querySelectorAll('header, footer, nav').forEach((el) => {
          (el as HTMLElement).style.display = 'none';
        });
        const main = document.querySelector('main');
        if (main) {
          const m = main as HTMLElement;
          m.style.padding  = '0';
          m.style.margin   = '0';
          m.style.width    = '816px';
          m.style.maxWidth = 'none';
          m.style.overflow = 'visible';
        }
        // Also override body/html to prevent any scrollbar-induced shrinkage
        (document.documentElement as HTMLElement).style.overflow = 'visible';
        (document.body as HTMLElement).style.overflow = 'visible';
      });

      const pdfBuffer = await page.pdf({
        format: 'Letter',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });

      const filename = `${slug}-pitch-deck.pdf`;
      // NextResponse needs a BodyInit — convert Node Buffer to Uint8Array
      const body = new Uint8Array(pdfBuffer);

      return new NextResponse(body, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': String(body.byteLength),
        },
      });
    } finally {
      await page.close();
    }
  } catch (err) {
    console.error('[available/pdf] export failed:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
