/**
 * GET /api/deck-sites/by-slug/[slug]
 *   Look up a deck site by its URL slug and return the site plus all slides.
 *   Used by the public deck portal at /deck/[slug] (server component direct DB access
 *   is preferred, but this endpoint is available for bots / external consumers).
 *
 *   Response: { data: { site: DeckSite, slides: DeckSlide[] } }
 *   404 if no deck site matches the slug.
 *
 * Called by: public deck portal server component, external preview tools
 * Auth: none (visibility enforcement is handled by the portal page itself)
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

// ---------------------------------------------------------------------------
// Row types (matches deck_sites / deck_slides schema from 007_deck_sites.sql)
// ---------------------------------------------------------------------------

interface DeckSite {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  logline: string | null;
  canva_url: string | null;
  genre: string | null;
  format: string | null;
  ep_count: string | null;
  network_target: string | null;
  ep_name: string | null;
  status: string;
  visibility: string;
  gate_password: string | null;
  slide_count: number;
  created_at: number;
  updated_at: number;
}

interface DeckSlide {
  id: string;
  deck_site_id: string;
  slide_order: number;
  slide_image_path: string | null;
  ai_image_path: string | null;
  ai_prompt: string | null;
  section_label: string | null;
  section_type: string;
  heading: string | null;
  body: string | null;
  stats_json: string | null;
  created_at: number;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Look up deck site by slug — slug is UNIQUE in the schema
    const site = await queryOne<DeckSite>(
      `SELECT * FROM deck_sites WHERE slug = ?`,
      [slug]
    );

    if (!site) {
      return NextResponse.json({ error: 'Deck site not found' }, { status: 404 });
    }

    // Fetch all slides for this deck in presentation order
    const slides = await query<DeckSlide>(
      `SELECT * FROM deck_slides WHERE deck_site_id = ? ORDER BY slide_order ASC`,
      [site.id]
    );

    return NextResponse.json({ data: { site, slides } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
