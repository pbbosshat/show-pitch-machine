// The stored QuickBooks connection (single row, fin_qbo_connection.id = 1) and
// access-token management.
//
// Token refresh is serialized with a row lock so two requests can't both spend the
// same refresh token; Intuit rotates refresh tokens, and the new one is saved in the
// same transaction as the new access token.

import { queryOne, run } from '@/lib/db';
import { withTransaction } from './db';
import { QboOAuthError, refreshAccessToken, revokeToken, type IntuitTokenSet } from './oauth';

/** Refresh when the access token has less than this left. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export interface QboConnectionRow {
  realm_id: string | null;
  access_token: string | null;
  access_expires_at: Date | null;
  refresh_token: string | null;
  refresh_expires_at: Date | null;
  connected_by: number | null;
  connected_at: Date | null;
  card_account_qbo_id: string | null;
}

export class QboNotConnectedError extends Error {
  constructor(message = 'QuickBooks is not connected. An admin needs to connect it on the QuickBooks page.') {
    super(message);
    this.name = 'QboNotConnectedError';
  }
}

const COLS =
  'realm_id, access_token, access_expires_at, refresh_token, refresh_expires_at, connected_by, connected_at, card_account_qbo_id';

export async function getConnection(): Promise<QboConnectionRow | null> {
  return (await queryOne<QboConnectionRow>(`SELECT ${COLS} FROM fin_qbo_connection WHERE id = 1`)) ?? null;
}

export function isConnected(c: QboConnectionRow | null): c is QboConnectionRow & { realm_id: string; refresh_token: string } {
  return Boolean(c?.realm_id && c.refresh_token);
}

function expiries(t: IntuitTokenSet) {
  const now = Date.now();
  return {
    accessExpiresAt: new Date(now + t.expiresIn * 1000),
    refreshExpiresAt: new Date(now + t.refreshExpiresIn * 1000),
  };
}

export interface SaveConnectionResult {
  /** True when this is a different QuickBooks company from the one connected last time. */
  companyChanged: boolean;
  previousRealmId: string | null;
  /** Unsynced charges whose Account/Class were cleared because they belonged to the old company. */
  chargesReset: number;
}

/**
 * Save a brand-new connection after the OAuth callback.
 *
 * Company switch guard: Account, Class and card-account ids are only meaningful
 * inside ONE QuickBooks company. If the admin connects a different company than
 * last time (e.g. the sandbox, then the real books), the old ids would post to the
 * wrong accounts or fail. So when the realm differs from `last_realm_id` (kept
 * across Disconnect), in the same transaction:
 *   - the cached account + Class lists are emptied (the caller refreshes them),
 *   - the card-account setting is cleared (falls back to the default by name),
 *   - every unsynced charge (status new/tagged, no qbo_txn_id) gets its Account and
 *     Class cleared and goes back to status 'new'. Memo and receipt are kept.
 * Synced charges are untouched (they live in the old company already).
 * If no previous realm is known but the list cache is not empty, it is treated as a
 * switch too (we can't prove the cached ids belong to this company).
 */
export async function saveNewConnection(realmId: string, tokens: IntuitTokenSet, userId: number): Promise<SaveConnectionResult> {
  const { accessExpiresAt, refreshExpiresAt } = expiries(tokens);
  return withTransaction(async (tx) => {
    const prev = await tx.queryOne<{ last_realm_id: string | null; realm_id: string | null }>(
      'SELECT last_realm_id, realm_id FROM fin_qbo_connection WHERE id = 1 FOR UPDATE'
    );
    const previousRealmId = prev?.last_realm_id ?? prev?.realm_id ?? null;
    let companyChanged = false;
    if (previousRealmId) companyChanged = previousRealmId !== realmId;
    else {
      const cached = await tx.queryOne<{ n: number }>(
        'SELECT ((SELECT count(*) FROM fin_qbo_accounts) + (SELECT count(*) FROM fin_qbo_classes))::int AS n'
      );
      companyChanged = (cached?.n ?? 0) > 0;
    }

    let chargesReset = 0;
    if (companyChanged) {
      await tx.query('DELETE FROM fin_qbo_accounts');
      await tx.query('DELETE FROM fin_qbo_classes');
      await tx.query('UPDATE fin_qbo_connection SET card_account_qbo_id = NULL WHERE id = 1');
      const reset = await tx.query<{ id: number }>(
        `UPDATE fin_charges
            SET account_qbo_id = NULL, account_name = NULL, class_qbo_id = NULL, class_name = NULL, status = 'new'
          WHERE qbo_txn_id IS NULL AND status IN ('new', 'tagged')
            AND (account_qbo_id IS NOT NULL OR class_qbo_id IS NOT NULL)
          RETURNING id`
      );
      chargesReset = reset.length;
      console.warn(
        `[fin qbo] QuickBooks company changed (${previousRealmId ?? 'unknown'} → ${realmId}): list cache and card account cleared; ` +
          `${chargesReset} unsynced charge(s) had their Account/Class cleared and need re-tagging.`
      );
    }

    await tx.query(
      `INSERT INTO fin_qbo_connection
         (id, realm_id, last_realm_id, access_token, access_expires_at, refresh_token, refresh_expires_at, connected_by, connected_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, now())
       ON CONFLICT (id) DO UPDATE SET
         realm_id = EXCLUDED.realm_id, last_realm_id = EXCLUDED.last_realm_id, access_token = EXCLUDED.access_token,
         access_expires_at = EXCLUDED.access_expires_at, refresh_token = EXCLUDED.refresh_token,
         refresh_expires_at = EXCLUDED.refresh_expires_at, connected_by = EXCLUDED.connected_by,
         connected_at = EXCLUDED.connected_at`,
      [realmId, realmId, tokens.accessToken, accessExpiresAt, tokens.refreshToken, refreshExpiresAt, userId]
    );
    return { companyChanged, previousRealmId, chargesReset };
  });
}

/** Forget the tokens locally (realm too). last_realm_id, card-account setting and list cache are kept. */
async function clearTokens(): Promise<void> {
  await run(
    `UPDATE fin_qbo_connection SET realm_id = NULL, access_token = NULL, access_expires_at = NULL,
       refresh_token = NULL, refresh_expires_at = NULL, connected_by = NULL, connected_at = NULL
     WHERE id = 1`
  );
}

/**
 * Disconnect: revoke the refresh token at Intuit (best effort — a token that is
 * already dead can't be revoked) and clear it locally either way.
 * Returns a warning string if Intuit's revoke call failed.
 */
export async function disconnect(): Promise<{ revokeWarning: string | null }> {
  const c = await getConnection();
  let revokeWarning: string | null = null;
  if (c?.refresh_token) {
    try {
      await revokeToken(c.refresh_token);
    } catch (err) {
      revokeWarning = (err as Error).message;
    }
  }
  await clearTokens();
  return { revokeWarning };
}

/**
 * A usable access token + realm. Refreshes (under a row lock) when the token is
 * expired/expiring or when `force` is set (e.g. after a 401). If Intuit says the
 * refresh token is invalid, the connection is cleared and the admin must reconnect.
 */
export async function getAccessToken(force = false): Promise<{ accessToken: string; realmId: string }> {
  const c = await getConnection();
  if (!isConnected(c)) throw new QboNotConnectedError();
  const fresh =
    !force && c.access_token && c.access_expires_at && c.access_expires_at.getTime() - Date.now() > REFRESH_MARGIN_MS;
  if (fresh) return { accessToken: c.access_token!, realmId: c.realm_id };
  const staleToken = c.access_token;

  try {
    return await withTransaction(async (tx) => {
      const row = await tx.queryOne<QboConnectionRow>(`SELECT ${COLS} FROM fin_qbo_connection WHERE id = 1 FOR UPDATE`);
      if (!isConnected(row ?? null)) throw new QboNotConnectedError();
      const r = row as QboConnectionRow & { realm_id: string; refresh_token: string };
      // Someone else refreshed while we waited for the lock — use theirs.
      const nowFresh =
        r.access_token &&
        r.access_expires_at &&
        r.access_expires_at.getTime() - Date.now() > REFRESH_MARGIN_MS &&
        (!force || r.access_token !== staleToken);
      if (nowFresh) return { accessToken: r.access_token!, realmId: r.realm_id };

      const t = await refreshAccessToken(r.refresh_token);
      const { accessExpiresAt, refreshExpiresAt } = expiries(t);
      await tx.query(
        `UPDATE fin_qbo_connection SET access_token = ?, access_expires_at = ?, refresh_token = ?, refresh_expires_at = ?
         WHERE id = 1`,
        [t.accessToken, accessExpiresAt, t.refreshToken, refreshExpiresAt]
      );
      return { accessToken: t.accessToken, realmId: r.realm_id };
    });
  } catch (err) {
    if (err instanceof QboOAuthError && err.code === 'invalid_grant') {
      await clearTokens();
      throw new QboNotConnectedError(
        'The QuickBooks connection has expired or was revoked. An admin needs to reconnect it on the QuickBooks page.'
      );
    }
    throw err;
  }
}
