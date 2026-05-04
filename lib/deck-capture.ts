// Puppeteer-based Canva slide capture for Show Pitch Machine.
// Navigates to a Canva presentation URL, advances through every slide,
// screenshots each one, saves to disk, and syncs DB records.
//
// Output path: public/deck-assets/{deckId}/slides/slide_1.png, slide_2.png, …
//
// Why puppeteer not CDP: Canva embeds require a full Chromium environment
// to render its canvas/React layer — a raw CDP session on the user's browser
// often lacks the right cookies and extension state. Puppeteer gives us a
// clean, isolated context every time.

import puppeteer from 'puppeteer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { run, queryOne } from '@/lib/db';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DeckSlideRow {
  id: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Hash a Buffer with MD5 — cheap & fast for duplicate-frame detection.
 * We don't need cryptographic security here, just fast content equality checks.
 */
function hashBuffer(buf: Buffer): string {
  return crypto.createHash('md5').update(buf).digest('hex');
}

/**
 * Parse slide total from Canva's pagination text, e.g. "1 / 24" → 24.
 * Returns null when the counter can't be parsed (caller falls back to 20-slide cap).
 */
function parseSlideCount(text: string | null | undefined): number | null {
  if (!text) return null;
  // Match "N / M" or "N/M" with optional whitespace
  const match = text.match(/\d+\s*\/\s*(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Capture every slide of a Canva presentation and persist them to disk + DB.
 *
 * @param deckId   UUID of the deck_sites row — used as the folder name
 * @param canvaUrl Full Canva presentation share URL
 * @returns        Number of slide images successfully saved
 *
 * Called by: POST /api/decks/[id]/capture  (browser-initiated, not a bot)
 */
export async function captureCanvaSlides(
  deckId: string,
  canvaUrl: string
): Promise<number> {
  // Output directory — served directly by Next.js from /public
  const slideDir = path.join(process.cwd(), 'public', 'deck-assets', deckId, 'slides');
  fs.mkdirSync(slideDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    // Required for running in sandboxed environments (Docker, Electron, etc.)
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let capturedCount = 0;

  try {
    const page = await browser.newPage();

    // Canva viewer is designed for 1920×1080; match that to get full-res slides
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(canvaUrl, { waitUntil: 'networkidle2', timeout: 60_000 });

    // Give Canva's React/canvas layer time to fully paint the first slide.
    // page.waitForTimeout was removed in Puppeteer v22; use a plain Promise instead.
    await new Promise(resolve => setTimeout(resolve, 6000));

    // ── Detect total slide count ────────────────────────────────────────────
    // Canva renders a counter like "1 / 24" in a pagination element.
    // We try several selector strategies before falling back to a hard cap.
    const counterText = await page.evaluate(() => {
      // Strategy 1: data-testid attribute (Canva's own test hooks)
      const byTestId = document.querySelector('[data-testid="slide-counter"]');
      if (byTestId?.textContent) return byTestId.textContent;

      // Strategy 2: class name fragments (Canva uses hashed class names but
      // "slide" and "counter"/"pagination" frequently appear together)
      const byClass = document.querySelector(
        '[class*="slide"][class*="counter"], [class*="pagination"]'
      );
      if (byClass?.textContent) return byClass.textContent;

      // Strategy 3: any element whose text matches "N / N" pattern
      const allEls = Array.from(document.querySelectorAll('*'));
      for (const el of allEls) {
        if (el.children.length === 0 && /\d+\s*\/\s*\d+/.test(el.textContent ?? '')) {
          return el.textContent;
        }
      }
      return null;
    });

    const totalSlides = parseSlideCount(counterText) ?? 20; // default cap: 20 slides
    console.log(`[deck-capture] Detected ${totalSlides} slides for deck ${deckId}`);

    // ── Capture loop ────────────────────────────────────────────────────────
    let prevHash = '';
    const now = () => (Date.now() / 1000) | 0; // Unix timestamp (seconds)

    for (let i = 1; i <= totalSlides; i++) {
      const imgPath = path.join(slideDir, `slide_${i}.png`);

      // fullPage: false — capture only the visible viewport (one slide frame)
      const screenshotBuf = await page.screenshot({
        path: imgPath,
        fullPage: false,
        type: 'png',
      });

      // Node 22+: page.screenshot returns Buffer when encoding is not set
      const buf = Buffer.isBuffer(screenshotBuf) ? screenshotBuf : Buffer.from(screenshotBuf);
      const currentHash = hashBuffer(buf);

      // If the slide image is identical to the previous frame, Canva hasn't
      // advanced — we've likely hit the end of the deck. Stop early.
      if (i > 1 && currentHash === prevHash) {
        console.log(`[deck-capture] Slide ${i} matches slide ${i - 1} — stopping early`);
        // Remove the duplicate screenshot we just saved
        fs.unlinkSync(imgPath);
        break;
      }
      prevHash = currentHash;

      // Relative public path stored in DB (served as /deck-assets/…)
      const dbImgPath = `/deck-assets/${deckId}/slides/slide_${i}.png`;

      // ── Upsert deck_slides row ──────────────────────────────────────────
      // NOTE: The unique index required for ON CONFLICT is:
      //   CREATE UNIQUE INDEX IF NOT EXISTS idx_deck_slides_order
      //     ON deck_slides(deck_site_id, slide_order);
      // Until that index exists in migrations, we use SELECT-then-INSERT/UPDATE
      // to avoid relying on the ON CONFLICT clause.
      const existing = queryOne<DeckSlideRow>(
        'SELECT id FROM deck_slides WHERE deck_site_id = ? AND slide_order = ?',
        [deckId, i]
      );

      if (existing) {
        run('UPDATE deck_slides SET slide_image_path = ? WHERE id = ?', [
          dbImgPath,
          existing.id,
        ]);
      } else {
        run(
          `INSERT INTO deck_slides
             (id, deck_site_id, slide_order, slide_image_path, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [crypto.randomUUID(), deckId, i, dbImgPath, now()]
        );
      }

      capturedCount = i;

      // Advance to the next slide — ArrowRight is Canva viewer's native hotkey
      if (i < totalSlides) {
        await page.keyboard.press('ArrowRight');
        // Wait for the slide transition animation to complete before screenshotting
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    // ── Update deck_sites metadata ─────────────────────────────────────────
    run(
      'UPDATE deck_sites SET slide_count = ?, updated_at = ? WHERE id = ?',
      [capturedCount, now(), deckId]
    );

    console.log(`[deck-capture] Captured ${capturedCount} slides for deck ${deckId}`);
  } finally {
    // Always close the browser — even if capture throws midway — to avoid
    // zombie Chromium processes accumulating over multiple capture calls.
    await browser.close();
  }

  return capturedCount;
}
