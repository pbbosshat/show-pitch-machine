// Post tagged Amex charges to QuickBooks as credit-card Purchases.
//
// ── What gets posted ─────────────────────────────────────────────────────────
// One Purchase per charge: PaymentType "CreditCard", AccountRef = the card account
// ("2200 MCS Show AMEX" or the saved setting), TxnDate = charge date, one
// AccountBasedExpenseLineDetail line (Amount, AccountRef = tagged account,
// ClassRef = tagged Class, Description = memo — or the Amex description if the memo
// is blank), PrivateNote = "<Amex description> — MYE Admin charge #<id>".
//
// Credits (negative amounts): QuickBooks Online has no separate "CreditCardCredit"
// entity in the v3 API. A credit card credit is a Purchase with `Credit: true` and
// a POSITIVE amount (Intuit schema: "If Credit is Null or False, it is considered as
// Charge. If true, the CreditCard represents a Refund. Valid only for CreditCard
// transaction"). So credits post as Purchase + Credit:true + Math.abs(amount).
// qbo_txn_type is 'Purchase' for both (it's the QBO entity name used to look it up).
//
// ── Never double-post ────────────────────────────────────────────────────────
// 1. Only charges with status 'tagged', not deleted, and qbo_txn_id NULL are posted.
// 2. Each charge is posted while holding `SELECT … FOR UPDATE SKIP LOCKED` on its row,
//    and qbo_txn_id/status are saved in that same transaction. A second concurrent
//    sync can't lock the row, so it reports "being synced right now" and posts nothing;
//    once the first commits, qbo_txn_id is set and later syncs skip it.
// 3. Intuit `requestid` = "mye-chg-<chargeId>-<payloadHash>-a<n>". Intuit replays the
//    original response for a repeated requestid instead of creating a second
//    Purchase, so a retry of the SAME payload after a crash/timeout gets the same Id.
//      <payloadHash> = first 10 hex of sha256 of the exact Purchase JSON (card
//        account, Account, Class, amount, date, memo, note). If the charge was
//        re-tagged since, the id changes, so Intuit can't replay an old payload.
//      <n> = number of DEFINITE rejections logged ("QuickBooks error: …"). After a
//        rejection nothing was created, so the next try gets a fresh id instead of
//        Intuit replaying the old error.
// 4. Changed payload after an "Outcome unknown" attempt (or after QuickBooks accepted
//    a post we then failed to save): QuickBooks MAY already hold the original
//    Purchase, and a new requestid would not be deduped. So before posting we run a
//    read-only query for Purchases on the charge date and look for PrivateNote
//    ending "MYE Admin charge #<id>". If found, that Id is saved as synced (nothing
//    is posted) and the log says QuickBooks has the ORIGINAL tags, so accounting
//    must correct the Account/Class/Memo in QuickBooks. If not found, we post.
//    Residual risk: Intuit only remembers requestids for a limited time (not
//    documented); the PrivateNote lookup covers changed payloads but a same-payload
//    retry many days later relies on Intuit's memory. The sync log shows every case.
// 5. If the database fails after QuickBooks accepted a post, the error is logged
//    (savepoint inside the transaction, or a separate pool write if the whole
//    transaction died) with the QuickBooks transaction Id, and the retry recovers it
//    via (3) or (4).
// 6. A charge whose Account or Class is not present + active in the cached lists is
//    refused ("Not sent: …") — e.g. ids left over from another QuickBooks company.
//
// Every attempt writes a fin_qbo_sync_log row. Nothing in QuickBooks is ever edited
// or deleted.

import { createHash } from 'node:crypto';
import { query, queryOne, run } from '@/lib/db';
import { centsToDollarsNumber } from '@/lib/fin/money';
import { isQboConfigured } from './config';
import { QboRejectedError, QboUncertainError, qboCreate, qboQuery, qboUploadAttachable } from './client';
import { getConnection, isConnected } from './connection';
import { withTransaction, type Tx } from './db';
import { resolveCardAccount, tagProblem } from './lists';

export const LOG_PREFIX_REJECTED = 'QuickBooks error: ';
export const LOG_PREFIX_UNCERTAIN = 'Outcome unknown: ';
export const LOG_PREFIX_NOT_SENT = 'Not sent: ';
export const LOG_PREFIX_RECEIPT_REJECTED = 'QuickBooks error (receipt): ';
/** QuickBooks created the Purchase but saving its Id here failed. */
export const LOG_PREFIX_ACCEPTED_NOT_SAVED = 'In QuickBooks, not saved here: ';

export interface SyncResult {
  chargeId: number;
  ok: boolean;
  qboTxnId?: string;
  error?: string;
  /** true when the charge wasn't eligible (already synced, not tagged, deleted, busy) — nothing was attempted. */
  skipped?: boolean;
  /** Receipt upload outcome, when the charge has a receipt. */
  receipt?: 'attached' | 'failed';
  receiptError?: string;
  /** Set when the charge was matched to a Purchase QuickBooks already had (original tags). */
  warning?: string;
}

export interface ChargeForSync {
  id: number;
  txn_date: string; // YYYY-MM-DD
  amex_description: string;
  amount_cents: number;
  account_qbo_id: string | null;
  class_qbo_id: string | null;
  memo: string | null;
}

const MAX_TEXT = 4000;

function clip(s: string, max = MAX_TEXT): string {
  return s.length <= max ? s : s.slice(0, max);
}

/** The exact JSON body sent to POST /purchase. Pure — exported for tests. */
export function buildPurchaseBody(c: ChargeForSync, cardAccountQboId: string): Record<string, unknown> {
  const isCredit = c.amount_cents < 0;
  const suffix = ` — MYE Admin charge #${c.id}`;
  const memo = c.memo?.trim();
  const body: Record<string, unknown> = {
    PaymentType: 'CreditCard',
    AccountRef: { value: cardAccountQboId },
    TxnDate: c.txn_date,
    PrivateNote: clip(c.amex_description, MAX_TEXT - suffix.length) + suffix,
    Line: [
      {
        Amount: centsToDollarsNumber(Math.abs(c.amount_cents)),
        DetailType: 'AccountBasedExpenseLineDetail',
        Description: clip(memo || c.amex_description),
        AccountBasedExpenseLineDetail: {
          AccountRef: { value: c.account_qbo_id },
          ClassRef: { value: c.class_qbo_id },
        },
      },
    ],
  };
  if (isCredit) body.Credit = true;
  return body;
}

async function log(
  db: Tx | null,
  chargeId: number,
  ok: boolean,
  message: string,
  qboTxnId: string | null,
  userId: number,
  requestId: string | null = null
): Promise<void> {
  const sql =
    'INSERT INTO fin_qbo_sync_log (charge_id, ok, message, qbo_txn_id, created_by, request_id) VALUES (?, ?, ?, ?, ?, ?)';
  const params = [chargeId, ok, clip(message), qboTxnId, userId, requestId];
  if (db) await db.query(sql, params);
  else await run(sql, params);
}

async function rejectionCount(tx: Tx, chargeId: number, prefix: string): Promise<number> {
  const r = await tx.queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM fin_qbo_sync_log WHERE charge_id = ? AND ok = FALSE AND message LIKE ?`,
    [chargeId, `${prefix}%`]
  );
  return r?.n ?? 0;
}

interface LockedCharge extends ChargeForSync {
  status: string;
  deleted_at: Date | null;
  qbo_txn_id: string | null;
}

function ineligibleReason(c: { status: string; deleted_at: Date | null; qbo_txn_id: string | null }): string | null {
  if (c.qbo_txn_id) return `Already in QuickBooks (transaction ${c.qbo_txn_id}).`;
  if (c.deleted_at) return 'This charge was deleted.';
  if (c.status !== 'tagged') return c.status === 'synced' ? 'Already synced.' : 'Not tagged yet (needs an Account and a Class).';
  return null;
}

/** Short hash of the exact Purchase JSON — part of the Intuit requestid. Exported for tests. */
export function payloadHash(body: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(body)).digest('hex').slice(0, 10);
}

/** Read-only: the Id of a Purchase QuickBooks already holds for this charge (matched on PrivateNote), or null. */
async function findExistingPurchase(c: ChargeForSync): Promise<string | null> {
  const tag = `MYE Admin charge #${c.id}`;
  for (let start = 1; ; start += 1000) {
    const resp = await qboQuery(
      `SELECT * FROM Purchase WHERE TxnDate = '${c.txn_date}' STARTPOSITION ${start} MAXRESULTS 1000`
    );
    const rows = (resp.Purchase as Array<{ Id: string; PrivateNote?: string }> | undefined) ?? [];
    const hit = rows.find((p) => (p.PrivateNote ?? '').trimEnd().endsWith(tag));
    if (hit) return String(hit.Id);
    if (rows.length < 1000) return null;
  }
}

function acceptedNotSavedMessage(txnId: string, err: unknown): string {
  return (
    `${LOG_PREFIX_ACCEPTED_NOT_SAVED}QuickBooks accepted this charge as Purchase #${txnId}, but saving that here failed ` +
    `(${(err as Error).message}). Do not enter it in QuickBooks by hand; Retry will record the existing transaction.`
  );
}

/** Post one charge under its row lock. */
async function postCharge(chargeId: number, cardAccountQboId: string, userId: number): Promise<SyncResult> {
  // Survives a failed transaction, so the error can say QuickBooks already accepted it.
  const st: { txnId: string | null; requestId: string | null } = { txnId: null, requestId: null };
  let outcome: SyncResult | 'busy';
  try {
    outcome = await withTransaction<SyncResult | 'busy'>(async (tx) => {
      const c = await tx.queryOne<LockedCharge>(
        `SELECT id, to_char(txn_date, 'YYYY-MM-DD') AS txn_date, amex_description, amount_cents,
                account_qbo_id, class_qbo_id, memo, status, deleted_at, qbo_txn_id
           FROM fin_charges WHERE id = ? FOR UPDATE SKIP LOCKED`,
        [chargeId]
      );
      if (!c) return 'busy';

      const reason = ineligibleReason(c);
      if (reason) return { chargeId, ok: false, skipped: true, error: reason, qboTxnId: c.qbo_txn_id ?? undefined };

      let notSent: string | null = null;
      if (!c.account_qbo_id || !c.class_qbo_id) notSent = 'The charge needs both an Account and a Class.';
      else if (!c.amount_cents) notSent = 'The amount is $0.00, so there is nothing to post.';
      else notSent = await tagProblem(c.account_qbo_id, c.class_qbo_id, tx);
      if (notSent) {
        await log(tx, chargeId, false, LOG_PREFIX_NOT_SENT + notSent, null, userId);
        return { chargeId, ok: false, error: notSent };
      }

      const body = buildPurchaseBody(c, cardAccountQboId);
      const attemptNo = await rejectionCount(tx, chargeId, LOG_PREFIX_REJECTED);
      const requestId = `mye-chg-${chargeId}-${payloadHash(body)}-a${attemptNo}`;
      st.requestId = requestId;

      // Saves the Id + ok log under a savepoint, so a DB error here still leaves a log row.
      const saveSynced = async (txnId: string, okMessage: string): Promise<string | null> => {
        await tx.query('SAVEPOINT fin_save_synced');
        try {
          await tx.query(
            `UPDATE fin_charges SET status = 'synced', qbo_txn_id = ?, qbo_txn_type = 'Purchase', synced_at = now()
              WHERE id = ?`,
            [txnId, chargeId]
          );
          await log(tx, chargeId, true, okMessage, txnId, userId, requestId);
          await tx.query('RELEASE SAVEPOINT fin_save_synced');
          return null;
        } catch (dbErr) {
          await tx.query('ROLLBACK TO SAVEPOINT fin_save_synced');
          const m = acceptedNotSavedMessage(txnId, dbErr);
          await log(tx, chargeId, false, m, txnId, userId, requestId);
          return m;
        }
      };

      // An earlier attempt may have created the Purchase with a DIFFERENT payload.
      const maybeCreated = await tx.queryOne<{ n: number }>(
        `SELECT count(*)::int AS n FROM fin_qbo_sync_log
          WHERE charge_id = ? AND ok = FALSE AND (message LIKE ? OR message LIKE ?)
            AND request_id IS DISTINCT FROM ?`,
        [chargeId, `${LOG_PREFIX_UNCERTAIN}%`, `${LOG_PREFIX_ACCEPTED_NOT_SAVED}%`, requestId]
      );
      if (maybeCreated?.n) {
        let existing: string | null;
        try {
          existing = await findExistingPurchase(c);
        } catch (err) {
          const m = `${LOG_PREFIX_NOT_SENT}An earlier attempt may already be in QuickBooks and checking for it failed (${(err as Error).message}). Nothing was posted; try again.`;
          await log(tx, chargeId, false, m, null, userId, requestId);
          return { chargeId, ok: false, error: m };
        }
        if (existing) {
          st.txnId = existing;
          const warning =
            `QuickBooks already had this charge as Purchase #${existing} from an earlier attempt whose outcome was unknown. ` +
            'It was recorded here as synced and NOT posted again. That Purchase has the ORIGINAL Account/Class/Memo from the ' +
            'earlier attempt, not the current tags — accounting must correct it in QuickBooks.';
          const failed = await saveSynced(existing, `Matched existing Purchase #${existing}. ${warning}`);
          if (failed) return { chargeId, ok: false, error: failed };
          return { chargeId, ok: true, qboTxnId: existing, warning };
        }
      }

      let txnId: string;
      try {
        const created = await qboCreate<{ Id: string }>('purchase', body, requestId);
        txnId = String(created.Id);
      } catch (err) {
        let message: string;
        if (err instanceof QboRejectedError) message = LOG_PREFIX_REJECTED + err.message;
        else if (err instanceof QboUncertainError)
          message = `${LOG_PREFIX_UNCERTAIN}${err.message.replace(/\.?$/, '.')} Retrying is safe: QuickBooks will not create a duplicate.`;
        else message = LOG_PREFIX_NOT_SENT + (err as Error).message;
        await log(tx, chargeId, false, message, null, userId, requestId);
        return { chargeId, ok: false, error: message };
      }
      st.txnId = txnId;
      const failed = await saveSynced(
        txnId,
        `Posted as ${c.amount_cents < 0 ? 'credit card credit (Purchase, Credit=true)' : 'Purchase'} #${txnId} (requestid ${requestId}).`
      );
      if (failed) return { chargeId, ok: false, error: failed };
      return { chargeId, ok: true, qboTxnId: txnId };
    });
  } catch (err) {
    // The transaction itself died (connection lost, COMMIT failed…). Log on a fresh pool connection.
    const message = st.txnId
      ? acceptedNotSavedMessage(st.txnId, err)
      : `${LOG_PREFIX_NOT_SENT}Database error: ${(err as Error).message}`;
    await log(null, chargeId, false, message, st.txnId, userId, st.requestId).catch((logErr) =>
      console.error('[fin qbo sync] could not write sync log:', logErr, 'original:', message)
    );
    return { chargeId, ok: false, error: message };
  }

  if (outcome !== 'busy') return outcome;
  const exists = await queryOne('SELECT 1 FROM fin_charges WHERE id = ?', [chargeId]);
  return exists
    ? { chargeId, ok: false, skipped: true, error: 'Another sync is posting this charge right now.' }
    : { chargeId, ok: false, skipped: true, error: 'Charge not found.' };
}

/** Upload the charge's receipt as an Attachable, if it has one not yet uploaded. */
async function attachReceipt(chargeId: number, userId: number): Promise<Pick<SyncResult, 'receipt' | 'receiptError'>> {
  try {
    return await withTransaction(async (tx) => {
      const r = await tx.queryOne<{ id: number; file_name: string | null; mime_type: string | null; data: Buffer; qbo_txn_id: string }>(
        `SELECT r.id, r.file_name, r.mime_type, r.data, c.qbo_txn_id
           FROM fin_receipts r JOIN fin_charges c ON c.id = r.charge_id
          WHERE r.charge_id = ? AND r.qbo_attachable_id IS NULL AND c.qbo_txn_id IS NOT NULL
          FOR UPDATE OF r SKIP LOCKED`,
        [chargeId]
      );
      if (!r) return {};
      const attemptNo = await rejectionCount(tx, chargeId, LOG_PREFIX_RECEIPT_REJECTED);
      const contentType = r.mime_type || 'application/octet-stream';
      const ext = contentType === 'application/pdf' ? 'pdf' : contentType.split('/')[1] || 'bin';
      try {
        const attId = await qboUploadAttachable({
          entityType: 'Purchase',
          entityId: r.qbo_txn_id,
          fileName: r.file_name || `receipt-charge-${chargeId}.${ext}`,
          contentType,
          data: r.data,
          requestId: `mye-rcpt-${r.id}-a${attemptNo}`,
        });
        await tx.query('UPDATE fin_receipts SET qbo_attachable_id = ? WHERE id = ?', [attId, r.id]);
        await log(tx, chargeId, true, `Receipt attached (Attachable #${attId}).`, r.qbo_txn_id, userId);
        return { receipt: 'attached' as const };
      } catch (err) {
        const message =
          err instanceof QboRejectedError
            ? LOG_PREFIX_RECEIPT_REJECTED + err.message
            : `${LOG_PREFIX_UNCERTAIN}receipt upload — ${(err as Error).message}`;
        await log(tx, chargeId, false, message, r.qbo_txn_id, userId);
        return { receipt: 'failed' as const, receiptError: message };
      }
    });
  } catch (err) {
    return { receipt: 'failed', receiptError: (err as Error).message };
  }
}

/**
 * Sync charges to QuickBooks.
 * - `chargeIds`: exactly these charges. Ineligible ones come back as
 *   { ok:false, skipped:true, error:<reason> } (already synced, not tagged, deleted, busy, not found).
 *   Already-synced charges with a receipt not yet uploaded get the receipt retried.
 * - `statementId`: every eligible charge in that statement (ineligible ones are OMITTED),
 *   plus synced charges in it whose receipt hasn't been uploaded yet.
 * - neither: every eligible charge in every statement.
 */
export async function syncCharges(opts: { chargeIds?: number[]; statementId?: number; userId: number }): Promise<SyncResult[]> {
  const { userId } = opts;
  let ids: number[];
  let receiptOnly: number[] = [];
  if (opts.chargeIds?.length) {
    ids = [...new Set(opts.chargeIds)];
  } else {
    const where = opts.statementId !== undefined ? 'AND statement_id = ?' : '';
    const params = opts.statementId !== undefined ? [opts.statementId] : [];
    ids = (
      await query<{ id: number }>(
        `SELECT id FROM fin_charges
          WHERE status = 'tagged' AND deleted_at IS NULL AND qbo_txn_id IS NULL ${where}
          ORDER BY txn_date, id`,
        params
      )
    ).map((r) => Number(r.id));
    receiptOnly = (
      await query<{ id: number }>(
        `SELECT c.id FROM fin_charges c JOIN fin_receipts r ON r.charge_id = c.id
          WHERE c.qbo_txn_id IS NOT NULL AND r.qbo_attachable_id IS NULL ${where.replace('statement_id', 'c.statement_id')}
          ORDER BY c.txn_date, c.id`,
        params
      )
    ).map((r) => Number(r.id));
  }

  // Preflight: if QuickBooks can't be used at all, report it on each charge without posting.
  let blocker: string | null = null;
  let cardAccountId: string | null = null;
  if (!isQboConfigured()) blocker = "QuickBooks isn't configured yet.";
  else if (!isConnected(await getConnection())) blocker = 'QuickBooks is not connected. Connect it on the QuickBooks page.';
  else {
    const { account } = await resolveCardAccount();
    if (!account) blocker = 'No card account is set. Refresh lists on the QuickBooks page and pick the Amex account.';
    else cardAccountId = account.qbo_id;
  }

  const results: SyncResult[] = [];
  if (blocker || !cardAccountId) {
    const msg = blocker ?? 'No card account is set.';
    const rows = ids.length
      ? await query<{ id: number; status: string; deleted_at: Date | null; qbo_txn_id: string | null }>(
          'SELECT id, status, deleted_at, qbo_txn_id FROM fin_charges WHERE id = ANY(?::bigint[])',
          [ids]
        )
      : [];
    const byId = new Map(rows.map((r) => [Number(r.id), r]));
    for (const id of ids) {
      const r = byId.get(id);
      if (!r) {
        results.push({ chargeId: id, ok: false, skipped: true, error: 'Charge not found.' });
        continue;
      }
      const reason = ineligibleReason(r);
      if (reason) {
        results.push({ chargeId: id, ok: false, skipped: true, error: reason, qboTxnId: r.qbo_txn_id ?? undefined });
        continue;
      }
      await log(null, id, false, LOG_PREFIX_NOT_SENT + msg, null, userId);
      results.push({ chargeId: id, ok: false, error: msg });
    }
    return results;
  }

  for (const id of ids) {
    const res = await postCharge(id, cardAccountId, userId);
    if (res.qboTxnId) Object.assign(res, await attachReceipt(id, userId));
    results.push(res);
  }
  for (const id of receiptOnly) {
    const att = await attachReceipt(id, userId);
    if (att.receipt) {
      const c = await queryOne<{ qbo_txn_id: string }>('SELECT qbo_txn_id FROM fin_charges WHERE id = ?', [id]);
      results.push({ chargeId: id, ok: att.receipt === 'attached', qboTxnId: c?.qbo_txn_id, ...att, ...(att.receiptError ? { error: att.receiptError } : {}) });
    }
  }
  return results;
}
