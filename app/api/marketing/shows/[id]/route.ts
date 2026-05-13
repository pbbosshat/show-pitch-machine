// GET  /api/marketing/shows/[id] — fetch a single site_show by id
// PUT  /api/marketing/shows/[id] — update all editable fields on a site_show
// Caller: MarketingShowsClient (admin CMS), public /shows page server component
import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';

interface RouteContext { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const show = await queryOne('SELECT * FROM site_shows WHERE id = ?', [id]);
    if (!show) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data: show });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const now = Math.floor(Date.now() / 1000);

    // Regenerate slug from title so URLs stay consistent with the title
    const slug = (body.title as string)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const result = await run(
      `UPDATE site_shows SET
        title            = ?,
        slug             = ?,
        tagline          = ?,
        description      = ?,
        genre            = ?,
        network          = ?,
        seasons          = ?,
        episode_count    = ?,
        status           = ?,
        image_url        = ?,
        is_featured      = ?,
        sort_order       = ?,
        imdb_url         = ?,
        production_hours = ?,
        updated_at       = ?
       WHERE id = ?`,
      [
        body.title,
        slug,
        body.tagline          ?? null,
        body.description      ?? null,
        body.genre            ?? null,
        body.network          ?? null,
        body.seasons          != null ? Number(body.seasons)          : null,
        body.episode_count    != null ? Number(body.episode_count)    : null,
        body.status           ?? 'active',
        body.image_url        ?? null,
        body.is_featured      ? 1 : 0,
        body.sort_order       != null ? Number(body.sort_order)       : 0,
        body.imdb_url         ?? null,
        body.production_hours != null ? Number(body.production_hours) : 0,
        now,
        id,
      ]
    );

    if (result.changes === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, slug });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
