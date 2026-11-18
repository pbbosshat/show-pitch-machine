'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatCentsWithCredit, sumCents } from '@/lib/fin/money';
import ChargesTable from '../_components/amex/ChargesTable';
import { api, useQboLists, type ChargeView } from '../_components/amex/client';

interface User { id: number; name: string; role: string; active: boolean }

const STATUSES = ['', 'new', 'tagged', 'synced'] as const;

export default function ChargesManager({
  isAdmin, currentUserName, initialCardholder, initialStatus,
}: { isAdmin: boolean; currentUserName: string; initialCardholder: string; initialStatus: string }) {
  const { lists, error: listError } = useQboLists();
  const [charges, setCharges] = useState<ChargeView[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cardholder, setCardholder] = useState(initialCardholder);
  const [status, setStatus] = useState<string>(STATUSES.includes(initialStatus as (typeof STATUSES)[number]) ? initialStatus : '');
  const [includeClosed, setIncludeClosed] = useState(false);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (cardholder) qs.set('cardholderId', cardholder);
    if (status) qs.set('status', status);
    if (includeClosed) qs.set('includeClosed', '1');
    try {
      const r = await api<{ charges: ChargeView[] }>(`/api/fin/charges?${qs}`);
      setCharges(r.charges);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [cardholder, status, includeClosed]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on filter change
    void load();
  }, [load]);

  useEffect(() => {
    if (!isAdmin) return;
    api<{ users: User[] }>('/api/fin/users').then((r) => setUsers(r.users)).catch(() => {});
  }, [isAdmin]);

  const counts = {
    new: charges.filter((c) => c.status === 'new').length,
    tagged: charges.filter((c) => c.status === 'tagged').length,
    synced: charges.filter((c) => c.status === 'synced').length,
  };

  return (
    <div>
      {listError && <div className="amx-warn-banner">{listError}</div>}

      <div className="amx-toolbar">
        {isAdmin && (
          <div>
            <label className="fin-label" htmlFor="c-who">Cardholder</label>
            <select id="c-who" className="fin-select" value={cardholder} onChange={(e) => setCardholder(e.target.value)}>
              <option value="">Everyone</option>
              <option value="unmatched">Unmatched</option>
              {users.map((u) => <option key={u.id} value={String(u.id)}>{u.name}{u.active ? '' : ' (inactive)'}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="fin-label" htmlFor="c-status">Status</label>
          <select id="c-status" className="fin-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="new">Untagged</option>
            <option value="tagged">Tagged</option>
            <option value="synced">In QuickBooks</option>
          </select>
        </div>
        <div style={{ flex: '0 0 auto', minWidth: 0 }}>
          <label className="fin-label" style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
            <input type="checkbox" checked={includeClosed} onChange={(e) => setIncludeClosed(e.target.checked)} />
            Include closed months
          </label>
        </div>
        <div className="amx-spacer" />
        <div className="amx-summary">
          <strong className={counts.new ? 'fin-error' : 'fin-ok'}>{counts.new} untagged</strong>
          <span className="fin-muted"> · {counts.tagged} tagged · {counts.synced} in QuickBooks · {charges.length} charges, {formatCentsWithCredit(sumCents(charges.map((c) => c.amount_cents)))}</span>
        </div>
      </div>

      {error && <p className="fin-error">{error}</p>}
      {loading ? (
        <div className="fin-empty">Loading…</div>
      ) : (
        <ChargesTable
          charges={charges}
          lists={lists}
          isAdmin={isAdmin}
          currentUserName={currentUserName}
          showCardMember={isAdmin}
          groupByMonth
          allComplete={!cardholder && !status && includeClosed}
          onChargeChange={(c) => setCharges((list) => list.map((x) => (x.id === c.id ? c : x)))}
          onReload={() => void load()}
          emptyText={status === 'new' ? 'Nothing left to tag.' : 'No charges in open months.'}
        />
      )}
    </div>
  );
}
