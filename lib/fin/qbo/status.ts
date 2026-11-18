// Read-only summaries for the QuickBooks page: connection status and the sync log.

import { query, queryOne } from '@/lib/db';
import { isQboConfigured, qboEnvironment, type QboEnvironment } from './config';
import { getConnection, isConnected } from './connection';
import { resolveCardAccount, type CachedAccount } from './lists';

export interface QboStatus {
  configured: boolean;
  environment: QboEnvironment;
  connected: boolean;
  realmId: string | null;
  connectedAt: string | null;
  connectedByName: string | null;
  refreshExpiresAt: string | null;
  cardAccount: CachedAccount | null;
  cardAccountDefaulted: boolean;
  /** A card account was saved but is no longer in the active list. */
  cardAccountMissing: boolean;
  lists: { accounts: number; classes: number; refreshedAt: string | null };
}

const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString() : null);

export async function getQboStatus(): Promise<QboStatus> {
  const [conn, card, counts] = await Promise.all([
    getConnection(),
    resolveCardAccount(),
    queryOne<{ accounts: number; classes: number; refreshed_at: Date | null }>(
      `SELECT (SELECT count(*)::int FROM fin_qbo_accounts WHERE active) AS accounts,
              (SELECT count(*)::int FROM fin_qbo_classes WHERE active) AS classes,
              GREATEST((SELECT max(refreshed_at) FROM fin_qbo_accounts), (SELECT max(refreshed_at) FROM fin_qbo_classes)) AS refreshed_at`
    ),
  ]);
  const connected = isConnected(conn);
  let connectedByName: string | null = null;
  if (connected && conn?.connected_by) {
    connectedByName = (await queryOne<{ name: string }>('SELECT name FROM fin_users WHERE id = ?', [conn.connected_by]))?.name ?? null;
  }
  return {
    configured: isQboConfigured(),
    environment: qboEnvironment(),
    connected,
    realmId: connected ? conn!.realm_id : null,
    connectedAt: connected ? iso(conn!.connected_at) : null,
    connectedByName,
    refreshExpiresAt: connected ? iso(conn!.refresh_expires_at) : null,
    cardAccount: card.account,
    cardAccountDefaulted: card.defaulted,
    cardAccountMissing: Boolean(card.savedId) && card.defaulted,
    lists: { accounts: counts?.accounts ?? 0, classes: counts?.classes ?? 0, refreshedAt: iso(counts?.refreshed_at) },
  };
}

export interface SyncLogRow {
  id: number;
  charge_id: number | null;
  ok: boolean;
  message: string | null;
  qbo_txn_id: string | null;
  created_at: string;
  created_by_name: string | null;
  txn_date: string | null;
  amex_description: string | null;
  amount_cents: number | null;
  statement_id: number | null;
}

export async function getSyncLog(opts: { limit?: number; chargeId?: number; statementId?: number } = {}): Promise<SyncLogRow[]> {
  const limit = Math.min(Math.max(Math.trunc(opts.limit ?? 50), 1), 500);
  const where: string[] = [];
  const params: unknown[] = [];
  if (opts.chargeId !== undefined) {
    where.push('l.charge_id = ?');
    params.push(opts.chargeId);
  }
  if (opts.statementId !== undefined) {
    where.push('c.statement_id = ?');
    params.push(opts.statementId);
  }
  params.push(limit);
  const rows = await query<SyncLogRow & { created_at: Date }>(
    `SELECT l.id, l.charge_id, l.ok, l.message, l.qbo_txn_id, l.created_at, u.name AS created_by_name,
            to_char(c.txn_date, 'YYYY-MM-DD') AS txn_date, c.amex_description, c.amount_cents, c.statement_id
       FROM fin_qbo_sync_log l
       LEFT JOIN fin_charges c ON c.id = l.charge_id
       LEFT JOIN fin_users u ON u.id = l.created_by
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY l.created_at DESC, l.id DESC
      LIMIT ?`,
    params
  );
  return rows.map((r) => ({ ...r, created_at: new Date(r.created_at).toISOString() }));
}
