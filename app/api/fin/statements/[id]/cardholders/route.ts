/**
 * /api/fin/statements/[id]/cardholders — assign an unmatched Card Member name (admins only).
 * POST { card_member, user_id } → { assigned: <charges updated>, alias_id }
 * Saves the name in the alias table (so future months match automatically — name
 * matching only, never charge memory) and assigns this statement's still-unmatched
 * charges with that name to the user. Other statements are never changed. 404 if the statement has no such unmatched name;
 * 409 if the month is closed (nothing is saved).
 */

import { NextResponse, type NextRequest } from 'next/server';
import { queryOne, run } from '@/lib/db';
import { requireFinAdmin } from '@/lib/fin/auth';
import { normalizeAmexName, upsertAlias } from '@/lib/fin/aliases';
import { MONTH_CLOSED, parseId } from '@/lib/fin/amex/charges';

const NAME_SQL = `upper(regexp_replace(trim(card_member), '\\s+', ' ', 'g'))`;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireFinAdmin(req);
  if (admin instanceof NextResponse) return admin;
  const id = parseId((await ctx.params).id);
  if (!id) return NextResponse.json({ error: 'Statement not found.' }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const name = typeof body.card_member === 'string' ? normalizeAmexName(body.card_member) : '';
  const userId = Number(body.user_id);
  if (!name) return NextResponse.json({ error: 'Card Member name is required.' }, { status: 400 });
  if (!Number.isInteger(userId) || userId <= 0) return NextResponse.json({ error: 'Choose a user.' }, { status: 400 });

  const user = await queryOne('SELECT id FROM fin_users WHERE id = ? AND active = TRUE', [userId]);
  if (!user) return NextResponse.json({ error: 'That user does not exist or is inactive.' }, { status: 400 });

  const st = await queryOne<{ closed_at: string | null }>('SELECT closed_at FROM fin_statements WHERE id = ?', [id]);
  if (!st) return NextResponse.json({ error: 'Statement not found.' }, { status: 404 });
  if (st.closed_at) return NextResponse.json({ error: MONTH_CLOSED }, { status: 409 });

  const present = await queryOne(
    `SELECT 1 FROM fin_charges WHERE statement_id = ? AND cardholder_id IS NULL AND ${NAME_SQL} = ? LIMIT 1`,
    [id, name]
  );
  if (!present) return NextResponse.json({ error: 'No unmatched charges with that Card Member name on this statement.' }, { status: 404 });

  const aliasId = await upsertAlias(name, userId);
  const { changes } = await run(
    `UPDATE fin_charges SET cardholder_id = ?
      WHERE statement_id = ? AND cardholder_id IS NULL AND ${NAME_SQL} = ?
        AND EXISTS (SELECT 1 FROM fin_statements s WHERE s.id = fin_charges.statement_id AND s.closed_at IS NULL)`,
    [userId, id, name]
  );
  return NextResponse.json({ assigned: changes, alias_id: aliasId });
}
