'use client';
// The charge tagging table, shared by /admin/charges and /admin/statements/[id].
// Each row: Amex date / description / amount always visible, then Account (searchable),
// Class, Memo, Receipt and Save. Every field starts blank — no suggestions, no pre-fill.
// Synced rows and rows in a closed month are read-only. Admin-only extras:
// duplicate Keep/Delete, sync Retry (also on closed months — syncing is still allowed).
//
// Unsaved edits live HERE, keyed by charge id (not inside each row), and the editors
// show "draft ?? saved value". So a refetch of the list (after Assign, Keep, Delete,
// Retry, a receipt upload, a filter change …) never wipes what someone typed: only
// a successful Save, or the person editing back to the saved values, clears a draft.
// Exception: when fresh server data shows a drafted row became read-only (synced,
// deleted, month closed) or — with `allComplete` — no longer exists, its draft is
// dropped, since it can never be saved. Drafts for rows merely hidden by a filter stay.
// While any row has unsaved edits the page warns before it is left.
//
// At ≤760px the same markup is laid out as stacked cards (see amex.css).

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { formatCentsWithCredit } from '@/lib/fin/money';
import { ADMIN_D_ERROR, isAdminClass, isShowAccount, isTaggableAccount } from '@/lib/fin/amex/rules';
import AccountPicker from './AccountPicker';
import {
  api, monthLabel, shortDate, shortDateTime, uploadReceipt,
  type ChargeView, type QboAccount, type QboClass, type QboLists,
} from './client';

interface Props {
  charges: ChargeView[];
  lists: QboLists;
  isAdmin: boolean;
  currentUserName: string;
  showCardMember: boolean;
  /** Insert a month heading row whenever the statement changes (cross-month lists). */
  groupByMonth?: boolean;
  /** Show Keep / Delete on possible duplicates (admin, statement page). */
  duplicateActions?: boolean;
  onChargeChange: (c: ChargeView) => void;
  onReload: () => void;
  onRetrySync?: (chargeId: number) => Promise<void>;
  emptyText?: string;
  /** Every charge the parent holds from the server, before any client-side filter (default: `charges`). */
  allCharges?: ChargeView[];
  /** True when `allCharges` is the whole data set (no server-side filter): a drafted row missing from it is gone. */
  allComplete?: boolean;
}

interface Draft { account: string | null; klass: string; memo: string }

const savedDraft = (c: ChargeView): Draft => ({ account: c.account_qbo_id, klass: c.class_qbo_id ?? '', memo: c.memo ?? '' });
const sameAsSaved = (d: Draft, c: ChargeView) =>
  d.account === c.account_qbo_id && (d.klass || null) === c.class_qbo_id && d.memo.trim() === (c.memo ?? '');

const LEAVE_WARNING = 'You have unsaved changes on some charges. Leave this page and lose them?';

export default function ChargesTable(props: Props) {
  const { charges, showCardMember, groupByMonth, lists } = props;
  const cols = showCardMember ? 10 : 9;
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const all = props.allCharges ?? charges;
  const allComplete = !!props.allComplete;

  // When new server data arrives, drop drafts that can never be saved: the row is now
  // locked, or (when the data set is complete) it no longer exists. Adjusting state
  // during render (React's documented pattern) avoids a flash of the stale banner.
  const [prevAll, setPrevAll] = useState(all);
  if (all !== prevAll) {
    setPrevAll(all);
    const byId = new Map(all.map((c) => [c.id, c]));
    const ids = Object.keys(drafts).map(Number);
    const drop = ids.filter((id) => {
      const c = byId.get(id);
      return c ? isLocked(c) : allComplete;
    });
    if (drop.length) {
      setDrafts((cur) => {
        const next = { ...cur };
        for (const id of drop) delete next[id];
        return next;
      });
    }
  }

  const setDraft = useCallback((c: ChargeView, d: Draft | null) => {
    setDrafts((all) => {
      const next = { ...all };
      if (d === null || sameAsSaved(d, c)) delete next[c.id];
      else next[c.id] = d;
      return next;
    });
  }, []);

  // A draft counts only while it differs from what is saved now (someone may have
  // saved the same values elsewhere) and the row can still be edited.
  const visibleIds = new Set(charges.map((c) => c.id));
  const visibleDirty = charges.filter((c) => drafts[c.id] && !sameAsSaved(drafts[c.id], c) && !isLocked(c)).length;
  const hiddenDirty = Object.keys(drafts).map(Number).filter((id) => {
    if (visibleIds.has(id)) return false;
    const c = all.find((x) => x.id === id);
    if (c) return !sameAsSaved(drafts[id], c) && !isLocked(c);
    return !allComplete; // not in the data: hidden by a server-side filter (kept) — or gone (pruned above)
  }).length;
  const dirtyCount = visibleDirty + hiddenDirty;

  useLeaveWarning(dirtyCount > 0);

  // Only expense-type accounts, never the Amex card account (the server enforces the same rule).
  const accounts = useMemo(
    () => lists.accounts.filter((a) => isTaggableAccount(a, lists.cardAccountQboId)),
    [lists.accounts, lists.cardAccountQboId]
  );

  return (
    <>
      {dirtyCount > 0 && (
        <div className="amx-unsaved-banner" role="status">
          {dirtyCount} charge{dirtyCount === 1 ? ' has' : 's have'} unsaved changes
          {hiddenDirty > 0 && (hiddenDirty < dirtyCount ? ' (some hidden by the current filter)' : ' (hidden by the current filter)')}
          . Press Save on {dirtyCount === 1 ? 'that row' : 'each row'} to keep them.
        </div>
      )}
      <div className="fin-table-wrap amx-charges-wrap">
        <table className={`fin-table amx-charges${showCardMember ? '' : ' amx-no-member'}`}>
          <colgroup>
            <col className="amx-col-date" />
            {showCardMember && <col className="amx-col-member" />}
            <col />
            <col className="amx-col-amount" />
            <col className="amx-col-account" />
            <col className="amx-col-class" />
            <col className="amx-col-memo" />
            <col className="amx-col-receipt" />
            <col className="amx-col-status" />
            <col className="amx-col-save" />
          </colgroup>
          <thead>
            <tr>
              <th>Date</th>
              {showCardMember && <th>Card Member</th>}
              <th>Amex description</th>
              <th className="fin-num">Amount</th>
              <th>Account</th>
              <th>Class</th>
              <th>Memo</th>
              <th>Receipt</th>
              <th>Status</th>
              <th aria-label="Save" />
            </tr>
          </thead>
          <tbody>
            {charges.length === 0 && (
              <tr className="amx-empty-row"><td colSpan={cols} className="fin-empty">{props.emptyText ?? 'No charges.'}</td></tr>
            )}
            {charges.map((c, i) => {
              const heading = groupByMonth && (i === 0 || c.statement_month !== charges[i - 1].statement_month);
              return (
                <Fragment key={c.id}>
                  {heading && (
                    <tr className="amx-group-row">
                      <td colSpan={cols}>{monthLabel(c.statement_month)}{c.statement_closed ? ' · closed' : ''}</td>
                    </tr>
                  )}
                  <ChargeRow {...props} accounts={accounts} charge={c} cols={cols} draft={drafts[c.id] ?? null} setDraft={setDraft} />
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function isLocked(c: ChargeView) {
  return c.status === 'synced' || !!c.qbo_txn_id || c.deleted || c.statement_closed;
}

/** Warn before closing/reloading the tab or following an in-app link while edits are unsaved. */
function useLeaveWarning(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    // Next <Link> navigation doesn't fire beforeunload: catch clicks on links first.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!window.confirm(LEAVE_WARNING)) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [active]);
}

function ChargeRow({
  charge: c, cols, lists, accounts, draft, setDraft, isAdmin, currentUserName, showCardMember, duplicateActions,
  onChargeChange, onReload, onRetrySync,
}: Props & {
  charge: ChargeView; cols: number; accounts: QboAccount[];
  draft: Draft | null; setDraft: (c: ChargeView, d: Draft | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState(0);

  const locked = isLocked(c);
  const { account, klass, memo } = draft ?? savedDraft(c);
  const dirty = !locked && !!draft && !sameAsSaved(draft, c);
  const edit = (patch: Partial<Draft>) => setDraft(c, { account, klass, memo, ...patch });

  const acctRow = lists.accounts.find((a) => a.qbo_id === account);
  const classRow = lists.classes.find((k) => k.qbo_id === klass);
  const ruleError = acctRow && classRow && isAdminClass(classRow) && isShowAccount(acctRow) ? ADMIN_D_ERROR : '';

  // A saved Class/account no longer offered still shows its stored name.
  const classOptions: QboClass[] = lists.classes.slice();
  if (c.class_qbo_id && !classOptions.some((k) => k.qbo_id === c.class_qbo_id)) {
    classOptions.unshift({ qbo_id: c.class_qbo_id, name: c.class_name ?? c.class_qbo_id, fully_qualified_name: null });
  }
  const accountOptions: QboAccount[] = accounts.slice();
  if (c.account_qbo_id && !accountOptions.some((a) => a.qbo_id === c.account_qbo_id)) {
    accountOptions.unshift({ qbo_id: c.account_qbo_id, acct_num: null, name: c.account_name ?? c.account_qbo_id, fully_qualified_name: null });
  }

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    run(async () => {
      if (ruleError) throw new Error(ruleError);
      const r = await api<{ charge: ChargeView }>(`/api/fin/charges/${c.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ account_qbo_id: account, class_qbo_id: klass || null, memo }),
      });
      setDraft(r.charge, null);
      onChargeChange(r.charge);
      setSavedAt(Date.now());
    });

  // Receipt changes only touch the receipt: the refreshed charge replaces the saved
  // values, and any unsaved Account/Class/Memo draft stays as typed.
  const refetch = async () => {
    const r = await api<{ charge: ChargeView }>(`/api/fin/charges/${c.id}`);
    onChargeChange(r.charge);
  };

  const attach = (file: File) => run(async () => { await uploadReceipt(c.id, file); await refetch(); });
  const removeReceipt = () =>
    run(async () => {
      if (!window.confirm(`Remove the receipt "${c.receipt_name}"?`)) return;
      await api(`/api/fin/charges/${c.id}/receipt`, { method: 'DELETE' });
      await refetch();
    });
  const dupe = (mode: 'keep' | 'delete') =>
    run(async () => {
      if (mode === 'delete' && !window.confirm('Delete this duplicate? It will no longer count toward the month total.')) return;
      await api(`/api/fin/charges/${c.id}`, mode === 'delete' ? { method: 'DELETE' } : { method: 'POST', body: JSON.stringify({ action: 'keep' }) });
      onReload();
    });

  const syncFailed = c.status !== 'synced' && c.last_sync_ok === false;
  const rowClass = [
    'amx-row',
    c.deleted ? 'amx-deleted-row' : c.possible_duplicate ? 'amx-dupe-row' : '',
    dirty ? 'amx-dirty-row' : '',
  ].filter(Boolean).join(' ');
  const credit = c.amount_cents < 0;
  const taggedByOther = c.tagged_by_name && c.tagged_by_name !== (c.cardholder_name ?? currentUserName);

  return (
    <>
      <tr className={rowClass} data-charge-id={c.id}>
        <td className="amx-td-date"><div className="amx-cell-text">{shortDate(c.txn_date)}</div></td>
        {showCardMember && (
          <td className="amx-td-member">
            <div className="amx-cell-text" title={c.card_member}>
              {c.cardholder_name ?? <span className="fin-error" title="No user matched this Card Member name">{c.card_member}</span>}
            </div>
          </td>
        )}
        <td className="amx-td-desc">
          <div className="amx-desc" title={[c.amex_description, c.extended_details].filter(Boolean).join('\n\n')}>
            {c.amex_description}
            {(c.amex_reference || c.card_account) && (
              <span className="amx-desc-sub">
                {c.card_account ? `Card ${c.card_account}` : ''}
                {c.card_account && c.amex_reference ? ' · ' : ''}
                {c.amex_reference ? `Ref ${c.amex_reference}` : ''}
              </span>
            )}
          </div>
        </td>
        <td className="fin-num amx-td-amount">
          <div className={`amx-cell-text amx-amt${credit ? ' fin-credit' : ''}`}>{formatCentsWithCredit(c.amount_cents)}</div>
        </td>
        <td className="amx-td-account" data-label="Account">
          {locked ? (
            <div className="amx-locked" title={c.account_name ?? ''}>{c.account_name ?? <span className="fin-muted">—</span>}</div>
          ) : (
            <AccountPicker accounts={accountOptions} value={account} onChange={(v) => edit({ account: v })} disabled={busy} id={`acct-${c.id}`} />
          )}
        </td>
        <td className="amx-td-class" data-label="Class">
          {locked ? (
            <div className="amx-locked" title={c.class_name ?? ''}>{c.class_name ?? <span className="fin-muted">—</span>}</div>
          ) : (
            <select className="fin-select" value={klass} onChange={(e) => edit({ klass: e.target.value })} disabled={busy} aria-label="Class" title={classRow?.fully_qualified_name ?? classRow?.name ?? ''}>
              <option value="">Class…</option>
              {classOptions.map((k) => (
                <option key={k.qbo_id} value={k.qbo_id}>{k.fully_qualified_name || k.name}</option>
              ))}
            </select>
          )}
        </td>
        <td className="amx-td-memo" data-label="Memo">
          {locked ? (
            <div className="amx-locked" title={c.memo ?? ''}>{c.memo ?? <span className="fin-muted">—</span>}</div>
          ) : (
            <input
              className="fin-input"
              value={memo}
              maxLength={1000}
              placeholder="Memo…"
              title={memo}
              aria-label="Memo"
              disabled={busy}
              onChange={(e) => edit({ memo: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter' && dirty) void save(); }}
            />
          )}
        </td>
        <td className="amx-td-receipt">
          <div className="amx-receipt">
            {c.receipt_name ? (
              <>
                <a href={`/api/fin/charges/${c.id}/receipt`} target="_blank" rel="noopener" title={c.receipt_name}>View<span className="amx-mobile-only"> receipt</span></a>
                {!locked && (
                  <button type="button" className="amx-x" onClick={removeReceipt} disabled={busy} title="Remove receipt" aria-label="Remove receipt">×</button>
                )}
              </>
            ) : locked ? (
              <span className="fin-muted">—</span>
            ) : (
              <label className="amx-attach" title="Photo or PDF, up to 10 MB">
                Attach<span className="amx-mobile-only"> receipt</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={busy}
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void attach(f); }}
                />
              </label>
            )}
          </div>
        </td>
        <td className="amx-statuscell amx-td-status">
          {c.deleted ? (
            <span className="fin-pill">Deleted</span>
          ) : c.status === 'synced' ? (
            <span className="fin-pill fin-pill-synced" title={c.qbo_txn_id ? `QuickBooks #${c.qbo_txn_id}` : ''}>In QuickBooks</span>
          ) : syncFailed ? (
            <span className="fin-pill fin-pill-error" title={c.last_sync_message ?? ''}>Sync failed</span>
          ) : c.status === 'tagged' ? (
            <span className="fin-pill fin-pill-tagged">Tagged</span>
          ) : (
            <span className="fin-pill fin-pill-new">Untagged</span>
          )}
          {c.possible_duplicate && !c.deleted && <span className="fin-pill fin-pill-new amx-pill-gap" title="Same date, Card Member, description and amount as another row in this file">Duplicate?</span>}
          {taggedByOther && (
            <span className="amx-tagged-by" title={`Tagged by ${c.tagged_by_name} ${shortDateTime(c.tagged_at)}`}>by {c.tagged_by_name}</span>
          )}
          {isAdmin && duplicateActions && (c.possible_duplicate || c.deleted) && !locked && (
            <div className="amx-actions">
              <button type="button" className="fin-btn fin-btn-sm" onClick={() => dupe('keep')} disabled={busy}>Keep</button>
              <button type="button" className="fin-btn fin-btn-sm fin-btn-danger" onClick={() => dupe('delete')} disabled={busy}>Delete</button>
            </div>
          )}
          {isAdmin && c.deleted && c.status !== 'synced' && !c.statement_closed && (
            <div className="amx-actions">
              <button type="button" className="fin-btn fin-btn-sm" onClick={() => dupe('keep')} disabled={busy}>Restore</button>
            </div>
          )}
          {/* Retry stays available in a closed month: the server allows syncing it. */}
          {isAdmin && syncFailed && c.status === 'tagged' && onRetrySync && (
            <div className="amx-actions">
              <button type="button" className="fin-btn fin-btn-sm" onClick={() => run(() => onRetrySync(c.id))} disabled={busy}>Retry</button>
            </div>
          )}
        </td>
        <td className="amx-td-save">
          {!locked && (
            <button
              type="button"
              className={`fin-btn fin-btn-sm amx-save${dirty ? ' fin-btn-primary' : ''}`}
              onClick={save}
              disabled={busy || !dirty}
            >
              {busy ? '…' : 'Save'}
            </button>
          )}
          {dirty && !busy && <span className="amx-unsaved" title="This row has changes that are not saved yet">Unsaved</span>}
          {savedAt > 0 && !dirty && !busy && <span className="fin-ok amx-saved">Saved</span>}
          {c.statement_closed && !c.deleted && c.status !== 'synced' && <span className="amx-closed-note" title="Reopen the month to make changes">Month closed</span>}
        </td>
      </tr>
      {(error || (ruleError && dirty)) && (
        <tr className="amx-row-error">
          <td colSpan={cols}><span className="fin-error">{error || ruleError}</span></td>
        </tr>
      )}
    </>
  );
}
