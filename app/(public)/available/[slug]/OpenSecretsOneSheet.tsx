'use client';

import { useState } from 'react';
import type { SafeTitle } from './page';
import { pickDeckVideoEmbed } from '@/lib/vimeo';

// Vivid red — intimate, bold, provocative
const PRIMARY = '#E8203A';
// Near-black with faint warmth
const BLACK   = '#0A0406';
// Dark panel surfaces
const DARK    = '#150608';
const PANEL   = '#1A080C';
// Muted crimson for secondary text
const MUTED   = '#6A2030';
// Off-white
const WHITE   = '#F2EEF0';

// Silk-thread divider — fine horizontal lines evoking intimacy and restraint
function SecretsDivider() {
  return (
    <div style={{ position: 'relative', height: 28, background: BLACK, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(90deg, ${PRIMARY}33 0px, ${PRIMARY}55 1px, transparent 1px, transparent 100px)`,
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(to right, ${BLACK}, transparent 8%, transparent 92%, ${BLACK})`,
      }} />
    </div>
  );
}

// Password gate — slug hardcoded as 'open-secrets'
function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [pw, setPw]   = useState('');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/marketing/available/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'open-secrets', password: pw }),
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
        background: PANEL, border: `1px solid ${PRIMARY}44`,
        borderRadius: 8, padding: '48px 40px', maxWidth: 420, width: '100%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🔑</div>
        <h2 style={{ color: WHITE, fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px' }}>
          Open Secrets
        </h2>
        <p style={{ color: MUTED, fontSize: 14, marginBottom: 28 }}>Enter password to view this package</p>
        <form onSubmit={submit}>
          <input
            type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password"
            style={{
              width: '100%', padding: '12px 16px', background: '#110306', border: `1px solid ${PRIMARY}55`,
              borderRadius: 4, color: WHITE, fontSize: 16, marginBottom: 12, boxSizing: 'border-box',
            }}
          />
          {err && <p style={{ color: '#E05050', fontSize: 13, marginBottom: 12 }}>{err}</p>}
          <button type="submit" style={{
            width: '100%', padding: '12px', background: PRIMARY, color: WHITE,
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

export default function OpenSecretsOneSheet({ title }: { title: SafeTitle }) {
  const [unlocked, setUnlocked] = useState(false);

  if (title.has_password && !unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  // Sizzle reel — casting sizzle on Vimeo — use DB URL if set, fallback to hardcoded
  const embedUrl = pickDeckVideoEmbed(title.drive_file_id, title.vimeo_url, 'https://player.vimeo.com/video/1097039487?h=e25045dc31');

  return (
    <div style={{ background: BLACK, color: WHITE, fontFamily: "'Roboto', sans-serif", lineHeight: 1.6 }}>

      {/* ── HERO — CSS gradient only, no hero image ── */}
      <section style={{ position: 'relative', height: '100vh', overflow: 'hidden', minHeight: 600 }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(135deg, ${BLACK} 0%, ${DARK} 50%, ${PRIMARY}22 100%)`,
        }} />
        {/* Soft radial glow — warmth without flash */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse 60% 55% at 50% 55%, ${PRIMARY}14 0%, transparent 70%)`,
        }} />
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 48px 64px' }}>
          <div style={{ marginBottom: 16 }}>
            <span style={{
              display: 'inline-block', padding: '5px 14px',
              background: `${PRIMARY}22`, border: `1px solid ${PRIMARY}66`,
              borderRadius: 3, color: PRIMARY, fontSize: 11,
              fontFamily: "'Roboto Condensed', sans-serif",
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em',
            }}>Limited Docu-Series · Unparalleled Access</span>
          </div>
          <h1 style={{
            fontFamily: "'Roboto Condensed', sans-serif",
            fontWeight: 900, fontSize: 'clamp(64px, 9vw, 120px)',
            textTransform: 'uppercase', letterSpacing: '-0.01em',
            lineHeight: 0.9, margin: '0 0 20px',
            color: WHITE,
            textShadow: `0 4px 24px rgba(0,0,0,0.8)`,
          }}>
            Open<br />
            <span style={{ color: PRIMARY }}>Secrets</span>
          </h1>
          <p style={{
            fontSize: 'clamp(15px, 1.8vw, 20px)', fontWeight: 400,
            color: `${WHITE}CC`, maxWidth: 560, margin: '0 0 8px',
            fontStyle: 'italic',
          }}>
            &ldquo;What if love wasn&apos;t about possession — but about choice?&rdquo;
          </p>
          <p style={{ color: MUTED, fontSize: 13, fontFamily: "'Roboto Condensed', sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            MY Entertainment
          </p>
        </div>
      </section>

      <SecretsDivider />

      {/* ── THE CONCEPT ── */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '96px 48px', textAlign: 'center' }}>
        <p style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 13, color: PRIMARY, letterSpacing: '0.2em',
          textTransform: 'uppercase', marginBottom: 32,
        }}>The Concept</p>
        <blockquote style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 'clamp(22px, 3vw, 40px)', textTransform: 'uppercase',
          color: WHITE, lineHeight: 1.15, margin: 0,
          borderTop: `3px solid ${PRIMARY}`, borderBottom: `3px solid ${PRIMARY}`,
          padding: '32px 0',
        }}>
          A world often misunderstood.<br />
          Rarely seen from the inside.<br />
          <span style={{ color: PRIMARY }}>Until now.</span>
        </blockquote>
      </section>

      <SecretsDivider />

      {/* ── THE SERIES ── */}
      <section style={{ background: DARK, padding: '80px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 13, color: PRIMARY, letterSpacing: '0.2em',
            textTransform: 'uppercase', marginBottom: 16,
          }}>The Show</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 64, alignItems: 'start' }}>
            <div>
              <h2 style={{
                fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
                fontSize: 'clamp(26px, 3vw, 38px)', textTransform: 'uppercase',
                lineHeight: 1.05, margin: 0, color: WHITE,
              }}>
                It&apos;s not about<br />
                shock value&mdash;<br />
                <span style={{ color: PRIMARY }}>it&apos;s about understanding.</span>
              </h2>
            </div>
            <div style={{ color: `${WHITE}CC`, fontSize: 17, lineHeight: 1.75 }}>
              <p>
                <strong style={{ color: WHITE }}>Open Secrets</strong> offers an unprecedented look into the lives
                of a tight-knit group of friends within the modern swinger community. With unparalleled access,
                this limited docu-series pulls back the curtain on a world often misunderstood and rarely seen
                from the inside.
              </p>
              <p>
                Following several couples at different stages of their journey — from curious newcomers navigating
                their first encounters, to seasoned veterans who&apos;ve found deep connection and freedom in
                non-monogamy — the series explores the emotional, relational, and cultural dimensions of consensual
                non-monogamy.
              </p>
              <p>
                More than just a glimpse into swinging, this is a story about{' '}
                <strong style={{ color: WHITE }}>love, identity, and community</strong> — told by the people
                living it. Think <em>Couples Therapy</em> meets <em>Love on the Spectrum</em>, but inside a
                subculture where communication, consent, and self-discovery are at the core.
              </p>
            </div>
          </div>
        </div>
      </section>

      <SecretsDivider />

      {/* ── KEY DETAILS — 3 cards ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <p style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 13, color: PRIMARY, letterSpacing: '0.2em',
          textTransform: 'uppercase', marginBottom: 40,
        }}>Key Details</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {[
            {
              heading: 'Unparalleled Access',
              body: 'Rare, inside access to a tight-knit community — candid conversations, intimate moments, and raw honesty that demystifies the lifestyle without sensationalism.',
            },
            {
              heading: 'Why Now',
              body: 'Since 2021, younger couples are redefining relationships. The divorce rate among swingers is under 3% as of 2024, while nearly 50% of first marriages end in divorce. This is the cultural conversation happening right now.',
            },
            {
              heading: 'Casting Sizzle Available',
              body: 'A casting sizzle is available for qualified buyers. The series features couples at all stages — from first-timers to long-term participants — with cinematic, emotionally honest storytelling.',
            },
          ].map(({ heading, body }) => (
            <div key={heading} style={{
              background: PANEL, borderRadius: 8, padding: '28px 24px',
              border: `1px solid ${PRIMARY}22`,
            }}>
              <h3 style={{
                fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
                fontSize: 20, textTransform: 'uppercase', color: PRIMARY,
                margin: '0 0 12px',
              }}>{heading}</h3>
              <p style={{ color: `${WHITE}BB`, fontSize: 14, lineHeight: 1.75, margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <SecretsDivider />

      {/* ── SIZZLE REEL ── */}
      <section style={{ background: DARK, padding: '80px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 13, color: PRIMARY, letterSpacing: '0.2em',
            textTransform: 'uppercase', marginBottom: 16,
          }}>Casting Sizzle</p>
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
            <iframe
              src={embedUrl ?? undefined}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0, borderRadius: 4 }}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      <SecretsDivider />

      {/* ── ABOUT / COMPANY BIO ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <p style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 13, color: PRIMARY, letterSpacing: '0.2em',
          textTransform: 'uppercase', marginBottom: 32,
        }}>About the Producers</p>
        <div>
          <h3 style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 24, textTransform: 'uppercase', color: WHITE, margin: '0 0 16px',
          }}>MY Entertainment</h3>
          <p style={{ color: `${WHITE}CC`, fontSize: 14, lineHeight: 1.75, maxWidth: 760 }}>
            MY Entertainment is an independent production company successful in creating undeniable content since 2000,
            best known for compelling characters, innovative deals and high production value. Committed to groundbreaking
            storytelling and global premium programming across all media.
          </p>
          <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.7, marginTop: 12, maxWidth: 760 }}>
            Notable titles: <em>Pros vs. Joes</em>, Destination Fear, Baggage Battles, Sin City Justice,
            Mansion Bloodlines, Breaking Brooklyn — produced for Discovery, Lifetime, ID, Investigation Discovery,
            Oxygen, Reelz and CMT.
          </p>
        </div>
      </section>

      <SecretsDivider />

      {/* ── CTA ── */}
      <section style={{ background: DARK, padding: '80px 48px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <blockquote style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 'clamp(20px, 2.8vw, 30px)', textTransform: 'uppercase',
            color: WHITE, lineHeight: 1.2, margin: '0 0 40px',
            borderTop: `3px solid ${PRIMARY}`, borderBottom: `3px solid ${PRIMARY}`,
            padding: '28px 0',
          }}>
            &ldquo;What if love wasn&apos;t about possession &mdash; but about choice?&rdquo;
          </blockquote>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700,
            fontSize: 18, color: MUTED, textTransform: 'uppercase',
            letterSpacing: '0.12em', marginBottom: 32,
          }}>
            Open Secrets · Limited Docu-Series · Available Now
          </p>
          <a
            href="mailto:info@myentertainment.tv?subject=Open Secrets — Acquisition Inquiry"
            style={{
              display: 'inline-block', padding: '16px 40px',
              background: PRIMARY, color: WHITE, borderRadius: 4,
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.15em',
              textDecoration: 'none',
            }}
          >
            Inquire Now
          </a>
          <p style={{ color: MUTED, fontSize: 14, marginTop: 16 }}>info@myentertainment.tv</p>
        </div>
      </section>

    </div>
  );
}
