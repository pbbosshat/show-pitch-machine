'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [resetUrl, setResetUrl] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Request failed (${res.status})`);
        return;
      }

      setResetUrl(data.resetUrl ? `${window.location.origin}${data.resetUrl}` : '');
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(resetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (submitted) {
    return (
      <div
        className="w-full max-w-sm rounded-xl p-8"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-baseline gap-1.5 mb-6">
          <span className="text-2xl font-bold leading-none" style={{ color: 'var(--accent)' }}>MY</span>
          <span className="text-[11px] font-semibold tracking-[0.15em] uppercase" style={{ color: 'var(--text-primary)' }}>Entertainment</span>
        </div>

        {resetUrl ? (
          <>
            <h1 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Reset link ready</h1>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Copy and open this link to set a new password. Expires in 6 hours.
            </p>
            <div
              className="rounded-md px-3 py-2 mb-3 text-xs break-all"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono, monospace' }}
            >
              {resetUrl}
            </div>
            <button
              onClick={copyLink}
              className="w-full py-2 rounded-md text-sm font-semibold mb-4"
              style={{ background: copied ? 'var(--status-greenlit)' : 'var(--accent)', color: '#fff', cursor: 'pointer', transition: 'background 150ms ease' }}
            >
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Check with your admin</h1>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              If that email is registered, a reset link has been generated. Contact your admin to retrieve it.
            </p>
          </>
        )}

        <Link href="/login" className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-sm rounded-xl p-8"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-baseline gap-1.5 mb-8">
        <span className="text-2xl font-bold leading-none" style={{ color: 'var(--accent)' }}>MY</span>
        <span className="text-[11px] font-semibold tracking-[0.15em] uppercase" style={{ color: 'var(--text-primary)' }}>Entertainment</span>
      </div>

      <h1 className="text-lg font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>Forgot password?</h1>
      <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
        Enter your email and we'll generate a reset link.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
            required
            className="w-full px-3 py-2 rounded-md text-sm focus:outline-none"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              transition: 'border-color 150ms ease',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--border-strong)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
          />
        </div>

        {error && (
          <p className="text-xs font-medium" style={{ color: 'var(--status-pass)' }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-md text-sm font-semibold"
          style={{
            background: 'var(--accent)',
            color: '#fff',
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Generating…' : 'Send reset link'}
        </button>
      </form>

      <div className="mt-5 text-center">
        <Link href="/login" className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>
          ← Back to sign in
        </Link>
      </div>
    </div>
  );
}
