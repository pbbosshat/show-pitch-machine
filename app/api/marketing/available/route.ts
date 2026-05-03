// GET /api/marketing/available — list available titles for licensing
// POST /api/marketing/available — add available title
import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { randomUUID } from 'node:crypto';

export async function GET() {
  try {
    const data = query('SELECT * FROM available_titles WHERE is_active = 1 ORDER BY sort_order ASC, title ASC');
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
    run(
      'INSERT INTO available_titles (id, site_show_id, title, rights_type, markets, seasons, episode_count, runtime_mins, genre, description, contact_email, is_active, sort_order, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, body.site_show_id ?? null, body.title, body.rights_type ?? null, body.markets ? JSON.stringify(body.markets) : null, body.seasons ?? null, body.episode_count ?? null, body.runtime_mins ?? null, body.genre ?? null, body.description ?? null, body.contact_email ?? 'info@myentertainment.tv', body.is_active !== false ? 1 : 0, body.sort_order ?? 0, now, now]
    );
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
