/**
 * /api/fin/aliases — Amex "Card Member" names mapped to MYE Admin users (admins only).
 * GET    → { aliases: [{ id, amex_name, user_id, user_name, user_email }] }
 * POST   { amex_name, user_id } → 200 { alias } (creates, or re-points an existing name)
 * DELETE ?id=<aliasId> → 200 { ok } · 404 unknown id
 * amex_name is stored normalized (trimmed, upper-case). Changing an alias does
 * NOT re-assign charges already imported; it applies to future matching.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { queryOne, run } from '@/lib/db';
import { requireFinAdmin } from '@/lib/fin/auth';
import { listAliases, normalizeAmexName, upsertAlias } from '@/lib/fin/aliases';

export async function GET(req: NextRequest) {
  const admin = await requireFinAdmin(req);
  if (admin instanceof NextResponse) return admin;
  return NextResponse.json({ aliases: await listAliases() });
}

export async function POST(req: NextRequest) {
  const admin = await requireFinAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const amexName = typeof body.amex_name === 'string' ? normalizeAmexName(body.amex_name) : '';
  const userId = typeof body.user_id === 'number' ? body.user_id : Number(body.user_id);
  if (!amexName) return NextResponse.json({ error: 'Card Member name is required.' }, { status: 400 });
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: 'Choose a user.' }, { status: 400 });
  }
  const user = await queryOne('SELECT id FROM fin_users WHERE id = ? AND active = TRUE', [userId]);
  if (!user) return NextResponse.json({ error: 'That user does not exist or is inactive.' }, { status: 400 });

  const id = await upsertAlias(amexName, userId);
  const alias = (await listAliases()).find((a) => a.id === id);
  return NextResponse.json({ alias });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireFinAdmin(req);
  if (admin instanceof NextResponse) return admin;

  const idParam = req.nextUrl.searchParams.get('id') ?? '';
  if (!/^\d+$/.test(idParam)) return NextResponse.json({ error: 'Alias not found.' }, { status: 404 });
  const { changes } = await run('DELETE FROM fin_cardholder_aliases WHERE id = ?', [Number(idParam)]);
  if (!changes) return NextResponse.json({ error: 'Alias not found.' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
