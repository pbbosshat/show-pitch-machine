'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

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

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="w-full max-w-sm rounded-xl p-8" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        <p className="text-sm" style={{ color: 'var(--status-pass)' }}>Missing or invalid reset token.</p>
        <Link href="/forgot-password" className="text-xs mt-3 block hover:underline" style={{ color: 'var(--text-muted)' }}>Request a new link</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full max-w-sm rounded-xl p-8" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
        <div className="flex items-baseline gap-1.5 mb-6">
          <span className="text-2xl font-bold leading-none" style={{ color: 'var(--accent)' }}>MY</span>
          <span className="text-[11px] font-semibold tracking-[0.15em] uppercase" style={{ color: 'var(--text-primary)' }}>Entertainment</span>
        </div>
        <h1 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Password updated</h1>
        <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>Your password has been changed. Sign in with your new credentials.</p>
        <Link
          href="/login"
          className="block w-full text-center py-2 rounded-md text-sm font-semibold"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Reset failed (${res.status})`);
        return;
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-xl p-8" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
      <div className="flex items-baseline gap-1.5 mb-8">
        <span className="text-2xl font-bold leading-none" style={{ color: 'var(--accent)' }}>MY</span>
        <span className="text-[11px] font-semibold tracking-[0.15em] uppercase" style={{ color: 'var(--text-primary)' }}>Entertainment</span>
      </div>

      <h1 className="text-lg font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>Set new password</h1>
      <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>Must be at least 8 characters.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* New password */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="new-password" className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>New password</label>
          <div className="relative">
            <input
              id="new-password"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
              required
              className="w-full px-3 py-2 pr-10 rounded-md text-sm focus:outline-none"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', transition: 'border-color 150ms ease' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--border-strong)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
            />
            <button type="button" onClick={() => setShowNew((v) => !v)} tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)', cursor: 'pointer' }}
              aria-label={showNew ? 'Hide' : 'Show'}>
              {showNew ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </div>

        {/* Confirm */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm-password" className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Confirm password</label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showConfirm ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2 pr-10 rounded-md text-sm focus:outline-none"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', transition: 'border-color 150ms ease' }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--border-strong)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
            />
            <button type="button" onClick={() => setShowConfirm((v) => !v)} tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)', cursor: 'pointer' }}
              aria-label={showConfirm ? 'Hide' : 'Show'}>
              {showConfirm ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </div>

        {error && <p className="text-xs font-medium" style={{ color: 'var(--status-pass)' }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-md text-sm font-semibold"
          style={{ background: 'var(--accent)', color: '#fff', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Saving…' : 'Set password'}
        </button>
      </form>

      <div className="mt-5 text-center">
        <Link href="/login" className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>← Back to sign in</Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
