'use client';

import { useState } from 'react';
import type { SafeTitle } from './page';

// Electric blue primary
const BLUE   = '#1A3CE8';
// Royal blue secondary / darker accent
const BLUE2  = '#0F2BA0';
// Near-black page background
const BLACK  = '#070810';
// White body text
const WHITE  = '#F0F2FF';
// Muted secondary text
const MUTED  = '#6B70A8';

// Blue scanline divider — horizontal rule with scanline texture overlay
function ScanlineDivider() {
  return (
    <div style={{ position: 'relative', height: 20, overflow: 'hidden', background: BLACK }}>
      {/* Solid horizontal rule */}
      <div style={{
        position: 'absolute', top: '50%', left: 0, right: 0,
        height: 1, background: `${BLUE}44`, transform: 'translateY(-50%)',
      }} />
      {/* Scanline texture overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(0deg, ${BLUE}22 0px, ${BLUE}22 1px, transparent 1px, transparent 4px)`,
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
      body: JSON.stringify({ slug: 'gone-viral', password: pw }),
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
        background: `${BLUE2}22`, border: `1px solid ${BLUE}44`,
        borderRadius: 8, padding: '48px 40px', maxWidth: 420, width: '100%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>📡</div>
        <h2 style={{
          color: WHITE, fontSize: 24, fontWeight: 900,
          textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px',
        }}>
          Gone Viral
        </h2>
        <p style={{ color: MUTED, fontSize: 14, marginBottom: 28 }}>Enter password to view this package</p>
        <form onSubmit={submit}>
          <input
            type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password"
            style={{
              width: '100%', padding: '12px 16px', background: `${BLUE2}18`,
              border: `1px solid ${BLUE}55`, borderRadius: 4, color: WHITE,
              fontSize: 16, marginBottom: 12, boxSizing: 'border-box',
            }}
          />
          {err && <p style={{ color: '#E05050', fontSize: 13, marginBottom: 12 }}>{err}</p>}
          <button type="submit" style={{
            width: '100%', padding: '12px', background: BLUE, color: WHITE,
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

// Viral example data — Daily Mail headlines used as illustrative case-study cards
const VIRAL_EXAMPLES = [
  {
    name: 'Rebecca Black',
    headline: `'The last laugh: Why Rebecca Black's much-derided YouTube video has already made her a fortune'`,
  },
  {
    name: 'The Tanning Mom',
    headline: `'New Jersey mother arrested after fair-skinned daughter (5) was severely burned after she took her to a tanning salon'`,
  },
  {
    name: 'The Viral Couple',
    headline: `'"God blessed me with my soul mate": Green Mile star Doug Hutchison and his 16-year-old bride defend their love'`,
  },
];

export default function GoneViralOneSheet({ title }: { title: SafeTitle }) {
  const [unlocked, setUnlocked] = useState(false);

  // Enforce password gate when the title record has one set
  if (title.has_password && !unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  // No sizzle reel for this title — placeholder section renders instead
  const embedUrl: string | null = null;

  return (
    <div style={{ background: BLACK, color: WHITE, fontFamily: "'Roboto', sans-serif", lineHeight: 1.6 }}>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', height: '100vh', overflow: 'hidden', minHeight: 600 }}>
        <img
          src="/available-thumbs/gv.png"
          alt="Gone Viral — Daily Mail Presents"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
        />
        {/* Blue-tinted dark overlay — matches the digital/broadcast aesthetic */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to bottom, rgba(7,8,16,0.4) 0%, rgba(7,8,16,0.55) 50%, rgba(7,8,16,0.93) 90%, ${BLACK} 100%)`,
        }} />
        <div style={{
          position: 'relative', height: '100%', display: 'flex',
          flexDirection: 'column', justifyContent: 'flex-end', padding: '0 48px 64px',
        }}>
          {/* Format badge */}
          <div style={{ marginBottom: 16 }}>
            <span style={{
              display: 'inline-block', padding: '5px 14px',
              background: `${BLUE}22`, border: `1px solid ${BLUE}66`,
              borderRadius: 3, color: BLUE, fontSize: 11,
              fontFamily: "'Roboto Condensed', sans-serif",
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em',
            }}>Documentary Series · Daily Mail Presents</span>
          </div>
          <h1 style={{
            fontFamily: "'Roboto Condensed', sans-serif",
            fontWeight: 900, fontSize: 'clamp(56px, 8vw, 108px)',
            textTransform: 'uppercase', letterSpacing: '-0.01em',
            lineHeight: 0.9, margin: '0 0 20px',
            textShadow: '0 4px 24px rgba(0,0,0,0.8)',
          }}>
            Gone<br />
            <span style={{ color: BLUE }}>Viral</span>
          </h1>
          <p style={{
            fontSize: 'clamp(16px, 2.2vw, 22px)', fontWeight: 400,
            color: `${WHITE}CC`, maxWidth: 600, margin: '0 0 8px',
            textShadow: '0 2px 12px rgba(0,0,0,0.7)',
            fontStyle: 'italic',
          }}>
            The headline made them famous. Now they tell the real story.
          </p>
          <p style={{
            color: MUTED, fontSize: 14,
            fontFamily: "'Roboto Condensed', sans-serif",
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            MY Entertainment · Daily Mail
          </p>
        </div>
      </section>

      <ScanlineDivider />

      {/* ── THE SHOW ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 64, alignItems: 'start' }}>
          <div>
            <p style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 13, color: BLUE, letterSpacing: '0.2em',
              textTransform: 'uppercase', marginBottom: 16,
            }}>The Show</p>
            <h2 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 'clamp(28px, 3vw, 42px)', textTransform: 'uppercase',
              lineHeight: 1, margin: 0, color: WHITE,
            }}>
              The internet<br />made them<br /><span style={{ color: BLUE }}>famous.</span>
            </h2>
          </div>
          <div style={{ color: `${WHITE}CC`, fontSize: 17, lineHeight: 1.75 }}>
            <p>
              The first generation of internet celebrities revisit the viral Daily Mail headlines and photos
              that made them famous — and reveal what really happened after the internet moved on.
            </p>
          </div>
        </div>
      </section>

      <ScanlineDivider />

      {/* ── SLIDE 2 IMAGE ── */}
      <section>
        <img
          src="/available-thumbs/gv-2.png"
          alt="Gone Viral — viral news screenshots collage"
          style={{ width: '100%', maxHeight: 560, objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
        />
      </section>

      <ScanlineDivider />

      {/* ── VIRAL EXAMPLES CARDS ── */}
      <section style={{ background: `${BLUE2}18`, padding: '80px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 13, color: BLUE, letterSpacing: '0.2em',
            textTransform: 'uppercase', marginBottom: 12,
          }}>Featured Stories</p>
          <h2 style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 'clamp(24px, 2.5vw, 36px)', textTransform: 'uppercase',
            color: WHITE, margin: '0 0 48px', lineHeight: 1.1,
          }}>
            Headlines That Changed Lives
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {VIRAL_EXAMPLES.map(({ name, headline }) => (
              <div key={name} style={{
                background: `${BLACK}CC`, border: `1px solid ${BLUE}33`,
                borderRadius: 6, padding: '24px 20px',
                borderTop: `3px solid ${BLUE}`,
              }}>
                <p style={{
                  fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
                  fontSize: 11, color: BLUE, letterSpacing: '0.2em',
                  textTransform: 'uppercase', marginBottom: 12,
                }}>Daily Mail · Featured</p>
                <h3 style={{
                  fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
                  fontSize: 18, textTransform: 'uppercase', color: WHITE, margin: '0 0 12px',
                }}>{name}</h3>
                <p style={{
                  color: `${WHITE}88`, fontSize: 13, lineHeight: 1.65,
                  fontStyle: 'italic', margin: 0,
                }}>{headline}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ScanlineDivider />

      {/* ── THE PREMISE ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <p style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 13, color: BLUE, letterSpacing: '0.2em',
          textTransform: 'uppercase', marginBottom: 16,
        }}>The Premise</p>
        <blockquote style={{
          borderLeft: `4px solid ${BLUE}`, paddingLeft: 28, margin: '0 0 28px',
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 'clamp(20px, 2.5vw, 30px)', color: WHITE,
          lineHeight: 1.3, textTransform: 'uppercase',
        }}>
          These were the people the internet decided it had the right to mock, judge, and move on from.
        </blockquote>
        <p style={{ color: `${WHITE}BB`, fontSize: 16, lineHeight: 1.8, maxWidth: 800 }}>
          This series gives them back their story. What actually happened? How did the fame, infamy, and global
          attention change their lives?
        </p>
      </section>

      <ScanlineDivider />

      {/* ── STATS BAR ── */}
      <section style={{ background: `${BLUE2}18`, padding: '48px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, textAlign: 'center' }}>
            {[
              { num: '3M+',         label: 'Views per episode (est.)' },
              { num: 'Daily Mail',  label: 'Platform' },
              { num: 'Exclusive',   label: 'Interviews' },
              { num: '8',           label: 'Episodes' },
            ].map(({ num, label }) => (
              <div key={label}>
                <div style={{
                  fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
                  fontSize: 'clamp(22px, 2.8vw, 38px)', color: BLUE, lineHeight: 1, marginBottom: 8,
                }}>{num}</div>
                <div style={{ color: MUTED, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ScanlineDivider />

      {/* ── SIZZLE REEL ── */}
      <section style={{ background: `${BLUE2}18`, padding: '80px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 13, color: BLUE, letterSpacing: '0.2em',
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
            <div style={{ position: 'relative', paddingBottom: '56.25%', background: BLACK, border: `2px dashed ${BLUE}33`, borderRadius: 4 }}>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              }}>
                <span style={{ fontSize: 48, marginBottom: 12 }}>▶</span>
                <p style={{
                  color: BLUE, fontFamily: "'Roboto Condensed', sans-serif",
                  fontWeight: 900, fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0,
                }}>Sizzle Available Upon Request</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <ScanlineDivider />

      {/* ── COMPANY BIO ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <p style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 13, color: BLUE, letterSpacing: '0.2em',
          textTransform: 'uppercase', marginBottom: 32,
        }}>About the Producers</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
          <div>
            <h3 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 24, textTransform: 'uppercase', color: WHITE, margin: '0 0 16px',
            }}>MY Entertainment</h3>
            <p style={{ color: `${WHITE}CC`, fontSize: 14, lineHeight: 1.75 }}>
              MY Entertainment is an independent production company successful in creating undeniable content since 2000,
              best known for compelling characters, innovative deals and high production value. Committed to groundbreaking
              storytelling and global premium programming across all media.
            </p>
            <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.7, marginTop: 12 }}>
              Notable titles: <em>Pros vs. Joes</em>, <em>Destination Fear</em>, <em>Baggage Battles</em>,{' '}
              <em>Sin City Justice</em>, <em>Mansion Bloodlines</em>, <em>Breaking Brooklyn</em> — produced for
              Discovery, Lifetime, ID, Investigation Discovery, Oxygen, Reelz and CMT.
            </p>
          </div>
          <div>
            <h3 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 24, textTransform: 'uppercase', color: WHITE, margin: '0 0 16px',
            }}>Daily Mail</h3>
            <p style={{ color: `${WHITE}CC`, fontSize: 14, lineHeight: 1.75 }}>
              MailOnline is the world&apos;s most visited English-language newspaper website, with over 200 million
              unique monthly visitors. The Daily Mail&apos;s archive of viral moments, celebrity coverage, and
              cultural touchstones makes it the definitive platform for this series.
            </p>
            <p style={{ color: MUTED, fontSize: 13, marginTop: 12 }}>
              200M+ monthly visitors · World&apos;s most visited English-language newspaper site
            </p>
          </div>
        </div>
      </section>

      <ScanlineDivider />

      {/* ── CTA ── */}
      <section style={{ background: `${BLUE2}18`, padding: '80px 48px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <blockquote style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 'clamp(20px, 2.8vw, 28px)', textTransform: 'uppercase',
            color: WHITE, lineHeight: 1.25, margin: '0 0 40px',
            borderTop: `3px solid ${BLUE}`, borderBottom: `3px solid ${BLUE}`,
            padding: '28px 0',
          }}>
            &ldquo;The headline made them famous. Now they tell the real story.&rdquo;
          </blockquote>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700,
            fontSize: 18, color: MUTED, textTransform: 'uppercase',
            letterSpacing: '0.12em', marginBottom: 32,
          }}>
            Gone Viral · Documentary Series · Available Now
          </p>
          <a
            href="mailto:info@myentertainment.tv?subject=Gone Viral — Acquisition Inquiry"
            style={{
              display: 'inline-block', padding: '16px 40px',
              background: BLUE, color: WHITE, borderRadius: 4,
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
