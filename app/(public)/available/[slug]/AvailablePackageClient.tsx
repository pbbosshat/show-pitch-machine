'use client';

// Client component for the public show package page.
// Receives sanitized title data (no raw password) from the server component.
// Manages the password gate overlay and the request-access form submission.

import { useState } from 'react';
import type { SafeTitle } from './page';
import { pickDeckVideoEmbed } from '@/lib/vimeo';

// Shared input style used across all form fields in the password gate
const inputStyle: React.CSSProperties = {
  background: '#000',
  border: '1px solid #333',
  color: '#fff',
  borderRadius: 6,
  padding: '10px 14px',
  width: '100%',
  fontSize: 14,
  fontFamily: "'Roboto', sans-serif",
  boxSizing: 'border-box',
};

// ── Metadata pill chip ────────────────────────────────────────────────────────
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block',
        background: '#1a1a1a',
        border: '1px solid #2a2a2a',
        color: '#a5a7ad',
        fontSize: 12,
        fontFamily: "'Roboto', sans-serif",
        borderRadius: 4,
        padding: '3px 10px',
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      {children}
    </span>
  );
}

// ── Main client component ─────────────────────────────────────────────────────
export default function AvailablePackageClient({ title }: { title: SafeTitle }) {
  // Gate state — immediately unlocked when no password is set
  const [unlocked, setUnlocked] = useState(!title.has_password);

  // Password section state
  const [password, setPassword]     = useState('');
  const [pwError, setPwError]       = useState('');
  const [pwLoading, setPwLoading]   = useState(false);

  // Request-access form state
  const [reqForm, setReqForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    company: '',
  });
  const [reqLoading, setReqLoading] = useState(false);
  const [reqSent, setReqSent]       = useState(false);
  const [reqError, setReqError]     = useState('');

  // ── Password submit handler ──────────────────────────────────────────────
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pwLoading) return;
    setPwLoading(true);
    setPwError('');

    try {
      const res = await fetch(`/api/available/${title.slug}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json() as { ok: boolean; error?: string };

      if (data.ok) {
        setUnlocked(true);
      } else {
        setPwError('Incorrect password');
      }
    } catch {
      setPwError('Network error — please try again.');
    } finally {
      setPwLoading(false);
    }
  }

  // ── Request access submit handler ────────────────────────────────────────
  async function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reqLoading) return;
    setReqLoading(true);

    setReqError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reqForm, available_title_id: title.id }),
      });
      if (res.ok) {
        setReqSent(true);
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setReqError(data.error ?? `Error ${res.status} — please try again.`);
      }
    } catch {
      setReqError('Network error — please try again.');
    } finally {
      setReqLoading(false);
    }
  }

  // ── Parse markets JSON ───────────────────────────────────────────────────
  // markets is stored as a JSON array string e.g. '["USA","Canada"]'
  let marketList: string[] = [];
  if (title.markets) {
    try {
      const parsed = JSON.parse(title.markets);
      if (Array.isArray(parsed)) marketList = parsed as string[];
    } catch {
      // If parsing fails, treat the raw string as a single market entry
      marketList = [title.markets];
    }
  }

  // ── Vimeo embed URL ──────────────────────────────────────────────────────
  const embedUrl = pickDeckVideoEmbed(title.drive_file_id, title.vimeo_url);

  return (
    <div style={{ background: '#000', minHeight: '100vh' }}>

      {/* ── Password gate overlay ── */}
      {/* Renders on top of the page content — content still renders underneath */}
      {!unlocked && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              maxWidth: 440,
              width: '100%',
              background: '#111',
              border: '1px solid #222',
              borderRadius: 12,
              padding: 40,
            }}
          >
            {/* MY Entertainment logo */}
            <div style={{ marginBottom: 20, textAlign: 'center' }}>
              <span
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontWeight: 900,
                  fontSize: 22,
                  color: '#e51d26',
                  letterSpacing: '-0.5px',
                }}
              >
                MY
              </span>
              <span
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: '#fff',
                  marginLeft: 6,
                }}
              >
                Entertainment
              </span>
            </div>

            {/* Show title */}
            <h1
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: 20,
                fontWeight: 500,
                color: '#fff',
                textAlign: 'center',
                margin: '0 0 24px',
              }}
            >
              {title.title}
            </h1>

            {/* ── Section A: Enter Password ── */}
            <div>
              <p
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 11,
                  color: '#a5a7ad',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  margin: '0 0 10px',
                }}
              >
                Have Access?
              </p>

              <form onSubmit={handlePasswordSubmit}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  style={inputStyle}
                  autoComplete="current-password"
                />

                {pwError && (
                  <p
                    style={{
                      fontFamily: "'Roboto', sans-serif",
                      fontSize: 13,
                      color: '#e51d26',
                      margin: '6px 0 0',
                    }}
                  >
                    {pwError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={pwLoading}
                  style={{
                    background: '#e51d26',
                    color: '#fff',
                    width: '100%',
                    padding: '10px',
                    borderRadius: 6,
                    border: 'none',
                    cursor: pwLoading ? 'not-allowed' : 'pointer',
                    marginTop: 8,
                    fontFamily: "'Roboto', sans-serif",
                    fontSize: 14,
                    fontWeight: 500,
                    opacity: pwLoading ? 0.7 : 1,
                  }}
                >
                  {pwLoading ? 'Verifying…' : 'Unlock'}
                </button>
              </form>
            </div>

            {/* ── Section B: Request Access ── */}
            <div>
              <div style={{ borderTop: '1px solid #222', margin: '24px 0' }} />

              <p
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 11,
                  color: '#a5a7ad',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  margin: '0 0 10px',
                }}
              >
                Request Access
              </p>

              {reqSent ? (
                <p
                  style={{
                    fontFamily: "'Roboto', sans-serif",
                    fontSize: 14,
                    color: '#fff',
                    textAlign: 'center',
                    margin: 0,
                  }}
                >
                  Request sent! We&apos;ll be in touch.
                </p>
              ) : (
                <form onSubmit={handleRequestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="First Name"
                    value={reqForm.first_name}
                    onChange={(e) => setReqForm((f) => ({ ...f, first_name: e.target.value }))}
                    required
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={reqForm.last_name}
                    onChange={(e) => setReqForm((f) => ({ ...f, last_name: e.target.value }))}
                    required
                    style={inputStyle}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={reqForm.email}
                    onChange={(e) => setReqForm((f) => ({ ...f, email: e.target.value }))}
                    required
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    placeholder="Company"
                    value={reqForm.company}
                    onChange={(e) => setReqForm((f) => ({ ...f, company: e.target.value }))}
                    style={inputStyle}
                  />

                  <button
                    type="submit"
                    disabled={reqLoading}
                    style={{
                      background: 'transparent',
                      border: '1px solid #444',
                      color: '#a5a7ad',
                      width: '100%',
                      padding: '10px',
                      borderRadius: 6,
                      cursor: reqLoading ? 'not-allowed' : 'pointer',
                      marginTop: 8,
                      fontFamily: "'Roboto', sans-serif",
                      fontSize: 14,
                      opacity: reqLoading ? 0.7 : 1,
                    }}
                  >
                    {reqLoading ? 'Sending…' : 'Request Access'}
                  </button>
                  {reqError && (
                    <p style={{ color: '#ef4444', fontSize: 13, margin: '4px 0 0', fontFamily: "'Roboto', sans-serif" }}>{reqError}</p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Page content — renders behind the gate when locked ── */}

      {/* Hero image / title banner */}
      {title.image_url ? (
        <div style={{ width: '100%', height: 400, overflow: 'hidden', paddingTop: 72 }}>
          <img
            src={title.image_url}
            alt={title.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      ) : (
        <div
          style={{
            width: '100%',
            height: 400,
            paddingTop: 72,
            background: '#111',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <h1
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 36,
              fontWeight: 400,
              color: '#fff',
              textAlign: 'center',
              padding: '0 20px',
              margin: 0,
            }}
          >
            {title.title}
          </h1>
        </div>
      )}

      {/* ── Main content area ── */}
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '60px 20px',
        }}
      >

        {/* Show title heading (below hero) */}
        <h1
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 36,
            fontWeight: 400,
            color: '#e51d26',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            margin: '0 0 32px',
          }}
        >
          {title.title}
        </h1>

        {/* Vimeo embed — 16:9 responsive container */}
        {embedUrl && (
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, marginBottom: 40 }}>
            <iframe
              src={embedUrl}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 0,
              }}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* Metadata pills row — only render non-null values */}
        <div style={{ marginBottom: 32 }}>
          {title.genre        && <Pill>Genre: {title.genre}</Pill>}
          {title.seasons      !== null && title.seasons !== undefined && (
            <Pill>Seasons: {title.seasons}</Pill>
          )}
          {title.episode_count !== null && title.episode_count !== undefined && (
            <Pill>Episodes: {title.episode_count}</Pill>
          )}
          {title.runtime_mins !== null && title.runtime_mins !== undefined && (
            <Pill>Runtime: {title.runtime_mins} min</Pill>
          )}
          {title.rights_type  && <Pill>Rights: {title.rights_type}</Pill>}
        </div>

        {/* Description */}
        {title.description && (
          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 15,
              color: '#a5a7ad',
              lineHeight: 1.7,
              margin: '0 0 32px',
              maxWidth: 800,
            }}
          >
            {title.description}
          </p>
        )}

        {/* Markets */}
        {marketList.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <p
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: 11,
                color: '#a5a7ad',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                margin: '0 0 10px',
              }}
            >
              Markets
            </p>
            <div>
              {marketList.map((m) => (
                <Pill key={m}>{m}</Pill>
              ))}
            </div>
          </div>
        )}

        {/* Contact link */}
        {title.contact_email && (
          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 14,
              color: '#a5a7ad',
              margin: '0 0 8px',
            }}
          >
            Inquire about this title:{' '}
            <a
              href={`mailto:${title.contact_email}`}
              style={{ color: '#e02027', textDecoration: 'none' }}
            >
              {title.contact_email}
            </a>
          </p>
        )}

      </div>

      {/* ── CTA section ── */}
      <section
        style={{
          padding: '80px 20px',
          textAlign: 'center',
          background: '#000',
          borderTop: '1px solid #1a1a1a',
        }}
      >
        <h2
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 32,
            fontWeight: 400,
            color: '#f2f4f7',
            textTransform: 'capitalize',
            marginBottom: 16,
            marginTop: 0,
          }}
        >
          Ready To Work With The Best?
        </h2>

        <p
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 14,
            color: '#a5a7ad',
            lineHeight: 1.7,
            marginBottom: 28,
            marginTop: 0,
          }}
        >
          Reach out to learn more about how we can make great content together.
        </p>

        <a
          href="/contact"
          style={{
            fontFamily: "'Roboto Condensed', sans-serif",
            fontSize: 14,
            fontWeight: 500,
            color: '#e02027',
            textTransform: 'uppercase',
            textDecoration: 'none',
            letterSpacing: '0.05em',
          }}
        >
          CONTACT US &nbsp;&#10095;
        </a>
      </section>

    </div>
  );
}
