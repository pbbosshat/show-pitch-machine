'use client';
// Account Settings — profile display + change password form.
// Fetches current user from /api/me and POsTs password changes to /api/me/password.

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface User {
  id: string;
  name: string;
  email: string;
  role: string | null;
}

function userInitials(name: string): string {
  return name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.json())
      .then(d => setUser(d.data))
      .catch(() => null);
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          currentPassword,
          newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: json.error ?? `Error ${res.status}: ${res.statusText}` });
      } else {
        setMessage({ type: 'success', text: 'Password updated successfully' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setSaving(false);
    }
  };

  const initials = user ? userInitials(user.name) : '?';

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-app)',
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 500,
    marginBottom: 4,
    color: 'var(--text-secondary)',
  };

  return (
    <div className="p-6 space-y-6" style={{ maxWidth: 520 }}>
      {/* Page header */}
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, color: 'var(--text-primary)' }}
        >
          Account Settings
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Your profile and security settings
        </p>
      </div>

      {/* Profile card */}
      <Card>
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
            style={{ background: 'var(--accent)', color: '#FFFFFF' }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {user?.name ?? '—'}
            </p>
            <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
              {user?.email || 'No email on file'}
            </p>
            {user?.role && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {user.role}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Change password card */}
      <Card>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Change Password
        </h2>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label style={labelStyle}>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Leave blank if no password set yet"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              required
              style={inputStyle}
            />
          </div>

          {message && (
            <p
              className="text-sm"
              style={{ color: message.type === 'error' ? 'var(--status-pass)' : 'var(--status-greenlit)' }}
            >
              {message.text}
            </p>
          )}

          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Update Password'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
