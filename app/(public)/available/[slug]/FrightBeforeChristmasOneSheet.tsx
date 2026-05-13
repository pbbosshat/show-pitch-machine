'use client';

import { useState } from 'react';
import type { SafeTitle } from './page';
import { pickDeckVideoEmbed } from '@/lib/vimeo';

// Christmas red — the holiday horror color, yuletide dread
const PRIMARY = '#CC2020';
// Near-black backgrounds — cold, dark, winter night
const BLACK   = '#050308';
const DARK    = '#0C0610';
const PANEL   = '#130A18';
// Muted crimson for secondary text
const MUTED   = '#6A2828';
const WHITE   = '#F2EEF5';

// Icicle-drip divider — frozen horror holiday aesthetic
function IcicleDripDivider() {
  return (
    <div style={{ position: 'relative', height: 36, background: BLACK, overflow: 'hidden' }}>
      {/* Ice shelf line */}
      <div style={{
        position: 'absolute', top: 8, left: 0, right: 0, height: 1,
        background: `linear-gradient(to right, transparent, ${PRIMARY}44 10%, ${PRIMARY}88 50%, ${PRIMARY}44 90%, transparent)`,
      }} />
      {/* Icicle drips — alternating heights */}
      {[8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 92].map((pct, i) => (
        <div key={pct} style={{
          position: 'absolute', top: 8,
          left: `${pct}%`,
          width: 2,
          height: 6 + (i % 3) * 5,
          background: `linear-gradient(to bottom, ${PRIMARY}88, transparent)`,
          borderRadius: '0 0 2px 2px',
        }} />
      ))}
    </div>
  );
}

// Password gate — slug hardcoded as string literal per pattern
function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [pw, setPw]   = useState('');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/marketing/available/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'fright-before-christmas', password: pw }),
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
        <div style={{ fontSize: 48, marginBottom: 8 }}>🎄</div>
        <h2 style={{ color: WHITE, fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px' }}>
          Fright Before Christmas
        </h2>
        <p style={{ color: MUTED, fontSize: 14, marginBottom: 28 }}>Enter password to view this package</p>
        <form onSubmit={submit}>
          <input
            type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password"
            style={{
              width: '100%', padding: '12px 16px', background: '#0A0612', border: `1px solid ${PRIMARY}55`,
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

export default function FrightBeforeChristmasOneSheet({ title }: { title: SafeTitle }) {
  const [unlocked, setUnlocked] = useState(false);

  if (title.has_password && !unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  // Sizzle reel from Vimeo — holiday horror anthology preview — use DB URL if set, fallback to hardcoded
  const embedUrl = pickDeckVideoEmbed(title.drive_file_id, title.vimeo_url, 'https://player.vimeo.com/video/905374739?h=08175a037f');

  return (
    <div style={{ background: BLACK, color: WHITE, fontFamily: "'Roboto', sans-serif", lineHeight: 1.6 }}>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', height: '100vh', overflow: 'hidden', minHeight: 600 }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(135deg, ${BLACK} 0%, ${DARK} 50%, ${PRIMARY}22 100%)`,
        }} />
        {/* Snow-static texture */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(${PRIMARY}10 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }} />
        {/* Candlelight flicker — red vignette */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(ellipse 70% 70% at 50% 0%, ${PRIMARY}14 0%, transparent 60%)`,
        }} />
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 48px 64px' }}>
          <div style={{ marginBottom: 16 }}>
            <span style={{
              display: 'inline-block', padding: '5px 14px',
              background: `${PRIMARY}22`, border: `1px solid ${PRIMARY}66`,
              borderRadius: 3, color: PRIMARY, fontSize: 11,
              fontFamily: "'Roboto Condensed', sans-serif",
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em',
            }}>Holiday Horror · Paranormal Anthology</span>
          </div>
          <h1 style={{
            fontFamily: "'Roboto Condensed', sans-serif",
            fontWeight: 900, fontSize: 'clamp(44px, 7vw, 96px)',
            textTransform: 'uppercase', letterSpacing: '-0.01em',
            lineHeight: 0.88, margin: '0 0 24px',
            color: WHITE,
          }}>
            Fright Before<br />
            <span style={{ color: PRIMARY }}>Christmas</span>
          </h1>
          <p style={{
            fontSize: 'clamp(15px, 1.8vw, 20px)', fontWeight: 400,
            color: `${WHITE}CC`, maxWidth: 560, margin: '0 0 8px',
            fontStyle: 'italic',
          }}>
            &apos;Twas the night before Christmas — and something was wrong.
          </p>
          <p style={{ color: MUTED, fontSize: 13, fontFamily: "'Roboto Condensed', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            MY Entertainment
          </p>
        </div>
      </section>

      <IcicleDripDivider />

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
          The holidays are the most wonderful<br />
          time of the year.<br />
          <span style={{ color: PRIMARY }}>For the things that come in the dark.</span>
        </blockquote>
      </section>

      <IcicleDripDivider />

      {/* ── THE SHOW ── */}
      <section style={{ background: DARK, padding: '80px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 13, color: PRIMARY, letterSpacing: '0.2em',
            textTransform: 'uppercase', marginBottom: 16,
          }}>The Series</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 64, alignItems: 'start' }}>
            <div>
              <h2 style={{
                fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
                fontSize: 'clamp(26px, 2.8vw, 38px)', textTransform: 'uppercase',
                lineHeight: 1.05, margin: 0, color: WHITE,
              }}>
                The holly.<br />
                The ivy.<br />
                <span style={{ color: PRIMARY }}>The horror.</span>
              </h2>
            </div>
            <div style={{ color: `${WHITE}CC`, fontSize: 17, lineHeight: 1.75 }}>
              <p>
                FRIGHT BEFORE CHRISTMAS is a paranormal holiday anthology series that turns the most beloved
                time of year into the most terrifying. Each episode uncovers real, unexplained encounters,
                hauntings, and supernatural events that took place during the Christmas season.
              </p>
              <p>
                From families tormented by apparitions to ancient folklore brought frighteningly to life —
                this is the dark side of the holiday that no one talks about.{' '}
                <strong style={{ color: WHITE }}>Until now.</strong>
              </p>
              <p>
                Mixing first-person accounts, chilling reenactments, and paranormal investigation,
                FRIGHT BEFORE CHRISTMAS delivers the ultimate holiday counter-programming — a series that
                will haunt viewers long after the decorations come down.
              </p>
            </div>
          </div>
        </div>
      </section>

      <IcicleDripDivider />

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
              heading: 'Paranormal Anthology',
              body: 'Real unexplained encounters and supernatural events — all set during the Christmas season. First-person accounts meet cinematic horror.',
            },
            {
              heading: 'Counter-Programming Gold',
              body: 'The holiday slot no one has fully claimed. A paranormal anthology series that owns December the way Halloween owns October.',
            },
            {
              heading: 'Ancient Folklore',
              body: 'From Krampus legends to cursed gifts to apparitions at the fireplace — the darkness hidden behind Christmas cheer runs deep.',
            },
          ].map(({ heading, body }) => (
            <div key={heading} style={{
              background: PANEL, borderRadius: 8, padding: '28px 24px',
              border: `1px solid ${PRIMARY}22`,
            }}>
              <h3 style={{
                fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
                fontSize: 22, textTransform: 'uppercase', color: PRIMARY,
                margin: '0 0 12px',
              }}>{heading}</h3>
              <p style={{ color: `${WHITE}BB`, fontSize: 14, lineHeight: 1.75, margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      <IcicleDripDivider />

      {/* ── SIZZLE REEL ── */}
      <section style={{ background: DARK, padding: '80px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 13, color: PRIMARY, letterSpacing: '0.2em',
            textTransform: 'uppercase', marginBottom: 16,
          }}>Sizzle Reel</p>
          {embedUrl ? (
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              <iframe
                src={embedUrl}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0, borderRadius: 4 }}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div style={{ position: 'relative', paddingBottom: '56.25%', background: PANEL, border: `2px dashed ${PRIMARY}33`, borderRadius: 4 }}>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              }}>
                <span style={{ fontSize: 48, marginBottom: 12 }}>▶</span>
                <p style={{
                  color: PRIMARY, fontFamily: "'Roboto Condensed', sans-serif",
                  fontWeight: 900, fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0,
                }}>Sizzle Available Upon Request</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <IcicleDripDivider />

      {/* ── ABOUT + CTA ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <p style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 13, color: PRIMARY, letterSpacing: '0.2em',
          textTransform: 'uppercase', marginBottom: 32,
        }}>About the Producers</p>
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
      </section>

      <IcicleDripDivider />

      {/* ── CTA ── */}
      <section style={{ background: DARK, padding: '80px 48px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <blockquote style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 'clamp(18px, 2.4vw, 28px)', textTransform: 'uppercase',
            color: WHITE, lineHeight: 1.2, margin: '0 0 40px',
            borderTop: `3px solid ${PRIMARY}`, borderBottom: `3px solid ${PRIMARY}`,
            padding: '28px 0',
          }}>
            &ldquo;&apos;Twas the night before Christmas —<br />
            and something was wrong.<br />
            <span style={{ color: PRIMARY }}>Very, very wrong.&rdquo;</span>
          </blockquote>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700,
            fontSize: 18, color: MUTED, textTransform: 'uppercase',
            letterSpacing: '0.12em', marginBottom: 32,
          }}>
            Fright Before Christmas · Holiday Horror · Available Now
          </p>
          <a
            href="mailto:info@myentertainment.tv?subject=Fright Before Christmas — Acquisition Inquiry"
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
