'use client';

import { useState } from 'react';
import type { SafeTitle } from './page';

// Hot pink primary accent
const PINK   = '#E0257A';
// Near-black background
const BLACK  = '#0C080F';
// Dark panel surface
const PANEL  = '#1A1025';
// Cream white text
const WHITE  = '#F5F0F8';
// Muted secondary text
const MUTED  = '#9A8FA8';

// Pink/black diagonal hazard-tape style divider
function PinkDivider() {
  return (
    <div style={{ height: 24, overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        backgroundImage: `repeating-linear-gradient(-45deg, ${PINK}, ${PINK} 12px, #111 12px, #111 24px)`,
        opacity: 0.85,
      }} />
    </div>
  );
}

// Password gate — identical API pattern to HeartlandPowerOneSheet
function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [pw, setPw]   = useState('');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/marketing/available/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'heidi-montag-rookie-pi', password: pw }),
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
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Roboto Condensed', sans-serif",
    }}>
      <div style={{
        background: PANEL, border: `1px solid ${PINK}44`,
        borderRadius: 8, padding: '48px 40px', maxWidth: 420, width: '100%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🔍</div>
        <h2 style={{
          color: WHITE, fontSize: 24, fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px',
        }}>
          Heidi Montag: Rookie PI
        </h2>
        <p style={{ color: MUTED, fontSize: 14, marginBottom: 28 }}>Enter password to view this package</p>
        <form onSubmit={submit}>
          <input
            type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password"
            style={{
              width: '100%', padding: '12px 16px', background: '#150D1E',
              border: `1px solid ${PINK}55`, borderRadius: 4, color: WHITE,
              fontSize: 16, marginBottom: 12, boxSizing: 'border-box',
            }}
          />
          {err && <p style={{ color: '#E05050', fontSize: 13, marginBottom: 12 }}>{err}</p>}
          <button type="submit" style={{
            width: '100%', padding: '12px', background: PINK, color: WHITE,
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

export default function HeidiMontagRookiePiOneSheet({ title }: { title: SafeTitle }) {
  const [unlocked, setUnlocked] = useState(false);

  // Show password gate if the title is protected and viewer hasn't unlocked yet
  if (title.has_password && !unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  // No sizzle reel available yet — placeholder renders instead
  const embedUrl: string | null = null;

  return (
    <div style={{ background: BLACK, color: WHITE, fontFamily: "'Roboto', sans-serif", lineHeight: 1.6 }}>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', height: '100vh', overflow: 'hidden', minHeight: 600 }}>
        <img
          src="/available-thumbs/hm.png"
          alt="Heidi Montag: Rookie PI"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
        />
        {/* Dark gradient overlay — fade hero into background */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to bottom, rgba(12,8,15,0.3) 0%, rgba(12,8,15,0.5) 50%, rgba(12,8,15,0.92) 90%, ${BLACK} 100%)`,
        }} />
        <div style={{
          position: 'relative', height: '100%', display: 'flex',
          flexDirection: 'column', justifyContent: 'flex-end', padding: '0 48px 64px',
        }}>
          {/* Format badge */}
          <div style={{ marginBottom: 16 }}>
            <span style={{
              display: 'inline-block', padding: '5px 14px',
              background: `${PINK}22`, border: `1px solid ${PINK}66`,
              borderRadius: 3, color: PINK, fontSize: 11,
              fontFamily: "'Roboto Condensed', sans-serif",
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em',
            }}>Premium Factual Series · 6 × 60 min</span>
          </div>
          <h1 style={{
            fontFamily: "'Roboto Condensed', sans-serif",
            fontWeight: 900, fontSize: 'clamp(48px, 7vw, 96px)',
            textTransform: 'uppercase', letterSpacing: '-0.01em',
            lineHeight: 0.9, margin: '0 0 20px',
            textShadow: '0 4px 24px rgba(0,0,0,0.7)',
          }}>
            Heidi Montag:<br />
            <span style={{ color: PINK }}>Rookie PI</span>
          </h1>
          <p style={{
            fontSize: 'clamp(16px, 2.2vw, 22px)', fontWeight: 400,
            color: `${WHITE}CC`, maxWidth: 560, margin: '0 0 8px',
            textShadow: '0 2px 12px rgba(0,0,0,0.7)',
            fontStyle: 'italic',
          }}>
            From reality star to real private investigator
          </p>
          <p style={{
            color: MUTED, fontSize: 14,
            fontFamily: "'Roboto Condensed', sans-serif",
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            MY Entertainment
          </p>
        </div>
      </section>

      <PinkDivider />

      {/* ── THE SERIES ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 64, alignItems: 'start' }}>
          <div>
            <p style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 13, color: PINK, letterSpacing: '0.2em',
              textTransform: 'uppercase', marginBottom: 16,
            }}>The Series</p>
            <h2 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 'clamp(28px, 3vw, 42px)', textTransform: 'uppercase',
              lineHeight: 1, margin: 0, color: WHITE,
            }}>
              From the<br />Spotlight<br /><span style={{ color: PINK }}>to the Shadows.</span>
            </h2>
          </div>
          <div style={{ color: `${WHITE}CC`, fontSize: 17, lineHeight: 1.75 }}>
            <p>
              Heidi Montag has lived her life in the spotlight — where everything is seen, judged, and shared.
              But while Heidi believes honesty is the best policy, she&apos;s also learned that most people live
              behind carefully guarded secrets.
            </p>
            <p>
              Heidi trades the spotlight for the shadows of private investigation, teaming up with a seasoned
              professional PI who will mentor her through the real craft of surveillance, interviewing,
              and undercover work.
            </p>
          </div>
        </div>
      </section>

      <PinkDivider />

      {/* ── SLIDE 2 IMAGE ── */}
      <section style={{ background: PANEL }}>
        <img
          src="/available-thumbs/hm-2.png"
          alt="Heidi Montag — investigation"
          style={{ width: '100%', maxHeight: 520, objectFit: 'cover', objectPosition: 'center', display: 'block' }}
        />
      </section>

      <PinkDivider />

      {/* ── WHY THE UK ── */}
      <section style={{ background: PANEL, padding: '80px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 64, alignItems: 'start' }}>
            <div>
              <p style={{
                fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
                fontSize: 13, color: PINK, letterSpacing: '0.2em',
                textTransform: 'uppercase', marginBottom: 16,
              }}>Why the UK</p>
              <h2 style={{
                fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
                fontSize: 'clamp(26px, 2.8vw, 38px)', textTransform: 'uppercase',
                lineHeight: 1.05, margin: 0, color: WHITE,
              }}>
                The Ultimate<br /><span style={{ color: PINK }}>Training Ground</span>
              </h2>
            </div>
            <p style={{ color: `${WHITE}CC`, fontSize: 16, lineHeight: 1.8, margin: 0 }}>
              From Sherlock Holmes to modern-day surveillance experts, the UK has a long-standing obsession
              with truth-making, making it the ultimate training ground for a rookie stepping into
              the world of secrets.
            </p>
          </div>
        </div>
      </section>

      <PinkDivider />

      {/* ── THE QUESTION ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <p style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 13, color: PINK, letterSpacing: '0.2em',
          textTransform: 'uppercase', marginBottom: 16,
        }}>The Question</p>
        <blockquote style={{
          borderLeft: `4px solid ${PINK}`, paddingLeft: 28, margin: 0,
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 'clamp(20px, 2.5vw, 30px)', color: WHITE,
          lineHeight: 1.3, textTransform: 'uppercase',
        }}>
          Can someone who believes in radical honesty succeed in a world built on secrets?
        </blockquote>
        <p style={{ color: `${WHITE}BB`, fontSize: 16, lineHeight: 1.8, marginTop: 28, maxWidth: 800 }}>
          Each case presents a new challenge — from suspected infidelity to hidden scams and deeply personal
          mysteries — pushing Heidi to apply what she&apos;s learned in real time.
        </p>
      </section>

      <PinkDivider />

      {/* ── STATS BAR ── */}
      <section style={{ background: PANEL, padding: '48px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, textAlign: 'center' }}>
            {[
              { num: '6',           label: 'Episodes' },
              { num: 'UK',          label: 'Production' },
              { num: 'Celebrity',   label: 'Host' },
              { num: 'Real',        label: 'Cases' },
            ].map(({ num, label }) => (
              <div key={label}>
                <div style={{
                  fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
                  fontSize: 'clamp(28px, 3vw, 42px)', color: PINK, lineHeight: 1, marginBottom: 8,
                }}>{num}</div>
                <div style={{ color: MUTED, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PinkDivider />

      {/* ── SLIDE 3 IMAGE ── */}
      <section>
        <img
          src="/available-thumbs/hm-3.png"
          alt="Heidi Montag: Rookie PI — series details"
          style={{ width: '100%', maxHeight: 520, objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
        />
      </section>

      <PinkDivider />

      {/* ── SIZZLE REEL ── */}
      <section style={{ background: PANEL, padding: '80px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 13, color: PINK, letterSpacing: '0.2em',
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
            <div style={{ position: 'relative', paddingBottom: '56.25%', background: BLACK, border: `2px dashed ${PINK}33`, borderRadius: 4 }}>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              }}>
                <span style={{ fontSize: 48, marginBottom: 12 }}>▶</span>
                <p style={{
                  color: PINK, fontFamily: "'Roboto Condensed', sans-serif",
                  fontWeight: 900, fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0,
                }}>Sizzle Available Upon Request</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <PinkDivider />

      {/* ── COMPANY BIO ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <p style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 13, color: PINK, letterSpacing: '0.2em',
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
            Notable titles: <em>Pros vs. Joes</em>, <em>Destination Fear</em>, <em>Baggage Battles</em>,{' '}
            <em>Sin City Justice</em>, <em>Mansion Bloodlines</em>, <em>Breaking Brooklyn</em> — produced for
            Discovery, Lifetime, ID, Investigation Discovery, Oxygen, Reelz and CMT.
          </p>
        </div>
      </section>

      <PinkDivider />

      {/* ── CTA ── */}
      <section style={{ background: PANEL, padding: '80px 48px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <blockquote style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 'clamp(20px, 2.8vw, 28px)', textTransform: 'uppercase',
            color: WHITE, lineHeight: 1.25, margin: '0 0 40px',
            borderTop: `3px solid ${PINK}`, borderBottom: `3px solid ${PINK}`,
            padding: '28px 0',
          }}>
            &ldquo;From reality star to real private investigator — the truth is always more complicated than the story.&rdquo;
          </blockquote>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700,
            fontSize: 18, color: MUTED, textTransform: 'uppercase',
            letterSpacing: '0.12em', marginBottom: 32,
          }}>
            Heidi Montag: Rookie PI · Premium Factual Series · Available Now
          </p>
          <a
            href="mailto:info@myentertainment.tv?subject=Heidi Montag: Rookie PI — Acquisition Inquiry"
            style={{
              display: 'inline-block', padding: '16px 40px',
              background: PINK, color: WHITE, borderRadius: 4,
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
