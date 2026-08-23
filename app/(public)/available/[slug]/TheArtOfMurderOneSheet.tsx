'use client';

import { useState } from 'react';
import type { SafeTitle } from './page';
import { pickDeckVideoEmbed } from '@/lib/vimeo';

// Deep red crime-thriller palette
const RED   = '#CC2929';
const BLACK = '#0D0A0A';
const DARK  = '#130D0D';
const PANEL = '#1A1010';
const MUTED = '#7A5050';
const WHITE = '#F5EEEE';

function CrimeDivider() {
  return (
    <div style={{ position: 'relative', height: 24, background: BLACK, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(90deg, ${RED}14 0px, ${RED}28 1px, transparent 1px, transparent 80px)`,
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 64, height: 1,
        background: `linear-gradient(to right, transparent, ${RED}99, transparent)`,
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(to right, ${BLACK}, transparent 10%, transparent 90%, ${BLACK})`,
      }} />
    </div>
  );
}

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [pw, setPw]   = useState('');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/marketing/available/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'the-art-of-murder', password: pw }),
    });
    if (res.ok) {
      onUnlock();
    } else {
      const d = await res.json().catch(() => ({}));
      setErr(d?.error || 'Incorrect password');
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: BLACK, display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: "'Roboto Condensed', sans-serif",
    }}>
      <div style={{
        background: PANEL, border: `1px solid ${RED}44`,
        borderRadius: 8, padding: '48px 40px', maxWidth: 420, width: '100%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🔴</div>
        <h2 style={{ color: WHITE, fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 8px' }}>
          The Art of Murder
        </h2>
        <p style={{ color: MUTED, fontSize: 14, marginBottom: 28 }}>Enter password to view this package</p>
        <form onSubmit={submit}>
          <input
            type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password"
            style={{
              width: '100%', padding: '12px 16px', background: '#0A0808', border: `1px solid ${RED}55`,
              borderRadius: 4, color: WHITE, fontSize: 16, marginBottom: 12, boxSizing: 'border-box',
            }}
          />
          {err && <p style={{ color: '#FF6060', fontSize: 13, marginBottom: 12 }}>{err}</p>}
          <button type="submit" style={{
            width: '100%', padding: '12px', background: RED, color: WHITE,
            border: 'none', borderRadius: 4, fontSize: 15, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer',
          }}>
            View Package
          </button>
        </form>
      </div>
    </div>
  );
}

export default function TheArtOfMurderOneSheet({ title }: { title: SafeTitle }) {
  const [unlocked, setUnlocked] = useState(!title.has_password);

  if (title.has_password && !unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  const embedUrl = pickDeckVideoEmbed(title.drive_file_id, title.vimeo_url);

  return (
    <div style={{ background: BLACK, color: WHITE, fontFamily: "'Roboto', sans-serif", lineHeight: 1.6 }}>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', minHeight: 520, overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
        {title.image_url && (
          <img
            src={title.image_url}
            alt="The Art of Murder"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
          />
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to top, ${BLACK} 0%, ${BLACK}88 40%, transparent 100%)`,
        }} />
        <div style={{ position: 'relative', padding: '0 48px 56px', width: '100%' }}>
          <span style={{
            display: 'inline-block', padding: '4px 12px',
            background: `${RED}22`, border: `1px solid ${RED}66`,
            borderRadius: 3, color: RED, fontSize: 11,
            fontFamily: "'Roboto Condensed', sans-serif",
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 12,
          }}>True Crime Documentary</span>
          <h1 style={{
            fontFamily: "'Roboto Condensed', sans-serif",
            fontWeight: 900, fontSize: 'clamp(40px, 6vw, 84px)',
            textTransform: 'uppercase', lineHeight: 0.92,
            margin: '0 0 16px', color: WHITE,
            textShadow: '0 4px 20px rgba(0,0,0,0.9)',
          }}>
            The Art<br />of <span style={{ color: RED }}>Murder</span>
          </h1>
          <p style={{ color: `${WHITE}AA`, fontSize: 16, maxWidth: 520, margin: 0, fontStyle: 'italic' }}>
            A deep-dive documentary series into killers who turned violence into craft.
          </p>
        </div>
      </section>

      <CrimeDivider />

      {/* ── THE STORY ── */}
      <section style={{ background: DARK, padding: '72px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 12, color: RED, letterSpacing: '0.22em',
            textTransform: 'uppercase', marginBottom: 24,
          }}>The Story</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 56, alignItems: 'start' }}>
            <h2 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 'clamp(22px, 2.5vw, 32px)', textTransform: 'uppercase',
              lineHeight: 1.1, margin: 0, color: WHITE,
            }}>
              Method.<br />
              Motive.<br />
              <span style={{ color: RED }}>The truth beneath.</span>
            </h2>
            <div style={{ color: `${WHITE}CC`, fontSize: 15, lineHeight: 1.8 }}>
              <p style={{ marginTop: 0 }}>
                <strong style={{ color: WHITE }}>The Art of Murder</strong> is a true crime documentary
                series that goes beyond the crime scene to examine the psychology, background, and methods
                of killers whose crimes became notorious not just for their brutality, but for their
                calculated precision.
              </p>
              <p>
                Each episode unravels the layers of a case through archival material, expert interviews,
                and forensic analysis, asking what drives someone to commit violence they consider
                a kind of craft.
              </p>
              <p style={{ marginBottom: 0 }}>
                A MY Entertainment production, The Art of Murder sits at the intersection of crime
                investigation and character study, built for audiences who demand depth over sensationalism.
              </p>
            </div>
          </div>
        </div>
      </section>

      <CrimeDivider />

      {/* ── SIZZLE REEL ── */}
      {embedUrl && (
        <section style={{ padding: '72px 48px', background: BLACK }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <p style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 12, color: RED, letterSpacing: '0.22em',
              textTransform: 'uppercase', marginBottom: 16,
            }}>Sizzle Reel</p>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: 4, overflow: 'hidden' }}>
              <iframe
                src={embedUrl}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      )}

      <CrimeDivider />

      {/* ── FORMAT ── */}
      <section style={{ padding: '72px 48px', background: DARK }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 12, color: RED, letterSpacing: '0.22em',
            textTransform: 'uppercase', marginBottom: 32,
          }}>Format &amp; Rights</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              { label: 'Format', value: 'True Crime Documentary Series' },
              { label: 'Rights', value: 'All Rights Available' },
              { label: 'Contact', value: 'info@myentertainment.tv' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: PANEL, borderRadius: 6, padding: '24px 20px',
                border: `1px solid ${RED}22`, textAlign: 'center',
              }}>
                <p style={{
                  fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700,
                  fontSize: 11, color: MUTED, letterSpacing: '0.18em',
                  textTransform: 'uppercase', margin: '0 0 8px',
                }}>{label}</p>
                <p style={{ color: WHITE, fontSize: 14, fontWeight: 600, margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CrimeDivider />

      {/* ── CTA ── */}
      <section style={{ padding: '80px 48px', textAlign: 'center', background: BLACK }}>
        <h2 style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 32, textTransform: 'uppercase', letterSpacing: '0.08em',
          color: WHITE, margin: '0 0 12px',
        }}>
          Acquire <span style={{ color: RED }}>The Art of Murder</span>
        </h2>
        <p style={{ color: MUTED, fontSize: 15, maxWidth: 480, margin: '0 auto 32px' }}>
          Contact MY Entertainment to discuss licensing, co-production, and distribution rights.
        </p>
        <a
          href="mailto:info@myentertainment.tv"
          style={{
            display: 'inline-block', padding: '14px 36px',
            background: RED, color: WHITE,
            fontFamily: "'Roboto Condensed', sans-serif",
            fontWeight: 700, fontSize: 14, textTransform: 'uppercase',
            letterSpacing: '0.1em', textDecoration: 'none', borderRadius: 3,
          }}
        >
          Request More Info
        </a>
      </section>

    </div>
  );
}
