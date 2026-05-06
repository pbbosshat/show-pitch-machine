'use client';

import { useState } from 'react';
import type { SafeTitle } from './page';

// Electric yellow primary accent
const YELLOW = '#F5E600';
// Near-black page background
const BLACK  = '#080A0C';
// Dark panel surface
const PANEL  = '#12151A';
// White text
const WHITE  = '#F2F5F0';
// Muted secondary text
const MUTED  = '#6E7580';

// Yellow/black hazard tape diagonal divider — evokes danger tape at a haunted site
function HazardDivider() {
  return (
    <div style={{ height: 28, overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        backgroundImage: `repeating-linear-gradient(-45deg, ${YELLOW}, ${YELLOW} 14px, #0D0F12 14px, #0D0F12 28px)`,
      }} />
    </div>
  );
}

// Password gate — same API as all other one-sheets, slug hardcoded to this page
function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [pw, setPw]   = useState('');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/marketing/available/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'scared-shirtless', password: pw }),
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
        background: PANEL, border: `1px solid ${YELLOW}44`,
        borderRadius: 8, padding: '48px 40px', maxWidth: 420, width: '100%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>👻</div>
        <h2 style={{
          color: WHITE, fontSize: 24, fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px',
        }}>
          Scared Shirtless!
        </h2>
        <p style={{ color: MUTED, fontSize: 14, marginBottom: 28 }}>Enter password to view this package</p>
        <form onSubmit={submit}>
          <input
            type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password"
            style={{
              width: '100%', padding: '12px 16px', background: '#0E1115',
              border: `1px solid ${YELLOW}55`, borderRadius: 4, color: WHITE,
              fontSize: 16, marginBottom: 12, boxSizing: 'border-box',
            }}
          />
          {err && <p style={{ color: '#E05050', fontSize: 13, marginBottom: 12 }}>{err}</p>}
          <button type="submit" style={{
            width: '100%', padding: '12px', background: YELLOW, color: BLACK,
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

// Format cards for The Format section
const FORMAT_CARDS = [
  { label: 'Real Ghost Hunts' },
  { label: "UK's Most Haunted Locations" },
  { label: 'Psychological Experiment' },
];

export default function ScaredShirtlessOneSheet({ title }: { title: SafeTitle }) {
  const [unlocked, setUnlocked] = useState(false);

  // Show password gate if the title is protected and the viewer hasn't unlocked yet
  if (title.has_password && !unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  // No sizzle reel for this title — placeholder renders instead
  const embedUrl: string | null = null;

  return (
    <div style={{ background: BLACK, color: WHITE, fontFamily: "'Roboto', sans-serif", lineHeight: 1.6 }}>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', height: '100vh', overflow: 'hidden', minHeight: 600 }}>
        <img
          src="/available-thumbs/ss.png"
          alt="Scared Shirtless!"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
        />
        {/* Dark overlay — heavy at bottom to ensure text legibility */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to bottom, rgba(8,10,12,0.3) 0%, rgba(8,10,12,0.5) 50%, rgba(8,10,12,0.93) 90%, ${BLACK} 100%)`,
        }} />
        <div style={{
          position: 'relative', height: '100%', display: 'flex',
          flexDirection: 'column', justifyContent: 'flex-end', padding: '0 48px 64px',
        }}>
          {/* Format badge */}
          <div style={{ marginBottom: 16 }}>
            <span style={{
              display: 'inline-block', padding: '5px 14px',
              background: `${YELLOW}18`, border: `1px solid ${YELLOW}66`,
              borderRadius: 3, color: YELLOW, fontSize: 11,
              fontFamily: "'Roboto Condensed', sans-serif",
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em',
            }}>Paranormal Series · From the producers of Ghost Adventures and Snooki: Paranormal Rookie</span>
          </div>
          <h1 style={{
            fontFamily: "'Roboto Condensed', sans-serif",
            fontWeight: 900, fontSize: 'clamp(56px, 8vw, 108px)',
            textTransform: 'uppercase', letterSpacing: '-0.01em',
            lineHeight: 0.9, margin: '0 0 20px',
            textShadow: '0 4px 24px rgba(0,0,0,0.8)',
          }}>
            Scared<br />
            <span style={{ color: YELLOW }}>Shirtless!</span>
          </h1>
          <p style={{
            fontSize: 'clamp(15px, 2vw, 20px)', fontWeight: 400,
            color: `${WHITE}CC`, maxWidth: 580, margin: '0 0 8px',
            textShadow: '0 2px 12px rgba(0,0,0,0.7)',
            fontStyle: 'italic',
          }}>
            The dead might care what you&apos;re wearing.
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

      <HazardDivider />

      {/* ── THE SERIES ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 64, alignItems: 'start' }}>
          <div>
            <p style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 13, color: YELLOW, letterSpacing: '0.2em',
              textTransform: 'uppercase', marginBottom: 16,
            }}>The Series</p>
            <h2 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 'clamp(28px, 3vw, 42px)', textTransform: 'uppercase',
              lineHeight: 1, margin: 0, color: WHITE,
            }}>
              Nowhere<br />left to<br /><span style={{ color: YELLOW }}>Hide.</span>
            </h2>
          </div>
          <div style={{ color: `${WHITE}CC`, fontSize: 17, lineHeight: 1.75 }}>
            <p>
              Four investigators spend the night inside the UK&apos;s most notoriously haunted locations
              conducting a real ghost hunt — fully stripped of their clothes.
            </p>
            <p>
              By removing the layers people usually feel protected from the unknown, the investigators
              become more vulnerable, more reactive, and possibly more visible to whatever may be there.
            </p>
          </div>
        </div>
      </section>

      <HazardDivider />

      {/* ── SLIDE 2 IMAGE ── */}
      <section>
        <img
          src="/available-thumbs/ss-2.png"
          alt="Scared Shirtless — The Series"
          style={{ width: '100%', maxHeight: 560, objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
        />
      </section>

      <HazardDivider />

      {/* ── THE DEEPER QUESTION ── */}
      <section style={{ background: PANEL, padding: '80px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 13, color: YELLOW, letterSpacing: '0.2em',
            textTransform: 'uppercase', marginBottom: 16,
          }}>The Deeper Question</p>
          <blockquote style={{
            borderLeft: `4px solid ${YELLOW}`, paddingLeft: 28, margin: '0 0 28px',
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 'clamp(20px, 2.5vw, 30px)', color: WHITE,
            lineHeight: 1.3, textTransform: 'uppercase',
          }}>
            What happens to people when fear leaves them nowhere to hide?
          </blockquote>
          <p style={{ color: `${WHITE}BB`, fontSize: 16, lineHeight: 1.8, maxWidth: 860 }}>
            Part paranormal experiment, part social experiment — SCARED SHIRTLESS explores how vulnerability
            reshapes courage, bravery, and human behavior over the course of a single unforgettable night
            where the supernatural and human psychology collide.
          </p>
        </div>
      </section>

      <HazardDivider />

      {/* ── THE FORMAT — three cards ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <p style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 13, color: YELLOW, letterSpacing: '0.2em',
          textTransform: 'uppercase', marginBottom: 12,
        }}>The Format</p>
        <h2 style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 'clamp(24px, 2.5vw, 36px)', textTransform: 'uppercase',
          color: WHITE, margin: '0 0 48px', lineHeight: 1.1,
        }}>
          Three Elements That Make It Work
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {FORMAT_CARDS.map(({ label }) => (
            <div key={label} style={{
              background: PANEL, border: `1px solid ${YELLOW}33`,
              borderRadius: 6, padding: '28px 24px', textAlign: 'center',
              borderTop: `3px solid ${YELLOW}`,
            }}>
              <p style={{
                fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
                fontSize: 18, textTransform: 'uppercase', color: WHITE, margin: 0,
                lineHeight: 1.3,
              }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      <HazardDivider />

      {/* ── WHY IT WORKS ── */}
      <section style={{ background: PANEL, padding: '80px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 13, color: YELLOW, letterSpacing: '0.2em',
            textTransform: 'uppercase', marginBottom: 16,
          }}>Why It Works</p>
          <p style={{ color: `${WHITE}CC`, fontSize: 17, lineHeight: 1.8, maxWidth: 860 }}>
            No two nights unfold the same way — because every location and every group dynamic will change
            the experiment. The vulnerability is real. The fear is real. And the results are unlike anything
            else on television.
          </p>
        </div>
      </section>

      <HazardDivider />

      {/* ── STATS BAR ── */}
      <section style={{ padding: '48px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, textAlign: 'center' }}>
            {[
              { num: '8',           label: 'Episodes' },
              { num: "UK's Most",   label: 'Haunted Locations' },
              { num: '4',           label: 'Investigators' },
              { num: 'Zero',        label: 'Clothes' },
            ].map(({ num, label }) => (
              <div key={label}>
                <div style={{
                  fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
                  fontSize: 'clamp(26px, 3vw, 42px)', color: YELLOW, lineHeight: 1, marginBottom: 8,
                }}>{num}</div>
                <div style={{ color: MUTED, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HazardDivider />

      {/* ── SIZZLE REEL ── */}
      <section style={{ background: PANEL, padding: '80px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 13, color: YELLOW, letterSpacing: '0.2em',
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
            <div style={{ position: 'relative', paddingBottom: '56.25%', background: BLACK, border: `2px dashed ${YELLOW}33`, borderRadius: 4 }}>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              }}>
                <span style={{ fontSize: 48, marginBottom: 12 }}>▶</span>
                <p style={{
                  color: YELLOW, fontFamily: "'Roboto Condensed', sans-serif",
                  fontWeight: 900, fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0,
                }}>Sizzle Available Upon Request</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <HazardDivider />

      {/* ── COMPANY BIO ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <p style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 13, color: YELLOW, letterSpacing: '0.2em',
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
            Notable titles: <em>Pros vs. Joes</em>, <em>Ghost Adventures</em> (producer credits),{' '}
            <em>Snooki: Paranormal Rookie</em>, <em>Destination Fear</em>, <em>Baggage Battles</em>,{' '}
            <em>Sin City Justice</em>, <em>Mansion Bloodlines</em>, <em>Breaking Brooklyn</em> — produced for
            Discovery, Lifetime, ID, Investigation Discovery, Oxygen, Reelz and CMT.
          </p>
        </div>
      </section>

      <HazardDivider />

      {/* ── CTA ── */}
      <section style={{ background: PANEL, padding: '80px 48px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <blockquote style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 'clamp(20px, 2.8vw, 28px)', textTransform: 'uppercase',
            color: WHITE, lineHeight: 1.25, margin: '0 0 40px',
            borderTop: `3px solid ${YELLOW}`, borderBottom: `3px solid ${YELLOW}`,
            padding: '28px 0',
          }}>
            &ldquo;The vulnerability is real. The fear is real. And the results are unlike anything else on television.&rdquo;
          </blockquote>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700,
            fontSize: 18, color: MUTED, textTransform: 'uppercase',
            letterSpacing: '0.12em', marginBottom: 32,
          }}>
            Scared Shirtless! · Paranormal Series · Available Now
          </p>
          <a
            href="mailto:info@myentertainment.tv?subject=Scared Shirtless! — Acquisition Inquiry"
            style={{
              display: 'inline-block', padding: '16px 40px',
              background: YELLOW, color: BLACK, borderRadius: 4,
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
