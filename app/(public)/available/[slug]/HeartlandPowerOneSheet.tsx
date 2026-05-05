'use client';

import { useState } from 'react';
import type { SafeTitle } from './page';

// Stadium orange — primary accent (warm field-light amber)
const ORANGE  = '#E07530';
const AMBER   = '#C8992A';
// Deep dark backgrounds
const BLACK   = '#08090D';
const DARK    = '#0F1118';
const PANEL   = '#141820';
// Text
const WHITE   = '#F2EFE6';
const MUTED   = '#8A8D98';

function FieldDivider() {
  return (
    <div style={{ position: 'relative', height: 28, background: BLACK, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(90deg, ${ORANGE}33 0px, ${ORANGE}55 1px, transparent 1px, transparent 80px)`,
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(to right, ${BLACK}, transparent 8%, transparent 92%, ${BLACK})`,
      }} />
    </div>
  );
}

function PasswordGate({
  onUnlock,
}: {
  onUnlock: () => void;
}) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/marketing/available/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'heartland-power', password: pw }),
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
        background: PANEL, border: `1px solid ${ORANGE}44`,
        borderRadius: 8, padding: '48px 40px', maxWidth: 420, width: '100%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🏟️</div>
        <h2 style={{ color: WHITE, fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px' }}>
          Heartland Power
        </h2>
        <p style={{ color: MUTED, fontSize: 14, marginBottom: 28 }}>Enter password to view this package</p>
        <form onSubmit={submit}>
          <input
            type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password"
            style={{
              width: '100%', padding: '12px 16px', background: '#1A1E2A', border: `1px solid ${ORANGE}55`,
              borderRadius: 4, color: WHITE, fontSize: 16, marginBottom: 12, boxSizing: 'border-box',
            }}
          />
          {err && <p style={{ color: '#E05050', fontSize: 13, marginBottom: 12 }}>{err}</p>}
          <button type="submit" style={{
            width: '100%', padding: '12px', background: ORANGE, color: WHITE,
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

export default function HeartlandPowerOneSheet({ title }: { title: SafeTitle }) {
  const [unlocked, setUnlocked] = useState(false);

  if (title.has_password && !unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  const embedUrl: string | null = null; // No sizzle reel yet

  return (
    <div style={{ background: BLACK, color: WHITE, fontFamily: "'Roboto', sans-serif", lineHeight: 1.6 }}>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', height: '100vh', overflow: 'hidden', minHeight: 600 }}>
        <img
          src="/available-thumbs/hp-hero.png"
          alt="Heartland Power"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
        />
        {/* Dark gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(8,9,13,0.35) 0%, rgba(8,9,13,0.5) 50%, rgba(8,9,13,0.92) 90%, ${BLACK} 100%)` }} />
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 48px 64px' }}>
          {/* Format badge */}
          <div style={{ marginBottom: 16 }}>
            <span style={{
              display: 'inline-block', padding: '5px 14px',
              background: `${ORANGE}22`, border: `1px solid ${ORANGE}66`,
              borderRadius: 3, color: ORANGE, fontSize: 11,
              fontFamily: "'Roboto Condensed', sans-serif",
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em',
            }}>Feature Documentary · 1 × 90 min</span>
          </div>
          <h1 style={{
            fontFamily: "'Roboto Condensed', sans-serif",
            fontWeight: 900, fontSize: 'clamp(56px, 8vw, 108px)',
            textTransform: 'uppercase', letterSpacing: '-0.01em',
            lineHeight: 0.9, margin: '0 0 20px',
            textShadow: '0 4px 24px rgba(0,0,0,0.6)',
          }}>
            Heartland<br />
            <span style={{ color: ORANGE }}>Power</span>
          </h1>
          <p style={{
            fontSize: 'clamp(16px, 2.2vw, 22px)', fontWeight: 400,
            color: `${WHITE}CC`, maxWidth: 620, margin: '0 0 8px',
            textShadow: '0 2px 12px rgba(0,0,0,0.7)',
          }}>
            Think you know who runs sports?{' '}
            <em style={{ color: WHITE, fontStyle: 'italic' }}>Think again.</em>
          </p>
          <p style={{ color: MUTED, fontSize: 14, fontFamily: "'Roboto Condensed', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            MY Entertainment · TOGETHXR
          </p>
        </div>
      </section>

      <FieldDivider />

      {/* ── THE SERIES ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 64, alignItems: 'start' }}>
          <div>
            <p style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 13, color: ORANGE, letterSpacing: '0.2em',
              textTransform: 'uppercase', marginBottom: 16,
            }}>The Series</p>
            <h2 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 'clamp(32px, 3vw, 44px)', textTransform: 'uppercase',
              lineHeight: 1, margin: 0, color: WHITE,
            }}>Four Women.<br />Four Empires.<br /><span style={{ color: ORANGE }}>One City.</span></h2>
          </div>
          <div style={{ color: `${WHITE}CC`, fontSize: 17, lineHeight: 1.75 }}>
            <p>
              In American sports, power has always had a familiar face. It lives in the owner&apos;s box, on the sidelines,
              in the locker room. It&apos;s loud. It&apos;s visible. It&apos;s almost always male.
            </p>
            <p>
              But in one place — quietly, without announcement — that image has changed. Not in New York.
              Not in Los Angeles. Not in Dallas. <strong style={{ color: WHITE }}>In Indianapolis.</strong>
            </p>
            <p>
              A city better known for high school gyms and cornfields than corporate influence has become something
              unexpected: a concentrated center of power in professional sports, led by women operating at the
              highest levels of authority. Not as symbolic hires. But as decision-makers shaping billion-dollar
              franchises, controlling outcomes, and redefining how modern sports organizations function.
            </p>
            <blockquote style={{
              borderLeft: `3px solid ${ORANGE}`, paddingLeft: 20, margin: '28px 0 0',
              fontStyle: 'italic', fontSize: 18, color: WHITE,
              fontFamily: "'Roboto', sans-serif",
            }}>
              &ldquo;This is not a story about breaking barriers. It&apos;s a story about what happens after the barrier is gone.&rdquo;
            </blockquote>
          </div>
        </div>
      </section>

      <FieldDivider />

      {/* ── STATS BAR ── */}
      <section style={{ background: DARK, padding: '48px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, textAlign: 'center' }}>
            {[
              { num: '4', label: 'NFL / NBA / WNBA / IMS' },
              { num: 'Indy 500', label: 'One of the world\'s largest sporting events' },
              { num: '4.5M', label: 'TOGETHXR social followers' },
              { num: '100M+', label: 'Monthly impressions via TOGETHXR' },
            ].map(({ num, label }) => (
              <div key={label}>
                <div style={{
                  fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
                  fontSize: 'clamp(28px, 3vw, 42px)', color: ORANGE, lineHeight: 1,
                  marginBottom: 8,
                }}>{num}</div>
                <div style={{ color: MUTED, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FieldDivider />

      {/* ── THE FOUR WOMEN ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <p style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 13, color: ORANGE, letterSpacing: '0.2em',
          textTransform: 'uppercase', marginBottom: 12,
        }}>Access</p>
        <h2 style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 'clamp(28px, 3vw, 42px)', textTransform: 'uppercase',
          margin: '0 0 48px', color: WHITE,
        }}>The Four Women at the Center</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          {[
            {
              name: 'Carlie Irsay-Gordon',
              role: 'Indianapolis Colts · NFL',
              img: '/available-thumbs/hp-carlie.png',
              body: `Carlie and her sisters inherited one of the NFL's most storied franchises. But inheritance is not the same as control. Inside the most exclusive ownership circles in sports, Carlie operates as the Colts' principal voice — navigating legacy, expectation, and the weight of decisions that ripple across the entire league.`,
            },
            {
              name: 'Kelly Krauskopf',
              role: 'Indiana Fever · WNBA',
              img: '/available-thumbs/hp-kelly.png',
              body: `Kelly Krauskopf has spent decades helping build the foundation of women's professional basketball. She hasn't simply managed one of the most visible WNBA teams — she has helped define what the league can become. Earned authority, built from the ground up in a league still fighting for investment and respect.`,
            },
            {
              name: 'Mel Raines',
              role: 'Pacers Sports & Entertainment · NBA',
              img: '/available-thumbs/hp-mel.png',
              body: `Mel Raines never stepped on a court, yet she oversees the entire business engine behind the Indiana Pacers as CEO of Pacers Sports and Entertainment. In a league driven by stars and headlines, she operates in a different arena — the one where infrastructure, strategy, and long-term vision determine whether a franchise survives in a small market.`,
            },
            {
              name: 'Allison Melangton',
              role: 'Penske Entertainment · Indy 500',
              img: '/available-thumbs/hp-allison.png',
              body: `As an executive for Penske Entertainment overseeing the Indianapolis Motor Speedway, Allison Melangton helps shape one of the most iconic events in global sports — the Indy 500. Where others step into the spotlight, Melangton ensures it exists: operating behind the spectacle, where there is no margin for error and no room to miss.`,
            },
          ].map(({ name, role, img, body }) => (
            <div key={name} style={{ background: PANEL, borderRadius: 8, overflow: 'hidden', border: `1px solid ${ORANGE}22` }}>
              <img src={img} alt={name} style={{ width: '100%', height: 220, objectFit: 'cover', objectPosition: 'center top' }} />
              <div style={{ padding: '20px 24px 24px' }}>
                <p style={{
                  fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
                  fontSize: 11, color: ORANGE, letterSpacing: '0.18em',
                  textTransform: 'uppercase', marginBottom: 6,
                }}>{role}</p>
                <h3 style={{
                  fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
                  fontSize: 22, textTransform: 'uppercase', color: WHITE, margin: '0 0 12px',
                }}>{name}</h3>
                <p style={{ color: `${WHITE}BB`, fontSize: 14, lineHeight: 1.7, margin: 0 }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <FieldDivider />

      {/* ── WHY INDIANAPOLIS ── */}
      <section style={{ background: DARK, padding: '80px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
            <div>
              <img
                src="/available-thumbs/hp-group.png"
                alt="Heartland Power — the four women"
                style={{ width: '100%', borderRadius: 8, objectFit: 'cover' }}
              />
            </div>
            <div>
              <p style={{
                fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
                fontSize: 13, color: ORANGE, letterSpacing: '0.2em',
                textTransform: 'uppercase', marginBottom: 16,
              }}>Why Indianapolis</p>
              <h2 style={{
                fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
                fontSize: 'clamp(28px, 3vw, 38px)', textTransform: 'uppercase',
                lineHeight: 1.05, margin: '0 0 24px', color: WHITE,
              }}>The Most Unlikely<br /><span style={{ color: ORANGE }}>Power Center</span><br />in Professional Sports</h2>
              <p style={{ color: `${WHITE}CC`, fontSize: 15, lineHeight: 1.75, marginBottom: 16 }}>
                How did a small-market state with conservative ownership structures and deeply traditional sports culture
                become fertile ground for this kind of leadership? Was it intentional? Structural? Accidental?
              </p>
              <p style={{ color: `${WHITE}CC`, fontSize: 15, lineHeight: 1.75, marginBottom: 16 }}>
                The film unfolds not as a series of profiles, but as an interwoven narrative cutting between boardrooms,
                locker rooms, racetracks, and empty arenas — contrasting inherited power with earned authority,
                visibility with invisibility, public perception with private influence.
              </p>
              <p style={{ color: WHITE, fontSize: 15, lineHeight: 1.75, fontStyle: 'italic' }}>
                <strong>Heartland Power</strong> invites the audience into a world they think they understand
                — and reveals something entirely different beneath the surface.
              </p>
            </div>
          </div>
        </div>
      </section>

      <FieldDivider />

      {/* ── TOGETHXR PARTNERSHIP ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <p style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 13, color: ORANGE, letterSpacing: '0.2em',
          textTransform: 'uppercase', marginBottom: 16,
        }}>Production Partner</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'start' }}>
          <div>
            <h2 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 'clamp(28px, 3vw, 40px)', textTransform: 'uppercase',
              lineHeight: 1.05, margin: '0 0 24px', color: WHITE,
            }}>TOGETHXR:<br /><span style={{ color: ORANGE }}>Built-In Audience</span><br />from Day One</h2>
            <p style={{ color: `${WHITE}CC`, fontSize: 15, lineHeight: 1.75 }}>
              TOGETHXR is a media company founded by some of the world&apos;s greatest professional athletes —
              Alex Morgan, Chloe Kim, Sue Bird, and Simone Manuel. With a focus on real storytelling rooted
              in lifestyle and youth culture, TOGETHXR is an unapologetic platform where representation and equality
              is the norm.
            </p>
          </div>
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
              {[
                { num: '4.5M', label: 'Followers across platforms' },
                { num: '100M+', label: 'Monthly impressions' },
                { num: '4', label: 'World-class founding athletes' },
                { num: 'Immediate', label: 'Runway for discovery & engagement' },
              ].map(({ num, label }) => (
                <div key={label} style={{ background: PANEL, padding: '20px 16px', borderRadius: 6, border: `1px solid ${ORANGE}22`, textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 24, color: ORANGE, lineHeight: 1, marginBottom: 8 }}>{num}</div>
                  <div style={{ color: MUTED, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                </div>
              ))}
            </div>
            <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.7 }}>
              TOGETHXR is where culture, activism, lifestyle, and sports converge — featuring a diverse and inclusive
              community of game-changers, culture-shapers, thought leaders, and barrier breakers.
            </p>
          </div>
        </div>
      </section>

      <FieldDivider />

      {/* ── SIZZLE REEL ── */}
      <section style={{ background: DARK, padding: '80px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 13, color: ORANGE, letterSpacing: '0.2em',
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
            <div style={{ position: 'relative', paddingBottom: '56.25%', background: PANEL, border: `2px dashed ${ORANGE}33`, borderRadius: 4 }}>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              }}>
                <span style={{ fontSize: 48, marginBottom: 12 }}>▶</span>
                <p style={{
                  color: ORANGE, fontFamily: "'Roboto Condensed', sans-serif",
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
          fontSize: 13, color: ORANGE, letterSpacing: '0.2em',
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
              Notable titles: <em>Pros vs. Joes</em>, <em>The Real Stories of Basketball</em> with TOGETHXR,
              Brooklyn, Legacy List, Destination Fear, Baggage Battles, Sin City Justice, Mansion Bloodlines,
              Breaking Brooklyn — produced for Discovery, Lifetime, ID, Investigation Discovery, Oxygen, Reelz and CMT.
            </p>
          </div>
          <div>
            <h3 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 24, textTransform: 'uppercase', color: WHITE, margin: '0 0 16px',
            }}>TOGETHXR</h3>
            <p style={{ color: `${WHITE}CC`, fontSize: 14, lineHeight: 1.75 }}>
              A media company founded by Alex Morgan, Chloe Kim, Sue Bird, and Simone Manuel — four of the world&apos;s
              greatest professional athletes. TOGETHXR is the platform where representation and equality is the norm:
              culture, activism, lifestyle, and sports converging in a single, powerful voice.
            </p>
            <p style={{ color: MUTED, fontSize: 13, marginTop: 12 }}>
              4.5M followers · 100M+ monthly impressions · Immediate runway for longform discovery and engagement
            </p>
          </div>
        </div>
      </section>

      <FieldDivider />

      {/* ── CTA ── */}
      <section style={{ background: DARK, padding: '80px 48px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
          <blockquote style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 'clamp(22px, 3vw, 32px)', textTransform: 'uppercase',
            color: WHITE, lineHeight: 1.2, margin: '0 0 40px',
            borderTop: `3px solid ${ORANGE}`, borderBottom: `3px solid ${ORANGE}`,
            padding: '28px 0',
          }}>
            &ldquo;Not a revolution. Something quieter. Something already happening.
            Something that may redefine the future of sports leadership — not from the coasts,
            but from the heart of the country.&rdquo;
          </blockquote>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700,
            fontSize: 18, color: MUTED, textTransform: 'uppercase',
            letterSpacing: '0.12em', marginBottom: 32,
          }}>
            Heartland Power · Feature Documentary · Available Now
          </p>
          <a
            href={`mailto:info@myentertainment.tv?subject=Heartland Power — Acquisition Inquiry`}
            style={{
              display: 'inline-block', padding: '16px 40px',
              background: ORANGE, color: WHITE, borderRadius: 4,
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
