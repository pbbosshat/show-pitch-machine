// DALL-E 3 hero image generation for Show Pitch Machine deck slides.
//
// For each slide in a deck, this module:
//   1. Reads the slide's metadata (section_label, heading, body) from DB
//   2. Builds a cinematic DALL-E 3 prompt from that content
//   3. Calls the OpenAI Images API (dall-e-3, 1792×1024, hd quality)
//   4. Downloads the returned image URL and saves it to disk
//   5. Updates the deck_slides row with ai_image_path and ai_prompt
//
// NOTE: 'openai' is NOT in package.json. Run:
//   npm install openai
// before using this module. The function will emit a console.warn and return
// gracefully if the package is missing, so the rest of the app stays healthy.
//
// Output path: public/deck-assets/{deckId}/ai/slide_{N}.png
// Called by:   POST /api/decks/[id]/generate-images  (manual trigger, not a cron)

import fs from 'node:fs';
import path from 'node:path';
import { query, queryOne, run } from '@/lib/db';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DeckSlide {
  id: string;
  deck_site_id: string;
  slide_order: number;
  slide_image_path: string | null;
  section_label: string | null;
  heading: string | null;
  body: string | null;
}

interface DeckSite {
  id: string;
  title: string;
}

// ─── Prompt builder ──────────────────────────────────────────────────────────

/**
 * Build a DALL-E 3 prompt for a single slide.
 *
 * Design goals:
 *  - Cinematic, photorealistic — looks like a real show's production still
 *  - No text/logos/watermarks (DALL-E has a habit of hallucinating these)
 *  - 16:9 composition to match the 1792×1024 output size
 *  - Show concept is drawn from whatever slide metadata is available
 *
 * The concept string is capped at 200 chars to keep the full prompt under
 * DALL-E 3's 4000-char limit while leaving room for the style boilerplate.
 */
function buildCinematicPrompt(slide: DeckSlide, siteTitle: string): string {
  // Combine available text fields, separated by em-dashes for readability
  const concept = [slide.section_label, slide.heading, slide.body]
    .filter(Boolean)
    .join(' — ')
    .substring(0, 200);

  return `Cinematic wide-angle photorealistic scene for a TV show pitch deck titled "${siteTitle}". \
Concept: ${concept}. \
Style: dramatic Hollywood production still, 16:9 cinematic ratio, professional color grading, \
moody atmospheric lighting, no text, no watermarks, no logos, high production value, \
film-quality composition. Dark and dramatic with high contrast.`.trim();
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Generate DALL-E 3 hero images for all slides in a deck (or a subset).
 *
 * @param deckId   UUID of the deck_sites row
 * @param slideIds Optional whitelist of deck_slides.id values; processes all if omitted
 *
 * Slides are processed sequentially (not in parallel) to avoid OpenAI rate limits.
 * Each slide's failure is caught individually so a single bad prompt can't abort the batch.
 *
 * Called by: POST /api/decks/[id]/generate-images
 */
export async function generateSlideImages(
  deckId: string,
  slideIds?: string[]
): Promise<void> {
  // ── Guard: ensure openai package is installed ───────────────────────────
  // Dynamic import lets us give a clear actionable error instead of a hard
  // module-not-found crash at startup.
  // NOTE: 'openai' is not in package.json yet — `npm install openai` needed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let OpenAI: new (opts: { apiKey: string }) => any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import('openai' as any) as any;
    // Handle both ESM default export and CommonJS module.exports shapes
    OpenAI = mod.default ?? mod;
  } catch {
    console.warn(
      '[deck-image-gen] openai package not installed. ' +
        'Run `npm install openai` then retry.'
    );
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.warn('[deck-image-gen] OPENAI_API_KEY is not set — skipping generation');
    return;
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // ── Fetch deck metadata ─────────────────────────────────────────────────
  const site = await queryOne<DeckSite>(
    'SELECT id, title FROM deck_sites WHERE id = ?',
    [deckId]
  );
  if (!site) {
    throw new Error(`[deck-image-gen] No deck_sites row found for id=${deckId}`);
  }

  // ── Fetch target slides ─────────────────────────────────────────────────
  let slides: DeckSlide[];
  if (slideIds && slideIds.length > 0) {
    // Parameterised IN clause — build one ? per id
    const placeholders = slideIds.map(() => '?').join(', ');
    slides = await query<DeckSlide>(
      `SELECT id, deck_site_id, slide_order, slide_image_path,
              section_label, heading, body
         FROM deck_slides
        WHERE deck_site_id = ?
          AND id IN (${placeholders})
        ORDER BY slide_order`,
      [deckId, ...slideIds]
    );
  } else {
    slides = await query<DeckSlide>(
      `SELECT id, deck_site_id, slide_order, slide_image_path,
              section_label, heading, body
         FROM deck_slides
        WHERE deck_site_id = ?
        ORDER BY slide_order`,
      [deckId]
    );
  }

  if (slides.length === 0) {
    console.warn(`[deck-image-gen] No slides found for deck ${deckId}`);
    return;
  }

  // AI output directory — served by Next.js from /public
  const aiDir = path.join(process.cwd(), 'public', 'deck-assets', deckId, 'ai');
  fs.mkdirSync(aiDir, { recursive: true });

  console.log(`[deck-image-gen] Generating images for ${slides.length} slides in deck ${deckId}`);

  // ── Sequential generation loop ──────────────────────────────────────────
  // Sequential (not Promise.all) to stay well under OpenAI's images.generate
  // rate limit (typically 5 images/min on standard tier).
  for (const slide of slides) {
    try {
      const cinematicPrompt = buildCinematicPrompt(slide, site.title);

      console.log(
        `[deck-image-gen] Slide ${slide.slide_order}/${slides.length} — calling DALL-E 3…`
      );

      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: cinematicPrompt,
        n: 1,
        size: '1792x1024',
        quality: 'hd',
        style: 'vivid',
      });

      const imageUrl = response.data[0]?.url;
      if (!imageUrl) {
        throw new Error('DALL-E 3 returned no image URL');
      }

      // ── Download and save ─────────────────────────────────────────────
      const imgResponse = await fetch(imageUrl);
      if (!imgResponse.ok) {
        throw new Error(
          `Failed to download image from OpenAI: ${imgResponse.status} ${imgResponse.statusText}`
        );
      }

      const buffer = Buffer.from(await imgResponse.arrayBuffer());
      const aiFilePath = path.join(aiDir, `slide_${slide.slide_order}.png`);
      fs.writeFileSync(aiFilePath, buffer);

      // Relative public path stored in DB
      const dbAiPath = `/deck-assets/${deckId}/ai/slide_${slide.slide_order}.png`;

      // ── Persist to DB ─────────────────────────────────────────────────
      await run(
        'UPDATE deck_slides SET ai_image_path = ?, ai_prompt = ? WHERE id = ?',
        [dbAiPath, cinematicPrompt, slide.id]
      );

      console.log(`[deck-image-gen] Slide ${slide.slide_order} saved to ${dbAiPath}`);
    } catch (err) {
      // Log and continue — one bad slide should not abort the whole batch.
      // The slide row will simply keep its old (or null) ai_image_path.
      console.error(
        `[deck-image-gen] Error on slide ${slide.slide_order}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  console.log(`[deck-image-gen] Done. Processed ${slides.length} slides for deck ${deckId}`);
}
