// GET /api/marketing/genres — list site genres
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const data = query('SELECT * FROM site_genres ORDER BY sort_order ASC, name ASC');
    return NextResponse.json({ data, total: (data as unknown[]).length });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
