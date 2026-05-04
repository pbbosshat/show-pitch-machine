'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function Eye() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function SetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="w-full max-w-sm rounded-xl p-8" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm" style={{ color: 'var(--status-pass)' }}>Missing or invalid invite link.</p>
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Ask your admin to resend the invitation.</p>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/setup-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: name.trim() || undefined, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Setup failed (${res.status})`);
        return;
      }
      // Session cookie is set by the API — go straight to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    paddingRight: 40,
    borderRadius: 6,
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color 150ms ease',
    boxSizing: 'border-box',
  };

  return (
    <div className="w-full max-w-sm rounded-xl p-8" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
      {/* Branding */}
      <div className="flex items-baseline gap-1.5 mb-8">
        <span className="text-2xl font-bold leading-none" style={{ color: 'var(--accent)' }}>MY</span>
        <span className="text-[11px] font-semibold tracking-[0.15em] uppercase" style={{ color: 'var(--text-primary)' }}>Entertainment</span>
      </div>

      <h1 className="text-lg font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>Set up your account</h1>
      <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>Choose your display name and a password to get started.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Display name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="display-name" className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Your name
          </label>
          <input
            id="display-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First Last"
            autoFocus
            style={{ ...inputStyle, paddingRight: 12 }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--border-strong)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Password <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(min 8 characters)</span>
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'var(--border-strong)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
            />
            <button type="button" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
              aria-label={showPassword ? 'Hide' : 'Show'}>
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </div>

        {/* Confirm password */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm-password" className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Confirm password
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'var(--border-strong)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
            />
            <button type="button" onClick={() => setShowConfirm((v) => !v)} tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
              aria-label={showConfirm ? 'Hide' : 'Show'}>
              {showConfirm ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-xs font-medium" style={{ color: 'var(--status-pass)' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-md text-sm font-semibold mt-1"
          style={{ background: 'var(--accent)', color: '#fff', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer', border: 'none' }}
        >
          {loading ? 'Setting up…' : 'Create account'}
        </button>
      </form>

      <div className="mt-5 text-center">
        <Link href="/login" className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>← Back to sign in</Link>
      </div>
    </div>
  );
}

export default function SetupAccountPage() {
  return (
    <Suspense>
      <SetupForm />
    </Suspense>
  );
}
