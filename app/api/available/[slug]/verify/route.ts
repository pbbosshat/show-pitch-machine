// POST /api/available/[slug]/verify
// Public endpoint — checks whether a visitor's password matches the one set on an available title.
//
// Caller: public Available Title package page (no auth required).
// Request body: { password: string }
// Response:
//   200 { ok: true }                       — correct password (or no password set)
//   200 { ok: false, error: string }       — wrong password
//   404 { error: 'Not found' }             — slug not found or title inactive

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

interface AvailableRow {
  id: string;
  password: string | null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Look up only active titles; inactive slugs behave as not found.
  const row = await queryOne<AvailableRow>(
    "SELECT id, gate_password AS password FROM deck_sites WHERE slug = ? AND is_active = 1 AND status = 'published'",
    [slug]
  );

  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // No password set on this title — treat as open access.
  if (!row.password) {
    return NextResponse.json({ ok: true });
  }

  const body = await req.json().catch(() => ({})) as { password?: string };
  const submitted = (body.password ?? '').trim();

  // Case-sensitive comparison per spec.
  if (submitted === row.password) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: 'Invalid password' });
}
