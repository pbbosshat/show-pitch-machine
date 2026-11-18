/**
 * /api/fin/charges/[id] — one charge.
 * GET    → { charge }
 * PATCH  { account_qbo_id?, class_qbo_id?, memo? } → { charge }  (tag; null/'' clears a field)
 *        Admin: any charge. Cardholder: only their own.
 *        400 unknown / non-expense account, the Amex card account, unknown Class, or Class ADMIN
 *            with a "D" account · 409 synced (locked), deleted, or the month is closed
 * DELETE → soft-delete a possible duplicate (admin only) → { charge }
 * POST   { action: "keep" } → clear the possible-duplicate flag / restore a deleted duplicate (admin only)
 * A cardholder asking for someone else's charge gets 404.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireFinUser, type FinUser } from '@/lib/fin/auth';
import { MONTH_CLOSED, getChargeForUser, parseId, withTransaction, type ChargeView } from '@/lib/fin/amex/charges';
import { readTagInput, resolveTags, type CurrentTags } from '@/lib/fin/amex/tagging';
import { resolveCardAccount } from '@/lib/fin/qbo/lists';

type Ctx = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ error: 'Charge not found.' }, { status: 404 });
const LOCKED = 'This charge is already in QuickBooks, so it is locked.';

async function load(req: NextRequest, ctx: Ctx): Promise<{ user: FinUser; charge: ChargeView } | NextResponse> {
  const user = await requireFinUser(req);
  if (user instanceof NextResponse) return user;
  const id = parseId((await ctx.params).id);
  const charge = id ? await getChargeForUser(user, id) : undefined;
  if (!charge) return notFound();
  return { user, charge };
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const r = await load(req, ctx);
  if (r instanceof NextResponse) return r;
  return NextResponse.json({ charge: r.charge });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const r = await load(req, ctx);
  if (r instanceof NextResponse) return r;
  const { user, charge } = r;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Send the fields to save.' }, { status: 400 });
  const input = readTagInput(body);
  if (input.account_qbo_id === undefined && input.class_qbo_id === undefined && input.memo === undefined) {
    return NextResponse.json({ error: 'Nothing to save.' }, { status: 400 });
  }

  // Looked up before the transaction so we never hold one pooled connection while
  // waiting for another (resolveTags runs its lookups on the transaction's client).
  const cardAccountQboId = input.account_qbo_id ? (await resolveCardAccount()).account?.qbo_id ?? null : null;

  const outcome = await withTransaction(async (client) => {
    const row = await client.query<CurrentTags & { status: string; qbo_txn_id: string | null; deleted_at: string | null; closed_at: string | null }>(
      `SELECT c.account_qbo_id, c.account_name, c.class_qbo_id, c.class_name, c.memo, c.status, c.qbo_txn_id, c.deleted_at, s.closed_at
         FROM fin_charges c JOIN fin_statements s ON s.id = c.statement_id WHERE c.id = $1 FOR UPDATE OF c`,
      [charge.id]
    );
    const cur = row.rows[0];
    if (!cur) return { error: 'Charge not found.', status: 404 };
    if (cur.status === 'synced' || cur.qbo_txn_id) return { error: LOCKED, status: 409 };
    if (cur.closed_at) return { error: MONTH_CLOSED, status: 409 };
    if (cur.deleted_at) return { error: 'This charge was deleted as a duplicate. Restore it first.', status: 409 };

    const res = await resolveTags(cur, input, { client, cardAccountQboId });
    if (!res.ok) return { error: res.error, status: 400 };
    const t = res.tags;
    await client.query(
      `UPDATE fin_charges SET account_qbo_id = $1, account_name = $2, class_qbo_id = $3, class_name = $4, memo = $5,
              status = $6, tagged_by = $7, tagged_at = now()
        WHERE id = $8`,
      [t.account_qbo_id, t.account_name, t.class_qbo_id, t.class_name, t.memo, t.status, user.id, charge.id]
    );
    return null;
  });
  if (outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  return NextResponse.json({ charge: await getChargeForUser(user, charge.id) });
}

/** Shared by DELETE (soft delete) and POST keep: admin-only duplicate resolution. */
async function resolveDuplicate(req: NextRequest, ctx: Ctx, mode: 'delete' | 'keep') {
  const r = await load(req, ctx);
  if (r instanceof NextResponse) return r;
  const { user, charge } = r;
  if (user.role !== 'admin') return NextResponse.json({ error: 'Admins only' }, { status: 403 });

  const outcome = await withTransaction(async (client) => {
    const row = await client.query<{ status: string; qbo_txn_id: string | null; possible_duplicate: boolean; deleted_at: string | null; closed_at: string | null }>(
      `SELECT c.status, c.qbo_txn_id, c.possible_duplicate, c.deleted_at, s.closed_at
         FROM fin_charges c JOIN fin_statements s ON s.id = c.statement_id WHERE c.id = $1 FOR UPDATE OF c`,
      [charge.id]
    );
    const cur = row.rows[0];
    if (!cur) return { error: 'Charge not found.', status: 404 };
    if (cur.status === 'synced' || cur.qbo_txn_id) return { error: LOCKED, status: 409 };
    if (cur.closed_at) return { error: 'This month is closed. Reopen it to change duplicates.', status: 409 };
    if (mode === 'delete') {
      if (cur.deleted_at) return { error: 'Already deleted.', status: 409 };
      if (!cur.possible_duplicate) return { error: 'Only charges flagged as possible duplicates can be deleted.', status: 409 };
      await client.query('UPDATE fin_charges SET deleted_at = now() WHERE id = $1', [charge.id]);
    } else {
      if (!cur.possible_duplicate && !cur.deleted_at) return { error: 'This charge is not flagged as a duplicate.', status: 409 };
      await client.query('UPDATE fin_charges SET possible_duplicate = FALSE, deleted_at = NULL WHERE id = $1', [charge.id]);
    }
    return null;
  });
  if (outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  return NextResponse.json({ charge: await getChargeForUser(user, charge.id) });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  return resolveDuplicate(req, ctx, 'delete');
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const body = (await req.clone().json().catch(() => ({}))) as Record<string, unknown>;
  if (body.action !== 'keep') {
    // Still enforce access first so a cardholder probing ids gets the same 404.
    const r = await load(req, ctx);
    if (r instanceof NextResponse) return r;
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  }
  return resolveDuplicate(req, ctx, 'keep');
}
