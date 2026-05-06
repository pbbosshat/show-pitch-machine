'use client';

import { useState } from 'react';
import type { SafeTitle } from './page';

// Home Game palette — forest / field / warm gold
const GREEN   = '#2A6B3C';   // forest green — primary accent
const GOLD    = '#C8A040';   // warm gold — secondary accent
const BLACK   = '#0E1009';   // charcoal — page background
const DARK    = '#151C10';   // dark panel — alternate section background
const PANEL   = '#1A2212';   // card background
const CREAM   = '#F5F2E8';   // warm cream — primary text
const MUTED   = '#7A8070';   // muted sage — secondary text

// Shared input style for password gate fields
const inputStyle: React.CSSProperties = {
  background: '#101409', border: '1px solid #2a3820', color: CREAM,
  borderRadius: 6, padding: '10px 14px', width: '100%',
  fontSize: 14, fontFamily: "'Roboto', sans-serif", boxSizing: 'border-box',
};

// Turf-style divider — repeating vertical lines with edge fade
function TurfDivider() {
  return (
    <div style={{ position: 'relative', height: 28, background: BLACK, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `repeating-linear-gradient(90deg, ${GREEN}33 0px, ${GREEN}55 1px, transparent 1px, transparent 80px)`,
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(to right, ${BLACK}, transparent 8%, transparent 92%, ${BLACK})`,
      }} />
    </div>
  );
}

// Small uppercase section label
function SectionLabel({ children, color = GOLD }: { children: React.ReactNode; color?: string }) {
  return (
    <p style={{
      fontFamily: "'Roboto Condensed', sans-serif",
      fontSize: 11, fontWeight: 700, letterSpacing: '0.3em',
      textTransform: 'uppercase', color, margin: '0 0 16px',
    }}>
      {children}
    </p>
  );
}

// Password gate: posts to the marketing verify-password API with this page's slug
function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [pw, setPw]       = useState('');
  const [err, setErr]     = useState('');
  const [loading, setLoading] = useState(false);
  const [reqForm, setReqForm] = useState({ first_name: '', last_name: '', email: '', company: '' });
  const [reqLoading, setReqLoading] = useState(false);
  const [reqSent, setReqSent]   = useState(false);
  const [reqError, setReqError] = useState('');

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true); setErr('');
    try {
      const res = await fetch('/api/marketing/available/verify-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: 'home-game', password: pw }),
      });
      if (res.ok) { onUnlock(); }
      else {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setErr(d?.error ?? 'Incorrect password');
      }
    } catch { setErr('Network error — try again.'); }
    finally { setLoading(false); }
  }

  async function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reqLoading) return;
    setReqLoading(true); setReqError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reqForm, slug: 'home-game' }),
      });
      if (res.ok) { setReqSent(true); }
      else {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setReqError(d?.error ?? `Error ${res.status} — please try again.`);
      }
    } catch { setReqError('Network error — please try again.'); }
    finally { setReqLoading(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 440, width: '100%', background: DARK, border: `1px solid ${GREEN}44`, borderRadius: 12, padding: 40 }}>
        <div style={{ marginBottom: 20, textAlign: 'center' }}>
          <span style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 900, fontSize: 22, color: '#e51d26' }}>MY</span>
          <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: CREAM, marginLeft: 6 }}>Entertainment</span>
        </div>
        <h1 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 22, fontWeight: 700, color: CREAM, textAlign: 'center', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Home Game
        </h1>
        <p style={{ fontSize: 12, color: GOLD, textAlign: 'center', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 28px' }}>
          Real Estate &amp; Renovation Series
        </p>
        <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 10px' }}>Have Access?</p>
        <form onSubmit={handlePasswordSubmit}>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Enter password" style={inputStyle} />
          {err && <p style={{ color: '#e51d26', fontSize: 13, margin: '6px 0 0' }}>{err}</p>}
          <button type="submit" disabled={loading} style={{ background: GREEN, color: '#fff', width: '100%', padding: 10, borderRadius: 6, border: 'none', cursor: 'pointer', marginTop: 8, fontSize: 14, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Verifying…' : 'Unlock'}
          </button>
        </form>
        <div style={{ borderTop: `1px solid ${GREEN}22`, margin: '24px 0' }} />
        <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 10px' }}>Request Access</p>
        {reqSent ? (
          <p style={{ fontSize: 14, color: CREAM, textAlign: 'center' }}>Request sent! We&apos;ll be in touch.</p>
        ) : (
          <form onSubmit={handleRequestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input type="text" placeholder="First Name" value={reqForm.first_name} onChange={e => setReqForm(f => ({ ...f, first_name: e.target.value }))} required style={inputStyle} />
            <input type="text" placeholder="Last Name" value={reqForm.last_name} onChange={e => setReqForm(f => ({ ...f, last_name: e.target.value }))} required style={inputStyle} />
            <input type="email" placeholder="Email" value={reqForm.email} onChange={e => setReqForm(f => ({ ...f, email: e.target.value }))} required style={inputStyle} />
            <input type="text" placeholder="Company" value={reqForm.company} onChange={e => setReqForm(f => ({ ...f, company: e.target.value }))} style={inputStyle} />
            <button type="submit" disabled={reqLoading} style={{ background: 'transparent', border: `1px solid ${GREEN}44`, color: MUTED, width: '100%', padding: 10, borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: reqLoading ? 0.7 : 1 }}>
              {reqLoading ? 'Sending…' : 'Request Access'}
            </button>
            {reqError && <p style={{ color: '#ef4444', fontSize: 13, margin: '4px 0 0' }}>{reqError}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

// Why it works — 3 value cards
const WHY_IT_WORKS = [
  {
    icon: '🏆',
    label: 'Celebrity Access',
    desc: 'Exclusive behind-the-scenes access to professional athletes and their families during one of life\'s biggest decisions.',
  },
  {
    icon: '🏠',
    label: 'Real Drama',
    desc: 'Real estate is stressful for everyone. It just happens to be more interesting when the buyer has a Super Bowl ring.',
  },
  {
    icon: '❤️',
    label: 'Universal Story',
    desc: 'Every viewer has dreamed about their perfect home. These athletes are living it — with all the imperfections.',
  },
];

export default function HomeGameOneSheet({ title }: { title: SafeTitle }) {
  const [unlocked, setUnlocked] = useState(!title.has_password);

  // No sizzle reel yet — placeholder shown
  const embedUrl: string | null = null;

  return (
    <div style={{ background: BLACK, minHeight: '100vh', color: CREAM, fontFamily: "'Roboto', sans-serif" }}>

      {/* ── PASSWORD GATE ─────────────────────────────────────────── */}
      {!unlocked && <PasswordGate onUnlock={() => setUnlocked(true)} />}

      {/* ── 1. HERO ──────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <img
            src="/available-thumbs/hg.png"
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block', filter: 'brightness(0.6) saturate(0.85)' }}
          />
          {/* Gradient overlays — bottom-heavy for text legibility */}
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(14,16,9,0.4) 0%, rgba(14,16,9,0) 25%, rgba(14,16,9,0.7) 65%, rgba(14,16,9,1) 100%)` }} />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(14,16,9,0.75) 0%, rgba(14,16,9,0) 18%)` }} />
          {/* Subtle green tint for field atmosphere */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,25,12,0.2)' }} />
        </div>

        {/* MY Entertainment badge */}
        <div style={{ position: 'absolute', top: 32, left: 40, zIndex: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 900, fontSize: 20, color: '#e51d26' }}>MY</span>
          <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: CREAM }}>Entertainment</span>
          <span style={{ fontSize: 10, color: '#444', margin: '0 4px' }}>·</span>
          <span style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#555' }}>Presents</span>
        </div>

        {/* Hero content */}
        <div style={{ position: 'relative', zIndex: 2, padding: '0 40px 80px', maxWidth: 900 }}>
          {/* Format badge */}
          <div style={{ marginBottom: 20 }}>
            <span style={{
              display: 'inline-block', padding: '5px 14px',
              background: `${GREEN}22`, border: `1px solid ${GREEN}66`,
              borderRadius: 3, color: GREEN, fontSize: 11,
              fontFamily: "'Roboto Condensed', sans-serif",
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em',
            }}>Real Estate &amp; Renovation Series · 8 × 60 min</span>
          </div>
          <h1 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(64px, 10vw, 120px)', textTransform: 'uppercase', lineHeight: 0.88, margin: '0 0 24px', letterSpacing: '-2px', color: CREAM }}>
            Home<br />
            <span style={{ color: GREEN }}>Game</span>
          </h1>
          <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 400, fontSize: 'clamp(18px, 2.5vw, 26px)', color: `${CREAM}99`, margin: '0 0 40px', letterSpacing: '0.04em', fontStyle: 'italic' }}>
            A heartwarming real estate &amp; renovation series
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: `${CREAM}66`, border: `1px solid ${GREEN}33`, padding: '7px 16px', borderRadius: 3 }}>
              NFL Athletes
            </span>
            <span style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: `${CREAM}66`, border: `1px solid ${GREEN}33`, padding: '7px 16px', borderRadius: 3 }}>
              Multiple Markets
            </span>
            <span style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: `${CREAM}66`, border: `1px solid ${GREEN}33`, padding: '7px 16px', borderRadius: 3 }}>
              All Rights Available
            </span>
          </div>
        </div>
      </section>

      <TurfDivider />

      {/* ── 2. THE SERIES ────────────────────────────────────────────── */}
      <section style={{ padding: '90px 40px', background: DARK }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 70, alignItems: 'start' }}>
            <div>
              <div style={{ width: 3, height: 56, background: GREEN, marginBottom: 20, boxShadow: `0 0 20px ${GREEN}66` }} />
              <SectionLabel>The Series</SectionLabel>
              <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(28px, 3.5vw, 44px)', lineHeight: 1.05, color: CREAM, textTransform: 'uppercase', margin: 0 }}>
                Where Winning Teams<br />
                Build Winning<br />
                <span style={{ color: GREEN }}>Homes.</span>
              </h2>
            </div>
            <div>
              <p style={{ fontSize: 17, lineHeight: 1.85, color: `${CREAM}CC`, margin: '0 0 20px' }}>
                Home Game follows professional athletes and their families as they navigate the exciting — and often chaotic — process of buying, renovating, and transforming their dream homes.
              </p>
              <p style={{ fontSize: 16, lineHeight: 1.8, color: `${CREAM}99`, margin: '0 0 20px' }}>
                From first-time homebuyers discovering what a million dollars gets you in different markets, to veterans finally building the custom estate they&apos;ve been dreaming of, every episode captures the human side of real estate: the arguments, the compromises, the surprises, and the joy of finally being home.
              </p>
            </div>
          </div>
        </div>
      </section>

      <TurfDivider />

      {/* ── 3. WHY IT WORKS ──────────────────────────────────────────── */}
      <section style={{ padding: '90px 40px', background: BLACK }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <SectionLabel>Why It Works</SectionLabel>
            <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(32px, 4vw, 48px)', color: CREAM, textTransform: 'uppercase', margin: 0, letterSpacing: '-0.5px' }}>
              Three Reasons Audiences <span style={{ color: GREEN }}>Can&apos;t Look Away</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32 }}>
            {WHY_IT_WORKS.map(item => (
              <div key={item.label} style={{ background: PANEL, border: `1px solid ${GREEN}22`, borderRadius: 8, padding: '32px 28px' }}>
                <p style={{ fontSize: 32, margin: '0 0 16px' }}>{item.icon}</p>
                <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD, margin: '0 0 12px' }}>{item.label}</p>
                <p style={{ fontSize: 15, lineHeight: 1.75, color: MUTED, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TurfDivider />

      {/* ── 4. THE FORMAT ────────────────────────────────────────────── */}
      <section style={{ padding: '90px 40px', background: DARK }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 70, alignItems: 'start' }}>
            <div>
              <SectionLabel>The Format</SectionLabel>
              <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(28px, 3vw, 42px)', color: CREAM, textTransform: 'uppercase', lineHeight: 1.1, margin: '0 0 28px' }}>
                Full Journey.<br />
                <span style={{ color: GREEN }}>One Episode.</span><br />
                Community Story.
              </h2>
              <p style={{ fontSize: 16, lineHeight: 1.8, color: `${CREAM}99`, margin: '0 0 24px' }}>
                Each episode follows a different athlete and their family through the full journey: the search, the negotiation, the renovation, and the reveal.
              </p>
              <p style={{ fontSize: 16, lineHeight: 1.8, color: `${CREAM}99`, margin: 0 }}>
                Local contractors, designers, and real estate agents become recurring characters as the community comes together to help build something lasting.
              </p>
            </div>
            <div>
              {/* Episode journey steps */}
              {[
                { num: '1', title: 'The Search', desc: 'The athlete and their family explore the market — discovering what their money can really buy and what compromises are off the table.' },
                { num: '2', title: 'The Negotiation', desc: 'Real deals, real stakes. Offers made, countered, and sometimes lost. The pressure of buying under public scrutiny.' },
                { num: '3', title: 'The Renovation', desc: 'The transformation begins. Contractors, designers, family input, cost overruns — the beautiful chaos of turning a house into a home.' },
                { num: '4', title: 'The Reveal', desc: 'The finished home. The athlete\'s family walks through for the first time. The payoff that makes it all worthwhile.' },
              ].map(step => (
                <div key={step.num} style={{ display: 'flex', gap: 20, alignItems: 'flex-start', background: PANEL, border: `1px solid ${GREEN}22`, borderRadius: 8, padding: '20px 24px', marginBottom: 12 }}>
                  <div style={{ flexShrink: 0, fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 36, color: `${GREEN}40`, lineHeight: 1 }}>{step.num}</div>
                  <div>
                    <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: '0.15em', textTransform: 'uppercase', color: CREAM, margin: '0 0 6px' }}>{step.title}</p>
                    <p style={{ fontSize: 14, lineHeight: 1.7, color: MUTED, margin: 0 }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <TurfDivider />

      {/* ── 5. CANVA SLIDE IMAGES ────────────────────────────────────── */}
      <section style={{ padding: '80px 40px', background: BLACK }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionLabel>Series Package</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${GREEN}22` }}>
              <img src="/available-thumbs/hg-2.png" alt="Home Game — Series Package" style={{ width: '100%', display: 'block' }} />
            </div>
            <div style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${GREEN}22` }}>
              <img src="/available-thumbs/hg-3.png" alt="Home Game — Series Package" style={{ width: '100%', display: 'block' }} />
            </div>
          </div>
        </div>
      </section>

      <TurfDivider />

      {/* ── 6. STATS BAR ────────────────────────────────────────────── */}
      <section style={{ padding: '72px 40px', background: DARK }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, textAlign: 'center' }}>
            {[
              { value: '8 Episodes', label: 'Per Season' },
              { value: 'Multiple', label: 'Markets' },
              { value: 'Real Estate + Renovation', label: 'Genre' },
              { value: 'NFL Athletes', label: 'Talent' },
            ].map(s => (
              <div key={s.label}>
                <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(18px, 2vw, 28px)', color: GREEN, margin: '0 0 8px', lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: MUTED, margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TurfDivider />

      {/* ── 7. SIZZLE REEL ────────────────────────────────────────────── */}
      <section style={{ padding: '90px 40px', background: BLACK }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <SectionLabel>Sizzle Reel</SectionLabel>
          {embedUrl ? (
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              <iframe
                src={embedUrl}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0, borderRadius: 6 }}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div style={{ position: 'relative', paddingBottom: '56.25%', background: PANEL, border: `2px dashed ${GREEN}33`, borderRadius: 6 }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <span style={{ fontSize: 48, marginBottom: 16 }}>▶</span>
                <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.2em', color: GREEN, margin: 0 }}>
                  Sizzle Available Upon Request
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <TurfDivider />

      {/* ── 8. COMPANY BIO ───────────────────────────────────────────── */}
      <section style={{ padding: '90px 40px', background: DARK }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 70 }}>
            <div>
              <div style={{ marginBottom: 28 }}>
                <span style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 900, fontSize: 36, color: '#e51d26' }}>MY</span>
                <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: 14, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: CREAM, marginLeft: 8 }}>Entertainment</span>
              </div>
              <SectionLabel>The Production</SectionLabel>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: MUTED, margin: '0 0 20px' }}>
                MY Entertainment is an independent production company creating undeniable content since 2000. Known for compelling characters, great storytelling, and innovative deals.
              </p>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: MUTED, margin: '0 0 20px' }}>
                With offices in Manhattan, Toronto, and London — at the forefront of the international format business, with strong working relationships with more than <strong style={{ color: CREAM }}>40 producers in 15 countries</strong>.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {['Pros vs. Joes', 'Ghost Adventures', 'Destination Fear', 'Baggage Battles', 'Mansion Bloodlines', 'Breaking Brooklyn'].map(s => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: GREEN, flexShrink: 0 }} />
                    <p style={{ fontSize: 13, color: MUTED, margin: 0 }}>{s}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <SectionLabel>Network Partners</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['Discovery', 'Lifetime', 'HGTV', 'Bravo', 'E!', 'ESPN', 'NFL Network', 'A&E', 'Oxygen', 'Reelz', 'CMT', 'ID: Investigation Discovery'].map(n => (
                  <span key={n} style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED, border: `1px solid ${GREEN}22`, padding: '6px 14px', borderRadius: 4 }}>
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. CTA ───────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 40px', background: BLACK, textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ width: 2, height: 60, background: `linear-gradient(to bottom, transparent, ${GREEN})`, margin: '0 auto 40px' }} />
          <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 'clamp(22px, 2.5vw, 32px)', color: CREAM, lineHeight: 1.5, margin: '0 0 16px', fontStyle: 'italic' }}>
            &ldquo;Every viewer has dreamed about<br />
            <span style={{ color: GREEN }}>their perfect home. These athletes are living it.&rdquo;</span>
          </p>
          <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: MUTED, margin: '0 0 48px' }}>
            MY Entertainment · Home Game
          </p>
          <a
            href="mailto:info@myentertainment.tv?subject=Home Game — Acquisition Inquiry"
            style={{ display: 'inline-block', background: GREEN, color: '#fff', padding: '14px 36px', borderRadius: 6, textDecoration: 'none', fontSize: 15, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Roboto Condensed', sans-serif" }}
          >
            Get in Touch
          </a>
          <p style={{ fontSize: 13, color: MUTED, marginTop: 24 }}>
            <a href="mailto:info@myentertainment.tv" style={{ color: GREEN, textDecoration: 'none' }}>info@myentertainment.tv</a>
          </p>
        </div>
      </section>

    </div>
  );
}
