'use client';

import { useState } from 'react';
import type { SafeTitle } from './page';
import { pickDeckVideoEmbed } from '@/lib/vimeo';

// Dusty mauve — justice, femininity, suppressed truth
const PRIMARY = '#9E6E7A';
const BLACK   = '#0B0709';
const DARK    = '#140F11';
const PANEL   = '#1A1214';
const MUTED   = '#5E4049';
const WHITE   = '#F5F0F2';

// Courtroom gavel / legal divider
function JusticeDivider() {
  return (
    <div style={{ position: 'relative', height: 28, background: BLACK, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(90deg, ${PRIMARY}1A 0px, ${PRIMARY}33 1px, transparent 1px, transparent 90px)`,
      }} />
      {/* Dual center lines — like scales of justice */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        display: 'flex', gap: 6,
      }}>
        <div style={{ width: 20, height: 2, background: `${PRIMARY}88` }} />
        <div style={{ width: 20, height: 2, background: `${PRIMARY}88` }} />
      </div>
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(to right, ${BLACK}, transparent 8%, transparent 92%, ${BLACK})`,
      }} />
    </div>
  );
}

// Password gate — slug hardcoded as string literal
function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [pw, setPw]   = useState('');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/marketing/available/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'show-tell-sandy-shaw', password: pw }),
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
        <div style={{ fontSize: 48, marginBottom: 8 }}>⚖️</div>
        <h2 style={{ color: WHITE, fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 8px' }}>
          Show &amp; Tell: Sandy Shaw
        </h2>
        <p style={{ color: MUTED, fontSize: 14, marginBottom: 28 }}>Enter password to view this package</p>
        <form onSubmit={submit}>
          <input
            type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password"
            style={{
              width: '100%', padding: '12px 16px', background: '#100B0D', border: `1px solid ${PRIMARY}55`,
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

export default function ShowTellSandyShawOneSheet({ title }: { title: SafeTitle }) {
  const [unlocked, setUnlocked] = useState(false);

  if (title.has_password && !unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  // Vimeo showcase embed — use DB URL if set, fallback to hardcoded
  const embedUrl = pickDeckVideoEmbed(title.drive_file_id, title.vimeo_url, 'https://vimeo.com/showcase/11884490');

  return (
    <div style={{ background: BLACK, color: WHITE, fontFamily: "'Roboto', sans-serif", lineHeight: 1.6 }}>

      {/* ── HERO — CSS gradient only, no img tag ── */}
      <section style={{ position: 'relative', height: '100vh', overflow: 'hidden', minHeight: 600 }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(135deg, ${BLACK} 0%, ${DARK} 50%, #3A2028 100%)`,
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(ellipse at 40% 50%, ${PRIMARY}18 0%, transparent 55%)`,
        }} />
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 48px 64px' }}>
          <div style={{ marginBottom: 16 }}>
            <span style={{
              display: 'inline-block', padding: '5px 14px',
              background: `${PRIMARY}22`, border: `1px solid ${PRIMARY}66`,
              borderRadius: 3, color: PRIMARY, fontSize: 11,
              fontFamily: "'Roboto Condensed', sans-serif",
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em',
            }}>3-Part Documentary · True Crime</span>
          </div>
          <h1 style={{
            fontFamily: "'Roboto Condensed', sans-serif",
            fontWeight: 900, fontSize: 'clamp(38px, 5.5vw, 80px)',
            textTransform: 'uppercase', letterSpacing: '-0.01em',
            lineHeight: 0.9, margin: '0 0 20px', color: WHITE,
            textShadow: '0 4px 24px rgba(0,0,0,0.8)',
          }}>
            Show &amp; Tell:<br />
            <span style={{ color: PRIMARY }}>The Truth About</span><br />
            Sandy Shaw
          </h1>
          <p style={{
            fontSize: 'clamp(14px, 1.6vw, 18px)', fontWeight: 400,
            color: `${WHITE}BB`, maxWidth: 560, margin: '0 0 8px',
            fontStyle: 'italic',
            textShadow: '0 2px 12px rgba(0,0,0,0.7)',
          }}>
            &ldquo;But that story was never the truth&hellip;&rdquo;
          </p>
          <p style={{ color: MUTED, fontSize: 14, fontFamily: "'Roboto Condensed', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            MY Entertainment
          </p>
        </div>
      </section>

      <JusticeDivider />

      {/* ── THE CONCEPT ── */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '96px 48px', textAlign: 'center' }}>
        <p style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 13, color: PRIMARY, letterSpacing: '0.2em',
          textTransform: 'uppercase', marginBottom: 32,
        }}>The Concept</p>
        <blockquote style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 'clamp(22px, 3.2vw, 40px)', textTransform: 'uppercase',
          color: WHITE, lineHeight: 1.15, margin: 0,
          borderTop: `3px solid ${PRIMARY}`, borderBottom: `3px solid ${PRIMARY}`,
          padding: '32px 0',
        }}>
          She was fifteen.<br />
          Las Vegas painted her as a killer.<br />
          <span style={{ color: PRIMARY }}>Now she&apos;s reclaiming her story.</span>
        </blockquote>
      </section>

      <JusticeDivider />

      {/* ── THE SERIES ── */}
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
                fontSize: 'clamp(26px, 3vw, 38px)', textTransform: 'uppercase',
                lineHeight: 1.05, margin: 0, color: WHITE,
              }}>
                A prosecutor&apos;s stage.<br />
                A complicit press.<br />
                <span style={{ color: PRIMARY }}>A teenager condemned.</span>
              </h2>
            </div>
            <div style={{ color: `${WHITE}CC`, fontSize: 17, lineHeight: 1.75 }}>
              <p>
                In 1986, fifteen-year-old Sandy Shaw was at the center of a case that stunned Las Vegas. Overnight,
                she became America&apos;s teenage monster. District Attorney Dan Seaton turned the case into his
                personal stage, telling jurors: &ldquo;Don&apos;t let her angelic face fool you&hellip; She is, in fact,
                a cold-blooded killer.&rdquo;
              </p>
              <p>
                After a 5-day trial, the jury took less than three hours to convict. Sandy was sentenced to two
                consecutive life terms without parole — becoming the youngest female ever incarcerated in Nevada&apos;s
                adult prison system. An illegal sentence.
              </p>
              <p>
                <strong style={{ color: WHITE }}>Show &amp; Tell peels back the layers</strong> — revealing the
                buried truth about the murder, the media, and the justice system that betrayed her.
              </p>
            </div>
          </div>
        </div>
      </section>

      <JusticeDivider />

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
              heading: 'The Case',
              body: '1986, Las Vegas. Sandy Shaw — 15 years old — convicted in under 3 hours. Sentenced to two consecutive life terms without parole. Nevada\'s youngest female ever sent to the adult prison system.',
            },
            {
              heading: 'The Buried Truth',
              body: 'Before that night in the desert, Sandy went to the police for help. They did nothing. When the victim turned up dead, the system that had ignored her suddenly made her its scapegoat.',
            },
            {
              heading: 'The Sizzle',
              body: 'Full sizzle showcase plus casting album available. Password: sandy. Three parts. One woman\'s story of how the institutions meant to protect her instead condemned her.',
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

      <JusticeDivider />

      {/* ── SIZZLE REEL ── */}
      <section style={{ background: DARK, padding: '80px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 13, color: PRIMARY, letterSpacing: '0.2em',
            textTransform: 'uppercase', marginBottom: 16,
          }}>Sizzle Showcase</p>
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

      <JusticeDivider />

      {/* ── ABOUT ── */}
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

      <JusticeDivider />

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
            &ldquo;Once painted as the Show and Tell Killer,<br />
            Sandy Shaw was just fifteen<br />
            <span style={{ color: PRIMARY }}>when Las Vegas turned her into a headline.&rdquo;</span>
          </blockquote>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700,
            fontSize: 18, color: MUTED, textTransform: 'uppercase',
            letterSpacing: '0.12em', marginBottom: 32,
          }}>
            Show &amp; Tell: Sandy Shaw · 3-Part Documentary · Available Now
          </p>
          <a
            href="mailto:info@myentertainment.tv?subject=Show Tell Sandy Shaw — Acquisition Inquiry"
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
