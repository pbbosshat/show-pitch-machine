/**
 * GET /api/deck-sites
 *   List all deck sites, newest first.
 *   Response: { data: DeckSite[] }
 *
 * POST /api/deck-sites
 *   Create a new deck site record. Slug is auto-generated from title if not provided.
 *   Body: { title, subtitle?, logline?, canva_url?, genre?, format?, ep_count?,
 *            network_target?, ep_name?, slug? }
 *   Response: { data: DeckSite }
 *
 * Called by: Show Pitch Machine dashboard, deck import workflow, bots creating deck records
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, run } from '@/lib/db';

// ---------------------------------------------------------------------------
// Shared types
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

// ---------------------------------------------------------------------------
// Slug helper — lowercase, hyphens only, max 60 chars
// ---------------------------------------------------------------------------

/**
 * Converts an arbitrary title string into a URL-safe slug.
 * Strips special characters, collapses whitespace to hyphens, truncates at 60.
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60);
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const rows = query<DeckSite>(
      `SELECT * FROM deck_sites ORDER BY created_at DESC`
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // title is the only required field
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const now = Date.now() / 1000 | 0; // unix epoch (seconds)

    // Use caller-supplied slug if present; otherwise derive from title
    const slug = body.slug ? String(body.slug) : slugify(body.title);

    if (!slug) {
      return NextResponse.json(
        { error: 'Could not generate a valid slug from the provided title' },
        { status: 400 }
      );
    }

    run(
      `INSERT INTO deck_sites
         (id, slug, title, subtitle, logline, canva_url, genre, format,
          ep_count, network_target, ep_name, status, visibility, gate_password,
          slide_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 'internal', ?, 0, ?, ?)`,
      [
        id,
        slug,
        body.title,
        body.subtitle    ?? null,
        body.logline     ?? null,
        body.canva_url   ?? null,
        body.genre       ?? null,
        body.format      ?? null,
        body.ep_count    ?? null,
        body.network_target ?? null,
        body.ep_name     ?? null,
        body.gate_password ?? null,
        now,
        now,
      ]
    );

    const created = queryOne<DeckSite>(
      `SELECT * FROM deck_sites WHERE id = ?`,
      [id]
    );

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
