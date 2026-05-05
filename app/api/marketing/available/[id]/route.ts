// GET    /api/marketing/available/[id]  — fetch single deck by id
// PUT    /api/marketing/available/[id]  — update deck (all available-title fields)
// DELETE /api/marketing/available/[id]  — hard-delete deck (204)
//
// Callers: internal admin UI (authenticated via layout), no public access.
// Auth: handled by the marketing layout — no per-route auth check needed here.

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const row = queryOne('SELECT *, gate_password AS password FROM deck_sites WHERE id = ?', [id]);
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ data: row });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = queryOne<{ id: string; title: string }>('SELECT id, title FROM deck_sites WHERE id = ?', [id]);
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;

  const rawSlug = (body.slug as string | undefined) ?? (body.title as string | undefined) ?? existing.title;
  const slug = slugify(rawSlug);

  let markets: string | null = null;
  if (body.markets !== undefined && body.markets !== null) {
    markets = Array.isArray(body.markets)
      ? JSON.stringify(body.markets)
      : String(body.markets);
  }

  const now = Math.floor(Date.now() / 1000);

  try {
    run(
      `UPDATE deck_sites SET
        title            = COALESCE(?, title),
        slug             = ?,
        rights_type      = COALESCE(?, rights_type),
        genre            = COALESCE(?, genre),
        seasons          = COALESCE(?, seasons),
        episode_count    = COALESCE(?, episode_count),
        runtime_mins     = COALESCE(?, runtime_mins),
        markets          = COALESCE(?, markets),
        description      = COALESCE(?, description),
        contact_email    = COALESCE(?, contact_email),
        is_active        = COALESCE(?, is_active),
        sort_order       = COALESCE(?, sort_order),
        image_url        = COALESCE(?, image_url),
        vimeo_url        = COALESCE(?, vimeo_url),
        gate_password    = COALESCE(?, gate_password),
        site_show_id     = COALESCE(?, site_show_id),
        status           = COALESCE(?, status),
        visibility       = COALESCE(?, visibility),
        updated_at       = ?
      WHERE id = ?`,
      [
        body.title        !== undefined ? String(body.title)                        : null,
        slug,
        body.rights_type  !== undefined ? String(body.rights_type)                 : null,
        body.genre        !== undefined ? String(body.genre)                        : null,
        body.seasons      !== undefined ? Number(body.seasons)                      : null,
        body.episode_count !== undefined ? Number(body.episode_count)               : null,
        body.runtime_mins !== undefined ? Number(body.runtime_mins)                 : null,
        markets,
        body.description  !== undefined ? String(body.description)                 : null,
        body.contact_email !== undefined ? String(body.contact_email)               : null,
        body.is_active    !== undefined ? (body.is_active ? 1 : 0)                 : null,
        body.sort_order   !== undefined ? Number(body.sort_order)                   : null,
        body.image_url    !== undefined ? String(body.image_url)                    : null,
        body.vimeo_url    !== undefined ? String(body.vimeo_url)                    : null,
        body.password     !== undefined ? String(body.password)                     : null,
        body.site_show_id !== undefined ? String(body.site_show_id)                 : null,
        body.status       !== undefined ? String(body.status)                       : null,
        body.visibility   !== undefined ? String(body.visibility)                   : null,
        now,
        id,
      ]
    );
  } catch (err) {
    if ((err as Error).message?.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Slug already in use' }, { status: 409 });
    }
    throw err;
  }

  const updated = queryOne('SELECT *, gate_password AS password FROM deck_sites WHERE id = ?', [id]);
  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = queryOne('SELECT id FROM deck_sites WHERE id = ?', [id]);
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  run('DELETE FROM deck_sites WHERE id = ?', [id]);
  return new NextResponse(null, { status: 204 });
}
