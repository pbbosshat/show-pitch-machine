'use client';

import { useState } from 'react';
import type { SafeTitle } from './page';

// Forest green — primary (field / athletic energy)
const GREEN   = '#1C7A3C';
// Gold — accent (championship / achievement)
const GOLD    = '#D4A017';
// Near-black background
const BLACK   = '#080C09';
// Dark panel surfaces
const DARK    = '#0F1512';
const PANEL   = '#141A16';
// Text
const WHITE   = '#F0F5F1';
const MUTED   = '#7A8A7D';

// Horizontal field-line divider with green stripes
function FieldDivider() {
  return (
    <div style={{ position: 'relative', height: 28, background: BLACK, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(90deg, ${GREEN}33 0px, ${GREEN}55 1px, transparent 1px, transparent 60px)`,
      }} />
      {/* Fade edges so lines don't hard-stop */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(to right, ${BLACK}, transparent 8%, transparent 92%, ${BLACK})`,
      }} />
    </div>
  );
}

// Password gate — calls shared verify-password API with slug hardcoded
function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [pw, setPw]   = useState('');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/marketing/available/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'out-of-bounds', password: pw }),
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
        background: PANEL, border: `1px solid ${GREEN}44`,
        borderRadius: 8, padding: '48px 40px', maxWidth: 420, width: '100%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🏟️</div>
        <h2 style={{ color: WHITE, fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px' }}>
          Out of Bounds
        </h2>
        <p style={{ color: MUTED, fontSize: 14, marginBottom: 28 }}>Enter password to view this package</p>
        <form onSubmit={submit}>
          <input
            type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password"
            style={{
              width: '100%', padding: '12px 16px', background: '#111A13', border: `1px solid ${GREEN}55`,
              borderRadius: 4, color: WHITE, fontSize: 16, marginBottom: 12, boxSizing: 'border-box',
            }}
          />
          {err && <p style={{ color: '#E05050', fontSize: 13, marginBottom: 12 }}>{err}</p>}
          <button type="submit" style={{
            width: '100%', padding: '12px', background: GREEN, color: WHITE,
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

export default function OutOfBoundsOneSheet({ title }: { title: SafeTitle }) {
  const [unlocked, setUnlocked] = useState(false);

  if (title.has_password && !unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  // No sizzle reel yet — placeholder shown instead
  const embedUrl: string | null = null;

  return (
    <div style={{ background: BLACK, color: WHITE, fontFamily: "'Roboto', sans-serif", lineHeight: 1.6 }}>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', height: '100vh', overflow: 'hidden', minHeight: 600 }}>
        <img
          src="/available-thumbs/oob.png"
          alt="Out of Bounds"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
        />
        {/* Dark overlay — bottom-heavy so title text is readable */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(8,12,9,0.30) 0%, rgba(8,12,9,0.50) 50%, rgba(8,12,9,0.92) 90%, ${BLACK} 100%)` }} />
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 48px 64px' }}>
          {/* Format badge */}
          <div style={{ marginBottom: 16 }}>
            <span style={{
              display: 'inline-block', padding: '5px 14px',
              background: `${GREEN}22`, border: `1px solid ${GREEN}66`,
              borderRadius: 3, color: GREEN, fontSize: 11,
              fontFamily: "'Roboto Condensed', sans-serif",
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em',
            }}>Documentary Series · 6 × 60 min</span>
          </div>
          {/* Main title — green to match the hero graphic */}
          <h1 style={{
            fontFamily: "'Roboto Condensed', sans-serif",
            fontWeight: 900, fontSize: 'clamp(56px, 8vw, 108px)',
            textTransform: 'uppercase', letterSpacing: '-0.01em',
            lineHeight: 0.9, margin: '0 0 12px',
            color: GREEN,
            textShadow: '0 4px 24px rgba(0,0,0,0.6)',
          }}>
            Out of<br />Bounds
          </h1>
          {/* Subtitle */}
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif",
            fontWeight: 700, fontSize: 'clamp(16px, 2vw, 24px)',
            textTransform: 'uppercase', letterSpacing: '0.15em',
            color: GOLD, margin: '0 0 16px',
            textShadow: '0 2px 12px rgba(0,0,0,0.7)',
          }}>
            From Gangs to the Game
          </p>
          <p style={{
            fontSize: 'clamp(15px, 1.8vw, 20px)', fontWeight: 400,
            color: `${WHITE}CC`, maxWidth: 560, margin: '0 0 8px',
            fontStyle: 'italic',
            textShadow: '0 2px 12px rgba(0,0,0,0.7)',
          }}>
            "Rising above the streets, to the stadium and beyond..."
          </p>
          <p style={{ color: MUTED, fontSize: 14, fontFamily: "'Roboto Condensed', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            MY Entertainment
          </p>
        </div>
      </section>

      <FieldDivider />

      {/* ── THE SERIES ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <p style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 13, color: GREEN, letterSpacing: '0.2em',
          textTransform: 'uppercase', marginBottom: 16,
        }}>The Series</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 64, alignItems: 'start' }}>
          {/* Left — big headline */}
          <div>
            <h2 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 'clamp(28px, 3vw, 40px)', textTransform: 'uppercase',
              lineHeight: 1.05, margin: 0, color: WHITE,
            }}>
              Two Athletes.<br />One Struggle.<br /><span style={{ color: GREEN }}>One Impossible<br />Journey.</span>
            </h2>
          </div>
          {/* Right — body copy */}
          <div style={{ color: `${WHITE}CC`, fontSize: 17, lineHeight: 1.75 }}>
            <p>
              &lsquo;From Gangs to the Game&rsquo; is an unflinching anthology documentary series tracing the powerful stories
              of 2 professional athletes who grew up entangled in gang culture — but made it out.
            </p>
            <p>
              The tragic story of Aaron Hernandez proves just how hard it is to escape a life of violence.
              The athletes profiled in this series didn&apos;t simply leave the streets behind — they <strong style={{ color: WHITE }}>fought</strong> to make it out.
              Their struggles didn&apos;t end when they put on a jersey.
            </p>
            {/* Pull quote */}
            <blockquote style={{
              borderLeft: `3px solid ${GOLD}`, paddingLeft: 20, margin: '28px 0 0',
              fontStyle: 'italic', fontSize: 18, color: WHITE,
              fontFamily: "'Roboto', sans-serif",
            }}>
              &ldquo;They fought to make it out. Their struggles didn&apos;t end when they put on a jersey.&rdquo;
            </blockquote>
          </div>
        </div>
      </section>

      <FieldDivider />

      {/* ── THE FORMAT ── */}
      <section style={{ background: DARK, padding: '80px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 13, color: GREEN, letterSpacing: '0.2em',
            textTransform: 'uppercase', marginBottom: 16,
          }}>The Format</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'start' }}>
            <div>
              <h2 style={{
                fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
                fontSize: 'clamp(28px, 2.5vw, 36px)', textTransform: 'uppercase',
                lineHeight: 1.05, margin: '0 0 24px', color: WHITE,
              }}>
                Intimate. Visceral.<br /><span style={{ color: GREEN }}>First-Person.</span>
              </h2>
              {/* Second slide image */}
              <img
                src="/available-thumbs/oob-2.png"
                alt="Out of Bounds — format preview"
                style={{ width: '100%', borderRadius: 8, objectFit: 'cover' }}
              />
            </div>
            <div style={{ color: `${WHITE}CC`, fontSize: 16, lineHeight: 1.8 }}>
              <p>
                Each episode profiles 2 different athletes, offering an intimate first-person look at their past:
                the personal battles and pivotal moments that helped them move beyond struggle, into sports.
              </p>
              <p>
                Through a combination of <strong style={{ color: WHITE }}>first-person candid interviews</strong>, visceral archival footage, and
                present-day verité, each episode highlights one athlete&apos;s story.
              </p>
              <p style={{ color: WHITE, fontStyle: 'italic', borderLeft: `3px solid ${GREEN}`, paddingLeft: 20, marginTop: 28 }}>
                Basketball. Football. Boxing. Three sports — one common thread.
              </p>
            </div>
          </div>
        </div>
      </section>

      <FieldDivider />

      {/* ── THE QUESTION ── */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '80px 48px', textAlign: 'center' }}>
        <p style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 13, color: GOLD, letterSpacing: '0.2em',
          textTransform: 'uppercase', marginBottom: 24,
        }}>The Question</p>
        <h2 style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 'clamp(22px, 2.8vw, 36px)', textTransform: 'uppercase',
          lineHeight: 1.2, margin: '0 0 32px', color: WHITE,
        }}>
          What does it cost to escape?<br />
          <span style={{ color: GREEN }}>What happens if you look back?</span>
        </h2>
        <p style={{ color: `${WHITE}CC`, fontSize: 17, lineHeight: 1.8, maxWidth: 720, margin: '0 auto' }}>
          From Gangs to the Game is an unflinching look at the challenges that come with both surviving the streets
          and achieving elite status in sports. These athletes carried their past into every arena — and the
          game was never just about the game.
        </p>
      </section>

      <FieldDivider />

      {/* ── STATS BAR ── */}
      <section style={{ background: DARK, padding: '48px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, textAlign: 'center' }}>
            {[
              { num: '3 Sports', label: 'Basketball / Football / Boxing' },
              { num: '2', label: 'Athletes per Episode' },
              { num: 'First-Person', label: 'Candid Accounts' },
              { num: 'Archival + Verité', label: 'Mixed Documentary Format' },
            ].map(({ num, label }) => (
              <div key={label}>
                <div style={{
                  fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
                  fontSize: 'clamp(20px, 2.2vw, 32px)', color: GREEN, lineHeight: 1,
                  marginBottom: 8,
                }}>{num}</div>
                <div style={{ color: MUTED, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FieldDivider />

      {/* ── THIRD SLIDE IMAGE ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <img
          src="/available-thumbs/oob-3.png"
          alt="Out of Bounds — additional visual"
          style={{ width: '100%', borderRadius: 8, objectFit: 'cover', maxHeight: 480 }}
        />
      </section>

      <FieldDivider />

      {/* ── SIZZLE REEL ── */}
      <section style={{ background: DARK, padding: '80px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 13, color: GREEN, letterSpacing: '0.2em',
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
            <div style={{ position: 'relative', paddingBottom: '56.25%', background: PANEL, border: `2px dashed ${GREEN}33`, borderRadius: 4 }}>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              }}>
                <span style={{ fontSize: 48, marginBottom: 12 }}>▶</span>
                <p style={{
                  color: GREEN, fontFamily: "'Roboto Condensed', sans-serif",
                  fontWeight: 900, fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0,
                }}>Sizzle Available Upon Request</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <FieldDivider />

      {/* ── COMPANY BIO ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <p style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 13, color: GREEN, letterSpacing: '0.2em',
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
            Notable titles: <em>Pros vs. Joes</em>, <em>The Real Stories of Basketball</em> with TOGETHXR,
            Destination Fear, Baggage Battles, Sin City Justice, Mansion Bloodlines, Breaking Brooklyn —
            produced for Discovery, Lifetime, ID, Investigation Discovery, Oxygen, Reelz and CMT.
          </p>
        </div>
      </section>

      <FieldDivider />

      {/* ── CTA ── */}
      <section style={{ background: DARK, padding: '80px 48px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <blockquote style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 'clamp(20px, 2.8vw, 30px)', textTransform: 'uppercase',
            color: WHITE, lineHeight: 1.2, margin: '0 0 40px',
            borderTop: `3px solid ${GREEN}`, borderBottom: `3px solid ${GREEN}`,
            padding: '28px 0',
          }}>
            &ldquo;Rising above the streets, to the stadium and beyond.&rdquo;
          </blockquote>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700,
            fontSize: 18, color: MUTED, textTransform: 'uppercase',
            letterSpacing: '0.12em', marginBottom: 32,
          }}>
            Out of Bounds · Documentary Series · Available Now
          </p>
          <a
            href="mailto:info@myentertainment.tv?subject=Out of Bounds — Acquisition Inquiry"
            style={{
              display: 'inline-block', padding: '16px 40px',
              background: GREEN, color: WHITE, borderRadius: 4,
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
