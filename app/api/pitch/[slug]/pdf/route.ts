/**
 * POST /api/pitch/[slug]/pdf
 * Called by: "Export PDF" button on package editor / portal page
 * Auth: none
 * Response: { data: { path: string, filename: string } }
 *
 * Triggers a Puppeteer headless Chrome export of the portal page at
 * localhost:3000/pitch/{slug}. Saves output to PDF_OUTPUT_PATH env var
 * (default: ./data/pdfs/). Updates pitch_portals.pdf_path with the saved path.
 *
 * Imports browser from @/lib/browser to reuse the shared Puppeteer instance.
 */

import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs';
import { run, queryOne } from '@/lib/db';

const PDF_OUTPUT_PATH = process.env.PDF_OUTPUT_PATH || path.join(process.cwd(), 'data', 'pdfs');

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Verify the portal exists before spinning up Puppeteer
    const portal = queryOne<{ id: string; slug: string }>(
      `SELECT id, slug FROM pitch_portals WHERE slug = ?`,
      [slug]
    );

    if (!portal) {
      return NextResponse.json({ error: 'Portal not found' }, { status: 404 });
    }

    // Ensure output directory exists — Puppeteer will throw if the path doesn't exist
    if (!fs.existsSync(PDF_OUTPUT_PATH)) {
      fs.mkdirSync(PDF_OUTPUT_PATH, { recursive: true });
    }

    const filename = `${slug}.pdf`;
    const outputPath = path.join(PDF_OUTPUT_PATH, filename);

    // Dynamic import of browser so Puppeteer isn't loaded at Next.js startup
    const { getBrowser } = await import('@/lib/browser');
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      // Use a short port — assumes Next.js dev server is running on 3000
      const portalUrl = `http://localhost:${process.env.PORT || 3000}/pitch/${slug}`;

      await page.goto(portalUrl, { waitUntil: 'networkidle0', timeout: 30000 });

      // Wait for any client-side data fetching to complete before printing
      await page.waitForSelector('[data-pdf-ready]', { timeout: 15000 }).catch(() => {
        // If the ready sentinel never appears, print anyway after a generous wait
      });

      await page.pdf({
        path: outputPath,
        format: 'Letter',
        printBackground: true,
        margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
      });
    } finally {
      await page.close();
    }

    // Persist the PDF path so portal records link to their exports
    run(
      `UPDATE pitch_portals SET pdf_path = ? WHERE slug = ?`,
      [outputPath, slug]
    );

    return NextResponse.json({ data: { path: outputPath, filename } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
