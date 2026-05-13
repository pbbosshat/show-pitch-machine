// GET /api/marketing/genres — list site genres with show counts and show titles
// PATCH /api/marketing/genres — bulk update sort_order for drag-and-drop reordering
import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';

export async function GET() {
  try {
    const data = await query(`
      SELECT
        g.id, g.name, g.slug, g.description, g.sort_order,
        COUNT(s.id) AS show_count,
        STRING_AGG(s.title, '||') AS show_titles
      FROM site_genres g
      LEFT JOIN site_shows s ON s.genre = g.name AND s.status = 'active'
      GROUP BY g.id
      ORDER BY g.sort_order ASC, g.name ASC
    `);
    return NextResponse.json({ data, total: (data as unknown[]).length });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { orders } = await req.json() as { orders: { id: string; sort_order: number }[] };
    for (const { id, sort_order } of orders) {
      await run('UPDATE site_genres SET sort_order = ? WHERE id = ?', [sort_order, id]);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
