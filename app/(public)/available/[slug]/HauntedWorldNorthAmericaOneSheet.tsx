'use client';

import { useState } from 'react';
import type { SafeTitle } from './page';

// Paranormal palette — same as HauntedWorldOneSheet
const MIST   = '#E8EEF4';   // ghostly white — primary headings
const GOLD   = '#C8A96E';   // aged parchment — accent labels
const BLUE   = '#6BA3BE';   // eerie pale blue — secondary accent
const RED    = '#8B1A1A';   // blood red — tragedy/dark history
const BLACK  = '#06060E';   // deep night — page background
const DARK   = '#0C0C18';   // alternate section background
const PANEL  = '#10101E';   // panel / card background

// Shared input style for password gate fields
const inputStyle: React.CSSProperties = {
  background: '#0a0a14', border: '1px solid #2a2a3e', color: '#fff',
  borderRadius: 6, padding: '10px 14px', width: '100%',
  fontSize: 14, fontFamily: "'Roboto', sans-serif", boxSizing: 'border-box',
};

// Atmospheric mist divider — vertical tick-mark pattern with edge fade
function MistDivider() {
  return (
    <div style={{ position: 'relative', height: 32, overflow: 'hidden', background: BLACK }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `repeating-linear-gradient(
          90deg,
          ${BLUE}22 0px, ${BLUE}44 1px,
          transparent 1px, transparent 16px
        )`,
        opacity: 0.6,
      }} />
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to right, ${BLACK}, transparent 10%, transparent 90%, ${BLACK})` }} />
    </div>
  );
}

// Small uppercase section label with accent color
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
        body: JSON.stringify({ slug: 'haunted-world-north-america', password: pw }),
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
        body: JSON.stringify({ ...reqForm, slug: 'haunted-world-north-america' }),
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
      <div style={{ maxWidth: 440, width: '100%', background: '#0C0C18', border: '1px solid #2a2a3e', borderRadius: 12, padding: 40 }}>
        <div style={{ marginBottom: 20, textAlign: 'center' }}>
          <span style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 900, fontSize: 22, color: '#e51d26' }}>MY</span>
          <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#fff', marginLeft: 6 }}>Entertainment</span>
        </div>
        <h1 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 22, fontWeight: 700, color: MIST, textAlign: 'center', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Haunted World
        </h1>
        <p style={{ fontSize: 12, color: GOLD, textAlign: 'center', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 28px' }}>
          North America
        </p>
        <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 10px' }}>Have Access?</p>
        <form onSubmit={handlePasswordSubmit}>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Enter password" style={inputStyle} />
          {err && <p style={{ color: '#e51d26', fontSize: 13, margin: '6px 0 0' }}>{err}</p>}
          <button type="submit" disabled={loading} style={{ background: BLUE, color: '#fff', width: '100%', padding: 10, borderRadius: 6, border: 'none', cursor: 'pointer', marginTop: 8, fontSize: 14, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Verifying…' : 'Unlock'}
          </button>
        </form>
        <div style={{ borderTop: '1px solid #1e1e30', margin: '24px 0' }} />
        <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 10px' }}>Request Access</p>
        {reqSent ? (
          <p style={{ fontSize: 14, color: MIST, textAlign: 'center' }}>Request sent! We&apos;ll be in touch.</p>
        ) : (
          <form onSubmit={handleRequestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input type="text" placeholder="First Name" value={reqForm.first_name} onChange={e => setReqForm(f => ({ ...f, first_name: e.target.value }))} required style={inputStyle} />
            <input type="text" placeholder="Last Name" value={reqForm.last_name} onChange={e => setReqForm(f => ({ ...f, last_name: e.target.value }))} required style={inputStyle} />
            <input type="email" placeholder="Email" value={reqForm.email} onChange={e => setReqForm(f => ({ ...f, email: e.target.value }))} required style={inputStyle} />
            <input type="text" placeholder="Company" value={reqForm.company} onChange={e => setReqForm(f => ({ ...f, company: e.target.value }))} style={inputStyle} />
            <button type="submit" disabled={reqLoading} style={{ background: 'transparent', border: '1px solid #2a2a3e', color: '#888', width: '100%', padding: 10, borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: reqLoading ? 0.7 : 1 }}>
              {reqLoading ? 'Sending…' : 'Request Access'}
            </button>
            {reqError && <p style={{ color: '#ef4444', fontSize: 13, margin: '4px 0 0' }}>{reqError}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

// The three featured North American location cards
const NA_LOCATIONS = [
  {
    name: 'Twin Bridges Orphanage',
    region: 'Twin Bridges, Montana',
    desc: 'One of the largest children\'s homes in the American West. Over 100 deaths on the grounds. The haunting is rooted in decades of loneliness, disease, and institutional hardship.',
  },
  {
    name: 'Volterra-Style Asylums',
    region: 'Canadian Wilderness',
    desc: 'Decommissioned psychiatric institutions deep in the Canadian wilderness — where patients endured brutal experimental treatments far from public scrutiny.',
  },
  {
    name: 'Revolutionary War Sites',
    region: 'Eastern United States',
    desc: 'Battlefields and fortifications where the founding violence of the nation left permanent marks — from unmarked graves to documented apparitions that persist centuries later.',
  },
];

export default function HauntedWorldNorthAmericaOneSheet({ title }: { title: SafeTitle }) {
  const [unlocked, setUnlocked] = useState(!title.has_password);

  // No sizzle reel for this variant — placeholder shown instead
  const embedUrl: string | null = null;

  return (
    <div style={{ background: BLACK, minHeight: '100vh', color: '#fff', fontFamily: "'Roboto', sans-serif" }}>

      {/* ── PASSWORD GATE ─────────────────────────────────────────── */}
      {!unlocked && <PasswordGate onUnlock={() => setUnlocked(true)} />}

      {/* ── 1. HERO ──────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <img
            src="/available-thumbs/hwna.png"
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block', filter: 'brightness(0.55) saturate(0.7)' }}
          />
          {/* Gradient overlays for atmospheric depth */}
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(6,6,14,0.5) 0%, rgba(6,6,14,0) 25%, rgba(6,6,14,0.7) 65%, rgba(6,6,14,1) 100%)` }} />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(6,6,14,0.85) 0%, rgba(6,6,14,0) 18%)` }} />
          {/* Subtle blue tint for eerie atmosphere */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,30,60,0.25)' }} />
        </div>

        {/* MY Entertainment badge */}
        <div style={{ position: 'absolute', top: 32, left: 40, zIndex: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 900, fontSize: 20, color: '#e51d26' }}>MY</span>
          <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#fff' }}>Entertainment</span>
          <span style={{ fontSize: 10, color: '#444', margin: '0 4px' }}>·</span>
          <span style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#555' }}>Presents</span>
        </div>

        {/* Hero content */}
        <div style={{ position: 'relative', zIndex: 2, padding: '0 40px 80px', maxWidth: 900 }}>
          <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: '0.35em', textTransform: 'uppercase', color: GOLD, margin: '0 0 20px' }}>
            A Paranormal History Documentary Series
          </p>
          <h1 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(56px, 8vw, 104px)', textTransform: 'uppercase', lineHeight: 0.88, margin: '0 0 12px', letterSpacing: '-2px', color: MIST }}>
            Haunted<br />
            <span style={{ color: BLUE }}>World</span>
          </h1>
          <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 'clamp(18px, 2.5vw, 28px)', letterSpacing: '0.1em', textTransform: 'uppercase', color: GOLD, margin: '0 0 20px' }}>
            North America
          </p>
          <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 400, fontSize: 'clamp(16px, 2vw, 22px)', color: '#aabccc', margin: '0 0 40px', letterSpacing: '0.04em', fontStyle: 'italic' }}>
            Every haunting begins with a story.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7a8fa0', border: '1px solid #2a3a4e', padding: '7px 16px', borderRadius: 3 }}>
              Documentary Series · 8 × 60 min
            </span>
            <span style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7a8fa0', border: '1px solid #2a3a4e', padding: '7px 16px', borderRadius: 3 }}>
              North American Rights
            </span>
            <span style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7a8fa0', border: '1px solid #2a3a4e', padding: '7px 16px', borderRadius: 3 }}>
              All Rights Available
            </span>
          </div>
        </div>
      </section>

      <MistDivider />

      {/* ── 2. THE SERIES ────────────────────────────────────────────── */}
      <section style={{ padding: '90px 40px', background: DARK }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 70, alignItems: 'center' }}>
            <div>
              <div style={{ width: 3, height: 56, background: BLUE, marginBottom: 20, boxShadow: `0 0 20px ${BLUE}88` }} />
              <SectionLabel>The Series</SectionLabel>
              <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 'clamp(30px, 3.5vw, 46px)', lineHeight: 1.05, color: MIST, textTransform: 'uppercase', margin: 0 }}>
                The continent&apos;s<br />
                darkest histories.<br />
                The hauntings<br />
                <span style={{ color: BLUE }}>they created.</span>
              </p>
            </div>
            <div>
              <p style={{ fontSize: 18, lineHeight: 1.85, color: '#b8c8d8', margin: '0 0 24px' }}>
                Haunted World: North America brings the same acclaimed paranormal history format to the stories that haunt the continent — from orphanages in the American South to decommissioned asylums in the Canadian wilderness.
              </p>
              <p style={{ fontSize: 17, lineHeight: 1.8, color: '#8a9aaa', margin: '0 0 24px' }}>
                Every episode uncovers the true, documented history of tragedy, obsession, and violence that created the haunting. Not a ghost hunting show — a history documentary that goes where the ghosts live.
              </p>
              <div style={{ marginTop: 32, padding: '22px 28px', borderLeft: `4px solid ${BLUE}`, background: `rgba(107,163,190,0.06)` }}>
                <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 20, color: BLUE, margin: 0, fontStyle: 'italic', lineHeight: 1.5 }}>
                  &ldquo;Every haunting begins with a story. This is a continent full of them.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MistDivider />

      {/* ── 3. NORTH AMERICAN LOCATIONS ──────────────────────────────── */}
      <section style={{ padding: '90px 40px', background: BLACK }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <SectionLabel color={RED}>North American Locations</SectionLabel>
            <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(32px, 4vw, 52px)', color: MIST, textTransform: 'uppercase', margin: 0, letterSpacing: '-0.5px' }}>
              Featured Locations
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32 }}>
            {NA_LOCATIONS.map(loc => (
              <div key={loc.name} style={{ background: PANEL, border: `1px solid ${RED}22`, borderRadius: 8, padding: '32px 28px' }}>
                <div style={{ width: 3, height: 28, background: RED, marginBottom: 20, boxShadow: `0 0 12px ${RED}66` }} />
                <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 18, color: MIST, textTransform: 'uppercase', margin: '0 0 6px', letterSpacing: '0.04em' }}>{loc.name}</p>
                <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: RED, margin: '0 0 16px' }}>{loc.region}</p>
                <p style={{ fontSize: 14, lineHeight: 1.75, color: '#8a9aaa', margin: 0 }}>{loc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MistDivider />

      {/* ── 4. STATS BAR ────────────────────────────────────────────── */}
      <section style={{ padding: '72px 40px', background: DARK }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, textAlign: 'center' }}>
            {[
              { value: '8 Episodes', label: 'Per Season' },
              { value: '60-Minute', label: 'Format' },
              { value: 'North American', label: 'Locations' },
              { value: 'All Rights', label: 'Available' },
            ].map(s => (
              <div key={s.label}>
                <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(22px, 2.5vw, 32px)', color: BLUE, margin: '0 0 8px', lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#555', margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MistDivider />

      {/* ── 5. SIZZLE REEL ────────────────────────────────────────────── */}
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
            <div style={{ position: 'relative', paddingBottom: '56.25%', background: PANEL, border: `2px dashed ${BLUE}33`, borderRadius: 6 }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <span style={{ fontSize: 48, marginBottom: 16 }}>▶</span>
                <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.2em', color: BLUE, margin: 0 }}>
                  Sizzle Available Upon Request
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <MistDivider />

      {/* ── 6. COMPANY BIO ───────────────────────────────────────────── */}
      <section style={{ padding: '90px 40px', background: DARK }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 70 }}>
            <div>
              <div style={{ marginBottom: 28 }}>
                <span style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 900, fontSize: 36, color: '#e51d26' }}>MY</span>
                <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: 14, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: MIST, marginLeft: 8 }}>Entertainment</span>
              </div>
              <SectionLabel>The Production</SectionLabel>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: '#8a9aaa', margin: '0 0 20px' }}>
                MY Entertainment is an independent production company creating undeniable content since 2000. Known for compelling characters, great storytelling, and innovative deals.
              </p>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: '#8a9aaa', margin: '0 0 20px' }}>
                With offices in Manhattan, Toronto, and London — at the forefront of the international format business, with strong working relationships with more than <strong style={{ color: MIST }}>40 producers in 15 countries</strong>.
              </p>
              <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: GOLD, margin: '0 0 12px' }}>
                Paranormal Track Record
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {['Ghost Adventures (#1 Paranormal Show)', 'Destination Fear', 'Destinations of the Damned', 'Deadly Possessions', 'Help! My House Is Haunted'].map(s => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: BLUE, flexShrink: 0 }} />
                    <p style={{ fontSize: 13, color: '#7a8a9a', margin: 0 }}>{s}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <SectionLabel>Network Partners</SectionLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 40 }}>
                {['Max', 'Discovery+', 'A&E', 'VICE', 'PBS', 'National Geographic', 'BBC', 'Lifetime', 'Travel Channel', 'ID: Investigation Discovery', 'Oxygen'].map(n => (
                  <span key={n} style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7a8a9a', border: '1px solid #1e2038', padding: '6px 14px', borderRadius: 4 }}>
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. CTA ───────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 40px', background: BLACK, textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ width: 2, height: 60, background: `linear-gradient(to bottom, transparent, ${BLUE})`, margin: '0 auto 40px' }} />
          <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 'clamp(22px, 2.5vw, 32px)', color: MIST, lineHeight: 1.5, margin: '0 0 16px', fontStyle: 'italic' }}>
            &ldquo;Every haunting begins with a story.<br />
            <span style={{ color: BLUE }}>North America has more than most.&rdquo;</span>
          </p>
          <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#555', margin: '0 0 48px' }}>
            MY Entertainment · Haunted World: North America
          </p>
          <a
            href="mailto:info@myentertainment.tv?subject=Haunted World North America — Acquisition Inquiry"
            style={{ display: 'inline-block', background: BLUE, color: '#fff', padding: '14px 36px', borderRadius: 6, textDecoration: 'none', fontSize: 15, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Roboto Condensed', sans-serif" }}
          >
            Get in Touch
          </a>
          <p style={{ fontSize: 13, color: '#444', marginTop: 24 }}>
            <a href="mailto:info@myentertainment.tv" style={{ color: BLUE, textDecoration: 'none' }}>info@myentertainment.tv</a>
          </p>
        </div>
      </section>

    </div>
  );
}
