'use client';

import { useState } from 'react';
import type { SafeTitle } from './page';

// Electric amber — primary (storm energy, lightning)
const AMBER   = '#F07820';
// Storm blue — secondary (sky, atmospheric depth)
const BLUE    = '#2A5FAA';
// Near-black background
const BLACK   = '#080A0C';
// Dark panel surfaces
const DARK    = '#101418';
const PANEL   = '#15191E';
// Text
const WHITE   = '#F0F2F5';
const MUTED   = '#7A8490';

// Lightning bolt diagonal divider with storm-blue overlay — combines the two palette colors
function FieldDivider() {
  return (
    <div style={{ position: 'relative', height: 28, background: BLACK, overflow: 'hidden' }}>
      {/* Amber lightning diagonals */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(-60deg, ${AMBER}22 0px, ${AMBER}44 1px, transparent 1px, transparent 40px)`,
      }} />
      {/* Storm-blue counter-diagonal overlay for depth */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(60deg, ${BLUE}11 0px, ${BLUE}22 1px, transparent 1px, transparent 80px)`,
      }} />
      {/* Edge fade */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(to right, ${BLACK}, transparent 8%, transparent 92%, ${BLACK})`,
      }} />
    </div>
  );
}

// Password gate — calls shared verify-password API with the US slug
function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [pw, setPw]   = useState('');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/marketing/available/verify-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'storm-warriors-us', password: pw }),
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
        background: PANEL, border: `1px solid ${AMBER}44`,
        borderRadius: 8, padding: '48px 40px', maxWidth: 420, width: '100%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>⚡</div>
        <h2 style={{ color: WHITE, fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 8px' }}>
          Storm Warriors
        </h2>
        <p style={{ color: MUTED, fontSize: 14, marginBottom: 28 }}>Enter password to view this package</p>
        <form onSubmit={submit}>
          <input
            type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password"
            style={{
              width: '100%', padding: '12px 16px', background: '#0D1116', border: `1px solid ${AMBER}55`,
              borderRadius: 4, color: WHITE, fontSize: 16, marginBottom: 12, boxSizing: 'border-box',
            }}
          />
          {err && <p style={{ color: '#E05050', fontSize: 13, marginBottom: 12 }}>{err}</p>}
          <button type="submit" style={{
            width: '100%', padding: '12px', background: AMBER, color: WHITE,
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

// ── TEAM MEMBER CARD ──
// The US version's key differentiator: named individuals with personal bios
// Each card shows role in amber, name in bold white, and a 2-line bio summary
interface TeamMember {
  role: string;        // e.g. "The Daredevil Driver"
  name: string;        // e.g. "Ricky Forbes"
  bio: string;         // 2-line summary
  stat: string;        // eye-catching stat line (optional quick fact)
}

function TeamCard({ member }: { member: TeamMember }) {
  return (
    <div style={{
      background: PANEL,
      borderRadius: 8,
      padding: '32px 28px',
      border: `1px solid ${AMBER}22`,
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
    }}>
      {/* Amber top accent bar — visual anchor for each card */}
      <div style={{ width: 48, height: 3, background: AMBER, borderRadius: 2, marginBottom: 20 }} />

      {/* Role label — amber, all-caps, condensed */}
      <p style={{
        fontFamily: "'Roboto Condensed', sans-serif",
        fontWeight: 700,
        fontSize: 11,
        color: AMBER,
        textTransform: 'uppercase',
        letterSpacing: '0.2em',
        margin: '0 0 8px',
      }}>
        {member.role}
      </p>

      {/* Name — large, bold, white — the visual centrepiece of each card */}
      <h3 style={{
        fontFamily: "'Roboto Condensed', sans-serif",
        fontWeight: 900,
        fontSize: 'clamp(22px, 2vw, 28px)',
        textTransform: 'uppercase',
        color: WHITE,
        margin: '0 0 16px',
        lineHeight: 1.0,
        letterSpacing: '-0.01em',
      }}>
        {member.name}
      </h3>

      {/* Amber divider — separates identity from bio */}
      <div style={{ width: '100%', height: 1, background: `${AMBER}33`, marginBottom: 16 }} />

      {/* Bio — 2-line summary in muted white */}
      <p style={{
        color: `${WHITE}BB`,
        fontSize: 14,
        lineHeight: 1.75,
        margin: '0 0 16px',
        flexGrow: 1,
      }}>
        {member.bio}
      </p>

      {/* Stat line — quick fact in storm-blue accent */}
      <p style={{
        fontFamily: "'Roboto Condensed', sans-serif",
        fontWeight: 700,
        fontSize: 13,
        color: '#7AABFF',
        margin: 0,
        letterSpacing: '0.04em',
      }}>
        {member.stat}
      </p>
    </div>
  );
}

// Named team data — the US version's key differentiator over the international deck
const TEAM_MEMBERS: TeamMember[] = [
  {
    role: 'The Daredevil Driver',
    name: 'Ricky Forbes',
    bio: 'Storm-chasing legend with 12+ years in the field and 500 tornadoes tracked. Survived a death-defying encounter inside a 2.6-mile-wide tornado — and came back for more.',
    stat: '2.1M social media followers · 500 tornadoes tracked',
  },
  {
    role: 'The Data Junkie',
    name: 'Braydon Morisseau',
    bio: 'Sixteen years of chasing and 100+ tornadoes under his belt. Deciphers radar, storm models, and atmospheric data in real time — while keeping the crew on their toes as the team prankster.',
    stat: '16 years chasing · 100+ tornadoes',
  },
  {
    role: 'The Storm Whisperer',
    name: 'Aaron Jayjack',
    bio: 'A storm-chasing virtuoso whose instinct feels almost supernatural. Has faced EF5 tornadoes, hurricanes, blizzards, and floods across North America — always getting closer than anyone else.',
    stat: 'Massive social following · EF5 tornadoes · hurricanes · blizzards',
  },
  {
    role: 'The Shot Seeker',
    name: 'Sierra Lindsey',
    bio: 'The first woman to intentionally drive into a tornado. Studying meteorology, she blends scientific rigour with an artist\'s eye — transforming nature\'s chaos into stunning visual narratives.',
    stat: 'First woman to drive into a tornado · meteorology student',
  },
];

export default function StormWarriorsUSOneSheet({ title }: { title: SafeTitle }) {
  const [unlocked, setUnlocked] = useState(false);

  if (title.has_password && !unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  // Live Vimeo sizzle reel — confirmed available for Storm Warriors US — use DB URL if set, fallback to hardcoded
  const embedUrl: string | null = title.vimeo_url || 'https://player.vimeo.com/video/1058661997?h=d23befd589';

  return (
    <div style={{ background: BLACK, color: WHITE, fontFamily: "'Roboto', sans-serif", lineHeight: 1.6 }}>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', height: '100vh', overflow: 'hidden', minHeight: 600 }}>
        <img
          src="/available-thumbs/sw.png"
          alt="Storm Warriors"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
        />
        {/* Dark overlay — storm imagery is naturally dramatic but text must be clear */}
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(8,10,12,0.25) 0%, rgba(8,10,12,0.50) 50%, rgba(8,10,12,0.93) 90%, ${BLACK} 100%)` }} />
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 48px 64px' }}>
          {/* Format badge */}
          <div style={{ marginBottom: 16 }}>
            <span style={{
              display: 'inline-block', padding: '5px 14px',
              background: `${AMBER}22`, border: `1px solid ${AMBER}66`,
              borderRadius: 3, color: AMBER, fontSize: 11,
              fontFamily: "'Roboto Condensed', sans-serif",
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em',
            }}>Adventure Documentary Series · 6 × 60 min</span>
          </div>
          <h1 style={{
            fontFamily: "'Roboto Condensed', sans-serif",
            fontWeight: 900, fontSize: 'clamp(56px, 8vw, 108px)',
            textTransform: 'uppercase', letterSpacing: '-0.01em',
            lineHeight: 0.9, margin: '0 0 12px',
            color: AMBER,
            textShadow: '0 4px 24px rgba(0,0,0,0.7)',
          }}>
            Storm<br />Warriors
          </h1>
          {/* Subtitle in storm blue */}
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif",
            fontWeight: 700, fontSize: 'clamp(14px, 1.8vw, 22px)',
            textTransform: 'uppercase', letterSpacing: '0.18em',
            color: '#7AABFF', margin: '0 0 16px',
            textShadow: '0 2px 12px rgba(0,0,0,0.7)',
          }}>
            Chasing Nature&apos;s Fury
          </p>
          <p style={{
            fontSize: 'clamp(14px, 1.6vw, 18px)', fontWeight: 400,
            color: `${WHITE}CC`, maxWidth: 640, margin: '0 0 8px',
            fontStyle: 'italic',
            textShadow: '0 2px 12px rgba(0,0,0,0.7)',
          }}>
            Three extraordinary teams push the boundaries of extreme weather science, chasing storms, tornadoes, and hurricanes across the globe.
          </p>
          {/* Team role tags — US version uses all four roles including Shot Seeker */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
            {['Daredevil Driver', 'Storm Whisperer', 'Shot Seeker', 'Data Junkie'].map(role => (
              <span key={role} style={{
                padding: '4px 10px',
                background: `${BLUE}33`, border: `1px solid ${BLUE}55`,
                borderRadius: 3, color: '#7AABFF', fontSize: 11,
                fontFamily: "'Roboto Condensed', sans-serif",
                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
              }}>{role}</span>
            ))}
          </div>
          <p style={{ color: MUTED, fontSize: 14, fontFamily: "'Roboto Condensed', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            MY Entertainment · Honeycut Studios · Airoker Entertainment
          </p>
        </div>
      </section>

      <FieldDivider />

      {/* ── THE SERIES ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <p style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 13, color: AMBER, letterSpacing: '0.2em',
          textTransform: 'uppercase', marginBottom: 16,
        }}>The Series</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 64, alignItems: 'start' }}>
          {/* Left — punchy headline using the four US roles */}
          <div>
            <h2 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 'clamp(28px, 3vw, 42px)', textTransform: 'uppercase',
              lineHeight: 1.05, margin: 0, color: WHITE,
            }}>
              Daredevil Driver.<br />Storm Whisperer.<br />Shot Seeker.<br /><span style={{ color: AMBER }}>Data Junkie.</span>
            </h2>
          </div>
          {/* Right — body */}
          <div style={{ color: `${WHITE}CC`, fontSize: 17, lineHeight: 1.75 }}>
            <p>
              Storm Warriors follows four extraordinary individuals as they push the boundaries of extreme weather
              science — chasing storms, tornadoes, and hurricanes across the globe.
            </p>
            <p>
              Their goal isn&apos;t just adrenaline. It&apos;s <strong style={{ color: WHITE }}>survival science</strong>: gathering data that advances
              early warning systems and potentially saves thousands of lives.
            </p>
            <p>
              Each team member brings a radically different approach — and a radically different personality —
              to the same deadly challenge.
            </p>
            <blockquote style={{
              borderLeft: `3px solid ${AMBER}`, paddingLeft: 20, margin: '28px 0 0',
              fontStyle: 'italic', fontSize: 18, color: WHITE,
              fontFamily: "'Roboto', sans-serif",
            }}>
              &ldquo;Get close enough to change everything.&rdquo;
            </blockquote>
          </div>
        </div>
      </section>

      <FieldDivider />

      {/* ── MEET THE TEAM — 4 named cards — visual centrepiece of the US deck ── */}
      <section style={{ background: DARK, padding: '80px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 13, color: AMBER, letterSpacing: '0.2em',
            textTransform: 'uppercase', marginBottom: 12,
          }}>Meet the Team</p>
          {/* Section headline — draws buyers in before cards */}
          <h2 style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 'clamp(24px, 2.8vw, 36px)', textTransform: 'uppercase',
            color: WHITE, margin: '0 0 40px', lineHeight: 1.1,
          }}>
            Four Individuals. One Relentless Mission.
          </h2>
          {/* 2×2 grid on desktop; single column on mobile via clamp min */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 24,
          }}>
            {TEAM_MEMBERS.map((member) => (
              <TeamCard key={member.name} member={member} />
            ))}
          </div>
        </div>
      </section>

      <FieldDivider />

      {/* ── WHY IT MATTERS ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <img
              src="/available-thumbs/sw.png"
              alt="Storm Warriors — in the field"
              style={{ width: '100%', borderRadius: 8, objectFit: 'cover', maxHeight: 400 }}
            />
          </div>
          <div>
            <p style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 13, color: AMBER, letterSpacing: '0.2em',
              textTransform: 'uppercase', marginBottom: 16,
            }}>Why It Matters</p>
            <h2 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 'clamp(26px, 2.8vw, 38px)', textTransform: 'uppercase',
              lineHeight: 1.1, margin: '0 0 24px', color: WHITE,
            }}>
              Real Science.<br /><span style={{ color: BLUE }}>Real Stakes.</span>
            </h2>
            <p style={{ color: `${WHITE}CC`, fontSize: 15, lineHeight: 1.8, marginBottom: 16 }}>
              The data these chasers collect doesn&apos;t just fuel the show — it advances real atmospheric science,
              contributing to early warning systems that protect millions of people in the path of extreme weather.
            </p>
            <p style={{ color: WHITE, fontSize: 15, lineHeight: 1.8, fontStyle: 'italic' }}>
              This is not spectacle for spectacle&apos;s sake. Every storm chased is a dataset. Every risk taken
              has a purpose.
            </p>
          </div>
        </div>
      </section>

      <FieldDivider />

      {/* ── STATS BAR — US version pulls in social reach as a key metric ── */}
      <section style={{ background: DARK, padding: '48px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, textAlign: 'center' }}>
            {[
              { num: '4 Chasers', label: 'Named Characters' },
              { num: '2.1M+', label: 'Social Followers (Team)' },
              { num: 'Real Science', label: 'Atmospheric Research' },
              { num: '6 Episodes', label: 'Series Run' },
            ].map(({ num, label }) => (
              <div key={label}>
                <div style={{
                  fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
                  fontSize: 'clamp(20px, 2.2vw, 32px)', color: AMBER, lineHeight: 1,
                  marginBottom: 8,
                }}>{num}</div>
                <div style={{ color: MUTED, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FieldDivider />

      {/* ── SIZZLE REEL — live Vimeo embed ── */}
      <section style={{ background: BLACK, padding: '80px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 13, color: AMBER, letterSpacing: '0.2em',
            textTransform: 'uppercase', marginBottom: 16,
          }}>Sizzle Reel</p>
          {/* embedUrl is always set for this US version — conditional kept for type-safety parity with pattern */}
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
            <div style={{ position: 'relative', paddingBottom: '56.25%', background: PANEL, border: `2px dashed ${AMBER}33`, borderRadius: 4 }}>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              }}>
                <span style={{ fontSize: 48, marginBottom: 12 }}>▶</span>
                <p style={{
                  color: AMBER, fontFamily: "'Roboto Condensed', sans-serif",
                  fontWeight: 900, fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0,
                }}>Sizzle Available Upon Request</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <FieldDivider />

      {/* ── COMPANY BIO — US-specific producer credits ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 48px' }}>
        <p style={{
          fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
          fontSize: 13, color: AMBER, letterSpacing: '0.2em',
          textTransform: 'uppercase', marginBottom: 32,
        }}>About the Producers</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 48 }}>
          {/* MY Entertainment */}
          <div>
            <h3 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 20, textTransform: 'uppercase', color: WHITE, margin: '0 0 12px',
            }}>MY Entertainment</h3>
            <p style={{ color: `${WHITE}CC`, fontSize: 14, lineHeight: 1.75 }}>
              Independent production company committed to groundbreaking storytelling since 2000.
              Best known for compelling characters, innovative deals, and high production value across
              all media.
            </p>
          </div>
          {/* Honeycut Studios */}
          <div>
            <h3 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 20, textTransform: 'uppercase', color: WHITE, margin: '0 0 12px',
            }}>Honeycut Studios</h3>
            <p style={{ color: `${WHITE}CC`, fontSize: 14, lineHeight: 1.75 }}>
              Co-production partner bringing expertise in adventure and science documentary programming
              to the Storm Warriors series.
            </p>
          </div>
          {/* Airoker Entertainment */}
          <div>
            <h3 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 20, textTransform: 'uppercase', color: WHITE, margin: '0 0 12px',
            }}>Airoker Entertainment</h3>
            <p style={{ color: `${WHITE}CC`, fontSize: 14, lineHeight: 1.75 }}>
              Distribution partner for Storm Warriors, facilitating global network and streaming
              placement across key broadcast markets.
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
            fontSize: 'clamp(20px, 2.8vw, 30px)', textTransform: 'uppercase',
            color: WHITE, lineHeight: 1.2, margin: '0 0 40px',
            borderTop: `3px solid ${AMBER}`, borderBottom: `3px solid ${AMBER}`,
            padding: '28px 0',
          }}>
            &ldquo;Four extraordinary chasers. One mission:<br />
            <span style={{ color: AMBER }}>get close enough to change everything.&rdquo;</span>
          </blockquote>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700,
            fontSize: 18, color: MUTED, textTransform: 'uppercase',
            letterSpacing: '0.12em', marginBottom: 32,
          }}>
            Storm Warriors · Adventure Documentary Series · Available Now
          </p>
          <a
            href="mailto:info@myentertainment.tv?subject=Storm Warriors — Acquisition Inquiry"
            style={{
              display: 'inline-block', padding: '16px 40px',
              background: AMBER, color: WHITE, borderRadius: 4,
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
