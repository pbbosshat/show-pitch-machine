// GET /api/marketing/available — list active decks for the catalog
// POST /api/marketing/available — add a new deck/available title
import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { randomUUID } from 'node:crypto';

export async function GET() {
  try {
    const data = await query('SELECT *, gate_password AS password FROM deck_sites WHERE is_active = 1 ORDER BY sort_order ASC, title ASC');
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
    await run(
      `INSERT INTO deck_sites
         (id, title, slug, genre, rights_type, markets, seasons, episode_count,
          runtime_mins, description, contact_email, is_active, sort_order,
          image_url, vimeo_url, gate_password, site_show_id,
          status, visibility, slide_count, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)`,
      [
        id,
        body.title,
        body.slug ?? null,
        body.genre ?? null,
        body.rights_type ?? null,
        body.markets ? JSON.stringify(body.markets) : null,
        body.seasons ?? null,
        body.episode_count ?? null,
        body.runtime_mins ?? null,
        body.description ?? null,
        body.contact_email ?? 'info@myentertainment.tv',
        body.is_active !== false ? 1 : 0,
        body.sort_order ?? 0,
        body.image_url ?? null,
        body.vimeo_url ?? null,
        body.password ?? null,
        body.site_show_id ?? null,
        body.status ?? 'published',
        body.visibility ?? 'public',
        now,
        now,
      ]
    );
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
