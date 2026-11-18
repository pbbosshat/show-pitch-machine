'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';

type Role = 'admin' | 'cardholder';
interface User { id: number; email: string; name: string; role: Role; active: boolean; created_at: string }
interface Alias { id: number; amex_name: string; user_id: number | null; user_name: string | null; user_email: string | null }

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

export default function UsersManager({ currentUserId }: { currentUserId: number }) {
  const [users, setUsers] = useState<User[]>([]);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const [u, a] = await Promise.all([
        api<{ users: User[] }>('/api/fin/users'),
        api<{ aliases: Alias[] }>('/api/fin/aliases'),
      ]);
      setUsers(u.users);
      setAliases(a.aliases);
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    void load();
  }, [load]);

  async function act(fn: () => Promise<unknown>, ok: string) {
    setError('');
    setMessage('');
    try {
      await fn();
      setMessage(ok);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // ── Add user ──
  const [nu, setNu] = useState({ name: '', email: '', role: 'cardholder' as Role, password: '' });
  function addUser(e: FormEvent) {
    e.preventDefault();
    void act(async () => {
      await api('/api/fin/users', { method: 'POST', body: JSON.stringify(nu) });
      setNu({ name: '', email: '', role: 'cardholder', password: '' });
    }, `Added ${nu.name}. Give them their temporary password.`);
  }

  function patchUser(u: User, body: Record<string, unknown>, ok: string) {
    void act(() => api(`/api/fin/users/${u.id}`, { method: 'PATCH', body: JSON.stringify(body) }), ok);
  }

  function resetPassword(u: User) {
    const pw = window.prompt(`New temporary password for ${u.name} (at least 8 characters):`);
    if (!pw) return;
    patchUser(u, { password: pw }, `Password reset for ${u.name}.`);
  }

  // ── Aliases ──
  const [na, setNa] = useState({ amex_name: '', user_id: '' });
  function addAlias(e: FormEvent) {
    e.preventDefault();
    void act(async () => {
      await api('/api/fin/aliases', {
        method: 'POST',
        body: JSON.stringify({ amex_name: na.amex_name, user_id: Number(na.user_id) }),
      });
      setNa({ amex_name: '', user_id: '' });
    }, 'Card Member name saved.');
  }

  const activeUsers = users.filter((u) => u.active);

  return (
    <div>
      {error && <p className="fin-error" style={{ marginBottom: 12 }}>{error}</p>}
      {message && <p className="fin-ok" style={{ marginBottom: 12 }}>{message}</p>}

      <h2 className="fin-section-title" style={{ marginTop: 0 }}>People</h2>
      <div className="fin-table-wrap">
        <table className="fin-table fin-stack">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="fin-empty">Loading…</td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={5} className="fin-empty">No users yet.</td></tr>
            )}
            {users.map((u) => {
              const self = u.id === currentUserId;
              return (
                <tr key={u.id} style={u.active ? undefined : { opacity: 0.55 }}>
                  <td className="fin-stack-title">{u.name}{self && <span className="fin-muted"> (you)</span>}</td>
                  <td data-label="Email"><span>{u.email}</span></td>
                  <td data-label="Role">
                    <select
                      className="fin-select"
                      style={{ width: 'auto' }}
                      value={u.role}
                      disabled={self}
                      onChange={(e) => patchUser(u, { role: e.target.value }, `${u.name} is now ${e.target.value === 'admin' ? 'an admin' : 'a cardholder'}.`)}
                    >
                      <option value="cardholder">Cardholder</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td data-label="Status">{u.active ? <span className="fin-pill fin-pill-synced">Active</span> : <span className="fin-pill">Deactivated</span>}</td>
                  <td className="fin-stack-actions" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button type="button" className="fin-btn fin-btn-sm" onClick={() => resetPassword(u)}>Reset password</button>{' '}
                    {u.active ? (
                      <button
                        type="button"
                        className="fin-btn fin-btn-sm fin-btn-danger"
                        disabled={self}
                        onClick={() => {
                          if (window.confirm(`Deactivate ${u.name}? They will be signed out and can't sign in.`)) {
                            patchUser(u, { active: false }, `${u.name} deactivated.`);
                          }
                        }}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button type="button" className="fin-btn fin-btn-sm" onClick={() => patchUser(u, { active: true }, `${u.name} reactivated.`)}>
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <form onSubmit={addUser} className="fin-card fin-card-pad fin-formrow" style={{ marginTop: 12 }}>
        <div>
          <label className="fin-label" htmlFor="nu-name">Name</label>
          <input id="nu-name" className="fin-input" value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} required />
        </div>
        <div>
          <label className="fin-label" htmlFor="nu-email">Email</label>
          <input id="nu-email" type="email" className="fin-input" value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} required />
        </div>
        <div>
          <label className="fin-label" htmlFor="nu-role">Role</label>
          <select id="nu-role" className="fin-select" value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value as Role })}>
            <option value="cardholder">Cardholder</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="fin-label" htmlFor="nu-pw">Temporary password</label>
          <input id="nu-pw" type="text" className="fin-input" minLength={8} value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} required autoComplete="off" />
        </div>
        <button type="submit" className="fin-btn fin-btn-primary">Add user</button>
      </form>

      <h2 className="fin-section-title">Card Member names</h2>
      <p className="fin-page-sub" style={{ marginBottom: 8 }}>
        The name exactly as it appears in the Amex download&apos;s Card Member column, and who it belongs to.
      </p>
      <div className="fin-table-wrap">
        <table className="fin-table fin-stack">
          <thead>
            <tr>
              <th>Card Member (Amex)</th>
              <th>Belongs to</th>
              <th style={{ textAlign: 'right' }}></th>
            </tr>
          </thead>
          <tbody>
            {!loading && aliases.length === 0 && (
              <tr><td colSpan={3} className="fin-empty">No Card Member names yet. They can also be assigned from a statement.</td></tr>
            )}
            {aliases.map((a) => (
              <tr key={a.id}>
                <td className="fin-stack-title" style={{ fontFamily: 'var(--font-data)' }}>{a.amex_name}</td>
                <td data-label="Belongs to"><span>{a.user_name ?? <span className="fin-muted">Unassigned</span>}{a.user_email && <span className="fin-muted"> · {a.user_email}</span>}</span></td>
                <td className="fin-stack-actions" style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    className="fin-btn fin-btn-sm fin-btn-danger"
                    onClick={() => {
                      if (window.confirm(`Remove the name ${a.amex_name}?`)) {
                        void act(() => api(`/api/fin/aliases?id=${a.id}`, { method: 'DELETE' }), 'Card Member name removed.');
                      }
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={addAlias} className="fin-card fin-card-pad fin-formrow" style={{ marginTop: 12 }}>
        <div>
          <label className="fin-label" htmlFor="na-name">Card Member name</label>
          <input id="na-name" className="fin-input" placeholder="e.g. JOSEPH SMITH" value={na.amex_name} onChange={(e) => setNa({ ...na, amex_name: e.target.value })} required />
        </div>
        <div>
          <label className="fin-label" htmlFor="na-user">Belongs to</label>
          <select id="na-user" className="fin-select" value={na.user_id} onChange={(e) => setNa({ ...na, user_id: e.target.value })} required>
            <option value="">Choose a person…</option>
            {activeUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
            ))}
          </select>
        </div>
        <button type="submit" className="fin-btn fin-btn-primary">Save name</button>
      </form>
    </div>
  );
}
