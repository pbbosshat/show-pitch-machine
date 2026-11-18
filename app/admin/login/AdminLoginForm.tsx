'use client';

import { useState, type FormEvent } from 'react';

export default function AdminLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/fin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Sign-in failed (${res.status})`);
        setLoading(false);
        return;
      }
      // Full navigation so the admin layout renders with the signed-in nav.
      window.location.href = '/admin';
    } catch {
      setError('Network error — please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="fin-card w-full max-w-sm p-8" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
      <div className="fin-brand mb-1" style={{ fontSize: '1.125rem' }}>
        MYE <span>Admin</span>
      </div>
      <p className="fin-page-sub" style={{ marginBottom: 24 }}>Amex reconciliation · sign in</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="fin-email" className="fin-label">Email</label>
          <input
            id="fin-email"
            type="email"
            className="fin-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </div>
        <div>
          <label htmlFor="fin-password" className="fin-label">Password</label>
          <input
            id="fin-password"
            type="password"
            className="fin-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error && <p className="fin-error">{error}</p>}
        <button type="submit" className="fin-btn fin-btn-primary justify-center" disabled={loading} style={{ padding: '8px 12px' }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p className="fin-muted mt-5" style={{ fontSize: '0.75rem' }}>
        This is separate from the Show Pitch Machine staff login. Forgot your password? Ask an MYE Admin to reset it.
      </p>
    </div>
  );
}
