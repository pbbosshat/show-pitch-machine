// GET /api/marketing/shows — list public show listings
// POST /api/marketing/shows — create a new show
// Caller: Marketing CMS admin, public site pages
import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { randomUUID } from 'node:crypto';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const genre = searchParams.get('genre');
    const featured = searchParams.get('featured');
    const limit = parseInt(searchParams.get('limit') ?? '100');

    let sql = 'SELECT * FROM site_shows WHERE 1=1';
    const params: unknown[] = [];
    if (genre) { sql += ' AND genre = ?'; params.push(genre); }
    if (featured === 'true') { sql += ' AND is_featured = 1'; }
    sql += ' ORDER BY sort_order ASC, title ASC LIMIT ?';
    params.push(limit);

    const data = query(sql, params);
    return NextResponse.json({ data, total: data.length });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const slug = body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    run(
      'INSERT INTO site_shows (id, title, slug, tagline, description, genre, network, seasons, episode_count, status, image_url, is_featured, sort_order, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, body.title, slug, body.tagline ?? null, body.description ?? null, body.genre ?? null, body.network ?? null, body.seasons ?? null, body.episode_count ?? null, body.status ?? 'active', body.image_url ?? null, body.is_featured ? 1 : 0, body.sort_order ?? 0, now, now]
    );
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
