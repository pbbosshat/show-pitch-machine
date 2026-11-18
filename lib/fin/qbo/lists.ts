// Cached QuickBooks lists (chart of accounts + classes) and the card-account setting.
//
// The cache lets tagging keep working while QuickBooks is disconnected or not
// configured. "Refresh lists" pulls ACTIVE accounts and classes; anything cached
// that QuickBooks no longer returns is marked inactive (never deleted, because
// tagged charges may still point at it).

import { query, queryOne, run } from '@/lib/db';
import { DEFAULT_CARD_ACCOUNT_NAME } from './config';
import { qboQuery } from './client';
import { withTransaction, type Tx } from './db';

const PAGE = 1000;

/** QuickBooks AccountType of a credit-card account. Only these can be the card account. */
export const CARD_ACCOUNT_TYPE = 'Credit Card';

export interface CachedAccount {
  qbo_id: string;
  acct_num: string | null;
  name: string;
  fully_qualified_name: string | null;
  account_type: string | null;
}
export interface CachedClass {
  qbo_id: string;
  name: string;
  fully_qualified_name: string | null;
}

interface QboAccount {
  Id: string;
  Name: string;
  AcctNum?: string;
  FullyQualifiedName?: string;
  AccountType?: string;
  Active?: boolean;
}
interface QboClass {
  Id: string;
  Name: string;
  FullyQualifiedName?: string;
  Active?: boolean;
}

async function queryAll<T>(entity: 'Account' | 'Class'): Promise<T[]> {
  const out: T[] = [];
  for (let start = 1; ; start += PAGE) {
    const resp = await qboQuery(`SELECT * FROM ${entity} WHERE Active = true STARTPOSITION ${start} MAXRESULTS ${PAGE}`);
    const rows = (resp[entity] as T[] | undefined) ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

/** Pull active accounts + classes from QuickBooks into the cache tables. */
export async function refreshLists(): Promise<{ accounts: number; classes: number; refreshedAt: string }> {
  const [accounts, classes] = await Promise.all([queryAll<QboAccount>('Account'), queryAll<QboClass>('Class')]);
  const now = new Date();
  await withTransaction(async (tx) => {
    for (const a of accounts) {
      await tx.query(
        `INSERT INTO fin_qbo_accounts (qbo_id, acct_num, name, fully_qualified_name, account_type, active, refreshed_at)
         VALUES (?, ?, ?, ?, ?, TRUE, ?)
         ON CONFLICT (qbo_id) DO UPDATE SET acct_num = EXCLUDED.acct_num, name = EXCLUDED.name,
           fully_qualified_name = EXCLUDED.fully_qualified_name, account_type = EXCLUDED.account_type,
           active = TRUE, refreshed_at = EXCLUDED.refreshed_at`,
        [String(a.Id), a.AcctNum?.trim() || null, a.Name, a.FullyQualifiedName ?? a.Name, a.AccountType ?? null, now]
      );
    }
    await tx.query('UPDATE fin_qbo_accounts SET active = FALSE WHERE refreshed_at IS DISTINCT FROM ?', [now]);
    for (const c of classes) {
      await tx.query(
        `INSERT INTO fin_qbo_classes (qbo_id, name, fully_qualified_name, active, refreshed_at)
         VALUES (?, ?, ?, TRUE, ?)
         ON CONFLICT (qbo_id) DO UPDATE SET name = EXCLUDED.name,
           fully_qualified_name = EXCLUDED.fully_qualified_name, active = TRUE, refreshed_at = EXCLUDED.refreshed_at`,
        [String(c.Id), c.Name, c.FullyQualifiedName ?? c.Name, now]
      );
    }
    await tx.query('UPDATE fin_qbo_classes SET active = FALSE WHERE refreshed_at IS DISTINCT FROM ?', [now]);
  });
  return { accounts: accounts.length, classes: classes.length, refreshedAt: now.toISOString() };
}

/** Active cached lists, for the tagging dropdowns. Works with QuickBooks disconnected. */
export async function getCachedLists(): Promise<{
  accounts: CachedAccount[];
  classes: CachedClass[];
  refreshedAt: string | null;
}> {
  const [accounts, classes, last] = await Promise.all([
    query<CachedAccount>(
      `SELECT qbo_id, acct_num, name, fully_qualified_name, account_type FROM fin_qbo_accounts
        WHERE active = TRUE ORDER BY acct_num NULLS LAST, fully_qualified_name, name`
    ),
    query<CachedClass>(
      `SELECT qbo_id, name, fully_qualified_name FROM fin_qbo_classes
        WHERE active = TRUE ORDER BY fully_qualified_name, name`
    ),
    queryOne<{ t: Date | null }>(
      `SELECT GREATEST((SELECT max(refreshed_at) FROM fin_qbo_accounts), (SELECT max(refreshed_at) FROM fin_qbo_classes)) AS t`
    ),
  ]);
  return { accounts, classes, refreshedAt: last?.t ? new Date(last.t).toISOString() : null };
}

/** Find the default card account ("2200 MCS Show AMEX", Credit Card type only) in the cache. */
export async function findDefaultCardAccount(): Promise<CachedAccount | null> {
  const row = await queryOne<CachedAccount>(
    `SELECT qbo_id, acct_num, name, fully_qualified_name, account_type FROM fin_qbo_accounts
      WHERE active = TRUE AND account_type = ? AND (
            upper(name) = upper(?)
         OR upper(fully_qualified_name) = upper(?)
         OR upper(coalesce(acct_num, '') || ' ' || name) = upper(?)
         OR (acct_num = '2200' AND upper(name) LIKE '%AMEX%'))
      ORDER BY CASE WHEN upper(name) = upper(?) THEN 0 ELSE 1 END
      LIMIT 1`,
    [CARD_ACCOUNT_TYPE, DEFAULT_CARD_ACCOUNT_NAME, DEFAULT_CARD_ACCOUNT_NAME, DEFAULT_CARD_ACCOUNT_NAME, DEFAULT_CARD_ACCOUNT_NAME]
  );
  return row ?? null;
}

/**
 * The account purchases post against: the saved setting if set (and still active
 * in the cache AND a Credit Card account), else the default "2200 MCS Show AMEX".
 * `defaulted` tells the UI which one it is.
 */
export async function resolveCardAccount(): Promise<{ account: CachedAccount | null; defaulted: boolean; savedId: string | null }> {
  const conn = await queryOne<{ card_account_qbo_id: string | null }>(
    'SELECT card_account_qbo_id FROM fin_qbo_connection WHERE id = 1'
  );
  const savedId = conn?.card_account_qbo_id ?? null;
  if (savedId) {
    const acct = await queryOne<CachedAccount>(
      `SELECT qbo_id, acct_num, name, fully_qualified_name, account_type FROM fin_qbo_accounts
        WHERE qbo_id = ? AND active = TRUE AND account_type = ?`,
      [savedId, CARD_ACCOUNT_TYPE]
    );
    if (acct) return { account: acct, defaulted: false, savedId };
  }
  return { account: await findDefaultCardAccount(), defaulted: true, savedId };
}

/** Save (or clear, with null) the card-account setting. Must be an active Credit Card account in the cache. */
export async function setCardAccount(qboId: string | null): Promise<void> {
  if (qboId !== null) {
    const a = await queryOne<{ account_type: string | null }>(
      'SELECT account_type FROM fin_qbo_accounts WHERE qbo_id = ? AND active = TRUE',
      [qboId]
    );
    if (!a) throw new Error('That account is not in the QuickBooks list. Refresh lists and try again.');
    if (a.account_type !== CARD_ACCOUNT_TYPE) {
      throw new Error(`The card account must be a Credit Card account in QuickBooks (this one is "${a.account_type ?? 'unknown type'}").`);
    }
  }
  await run(
    `INSERT INTO fin_qbo_connection (id, card_account_qbo_id) VALUES (1, ?)
     ON CONFLICT (id) DO UPDATE SET card_account_qbo_id = EXCLUDED.card_account_qbo_id`,
    [qboId]
  );
}

/**
 * Why a charge's Account / Class can't be posted to the CURRENT QuickBooks company,
 * or null if both are present and active in the cached lists. Guards against ids
 * left over from another company or deleted/inactive in QuickBooks.
 */
export async function tagProblem(accountQboId: string, classQboId: string, db?: Pick<Tx, 'queryOne'>): Promise<string | null> {
  const q: Pick<Tx, 'queryOne'> = db ?? { queryOne };
  const r = await q.queryOne<{ acct: boolean; cls: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM fin_qbo_accounts WHERE qbo_id = ? AND active = TRUE) AS acct,
            EXISTS (SELECT 1 FROM fin_qbo_classes WHERE qbo_id = ? AND active = TRUE) AS cls`,
    [accountQboId, classQboId]
  );
  const missing = [r?.acct ? null : 'Account', r?.cls ? null : 'Class'].filter(Boolean);
  if (!missing.length) return null;
  return `The ${missing.join(' and ')} on this charge ${missing.length > 1 ? 'are' : 'is'} not in the current QuickBooks lists (deleted, made inactive, or from a different QuickBooks company). Refresh lists and re-tag the charge.`;
}
