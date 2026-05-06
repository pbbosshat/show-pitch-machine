'use client';

import { useState } from 'react';
import type { SafeTitle } from './page';

// Blood red — primary (danger, deception, true crime)
const RED     = '#C0151F';
// Near-black background
const BLACK   = '#080609';
// Dark panel surfaces
const DARK    = '#110910';
const PANEL   = '#170D14';
// Muted rose for accents
const ROSE    = '#8A4A50';
// Cream text
const WHITE   = '#F5EEED';
const MUTED   = '#8A7A7C';

// Vertical red drip divider — faded at both horizontal edges for a cinematic feel
function FieldDivider() {
  return (
    <div style={{ position: 'relative', height: 28, background: BLACK, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(180deg, ${RED} 0px, ${RED} 2px, transparent 2px, transparent 30px)`,
      }} />
      {/* Fade left + right so the drip lines don't reach the frame edge */}
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
      body: JSON.stringify({ slug: 'pretty-big-liars', password: pw }),
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
        <div style={{ fontSize: 48, marginBottom: 8 }}>🔍</div>
        <h2 style={{ color: WHITE, fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px' }}>
          Pretty Big Liars
        </h2>
        <p style={{ color: MUTED, fontSize: 14, marginBottom: 28 }}>Enter password to view this package</p>
        <form onSubmit={submit}>
          <input
            type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password"
            style={{
              width: '100%', padding: '12px 16px', background: '#160A0D', border: `1px solid ${RED}55`,
              borderRadius: 4, color: WHITE, fontSize: 16, marginBottom: 12, boxSizing: 'border-box',
            }}
          />
          {err && <p style={{ color: '#E05050', fontSize: 13, marginBottom: 12 }}>{err}</p>}
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

export default function PrettyBigLiarsOneSheet({ title }: { title: SafeTitle }) {
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
          src="/available-thumbs/pbl.png"
          alt="Pretty Big Liars"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
        />
        {/* Deep dark overlay — split-face image needs strong contrast for text legibility */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(8,6,9,0.30) 0%, rgba(8,6,9,0.55) 50%, rgba(8,6,9,0.93) 90%, ${BLACK} 100%)` }} />
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 48px 64px' }}>
          {/* Format badge */}
          <div style={{ marginBottom: 16 }}>
            <span style={{
              display: 'inline-block', padding: '5px 14px',
              background: `${RED}22`, border: `1px solid ${RED}66`,
              borderRadius: 3, color: RED, fontSize: 11,
              fontFamily: "'Roboto Condensed', sans-serif",
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em',
            }}>True Crime Documentary Series · 4 × 60 min</span>
          </div>
          {/* Title stacked to match hero graphic style */}
          <h1 style={{
            fontFamily: "'Roboto Condensed', sans-serif",
            fontWeight: 900, fontSize: 'clamp(52px, 8vw, 104px)',
            textTransform: 'uppercase', letterSpacing: '-0.01em',
            lineHeight: 0.9, margin: '0 0 20px',
            color: RED,
            textShadow: '0 4px 24px rgba(0,0,0,0.7)',
          }}>
            Pretty Big<br />Liars
          </h1>
          <p style={{
            fontSize: 'clamp(15px, 1.8vw, 20px)', fontWeight: 400,
            color: `${WHITE}CC`, maxWidth: 560, margin: '0 0 8px',
            fontStyle: 'italic',
            textShadow: '0 2px 12px rgba(0,0,0,0.7)',
          }}>
            "Some families hide the darkest secrets."
          </p>
          <p style={{ color: MUTED, fontSize: 14, fontFamily: "'Roboto Condensed', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            MY Entertainment
          </p>
        </div>
      </section>

      <FieldDivider />

      {/* ── THE CASE ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <p style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 13, color: RED, letterSpacing: '0.2em',
          textTransform: 'uppercase', marginBottom: 16,
        }}>The Case</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 64, alignItems: 'start' }}>
          {/* Left — case headline */}
          <div>
            <h2 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 'clamp(28px, 3vw, 40px)', textTransform: 'uppercase',
              lineHeight: 1.05, margin: '0 0 24px', color: WHITE,
            }}>
              The Gannon<br /><span style={{ color: RED }}>Stauch Case</span>
            </h2>
            {/* Slide 2 image inset in the left column */}
            <img
              src="/available-thumbs/pbl-2.png"
              alt="Pretty Big Liars — case detail"
              style={{ width: '100%', borderRadius: 8, objectFit: 'cover' }}
            />
          </div>
          {/* Right — narrative */}
          <div style={{ color: `${WHITE}CC`, fontSize: 16, lineHeight: 1.8 }}>
            <p>
              In January 2020, Letecia Stauch frantically called 911 reporting that her 11-year-old stepson,
              Gannon Stauch, was missing from their home in Colorado Springs. She explained that he had gone to
              a friend&apos;s house and never returned.
            </p>
            <p>
              She was distraught and made public pleas for his safe return, rallying the local community and
              media. The initial belief was that Gannon might have run away or been abducted, prompting an
              extensive search and investigation by law enforcement and volunteers.
            </p>
            <p>
              But as the investigation continued, <strong style={{ color: WHITE }}>a horrific truth began to emerge.</strong>
            </p>
          </div>
        </div>
      </section>

      <FieldDivider />

      {/* ── PULL QUOTE — centered, full-width impact ── */}
      <section style={{ background: DARK, padding: '80px 48px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <blockquote style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 'clamp(22px, 3vw, 36px)', textTransform: 'uppercase',
            color: WHITE, lineHeight: 1.2, margin: 0,
            borderTop: `3px solid ${RED}`, borderBottom: `3px solid ${RED}`,
            padding: '36px 0',
          }}>
            "She made everyone believe she was a grieving stepmother.<br />
            <span style={{ color: RED }}>The truth was something far darker.</span>"
          </blockquote>
        </div>
      </section>

      <FieldDivider />

      {/* ── THE SERIES ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <p style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 13, color: RED, letterSpacing: '0.2em',
          textTransform: 'uppercase', marginBottom: 16,
        }}>The Series</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 64, alignItems: 'start' }}>
          <div>
            <h2 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 'clamp(28px, 3vw, 38px)', textTransform: 'uppercase',
              lineHeight: 1.1, margin: 0, color: WHITE,
            }}>
              Deception<br />in<br /><span style={{ color: RED }}>Plain Sight.</span>
            </h2>
          </div>
          <div style={{ color: `${WHITE}CC`, fontSize: 16, lineHeight: 1.8 }}>
            <p>
              <strong style={{ color: WHITE }}>PRETTY BIG LIARS</strong> examines cases where deception operates in plain sight —
              where the person closest to the victim, the one leading the public vigils and media pleas,
              is the one hiding the most.
            </p>
            <p>
              These are not shadowy strangers. These are people who looked directly into cameras and
              <strong style={{ color: WHITE }}> lied with confidence</strong>.
            </p>
            <p style={{ color: WHITE, fontStyle: 'italic', borderLeft: `3px solid ${RED}`, paddingLeft: 20, marginTop: 28 }}>
              The worst lies aren&apos;t whispered. They&apos;re broadcast.
            </p>
          </div>
        </div>
      </section>

      <FieldDivider />

      {/* ── STATS BAR ── */}
      <section style={{ background: DARK, padding: '48px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, textAlign: 'center' }}>
            {[
              { num: '4-Part', label: 'Series' },
              { num: 'Colorado', label: 'Springs Case' },
              { num: 'True Crime', label: 'Investigation' },
              { num: 'Law Enforcement', label: 'Access' },
            ].map(({ num, label }) => (
              <div key={label}>
                <div style={{
                  fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
                  fontSize: 'clamp(20px, 2.2vw, 32px)', color: RED, lineHeight: 1,
                  marginBottom: 8,
                }}>{num}</div>
                <div style={{ color: MUTED, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FieldDivider />

      {/* ── SLIDE 3 IMAGE ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <img
          src="/available-thumbs/pbl-3.png"
          alt="Pretty Big Liars — additional visual"
          style={{ width: '100%', borderRadius: 8, objectFit: 'cover', maxHeight: 480 }}
        />
      </section>

      <FieldDivider />

      {/* ── SIZZLE REEL ── */}
      <section style={{ background: DARK, padding: '80px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 13, color: RED, letterSpacing: '0.2em',
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
            <div style={{ position: 'relative', paddingBottom: '56.25%', background: PANEL, border: `2px dashed ${RED}33`, borderRadius: 4 }}>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              }}>
                <span style={{ fontSize: 48, marginBottom: 12 }}>▶</span>
                <p style={{
                  color: RED, fontFamily: "'Roboto Condensed', sans-serif",
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
          fontSize: 13, color: RED, letterSpacing: '0.2em',
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
            Notable titles: <em>Pros vs. Joes</em>, Destination Fear, Sin City Justice, Mansion Bloodlines,
            Breaking Brooklyn — produced for Discovery, Lifetime, ID, Investigation Discovery, Oxygen, Reelz and CMT.
          </p>
        </div>
      </section>

      <FieldDivider />

      {/* ── CTA ── */}
      <section style={{ background: DARK, padding: '80px 48px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <blockquote style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 'clamp(20px, 2.8vw, 28px)', textTransform: 'uppercase',
            color: WHITE, lineHeight: 1.2, margin: '0 0 40px',
            borderTop: `3px solid ${RED}`, borderBottom: `3px solid ${RED}`,
            padding: '28px 0',
          }}>
            &ldquo;Some families hide the darkest secrets.&rdquo;
          </blockquote>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700,
            fontSize: 18, color: MUTED, textTransform: 'uppercase',
            letterSpacing: '0.12em', marginBottom: 32,
          }}>
            Pretty Big Liars · True Crime Documentary Series · Available Now
          </p>
          <a
            href="mailto:info@myentertainment.tv?subject=Pretty Big Liars — Acquisition Inquiry"
            style={{
              display: 'inline-block', padding: '16px 40px',
              background: RED, color: WHITE, borderRadius: 4,
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
