'use client';

import { useState } from 'react';
import type { SafeTitle } from './page';
import { pickDeckVideoEmbed } from '@/lib/vimeo';

// Gold-on-dark crime/documentary palette
const GOLD  = '#C8A84B';
const BLACK = '#0B0B14';
const DARK  = '#131320';
const PANEL = '#1A1A2E';
const MUTED = '#6B6B8A';
const WHITE = '#F0EEE8';

function GoldDivider() {
  return (
    <div style={{ position: 'relative', height: 24, background: BLACK, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(90deg, ${GOLD}18 0px, ${GOLD}38 1px, transparent 1px, transparent 80px)`,
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 64, height: 1,
        background: `linear-gradient(to right, transparent, ${GOLD}99, transparent)`,
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
      body: JSON.stringify({ slug: 'michelle-renee', password: pw }),
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
        background: PANEL, border: `1px solid ${GOLD}44`,
        borderRadius: 8, padding: '48px 40px', maxWidth: 420, width: '100%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🔎</div>
        <h2 style={{ color: WHITE, fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 8px' }}>
          Michelle Renee
        </h2>
        <p style={{ color: MUTED, fontSize: 14, marginBottom: 28 }}>Enter password to view this package</p>
        <form onSubmit={submit}>
          <input
            type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password"
            style={{
              width: '100%', padding: '12px 16px', background: '#080810', border: `1px solid ${GOLD}55`,
              borderRadius: 4, color: WHITE, fontSize: 16, marginBottom: 12, boxSizing: 'border-box',
            }}
          />
          {err && <p style={{ color: '#E05050', fontSize: 13, marginBottom: 12 }}>{err}</p>}
          <button type="submit" style={{
            width: '100%', padding: '12px', background: GOLD, color: BLACK,
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

export default function MichelleReneeOneSheet({ title }: { title: SafeTitle }) {
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
            alt="Michelle Renee"
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
            background: `${GOLD}22`, border: `1px solid ${GOLD}66`,
            borderRadius: 3, color: GOLD, fontSize: 11,
            fontFamily: "'Roboto Condensed', sans-serif",
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: 12,
          }}>True Crime Documentary</span>
          <h1 style={{
            fontFamily: "'Roboto Condensed', sans-serif",
            fontWeight: 900, fontSize: 'clamp(44px, 6vw, 88px)',
            textTransform: 'uppercase', lineHeight: 0.92,
            margin: '0 0 16px', color: WHITE,
            textShadow: '0 4px 20px rgba(0,0,0,0.9)',
          }}>
            Michelle<br /><span style={{ color: GOLD }}>Renee</span>
          </h1>
          <p style={{ color: `${WHITE}AA`, fontSize: 16, maxWidth: 520, margin: 0, fontStyle: 'italic' }}>
            A true crime investigation into a case that shook a community and demanded answers.
          </p>
        </div>
      </section>

      <GoldDivider />

      {/* ── THE STORY ── */}
      <section style={{ background: DARK, padding: '72px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 12, color: GOLD, letterSpacing: '0.22em',
            textTransform: 'uppercase', marginBottom: 24,
          }}>The Story</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 56, alignItems: 'start' }}>
            <h2 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 'clamp(22px, 2.5vw, 32px)', textTransform: 'uppercase',
              lineHeight: 1.1, margin: 0, color: WHITE,
            }}>
              One woman.<br />
              One case.<br />
              <span style={{ color: GOLD }}>One fight for the truth.</span>
            </h2>
            <div style={{ color: `${WHITE}CC`, fontSize: 15, lineHeight: 1.8 }}>
              <p style={{ marginTop: 0 }}>
                <strong style={{ color: WHITE }}>Michelle Renee</strong> is a true crime documentary that follows
                investigators, family members, and witnesses who refused to let a case go cold. With exclusive
                access and newly uncovered evidence, the series pieces together what really happened.
              </p>
              <p>
                Part investigation, part human portrait, the series examines how communities process grief,
                demand accountability, and fight for justice when the system falls short.
              </p>
              <p style={{ marginBottom: 0 }}>
                MY Entertainment brings its signature documentary approach to a story that resonates far
                beyond one case, touching on systemic issues in crime investigation and the relentless pursuit
                of truth.
              </p>
            </div>
          </div>
        </div>
      </section>

      <GoldDivider />

      {/* ── SIZZLE REEL ── */}
      {embedUrl && (
        <section style={{ padding: '72px 48px', background: BLACK }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <p style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 12, color: GOLD, letterSpacing: '0.22em',
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

      <GoldDivider />

      {/* ── FORMAT ── */}
      <section style={{ padding: '72px 48px', background: DARK }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 12, color: GOLD, letterSpacing: '0.22em',
            textTransform: 'uppercase', marginBottom: 32,
          }}>Format &amp; Rights</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              { label: 'Format', value: 'Documentary Series' },
              { label: 'Rights', value: 'All Rights Available' },
              { label: 'Contact', value: 'info@myentertainment.tv' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: PANEL, borderRadius: 6, padding: '24px 20px',
                border: `1px solid ${GOLD}22`, textAlign: 'center',
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

      <GoldDivider />

      {/* ── CTA ── */}
      <section style={{ padding: '80px 48px', background: BLACK, textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 13, color: GOLD, letterSpacing: '0.2em',
            textTransform: 'uppercase', marginBottom: 16,
          }}>MY Entertainment</p>
          <p style={{ color: `${WHITE}BB`, fontSize: 15, lineHeight: 1.75, marginBottom: 36 }}>
            Independent production company creating undeniable content since 2000. Known for Ghost Adventures,
            Destination Fear, and 40+ titles distributed across Discovery, A&amp;E, PBS, and 28+ networks.
          </p>
          <a
            href="mailto:info@myentertainment.tv?subject=Michelle Renee - Acquisition Inquiry"
            style={{
              display: 'inline-block', padding: '15px 40px',
              background: GOLD, color: BLACK, borderRadius: 4,
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.14em',
              textDecoration: 'none', marginBottom: 12,
            }}
          >
            Inquire Now
          </a>
          <p style={{ color: MUTED, fontSize: 13, marginTop: 8 }}>
            <a href="/contact" style={{ color: GOLD, textDecoration: 'none' }}>Contact MY Entertainment</a>
            {' '}&middot;{' '}
            info@myentertainment.tv
          </p>
        </div>
      </section>

    </div>
  );
}
