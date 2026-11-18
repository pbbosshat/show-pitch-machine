'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatCentsWithCredit } from '@/lib/fin/money';
import type { QboStatus, SyncLogRow } from '@/lib/fin/qbo/status';

interface Account {
  qbo_id: string;
  acct_num: string | null;
  name: string;
  fully_qualified_name: string | null;
  account_type: string | null;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

function when(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function acctLabel(a: Pick<Account, 'acct_num' | 'name' | 'fully_qualified_name'>): string {
  const n = a.fully_qualified_name || a.name;
  return a.acct_num ? `${a.acct_num} ${n}` : n;
}

export default function QuickBooksPanel({
  initialStatus,
  initialLog,
  flash,
}: {
  initialStatus: QboStatus;
  initialLog: SyncLogRow[];
  flash: { connected: boolean; error: string | null; warning: string | null; switched: string | null };
}) {
  const [status, setStatus] = useState(initialStatus);
  const [log, setLog] = useState(initialLog);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(flash.error ?? '');
  const [message, setMessage] = useState(
    [flash.connected ? 'QuickBooks is connected.' : '', flash.warning ?? ''].filter(Boolean).join(' ')
  );
  const switchedCount = flash.switched !== null ? Number(flash.switched) || 0 : null;

  const reload = useCallback(async () => {
    const [s, l, lists] = await Promise.all([
      api<QboStatus>('/api/fin/qbo/status'),
      api<{ log: SyncLogRow[] }>('/api/fin/qbo/log?limit=50'),
      api<{ accounts: Account[] }>('/api/fin/qbo/lists'),
    ]);
    setStatus(s);
    setLog(l.log);
    setAccounts(lists.accounts);
  }, []);

  useEffect(() => {
    // Drop ?connected / ?error from the address bar so a refresh doesn't repeat the message.
    if (window.location.search) window.history.replaceState(null, '', window.location.pathname);
    api<{ accounts: Account[] }>('/api/fin/qbo/lists')
      .then((l) => setAccounts(l.accounts))
      .catch(() => {});
  }, []);

  async function act(key: string, fn: () => Promise<string | void>) {
    setBusy(key);
    setError('');
    setMessage('');
    try {
      const ok = await fn();
      if (ok) setMessage(ok);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const disconnect = () => {
    if (!window.confirm('Disconnect QuickBooks? Tagging keeps working, but nothing can be sent until someone reconnects.')) return;
    void act('disconnect', async () => {
      const r = await api<{ warning?: string }>('/api/fin/qbo/disconnect', { method: 'POST' });
      return r.warning ?? 'QuickBooks is disconnected.';
    });
  };

  const refreshLists = () =>
    void act('refresh', async () => {
      const r = await api<{ accounts: number; classes: number }>('/api/fin/qbo/refresh-lists', { method: 'POST' });
      return `Lists refreshed: ${r.accounts} accounts, ${r.classes} Classes.`;
    });

  const saveCard = (qboId: string) =>
    void act('card', async () => {
      await api('/api/fin/qbo/settings', {
        method: 'PUT',
        body: JSON.stringify({ cardAccountQboId: qboId === '' ? null : qboId }),
      });
      return 'Card account saved.';
    });

  // Only Credit Card accounts can be the card account (the server enforces this too).
  const cardAccounts = accounts.filter((a) => a.account_type === 'Credit Card');
  const envLabel = status.environment === 'production' ? 'Production (live books)' : 'Sandbox (test company)';

  return (
    <>
      {error && <p className="fin-notice fin-error" role="alert">{error}</p>}
      {message && <p className="fin-notice fin-ok" role="status">{message}</p>}
      {switchedCount !== null && (
        <p className="fin-notice fin-error" role="alert">
          This is a different QuickBooks company from the one connected before. The account and Class lists were
          reloaded from the new company and the card account went back to the default.{' '}
          {switchedCount > 0
            ? `${switchedCount} charge${switchedCount === 1 ? '' : 's'} not yet sent to QuickBooks had ${switchedCount === 1 ? 'its' : 'their'} Account and Class cleared and must be tagged again (memos and receipts were kept).`
            : 'No unsent charges needed re-tagging.'}
        </p>
      )}

      <h2 className="fin-section-title">Connection</h2>
      <div className="fin-card fin-card-pad">
        {!status.configured ? (
          <>
            <p style={{ margin: 0, fontWeight: 600 }}>QuickBooks isn&apos;t configured yet.</p>
            <p className="fin-muted" style={{ margin: '6px 0 0', fontSize: '0.8125rem' }}>
              Uploading statements and tagging still work. To send charges to QuickBooks, ask your developer to finish the
              QuickBooks setup; the steps are in the setup guide.
            </p>
          </>
        ) : (
          <table className="fin-table" style={{ maxWidth: 640 }}>
            <tbody>
              <tr>
                <td className="fin-muted" style={{ width: 180 }}>Status</td>
                <td>
                  {status.connected ? (
                    <span className="fin-pill fin-pill-synced">Connected</span>
                  ) : (
                    <span className="fin-pill fin-pill-new">Not connected</span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="fin-muted">Environment</td>
                <td>{envLabel}</td>
              </tr>
              {status.connected && (
                <>
                  <tr>
                    <td className="fin-muted">Company ID</td>
                    <td>{status.realmId}</td>
                  </tr>
                  <tr>
                    <td className="fin-muted">Connected</td>
                    <td>
                      {when(status.connectedAt)}
                      {status.connectedByName ? ` by ${status.connectedByName}` : ''}
                    </td>
                  </tr>
                  <tr>
                    <td className="fin-muted">Reconnect needed by</td>
                    <td>{when(status.refreshExpiresAt)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        )}
        {status.configured && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {status.connected ? (
              <button type="button" className="fin-btn fin-btn-danger" onClick={disconnect} disabled={busy !== null}>
                {busy === 'disconnect' ? 'Disconnecting…' : 'Disconnect'}
              </button>
            ) : (
              <a className="fin-btn fin-btn-primary" href="/api/fin/qbo/connect" style={{ textDecoration: 'none' }}>
                Connect to QuickBooks
              </a>
            )}
          </div>
        )}
      </div>

      <h2 className="fin-section-title">Lists</h2>
      <div className="fin-card fin-card-pad">
        <div className="fin-formrow" style={{ alignItems: 'center' }}>
          <div>
            <strong>{status.lists.accounts}</strong> accounts · <strong>{status.lists.classes}</strong> Classes
            <span className="fin-muted"> · last refreshed {when(status.lists.refreshedAt)}</span>
          </div>
          <button
            type="button"
            className="fin-btn"
            onClick={refreshLists}
            disabled={busy !== null || !status.connected}
            title={status.connected ? undefined : 'Connect QuickBooks first'}
          >
            {busy === 'refresh' ? 'Refreshing…' : 'Refresh lists'}
          </button>
        </div>

        <div style={{ marginTop: 16, maxWidth: 520 }}>
          <label className="fin-label" htmlFor="fin-card-account">
            Card account (charges post against this Amex account)
          </label>
          <select
            id="fin-card-account"
            className="fin-select"
            value={status.cardAccountDefaulted ? '' : status.cardAccount?.qbo_id ?? ''}
            onChange={(e) => saveCard(e.target.value)}
            disabled={busy !== null || accounts.length === 0}
          >
            <option value="">
              Default: 2200 MCS Show AMEX
              {status.cardAccountDefaulted ? (status.cardAccount ? ' (found)' : ' (not found — refresh lists)') : ''}
            </option>
            {cardAccounts.length > 0 && (
              <optgroup label="Credit card accounts">
                {cardAccounts.map((a) => (
                  <option key={a.qbo_id} value={a.qbo_id}>{acctLabel(a)}</option>
                ))}
              </optgroup>
            )}
          </select>
          <p className="fin-muted" style={{ fontSize: '0.75rem', margin: '4px 0 0' }}>
            {status.cardAccount ? `Using: ${acctLabel(status.cardAccount)}` : 'No card account found yet — charges cannot be sent until one is set.'}
            {status.cardAccountMissing ? ' (The saved account is no longer active in QuickBooks, so the default is used.)' : ''}
          </p>
        </div>
      </div>

      <h2 className="fin-section-title">Recent sync log</h2>
      <div className="fin-table-wrap">
        {log.length === 0 ? (
          <div className="fin-empty">Nothing has been sent to QuickBooks yet.</div>
        ) : (
          <table className="fin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Charge</th>
                <th>Date</th>
                <th>Amex description</th>
                <th className="fin-num">Amount</th>
                <th>Result</th>
                <th>Details</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {log.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{when(r.created_at)}</td>
                  <td>
                    {r.statement_id && r.charge_id ? (
                      <a href={`/admin/statements/${r.statement_id}`}>#{r.charge_id}</a>
                    ) : (
                      r.charge_id ? `#${r.charge_id}` : '—'
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.txn_date ?? '—'}</td>
                  <td>{r.amex_description ?? '—'}</td>
                  <td className={`fin-num${r.amount_cents !== null && r.amount_cents < 0 ? ' fin-credit' : ''}`}>
                    {formatCentsWithCredit(r.amount_cents)}
                  </td>
                  <td>
                    {r.ok ? (
                      <span className="fin-pill fin-pill-synced">Sent{r.qbo_txn_id ? ` #${r.qbo_txn_id}` : ''}</span>
                    ) : (
                      <span className="fin-pill fin-pill-error">Failed</span>
                    )}
                  </td>
                  <td style={{ maxWidth: 380 }}>{r.message}</td>
                  <td className="fin-muted">{r.created_by_name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
