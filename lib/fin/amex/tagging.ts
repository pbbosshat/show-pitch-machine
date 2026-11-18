// Tagging validation for a charge: Account + Class from the cached QuickBooks
// lists, plus a free-text memo. Every field starts blank (no suggestions, no
// pre-fill). Server-side rules enforced here:
//   • the account / Class id must exist (active) in fin_qbo_accounts / fin_qbo_classes;
//   • the account must be an expense-type account (Expense, Other Expense, Cost of
//     Goods Sold) and never the Amex card account itself;
//   • Overhead rule: Class "ADMIN" may NOT use an account whose number starts
//     with "D" (D-accounts are show budget accounts, e.g. D2914).
// Queries run on the caller's client when one is passed (the PATCH route holds a
// row lock in a transaction — borrowing a second pooled connection there could
// exhaust the pool under concurrent saves).
// Status follows the fields: account AND Class filled -> 'tagged', else 'new'.

import type { PoolClient } from 'pg';
import { getDb } from '@/lib/db';
import {
  ADMIN_D_ERROR, CARD_ACCOUNT_ERROR, NOT_EXPENSE_ERROR,
  accountDisplayName, isAdminClass, isShowAccount, isTaggableAccount,
} from './rules';

export { ADMIN_D_ERROR, accountDisplayName };

export const MEMO_MAX = 1000;

export interface TagInput {
  /** undefined = leave unchanged; null/'' = clear. */
  account_qbo_id?: string | null;
  class_qbo_id?: string | null;
  memo?: string | null;
}

export interface CurrentTags {
  account_qbo_id: string | null;
  account_name: string | null;
  class_qbo_id: string | null;
  class_name: string | null;
  memo: string | null;
}

export interface ResolvedTags extends CurrentTags {
  status: 'new' | 'tagged';
}

export type TagResult = { ok: true; tags: ResolvedTags } | { ok: false; error: string };

interface AccountRow { qbo_id: string; acct_num: string | null; name: string; fully_qualified_name: string | null; account_type: string | null }
interface ClassRow { qbo_id: string; name: string; fully_qualified_name: string | null }

const clean = (v: unknown): string | null | undefined => {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== 'string' && typeof v !== 'number') return undefined;
  const s = String(v).trim();
  return s === '' ? null : s;
};

/** Read the tag fields from a JSON body. Unknown types are treated as "not sent". */
export function readTagInput(body: Record<string, unknown>): TagInput {
  return {
    account_qbo_id: clean(body.account_qbo_id),
    class_qbo_id: clean(body.class_qbo_id),
    memo: body.memo === undefined ? undefined : typeof body.memo === 'string' ? body.memo : body.memo === null ? null : undefined,
  };
}

export interface ResolveOptions {
  /** Run lookups on this client (e.g. the open transaction). Default: the pool. */
  client?: PoolClient;
  /** The Amex card account's QBO id (refused as a tag). Look it up BEFORE opening a transaction. */
  cardAccountQboId?: string | null;
}

/** Merge the input onto the charge's current tags, validate, and resolve display names + status. */
export async function resolveTags(current: CurrentTags, input: TagInput, opts: ResolveOptions = {}): Promise<TagResult> {
  const db = opts.client ?? getDb();
  const queryOne = async <T,>(sql: string, params: unknown[]): Promise<T | undefined> =>
    ((await db.query(sql, params)).rows[0] as T | undefined);
  const out: CurrentTags = { ...current };

  if (input.account_qbo_id !== undefined) {
    if (input.account_qbo_id === null) {
      out.account_qbo_id = null;
      out.account_name = null;
    } else {
      const a = await queryOne<AccountRow>(
        'SELECT qbo_id, acct_num, name, fully_qualified_name, account_type FROM fin_qbo_accounts WHERE qbo_id = $1 AND active IS NOT FALSE',
        [input.account_qbo_id]
      );
      if (!a) return { ok: false, error: 'That account is not in the QuickBooks chart of accounts. Refresh the lists and try again.' };
      if (opts.cardAccountQboId && a.qbo_id === opts.cardAccountQboId) return { ok: false, error: CARD_ACCOUNT_ERROR };
      if (!isTaggableAccount(a)) return { ok: false, error: NOT_EXPENSE_ERROR };
      out.account_qbo_id = a.qbo_id;
      out.account_name = accountDisplayName(a);
    }
  }

  if (input.class_qbo_id !== undefined) {
    if (input.class_qbo_id === null) {
      out.class_qbo_id = null;
      out.class_name = null;
    } else {
      const c = await queryOne<ClassRow>(
        'SELECT qbo_id, name, fully_qualified_name FROM fin_qbo_classes WHERE qbo_id = $1 AND active IS NOT FALSE',
        [input.class_qbo_id]
      );
      if (!c) return { ok: false, error: 'That Class is not in the QuickBooks Class list. Refresh the lists and try again.' };
      out.class_qbo_id = c.qbo_id;
      out.class_name = c.fully_qualified_name || c.name;
    }
  }

  if (input.memo !== undefined) {
    const memo = (input.memo ?? '').trim();
    if (memo.length > MEMO_MAX) return { ok: false, error: `Memo is too long (max ${MEMO_MAX} characters).` };
    out.memo = memo || null;
  }

  // Overhead rule — checked against the FINAL combination, whichever field changed.
  if (out.account_qbo_id && out.class_qbo_id) {
    // Sequential, not Promise.all: one client runs one query at a time.
    const a = await queryOne<AccountRow>('SELECT qbo_id, acct_num, name, fully_qualified_name, account_type FROM fin_qbo_accounts WHERE qbo_id = $1', [out.account_qbo_id]);
    const c = await queryOne<ClassRow>('SELECT qbo_id, name, fully_qualified_name FROM fin_qbo_classes WHERE qbo_id = $1', [out.class_qbo_id]);
    const acct = a ?? { acct_num: null, name: out.account_name ?? '' };
    const cls = c ?? { name: out.class_name ?? '', fully_qualified_name: null };
    if (isAdminClass(cls) && isShowAccount(acct)) return { ok: false, error: ADMIN_D_ERROR };
  }

  return { ok: true, tags: { ...out, status: out.account_qbo_id && out.class_qbo_id ? 'tagged' : 'new' } };
}
