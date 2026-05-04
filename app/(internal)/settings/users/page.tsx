'use client';
// User management — visible to owner and admin roles only.
// Lists all team members and lets privileged users invite new ones by email.

import { useState, useEffect, FormEvent } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: string | null;
  created_at: number;
  has_password: number;
  pending_invite: number;
}

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string | null;
}

function isPrivileged(role: string | null): boolean {
  return role === 'owner' || role === 'admin';
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  exec: 'Exec',
};

const ROLE_COLORS: Record<string, string> = {
  owner: 'var(--accent)',
  admin: 'var(--status-greenlit)',
  exec: 'var(--text-muted)',
};

function userInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export default function UsersPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'exec' | 'admin' | 'owner'>('exec');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ type: 'success' | 'error'; text: string; setupUrl?: string } | null>(null);

  // Remove user state
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d) => setCurrentUser(d.data ?? null))
      .catch(() => null);
  }, []);

  useEffect(() => {
    fetch('/api/users')
      .then((r) => {
        if (r.status === 403) { setForbidden(true); return null; }
        return r.json();
      })
      .then((d) => {
        if (d?.data) setUsers(d.data);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  async function handleRemove(userId: string, userName: string) {
    if (!confirm(`Remove ${userName} from the team? This cannot be undone.`)) return;
    setRemovingId(userId);
    setRemoveError(null);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setRemoveError(data.error ?? `Error ${res.status}`);
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setRemovingId(null);
    }
  }

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setInviteResult(null);
    setInviting(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, name: inviteName || undefined, role: inviteRole }),
      });
      const data = await res.json();

      if (!res.ok) {
        setInviteResult({ type: 'error', text: data.error ?? `Error ${res.status}` });
        return;
      }

      if (data.warning) {
        setInviteResult({
          type: 'error',
          text: `${data.warning} Share this setup link manually:`,
          setupUrl: data.setupUrl,
        });
      } else {
        setInviteResult({ type: 'success', text: `Invitation sent to ${inviteEmail}` });
      }

      setInviteEmail('');
      setInviteName('');
      setInviteRole('exec');

      // Refresh user list
      fetch('/api/users')
        .then((r) => r.json())
        .then((d) => { if (d?.data) setUsers(d.data); })
        .catch(() => null);
    } catch (err) {
      setInviteResult({ type: 'error', text: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setInviting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-app)',
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 500,
    marginBottom: 4,
    color: 'var(--text-secondary)',
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="p-6">
        <p className="text-sm" style={{ color: 'var(--status-pass)' }}>
          You don&apos;t have permission to manage users. This page requires Owner or Admin access.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" style={{ maxWidth: 680 }}>
      {/* Page header */}
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, color: 'var(--text-primary)' }}
        >
          Team Members
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Manage who has access to Show Pitch Machine
        </p>
      </div>

      {/* Invite form */}
      <Card>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Invite New Member
        </h2>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <label style={labelStyle}>Email address *</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="name@example.com"
                required
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = 'var(--border-strong)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
              />
            </div>
            <div>
              <label style={labelStyle}>Display name (optional)</label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="First Last"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = 'var(--border-strong)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
              />
            </div>
          </div>

          <div style={{ maxWidth: 200 }}>
            <label style={labelStyle}>Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="exec">Exec</option>
              <option value="admin">Admin</option>
              {currentUser?.role === 'owner' && <option value="owner">Owner</option>}
            </select>
          </div>

          {inviteResult && (
            <div>
              <p
                className="text-sm"
                style={{ color: inviteResult.type === 'error' ? 'var(--status-pass)' : 'var(--status-greenlit)' }}
              >
                {inviteResult.text}
              </p>
              {inviteResult.setupUrl && (
                <p className="text-xs mt-1 break-all" style={{ color: 'var(--text-muted)' }}>
                  {inviteResult.setupUrl}
                </p>
              )}
            </div>
          )}

          <Button type="submit" variant="primary" disabled={inviting}>
            {inviting ? 'Sending invite…' : 'Send invite email'}
          </Button>
        </form>
      </Card>

      {/* User list */}
      <Card>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          All Members ({users.length})
        </h2>
        {removeError && (
          <p className="text-sm mb-3" style={{ color: 'var(--status-pass)' }}>{removeError}</p>
        )}
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md"
              style={{
                background: u.id === currentUser?.id ? 'var(--bg-surface-alt)' : 'transparent',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {/* Avatar */}
              <div
                className="flex items-center justify-center rounded-full text-xs font-bold shrink-0"
                style={{
                  width: 36,
                  height: 36,
                  background: 'var(--accent-dim)',
                  color: 'var(--accent)',
                  opacity: u.pending_invite ? 0.5 : 1,
                }}
              >
                {userInitials(u.name)}
              </div>

              {/* Name + email */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {u.name}
                  </p>
                  {u.id === currentUser?.id && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                      you
                    </span>
                  )}
                </div>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
              </div>

              {/* Status badge */}
              <div className="flex items-center gap-2 shrink-0">
                {u.pending_invite ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                    invite sent
                  </span>
                ) : !u.has_password ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-elevated)', color: 'var(--status-pass)', border: '1px solid var(--border-subtle)' }}>
                    no password
                  </span>
                ) : null}

                {/* Role badge */}
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
                  style={{
                    background: 'var(--bg-elevated)',
                    color: ROLE_COLORS[u.role ?? ''] ?? 'var(--text-muted)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {ROLE_LABELS[u.role ?? ''] ?? 'User'}
                </span>

                {/* Remove button — hidden for self; admins cannot remove owners */}
                {u.id !== currentUser?.id &&
                  isPrivileged(currentUser?.role ?? null) &&
                  !(u.role === 'owner' && currentUser?.role !== 'owner') && (
                  <button
                    onClick={() => handleRemove(u.id, u.name)}
                    disabled={removingId === u.id}
                    title="Remove user"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: removingId === u.id ? 'default' : 'pointer',
                      color: 'var(--text-muted)',
                      padding: '2px 4px',
                      borderRadius: 4,
                      fontSize: '0.75rem',
                      lineHeight: 1,
                      opacity: removingId === u.id ? 0.4 : 1,
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => { if (removingId !== u.id) (e.target as HTMLElement).style.color = 'var(--status-pass)'; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.color = 'var(--text-muted)'; }}
                  >
                    {removingId === u.id ? '…' : '✕'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
