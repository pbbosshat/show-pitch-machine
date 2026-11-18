/**
 * /api/fin/statements/[id] — one statement (admins only).
 * GET    → { statement, charges: ChargeView[] (incl. deleted duplicates), unmatched: [{card_member, charge_count, total_cents}] }
 * PATCH  { statement_total: "12,345.67" | null }  → set/clear the total the admin reads off the Amex statement
 *        { action: "close" }  → close the month; 409 unless the charges (excluding deleted
 *                               duplicates) sum to the statement total to the cent
 *        { action: "reopen" } → reopen a closed month
 *        → { statement }
 * DELETE → remove a wrongly uploaded statement and its charges; 409 if closed or any charge is in QuickBooks.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireFinAdmin } from '@/lib/fin/auth';
import { formatCents, parseDollarsToCents } from '@/lib/fin/money';
import { getStatement, listChargesForUser, listUnmatchedNames, parseId, withTransaction } from '@/lib/fin/amex/charges';

type Ctx = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ error: 'Statement not found.' }, { status: 404 });

export async function GET(req: NextRequest, ctx: Ctx) {
  const admin = await requireFinAdmin(req);
  if (admin instanceof NextResponse) return admin;
  const id = parseId((await ctx.params).id);
  const statement = id ? await getStatement(id) : undefined;
  if (!id || !statement) return notFound();
  const [charges, unmatched] = await Promise.all([
    listChargesForUser(admin, { statementId: id, includeDeleted: true }),
    listUnmatchedNames(id),
  ]);
  return NextResponse.json({ statement, charges, unmatched });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const admin = await requireFinAdmin(req);
  if (admin instanceof NextResponse) return admin;
  const id = parseId((await ctx.params).id);
  if (!id) return notFound();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  type Outcome = { error: string; status: number } | null;
  const outcome: Outcome = await withTransaction(async (client) => {
    // Row lock so a close can't race a total change or another close.
    const s = await client.query<{ closed_at: string | null; statement_total_cents: number | null }>(
      'SELECT closed_at, statement_total_cents FROM fin_statements WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (!s.rows[0]) return { error: 'Statement not found.', status: 404 };
    const st = s.rows[0];

    if ('statement_total' in body) {
      if (st.closed_at) return { error: 'This month is closed. Reopen it to change the total.', status: 409 };
      let cents: number | null = null;
      if (body.statement_total !== null && String(body.statement_total).trim() !== '') {
        cents = parseDollarsToCents(String(body.statement_total));
        if (cents === null) return { error: 'Enter the statement total as an amount, e.g. 12,345.67.', status: 400 };
      }
      await client.query('UPDATE fin_statements SET statement_total_cents = $1 WHERE id = $2', [cents, id]);
      return null;
    }

    if (body.action === 'close') {
      if (st.closed_at) return { error: 'This month is already closed.', status: 409 };
      if (st.statement_total_cents === null) return { error: 'Enter the statement total before closing the month.', status: 409 };
      const sum = await client.query<{ total: string }>(
        'SELECT COALESCE(SUM(amount_cents), 0)::text AS total FROM fin_charges WHERE statement_id = $1 AND deleted_at IS NULL',
        [id]
      );
      const total = Number(sum.rows[0].total);
      const expected = Number(st.statement_total_cents);
      if (total !== expected) {
        return {
          error: `Charges add up to ${formatCents(total)} but the statement total is ${formatCents(expected)} (off by ${formatCents(Math.abs(total - expected))}). The month can only close when they match to the cent.`,
          status: 409,
        };
      }
      await client.query('UPDATE fin_statements SET closed_at = now(), closed_by = $1 WHERE id = $2', [admin.id, id]);
      return null;
    }

    if (body.action === 'reopen') {
      if (!st.closed_at) return { error: 'This month is not closed.', status: 409 };
      await client.query('UPDATE fin_statements SET closed_at = NULL, closed_by = NULL WHERE id = $1', [id]);
      return null;
    }

    return { error: 'Nothing to change.', status: 400 };
  });

  if (outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  return NextResponse.json({ statement: await getStatement(id) });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const admin = await requireFinAdmin(req);
  if (admin instanceof NextResponse) return admin;
  const id = parseId((await ctx.params).id);
  if (!id) return notFound();

  const outcome = await withTransaction(async (client) => {
    const s = await client.query<{ closed_at: string | null }>('SELECT closed_at FROM fin_statements WHERE id = $1 FOR UPDATE', [id]);
    if (!s.rows[0]) return { error: 'Statement not found.', status: 404 };
    if (s.rows[0].closed_at) return { error: 'This month is closed. Reopen it before deleting.', status: 409 };
    // Lock every charge row first (waiting for, not skipping, rows a QuickBooks sync
    // is posting right now) so the "nothing synced" count below can't go stale.
    await client.query('SELECT id FROM fin_charges WHERE statement_id = $1 ORDER BY id FOR UPDATE', [id]);
    const synced = await client.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM fin_charges WHERE statement_id = $1 AND (qbo_txn_id IS NOT NULL OR status = 'synced')`,
      [id]
    );
    if (synced.rows[0].n > 0) {
      return { error: `${synced.rows[0].n} charge(s) from this statement are already in QuickBooks, so it can't be deleted.`, status: 409 };
    }
    await client.query('DELETE FROM fin_statements WHERE id = $1', [id]);
    return null;
  });
  if (outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  return NextResponse.json({ ok: true });
}
