/**
 * GET  /api/marketing/press
 * POST /api/marketing/press
 * Called by: Marketing CMS press page (browser, admin session)
 * Auth: spm_session cookie (marketing layout enforces auth)
 * POST body: { headline, excerpt?, body?, source?, source_url?, published_at?, is_featured? }
 * GET response: { data: PressRelease[], total: number }
 * POST response: { id } with status 201
 *
 * Manages the press_releases table. Slug is auto-derived from headline on create.
 * Rows feed the public /press-releases page and individual /press-releases/[slug] pages.
 */
import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { randomUUID } from 'node:crypto';

export async function GET() {
  try {
    const data = await query('SELECT * FROM press_releases ORDER BY published_at DESC, created_at DESC');
    return NextResponse.json({ data, total: (data as unknown[]).length });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const slug = body.headline.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
    await run(
      'INSERT INTO press_releases (id, headline, slug, excerpt, body, source, source_url, published_at, is_featured, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [id, body.headline, slug, body.excerpt ?? null, body.body ?? null, body.source ?? null, body.source_url ?? null, body.published_at ?? now, body.is_featured ? 1 : 0, now, now]
    );
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
