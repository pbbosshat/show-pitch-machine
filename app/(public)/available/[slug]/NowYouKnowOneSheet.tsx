'use client';

import { useState } from 'react';
import type { SafeTitle } from './page';

// Gold — knowledge, myth-busting reveal, premium History Channel energy
const PRIMARY = '#F5C400';
// Near-black backgrounds — deep navy undertone
const BLACK   = '#04060E';
const DARK    = '#080B18';
const PANEL   = '#0D1022';
// Muted gold for secondary text
const MUTED   = '#7A6820';
const WHITE   = '#F5F2E0';

// Lightning bolt divider — the "aha!" moment of myth-busting
function MythBustDivider() {
  return (
    <div style={{ position: 'relative', height: 28, background: BLACK, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: '50%', left: 48, right: 48, height: 1,
        background: `linear-gradient(to right, transparent, ${PRIMARY}55 15%, transparent 50%, ${PRIMARY}55 85%, transparent)`,
        transform: 'translateY(-50%)',
      }} />
      {/* Center burst */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 6, height: 6, background: PRIMARY, borderRadius: '50%',
        boxShadow: `0 0 10px ${PRIMARY}, 0 0 20px ${PRIMARY}66`,
      }} />
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
      body: JSON.stringify({ slug: 'now-you-know', password: pw }),
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
        <div style={{ fontSize: 48, marginBottom: 8 }}>💡</div>
        <h2 style={{ color: WHITE, fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px' }}>
          Now You Know
        </h2>
        <p style={{ color: MUTED, fontSize: 14, marginBottom: 28 }}>Enter password to view this package</p>
        <form onSubmit={submit}>
          <input
            type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password"
            style={{
              width: '100%', padding: '12px 16px', background: '#08090E', border: `1px solid ${PRIMARY}55`,
              borderRadius: 4, color: WHITE, fontSize: 16, marginBottom: 12, boxSizing: 'border-box',
            }}
          />
          {err && <p style={{ color: '#E05050', fontSize: 13, marginBottom: 12 }}>{err}</p>}
          <button type="submit" style={{
            width: '100%', padding: '12px', background: PRIMARY, color: BLACK,
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

export default function NowYouKnowOneSheet({ title }: { title: SafeTitle }) {
  const [unlocked, setUnlocked] = useState(false);

  if (title.has_password && !unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  // No sizzle reel for this title
  const embedUrl: string | null = null;

  return (
    <div style={{ background: BLACK, color: WHITE, fontFamily: "'Roboto', sans-serif", lineHeight: 1.6 }}>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', height: '100vh', overflow: 'hidden', minHeight: 600 }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(135deg, ${BLACK} 0%, ${DARK} 50%, ${PRIMARY}22 100%)`,
        }} />
        {/* Knowledge-grid texture */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `repeating-linear-gradient(0deg, ${PRIMARY}06 0px, transparent 1px, transparent 48px),
                            repeating-linear-gradient(90deg, ${PRIMARY}06 0px, transparent 1px, transparent 48px)`,
        }} />
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 48px 64px' }}>
          <div style={{ marginBottom: 16 }}>
            <span style={{
              display: 'inline-block', padding: '5px 14px',
              background: `${PRIMARY}22`, border: `1px solid ${PRIMARY}66`,
              borderRadius: 3, color: PRIMARY, fontSize: 11,
              fontFamily: "'Roboto Condensed', sans-serif",
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em',
            }}>History Series · Myth-Busting · Hosted</span>
          </div>
          <h1 style={{
            fontFamily: "'Roboto Condensed', sans-serif",
            fontWeight: 900, fontSize: 'clamp(54px, 8vw, 110px)',
            textTransform: 'uppercase', letterSpacing: '-0.01em',
            lineHeight: 0.88, margin: '0 0 24px',
            color: WHITE,
          }}>
            Now You<br />
            <span style={{ color: PRIMARY }}>Know</span>
          </h1>
          <p style={{
            fontSize: 'clamp(15px, 1.8vw, 20px)', fontWeight: 400,
            color: `${WHITE}CC`, maxWidth: 560, margin: '0 0 8px',
            fontStyle: 'italic',
          }}>
            History&apos;s Biggest Misconceptions
          </p>
          <p style={{ color: MUTED, fontSize: 13, fontFamily: "'Roboto Condensed', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            MY Entertainment
          </p>
        </div>
      </section>

      <MythBustDivider />

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
          What if the &ldquo;facts&rdquo; we learned in school<br />
          were never the whole story?<br />
          <span style={{ color: PRIMARY }}>History isn&apos;t wrong — it&apos;s incomplete.</span>
        </blockquote>
      </section>

      <MythBustDivider />

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
                We don&apos;t<br />just revisit history.<br />
                <span style={{ color: PRIMARY }}>We interrogate it.</span>
              </h2>
            </div>
            <div style={{ color: `${WHITE}CC`, fontSize: 17, lineHeight: 1.75 }}>
              <p>
                Betsy Ross didn&apos;t design the US Flag. Marie Antoinette never said &ldquo;Let Them Eat Cake.&rdquo;
                Magellan wasn&apos;t the first person to sail around the world. Charles Lindbergh was the 85th man
                to fly across the Atlantic.
              </p>
              <p>
                NOW YOU KNOW is a premium, high-energy hosted History Channel series that unpacks{' '}
                <strong style={{ color: WHITE }}>six stand-alone misconceptions per episode</strong>, tied to a single
                theme — peeling back centuries of myth to reveal the real, more dramatic, more competitive,
                more human story underneath.
              </p>
              <p>
                The series dives into inventions, discoveries, cultural firsts, and breakthrough moments —
                exposing the rivalries, misunderstandings, and missed details that changed the historical record.
                This is History&apos;s new myth-busting franchise.
              </p>
            </div>
          </div>
        </div>
      </section>

      <MythBustDivider />

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
              heading: '6 Myths Per Hour',
              body: 'Six stand-alone misconceptions per episode, tied to a common theme. Endlessly shareable, infinitely watchable.',
            },
            {
              heading: 'Premium & Hosted',
              body: 'High-energy hosted format. Designed for History Channel — with the authority and production value to match.',
            },
            {
              heading: 'Thrilling Corrections',
              body: "These stories aren't trivia — they're revelations. The USA had an emperor. The truth is always stranger than the myth.",
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

      <MythBustDivider />

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

      <MythBustDivider />

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

      <MythBustDivider />

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
            &ldquo;What if the truth was more dramatic,<br />
            more human, and far stranger<br />
            <span style={{ color: PRIMARY }}>than the myths that survived?&rdquo;</span>
          </blockquote>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700,
            fontSize: 18, color: MUTED, textTransform: 'uppercase',
            letterSpacing: '0.12em', marginBottom: 32,
          }}>
            Now You Know · History Series · Available Now
          </p>
          <a
            href="mailto:info@myentertainment.tv?subject=Now You Know — Acquisition Inquiry"
            style={{
              display: 'inline-block', padding: '16px 40px',
              background: PRIMARY, color: BLACK, borderRadius: 4,
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
