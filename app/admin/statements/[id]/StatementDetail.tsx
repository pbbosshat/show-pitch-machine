'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatCents, formatCentsWithCredit, parseDollarsToCents } from '@/lib/fin/money';
import ChargesTable from '../../_components/amex/ChargesTable';
import {
  api, runSync, shortDateTime, useQboLists,
  type ChargeView, type StatementSummary, type SyncResult,
} from '../../_components/amex/client';

interface Unmatched { card_member: string; charge_count: number; total_cents: number }
interface User { id: number; name: string; role: string; active: boolean }

type StatusFilter = '' | 'new' | 'tagged' | 'synced' | 'dupe' | 'failed' | 'deleted';

export default function StatementDetail({ statementId, currentUserName }: { statementId: number; currentUserName: string }) {
  const router = useRouter();
  const { lists, error: listError } = useQboLists();
  const [statement, setStatement] = useState<StatementSummary | null>(null);
  const [charges, setCharges] = useState<ChargeView[]>([]);
  const [unmatched, setUnmatched] = useState<Unmatched[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const [who, setWho] = useState('');
  const [status, setStatus] = useState<StatusFilter>('');

  const load = useCallback(async () => {
    try {
      const r = await api<{ statement: StatementSummary; charges: ChargeView[]; unmatched: Unmatched[] }>(`/api/fin/statements/${statementId}`);
      setStatement(r.statement);
      setCharges(r.charges);
      setUnmatched(r.unmatched);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [statementId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    void load();
    api<{ users: User[] }>('/api/fin/users').then((r) => setUsers(r.users.filter((u) => u.active))).catch(() => {});
  }, [load]);

  // Refresh only the totals after a single-row change (cheap; keeps editors in other rows untouched).
  const refreshStatement = useCallback(async () => {
    try {
      const r = await api<{ statement: StatementSummary }>(`/api/fin/statements/${statementId}`);
      setStatement(r.statement);
    } catch { /* the next full load will show it */ }
  }, [statementId]);

  function onChargeChange(c: ChargeView) {
    setCharges((list) => list.map((x) => (x.id === c.id ? c : x)));
    void refreshStatement();
  }

  async function act(fn: () => Promise<unknown>, ok?: string) {
    setError('');
    setMsg('');
    try {
      await fn();
      if (ok) setMsg(ok);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // ── Reconcile ──
  const [totalInput, setTotalInput] = useState<string | null>(null);
  const shownTotal = totalInput ?? (statement?.statement_total_cents != null ? formatCents(statement.statement_total_cents).replace('$', '') : '');
  const typedCents = totalInput === null ? statement?.statement_total_cents ?? null : parseDollarsToCents(totalInput);
  const diff = statement && typedCents != null ? statement.charges_total_cents - typedCents : null;
  const totalDirty = totalInput !== null && typedCents !== (statement?.statement_total_cents ?? null);
  const canClose = !!statement && !statement.closed_at && !totalDirty && statement.statement_total_cents !== null && diff === 0;

  // ── Sync ──
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResult[] | null>(null);
  const readyToSync = charges.filter((c) => !c.deleted && c.status === 'tagged').length;

  async function syncAll() {
    setSyncing(true);
    setSyncResults(null);
    await act(async () => {
      const r = await runSync({ statementId });
      setSyncResults(r.results);
    });
    setSyncing(false);
  }

  const retry = useCallback(async (chargeId: number) => {
    const r = await runSync({ chargeIds: [chargeId] });
    setSyncResults(r.results);
    const failed = r.results.find((x) => !x.ok);
    await load();
    if (failed) throw new Error(failed.error ?? 'QuickBooks rejected this charge.');
  }, [load]);

  const filtered = useMemo(() => charges.filter((c) => {
    if (who === 'unmatched' && c.cardholder_id !== null) return false;
    if (who && who !== 'unmatched' && String(c.cardholder_id) !== who) return false;
    if (status === 'deleted') return c.deleted;
    if (status === '' ) return true;
    if (c.deleted) return false;
    if (status === 'dupe') return c.possible_duplicate;
    if (status === 'failed') return c.status !== 'synced' && c.last_sync_ok === false;
    return c.status === status;
  }), [charges, who, status]);

  if (loading) return <div className="fin-empty">Loading…</div>;
  if (!statement) return <p className="fin-error">{error || 'Statement not found.'}</p>;

  const cardholderOptions = Array.from(
    new Map(charges.filter((c) => c.cardholder_id !== null).map((c) => [c.cardholder_id!, c.cardholder_name ?? '?'])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));
  const failedCount = charges.filter((c) => !c.deleted && c.status !== 'synced' && c.last_sync_ok === false).length;

  return (
    <div>
      {error && <div className="amx-warn-banner fin-error">{error}</div>}
      {msg && <p className="fin-ok" style={{ marginTop: 0 }}>{msg}</p>}
      {listError && <div className="amx-warn-banner">{listError}</div>}

      <div className="amx-tiles">
        <Tile label="Charges" value={statement.charge_count} sub={formatCentsWithCredit(statement.charges_total_cents)} />
        <Tile label="Untagged" value={statement.new_count} warn={statement.new_count > 0} onClick={() => setStatus('new')} />
        <Tile label="Tagged, not synced" value={statement.tagged_count} onClick={() => setStatus('tagged')} />
        <Tile label="In QuickBooks" value={statement.synced_count} onClick={() => setStatus('synced')} />
        <Tile label="Possible duplicates" value={statement.duplicate_count} warn={statement.duplicate_count > 0} onClick={() => setStatus('dupe')} />
        <Tile label="Unmatched" value={statement.unmatched_count} warn={statement.unmatched_count > 0} onClick={() => setWho('unmatched')} />
      </div>

      <div className="amx-panels">
        <div className="fin-card fin-card-pad">
          <h2 className="amx-panel-title">Reconcile &amp; close</h2>
          <table className="amx-recon">
            <tbody>
              <tr><td>Charges on this statement{statement.deleted_count ? ` (excluding ${statement.deleted_count} deleted)` : ''}</td><td>{formatCentsWithCredit(statement.charges_total_cents)}</td></tr>
              <tr>
                <td>Statement total (from the Amex statement)</td>
                <td>
                  {statement.closed_at ? formatCentsWithCredit(statement.statement_total_cents) : (
                    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                      $<input
                        className="fin-input fin-num"
                        style={{ width: 120 }}
                        inputMode="decimal"
                        placeholder="0.00"
                        aria-label="Statement total"
                        value={shownTotal}
                        onChange={(e) => setTotalInput(e.target.value)}
                      />
                      <button
                        type="button"
                        className={`fin-btn fin-btn-sm${totalDirty ? ' fin-btn-primary' : ''}`}
                        disabled={!totalDirty || (totalInput !== '' && typedCents === null)}
                        onClick={() => act(async () => {
                          await api(`/api/fin/statements/${statementId}`, { method: 'PATCH', body: JSON.stringify({ statement_total: totalInput }) });
                          setTotalInput(null);
                        }, 'Statement total saved.')}
                      >
                        Save
                      </button>
                    </span>
                  )}
                </td>
              </tr>
              <tr className="amx-recon-diff">
                <td>Difference</td>
                <td className={diff === 0 ? 'fin-ok' : diff === null ? 'fin-muted' : 'fin-error'}>
                  {diff === null ? '—' : diff === 0 ? 'Matches $0.00' : formatCents(diff)}
                </td>
              </tr>
            </tbody>
          </table>
          {statement.closed_at ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="fin-pill fin-pill-synced">Closed {shortDateTime(statement.closed_at)}{statement.closed_by_name ? ` by ${statement.closed_by_name}` : ''}</span>
              <button type="button" className="fin-btn fin-btn-sm" onClick={() => act(() => api(`/api/fin/statements/${statementId}`, { method: 'PATCH', body: JSON.stringify({ action: 'reopen' }) }), 'Month reopened.')}>
                Reopen month
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="fin-btn fin-btn-primary"
                disabled={!canClose}
                title={canClose ? '' : 'Enter and save the statement total; it must match the charges to the cent.'}
                onClick={() => act(() => api(`/api/fin/statements/${statementId}`, { method: 'PATCH', body: JSON.stringify({ action: 'close' }) }), 'Month closed.')}
              >
                Close month
              </button>
              <span className="fin-muted" style={{ fontSize: '0.75rem' }}>Closes only when the totals match to the cent.</span>
              <span style={{ flex: 1 }} />
              {statement.synced_count === 0 && (
                <button
                  type="button"
                  className="fin-linkbtn"
                  style={{ fontSize: '0.75rem' }}
                  onClick={() => {
                    if (!window.confirm('Delete this whole statement and its charges? Use this only for a wrong upload.')) return;
                    void act(async () => {
                      await api(`/api/fin/statements/${statementId}`, { method: 'DELETE' });
                      router.push('/admin/statements');
                    });
                  }}
                >
                  Delete statement
                </button>
              )}
            </div>
          )}
        </div>

        <div className="fin-card fin-card-pad">
          <h2 className="amx-panel-title">Unmatched Card Members</h2>
          {unmatched.length === 0 ? (
            <p className="fin-muted" style={{ margin: 0, fontSize: '0.8125rem' }}>Every Card Member on this statement is matched to a user.</p>
          ) : (
            <>
              <p className="fin-muted" style={{ margin: '0 0 10px', fontSize: '0.75rem' }}>
                Pick who each name belongs to. This assigns the charges on this statement, and future months will match the name automatically.
              </p>
              <div className="amx-unmatched">
                {unmatched.map((u) => (
                  <UnmatchedRow key={u.card_member} u={u} users={users} onAssign={(userId) => act(
                    () => api(`/api/fin/statements/${statementId}/cardholders`, { method: 'POST', body: JSON.stringify({ card_member: u.card_member, user_id: userId }) }),
                    `${u.card_member} assigned on this statement. Future months will match automatically.`
                  )} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="amx-toolbar">
        <div>
          <label className="fin-label" htmlFor="f-who">Cardholder</label>
          <select id="f-who" className="fin-select" value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="">Everyone</option>
            <option value="unmatched">Unmatched</option>
            {cardholderOptions.map(([id, name]) => <option key={id} value={String(id)}>{name}</option>)}
          </select>
        </div>
        <div>
          <label className="fin-label" htmlFor="f-status">Status</label>
          <select id="f-status" className="fin-select" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="">All</option>
            <option value="new">Untagged</option>
            <option value="tagged">Tagged, not synced</option>
            <option value="synced">In QuickBooks</option>
            <option value="dupe">Possible duplicates</option>
            <option value="failed">Sync failed{failedCount ? ` (${failedCount})` : ''}</option>
            <option value="deleted">Deleted duplicates</option>
          </select>
        </div>
        <div className="amx-spacer" />
        <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
          <button type="button" className="fin-btn fin-btn-primary" onClick={syncAll} disabled={syncing || readyToSync === 0}>
            {syncing ? 'Syncing…' : `Sync ${readyToSync} tagged to QuickBooks`}
          </button>
        </div>
      </div>
      {syncResults && (
        <div className="fin-notice" style={{ marginBottom: 10 }}>
          {syncResults.length === 0 ? 'Nothing to sync.' : (
            <>
              <strong>{syncResults.filter((r) => r.ok).length} posted, {syncResults.filter((r) => !r.ok).length} failed.</strong>
              {syncResults.some((r) => !r.ok) && (
                <ul className="amx-sync-results">
                  {syncResults.filter((r) => !r.ok).map((r) => {
                    const c = charges.find((x) => x.id === r.chargeId);
                    return <li key={r.chargeId} className="fin-error">#{r.chargeId}{c ? ` ${c.amex_description}` : ''}: {r.error ?? 'failed'}</li>;
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      <ChargesTable
        charges={filtered}
        allCharges={charges}
        allComplete
        lists={lists}
        isAdmin
        currentUserName={currentUserName}
        showCardMember
        duplicateActions={!statement.closed_at}
        onChargeChange={onChargeChange}
        onReload={() => void load()}
        onRetrySync={retry}
        emptyText="No charges match these filters."
      />
    </div>
  );
}

function Tile({ label, value, sub, warn, onClick }: { label: string; value: number; sub?: string; warn?: boolean; onClick?: () => void }) {
  return (
    <div
      className={`amx-tile${warn ? ' amx-tile-warn' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div className="amx-tile-label">{label}</div>
      <div className="amx-tile-value">{value}{sub && <small>{sub}</small>}</div>
    </div>
  );
}

function UnmatchedRow({ u, users, onAssign }: { u: Unmatched; users: User[]; onAssign: (userId: number) => void }) {
  const [pick, setPick] = useState('');
  return (
    <div className="amx-unmatched-row">
      <div>
        <strong>{u.card_member}</strong>
        <span className="fin-muted"> · {u.charge_count} charge{u.charge_count === 1 ? '' : 's'}, {formatCentsWithCredit(u.total_cents)}</span>
      </div>
      <select className="fin-select" value={pick} onChange={(e) => setPick(e.target.value)} aria-label={`User for ${u.card_member}`}>
        <option value="">Choose user…</option>
        {users.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
      </select>
      <button type="button" className="fin-btn fin-btn-sm" disabled={!pick} onClick={() => onAssign(Number(pick))}>Assign</button>
    </div>
  );
}
