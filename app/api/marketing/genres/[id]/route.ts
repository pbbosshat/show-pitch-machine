// PUT /api/marketing/genres/[id] — update a genre's name, description, and sort order
import { NextRequest, NextResponse } from 'next/server';
import { run, queryOne } from '@/lib/db';

interface GenreRow { id: string; name: string; }

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, description } = body as { name: string; description: string };

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const existing = await queryOne<GenreRow>('SELECT id, name FROM site_genres WHERE id = ?', [id]);
    if (!existing) {
      return NextResponse.json({ error: 'Genre not found' }, { status: 404 });
    }

    // Derive slug from name
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    await run(
      `UPDATE site_genres SET name = ?, slug = ?, description = ? WHERE id = ?`,
      [name.trim(), slug, description?.trim() || null, id]
    );

    return NextResponse.json({ success: true, slug });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
