// Charge + statement read models and access rules for MYE Admin. Server-only.
//
// Role rule (enforced here so every route uses the same check): an admin sees
// every charge; a cardholder sees ONLY charges assigned to them that are not
// deleted duplicates. Anything else is "not found" (routes answer 404, never 403,
// so a cardholder can't probe which ids exist).

import type { PoolClient } from 'pg';
import { getDb, query, queryOne } from '@/lib/db';
import type { FinUser } from '@/lib/fin/auth';

export type ChargeStatus = 'new' | 'tagged' | 'synced';

/** Shown when tagging / receipt changes hit a closed month (admins can reopen it). */
export const MONTH_CLOSED = 'This month is closed — reopen it to make changes.';
export const CHARGE_LOCKED = 'This charge is already in QuickBooks, so it is locked.';

export interface ChargeView {
  id: number;
  statement_id: number;
  statement_month: string; // YYYY-MM
  statement_closed: boolean;
  txn_date: string; // YYYY-MM-DD
  amex_description: string;
  extended_details: string | null;
  amex_reference: string | null;
  card_account: string | null;
  card_member: string;
  amount_cents: number;
  cardholder_id: number | null;
  cardholder_name: string | null;
  possible_duplicate: boolean;
  deleted: boolean;
  account_qbo_id: string | null;
  account_name: string | null;
  class_qbo_id: string | null;
  class_name: string | null;
  memo: string | null;
  tagged_by_name: string | null;
  tagged_at: string | null;
  status: ChargeStatus;
  qbo_txn_id: string | null;
  synced_at: string | null;
  receipt_name: string | null;
  receipt_mime: string | null;
  receipt_size: number | null;
  last_sync_ok: boolean | null;
  last_sync_message: string | null;
}

const CHARGE_SELECT = `
  SELECT c.id, c.statement_id, to_char(s.statement_month, 'YYYY-MM') AS statement_month,
         (s.closed_at IS NOT NULL) AS statement_closed,
         to_char(c.txn_date, 'YYYY-MM-DD') AS txn_date,
         c.amex_description, c.extended_details, c.amex_reference, c.card_account, c.card_member,
         c.amount_cents, c.cardholder_id, u.name AS cardholder_name,
         c.possible_duplicate, (c.deleted_at IS NOT NULL) AS deleted,
         c.account_qbo_id, c.account_name, c.class_qbo_id, c.class_name, c.memo,
         tb.name AS tagged_by_name, c.tagged_at, c.status, c.qbo_txn_id, c.synced_at,
         r.file_name AS receipt_name, r.mime_type AS receipt_mime, r.size_bytes AS receipt_size,
         ls.ok AS last_sync_ok, ls.message AS last_sync_message
    FROM fin_charges c
    JOIN fin_statements s ON s.id = c.statement_id
    LEFT JOIN fin_users u  ON u.id = c.cardholder_id
    LEFT JOIN fin_users tb ON tb.id = c.tagged_by
    LEFT JOIN fin_receipts r ON r.charge_id = c.id
    LEFT JOIN LATERAL (
      SELECT l.ok, l.message FROM fin_qbo_sync_log l
       WHERE l.charge_id = c.id ORDER BY l.created_at DESC, l.id DESC LIMIT 1
    ) ls ON TRUE`;

const ORDER = ' ORDER BY s.statement_month DESC, c.txn_date, c.id';

export interface ChargeFilters {
  statementId?: number;
  cardholderId?: number | 'unmatched';
  status?: ChargeStatus;
  /** Include charges from closed months (default: open months only, unless statementId is given). */
  includeClosed?: boolean;
  /** Admin only: include soft-deleted duplicates. */
  includeDeleted?: boolean;
}

/** Charges visible to `user`, filtered. Cardholders are always limited to their own, non-deleted charges. */
export async function listChargesForUser(user: FinUser, f: ChargeFilters): Promise<ChargeView[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (user.role !== 'admin') {
    where.push('c.cardholder_id = ?', 'c.deleted_at IS NULL');
    params.push(user.id);
  } else {
    if (f.cardholderId === 'unmatched') where.push('c.cardholder_id IS NULL');
    else if (f.cardholderId) { where.push('c.cardholder_id = ?'); params.push(f.cardholderId); }
    if (!f.includeDeleted) where.push('c.deleted_at IS NULL');
  }
  if (f.statementId) { where.push('c.statement_id = ?'); params.push(f.statementId); }
  else if (!f.includeClosed) where.push('s.closed_at IS NULL');
  if (f.status) { where.push('c.status = ?'); params.push(f.status); }
  const sql = CHARGE_SELECT + (where.length ? ` WHERE ${where.join(' AND ')}` : '') + ORDER;
  return query<ChargeView>(sql, params);
}

/** One charge if `user` may see it, else undefined (route answers 404). */
export async function getChargeForUser(user: FinUser, id: number): Promise<ChargeView | undefined> {
  if (!Number.isSafeInteger(id) || id <= 0) return undefined;
  if (user.role === 'admin') return queryOne<ChargeView>(`${CHARGE_SELECT} WHERE c.id = ?`, [id]);
  return queryOne<ChargeView>(`${CHARGE_SELECT} WHERE c.id = ? AND c.cardholder_id = ? AND c.deleted_at IS NULL`, [id, user.id]);
}

/** "/api/.../[id]" param -> positive integer, or null. */
export function parseId(raw: string): number | null {
  if (!/^\d{1,15}$/.test(raw)) return null;
  const n = Number(raw);
  return n > 0 ? n : null;
}

// ── Statements ───────────────────────────────────────────────────────────────

export interface StatementSummary {
  id: number;
  statement_month: string; // YYYY-MM
  file_name: string | null;
  uploaded_at: string;
  uploaded_by_name: string | null;
  statement_total_cents: number | null;
  closed_at: string | null;
  closed_by_name: string | null;
  charge_count: number;
  charges_total_cents: number;
  new_count: number;
  tagged_count: number;
  synced_count: number;
  duplicate_count: number;
  deleted_count: number;
  unmatched_count: number;
}

const STATEMENT_SELECT = `
  SELECT s.id, to_char(s.statement_month, 'YYYY-MM') AS statement_month, s.file_name, s.uploaded_at,
         ub.name AS uploaded_by_name, s.statement_total_cents, s.closed_at, cb.name AS closed_by_name,
         COUNT(c.id) FILTER (WHERE c.deleted_at IS NULL)::int AS charge_count,
         COALESCE(SUM(c.amount_cents) FILTER (WHERE c.deleted_at IS NULL), 0)::bigint AS charges_total_cents,
         COUNT(c.id) FILTER (WHERE c.deleted_at IS NULL AND c.status = 'new')::int AS new_count,
         COUNT(c.id) FILTER (WHERE c.deleted_at IS NULL AND c.status = 'tagged')::int AS tagged_count,
         COUNT(c.id) FILTER (WHERE c.deleted_at IS NULL AND c.status = 'synced')::int AS synced_count,
         COUNT(c.id) FILTER (WHERE c.deleted_at IS NULL AND c.possible_duplicate)::int AS duplicate_count,
         COUNT(c.id) FILTER (WHERE c.deleted_at IS NOT NULL)::int AS deleted_count,
         COUNT(c.id) FILTER (WHERE c.deleted_at IS NULL AND c.cardholder_id IS NULL)::int AS unmatched_count
    FROM fin_statements s
    LEFT JOIN fin_charges c ON c.statement_id = s.id
    LEFT JOIN fin_users ub ON ub.id = s.uploaded_by
    LEFT JOIN fin_users cb ON cb.id = s.closed_by`;

const STATEMENT_GROUP = ' GROUP BY s.id, ub.name, cb.name';

export async function listStatements(): Promise<StatementSummary[]> {
  return query<StatementSummary>(`${STATEMENT_SELECT}${STATEMENT_GROUP} ORDER BY s.statement_month DESC`);
}

export async function getStatement(id: number): Promise<StatementSummary | undefined> {
  return queryOne<StatementSummary>(`${STATEMENT_SELECT} WHERE s.id = ?${STATEMENT_GROUP}`, [id]);
}

/** Distinct Card Member names in a statement with no matching user. */
export async function listUnmatchedNames(statementId: number): Promise<Array<{ card_member: string; charge_count: number; total_cents: number }>> {
  return query(
    `SELECT MIN(card_member) AS card_member, COUNT(*)::int AS charge_count, SUM(amount_cents)::bigint AS total_cents
       FROM fin_charges
      WHERE statement_id = ? AND cardholder_id IS NULL AND deleted_at IS NULL
      GROUP BY upper(regexp_replace(trim(card_member), '\\s+', ' ', 'g'))
      ORDER BY 1`,
    [statementId]
  );
}

/** "2026-11" -> "November 2026". */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${names[m - 1] ?? '?'} ${y}`;
}

// ── Transactions ─────────────────────────────────────────────────────────────
/** Run `fn` inside BEGIN/COMMIT on one pooled client (use $1-style placeholders with client.query). */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getDb().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
