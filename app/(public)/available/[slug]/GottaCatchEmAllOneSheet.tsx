'use client';

import { useState } from 'react';
import type { SafeTitle } from './page';

// ── PDF export action bar ─────────────────────────────────────────────────────
function ExportBar({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(false);
  const [hover, setHover]     = useState(false);

  async function handleExport() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/available/${slug}/pdf`, { method: 'POST' });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${slug}-pitch-deck.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[ExportBar] PDF export failed:', err);
      alert('PDF export failed — please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 75,          // sit directly below the 75px fixed site nav
      left: 0,
      right: 0,
      zIndex: 110,      // above the site nav (z-index: 100)
      background: 'rgba(5,5,5,0.97)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid #1c1c1c',
      padding: '0 40px',
      height: 46,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
    }}>
      {/* Export button */}
      <button
        onClick={handleExport}
        disabled={loading}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          fontFamily: "'Roboto Condensed', sans-serif",
          fontWeight: 700,
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: loading ? '#555' : (hover ? '#000' : GOLD),
          background: loading ? 'transparent' : (hover ? GOLD : 'transparent'),
          border: `1px solid ${loading ? '#333' : GOLD}`,
          padding: '7px 18px',
          borderRadius: 3,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s, color 0.15s',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {loading ? (
          <>
            <span style={{ display: 'inline-block', width: 10, height: 10, border: '1.5px solid #555', borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            Generating PDF…
          </>
        ) : (
          <>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
              <path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export as PDF
          </>
        )}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function vimeoEmbedUrl(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)(?:\/([a-f0-9]+))?/);
  if (!m) return null;
  return `https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}&autoplay=0` : '?autoplay=0'}`;
}

const GOLD   = '#F5C400';
const RED    = '#CC0000';
const BLACK  = '#050505';
const DARK   = '#0d0d0d';

const STATS = [
  { value: '$147B',   label: 'Global Pokémon Trading\nCard Market' },
  { value: '30th',    label: '2026 Pokémon\nAnniversary Year' },
  { value: '$16.5M',  label: 'Record Single-Card\nSale — Logan Paul' },
  { value: '4 Parts', label: 'Cinematic Investigation\nEvent Series' },
];

const EPISODES = [
  {
    num: '01',
    title: 'THE ORIGIN',
    desc: 'Pokémon explodes into a global phenomenon in the late 1990s. Pokémania overtakes the world overnight — and embedded in the game is a powerful psychological loop: rarity, completion, and the thrill of discovery. Decades later, those same childhood cards are suddenly worth astonishing amounts of money. The childhood game has become a collectible gold rush.',
  },
  {
    num: '02',
    title: 'THE BOOM',
    desc: 'As nostalgia collides with internet culture, Pokémon cards explode into one of the hottest collectible markets on Earth. Influencers livestream pack openings to millions of viewers. Logan Paul sells his Pikachu Illustrator card for a record-breaking $16.5 million. Scammers and counterfeiters flood global marketplaces. The Pokémon economy is no longer a hobby. It\'s a billion-dollar market.',
  },
  {
    num: '03',
    title: 'THE HUNT',
    desc: 'In 2016, Pokémon GO transforms the franchise — turning the hunt into a real-world experience. Criminals exploit the game\'s location features to target players. Police departments issue warnings as confrontations escalate. In some cases, the consequences turn deadly. For the first time, Pokémon\'s fictional hunt had entered the real world — and the stakes were no longer just part of the game.',
  },
  {
    num: '04',
    title: 'THE BLACK MARKET',
    desc: 'A new criminal ecosystem emerges around Pokémon cards. Thieves drill through walls and smash display cases to steal collections worth hundreds of thousands of dollars. Investigators see coordinated patterns — organized groups treating trading card stores as high-value targets. Rare cards are now stored in vaults, traded like stocks. The question isn\'t just who will catch them all. It\'s what new crimes may follow.',
  },
];

const TALENT = [
  { name: 'Logan Paul',          role: 'Influencer · sold Pikachu Illustrator for $16.5M' },
  { name: 'Steve Aoki',          role: 'Grammy DJ · avid Pokémon collector' },
  { name: 'Charlie Hurlocker',   role: 'Trading Card Expert · tens of millions of cards' },
  { name: 'Ken Goldin',          role: 'Owner, Goldin Auctions · oversaw Logan Paul sale' },
  { name: 'Tommy Brown',         role: 'Tag Collects · robbed of $100K on Christmas Eve 2024' },
  { name: 'Duy Pham',            role: 'Do-We Collectibles · lost $180K in Anaheim theft' },
  { name: 'Dr. Marcus Carter',   role: 'Pokémon GO Researcher' },
  { name: 'Paul Lesko',          role: 'Attorney · Hobby & Collectibles Law' },
  { name: 'Patricia Hernandez',  role: 'Pokémon Culture Journalist' },
  { name: 'Gary Haase',          role: 'Legendary Pokémon Card Collector' },
  { name: 'Manny Luoro',         role: 'Card Cave Central · Union, NJ' },
  { name: 'Law Enforcement',     role: 'Investigators pursuing Pokémon crime networks' },
];

const COMPARABLES = [
  { title: 'McMillions',           network: 'HBO' },
  { title: 'The Beanie Bubble',    network: 'Apple TV+' },
  { title: 'The Hobby',            network: 'Documentary' },
  { title: 'Dark Side of the Ring', network: 'Vice TV' },
];

const inputStyle: React.CSSProperties = {
  background: '#000', border: '1px solid #333', color: '#fff',
  borderRadius: 6, padding: '10px 14px', width: '100%',
  fontSize: 14, fontFamily: "'Roboto', sans-serif", boxSizing: 'border-box',
};

// Police-tape stripe divider rendered as CSS gradient
function TapeDivider() {
  return (
    <div style={{
      height: 20,
      background: `repeating-linear-gradient(
        -45deg,
        ${GOLD},
        ${GOLD} 16px,
        #111 16px,
        #111 32px
      )`,
      width: '100%',
    }} />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: "'Roboto Condensed', sans-serif",
      fontSize: 11, fontWeight: 700, letterSpacing: '0.25em',
      textTransform: 'uppercase', color: GOLD, margin: '0 0 16px',
    }}>
      {children}
    </p>
  );
}

export default function GottaCatchEmAllOneSheet({ title }: { title: SafeTitle }) {
  const [unlocked, setUnlocked] = useState(!title.has_password);
  const [password, setPassword] = useState('');
  const [pwError, setPwError]   = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [reqForm, setReqForm]   = useState({ first_name: '', last_name: '', email: '', company: '' });
  const [reqLoading, setReqLoading] = useState(false);
  const [reqSent, setReqSent]   = useState(false);
  const [reqError, setReqError] = useState('');

  const embedUrl = title.vimeo_url ? vimeoEmbedUrl(title.vimeo_url) : null;

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pwLoading) return;
    setPwLoading(true); setPwError('');
    try {
      const res  = await fetch(`/api/available/${title.slug}/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json() as { ok: boolean };
      if (data.ok) setUnlocked(true); else setPwError('Incorrect password');
    } catch { setPwError('Network error — try again.'); }
    finally   { setPwLoading(false); }
  }

  async function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reqLoading) return;
    setReqLoading(true);
    setReqError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reqForm, available_title_id: title.id }),
      });
      if (res.ok) {
        setReqSent(true);
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setReqError(data.error ?? `Error ${res.status} — please try again.`);
      }
    } catch { setReqError('Network error — please try again.'); }
    finally { setReqLoading(false); }
  }

  return (
    <div style={{ background: BLACK, minHeight: '100vh', color: '#fff', fontFamily: "'Roboto', sans-serif" }}>

      {/* ── ACTION BAR ──────────────────────────────────────────────── */}
      <ExportBar slug={title.slug} />

      {/* ── PASSWORD GATE ─────────────────────────────────────────── */}
      {!unlocked && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.93)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ maxWidth: 440, width: '100%', background: '#111', border: '1px solid #222', borderRadius: 12, padding: 40 }}>
            <div style={{ marginBottom: 20, textAlign: 'center' }}>
              <span style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 900, fontSize: 22, color: '#e51d26' }}>MY</span>
              <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#fff', marginLeft: 6 }}>Entertainment</span>
            </div>
            <h1 style={{ fontFamily: "'Roboto', sans-serif", fontSize: 18, fontWeight: 500, color: '#fff', textAlign: 'center', margin: '0 0 24px' }}>
              {title.title}
            </h1>
            <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 10px' }}>Have Access?</p>
            <form onSubmit={handlePasswordSubmit}>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" style={inputStyle} />
              {pwError && <p style={{ color: '#e51d26', fontSize: 13, margin: '6px 0 0' }}>{pwError}</p>}
              <button type="submit" disabled={pwLoading} style={{ background: '#e51d26', color: '#fff', width: '100%', padding: 10, borderRadius: 6, border: 'none', cursor: 'pointer', marginTop: 8, fontSize: 14, opacity: pwLoading ? 0.7 : 1 }}>
                {pwLoading ? 'Verifying…' : 'Unlock'}
              </button>
            </form>
            <div style={{ borderTop: '1px solid #222', margin: '24px 0' }} />
            <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 10px' }}>Request Access</p>
            {reqSent ? (
              <p style={{ fontSize: 14, color: '#fff', textAlign: 'center' }}>Request sent! We&apos;ll be in touch.</p>
            ) : (
              <form onSubmit={handleRequestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input type="text" placeholder="First Name" value={reqForm.first_name} onChange={e => setReqForm(f => ({ ...f, first_name: e.target.value }))} required style={inputStyle} />
                <input type="text" placeholder="Last Name" value={reqForm.last_name} onChange={e => setReqForm(f => ({ ...f, last_name: e.target.value }))} required style={inputStyle} />
                <input type="email" placeholder="Email" value={reqForm.email} onChange={e => setReqForm(f => ({ ...f, email: e.target.value }))} required style={inputStyle} />
                <input type="text" placeholder="Company" value={reqForm.company} onChange={e => setReqForm(f => ({ ...f, company: e.target.value }))} style={inputStyle} />
                <button type="submit" disabled={reqLoading} style={{ background: 'transparent', border: '1px solid #444', color: '#888', width: '100%', padding: 10, borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: reqLoading ? 0.7 : 1 }}>
                  {reqLoading ? 'Sending…' : 'Request Access'}
                </button>
                {reqError && <p style={{ color: '#ef4444', fontSize: 13, margin: '4px 0 0' }}>{reqError}</p>}
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── 1. HERO ──────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
        {/* Background key art */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <img
            src="/available-thumbs/gotta-catch-em-all.png"
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
          />
          {/* gradient bottom overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(5,5,5,0.3) 0%, rgba(5,5,5,0) 30%, rgba(5,5,5,0.85) 70%, rgba(5,5,5,1) 100%)' }} />
          {/* gradient top overlay (nav spacing) */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(5,5,5,0.9) 0%, rgba(5,5,5,0) 20%)' }} />
        </div>

        {/* MY Entertainment badge top-left */}
        <div style={{ position: 'absolute', top: 32, left: 40, zIndex: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 900, fontSize: 20, color: '#e51d26' }}>MY</span>
          <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#fff' }}>Entertainment</span>
          <span style={{ fontSize: 10, color: '#555', margin: '0 4px' }}>·</span>
          <span style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#555' }}>Presents</span>
        </div>

        {/* Hero content */}
        <div style={{ position: 'relative', zIndex: 2, padding: '0 40px 64px', maxWidth: 900 }}>
          <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: GOLD, margin: '0 0 16px' }}>
            A 4 Part Investigation Event
          </p>
          <h1 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(48px, 8vw, 96px)', textTransform: 'uppercase', lineHeight: 0.9, margin: '0 0 12px', letterSpacing: '-1px' }}>
            Gotta Catch<br />
            <span style={{ color: GOLD }}>&lsquo;Em All</span>
          </h1>
          <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 'clamp(18px, 3vw, 28px)', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#ddd', margin: '0 0 32px' }}>
            Inside the Pokémon Crime Wave
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#aaa', border: '1px solid #333', padding: '6px 14px', borderRadius: 3 }}>
              4 Episodes · Documentary
            </span>
            <span style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#aaa', border: '1px solid #333', padding: '6px 14px', borderRadius: 3 }}>
              All Rights Available
            </span>
          </div>
        </div>
      </section>

      {/* ── POLICE TAPE DIVIDER ─────────────────────────────────── */}
      <TapeDivider />

      {/* ── 2. LOGLINE ───────────────────────────────────────────── */}
      <section style={{ position: 'relative', padding: '80px 40px', overflow: 'hidden', background: DARK }}>
        {/* subtle background image */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <img src="/available-thumbs/gcal-logline.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.08 }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 60, alignItems: 'center' }}>
            <div>
              <div style={{ width: 4, height: 60, background: RED, marginBottom: 20 }} />
              <SectionLabel>The Series</SectionLabel>
              <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 48, lineHeight: 1, color: '#fff', textTransform: 'uppercase', margin: 0 }}>
                For thirty years,<br />
                <span style={{ color: GOLD }}>Pokémon</span><br />
                has been one of the most beloved franchises on Earth.
              </p>
            </div>
            <div>
              <p style={{ fontSize: 18, lineHeight: 1.8, color: '#ccc', margin: '0 0 24px' }}>
                But as nostalgia turned childhood collectibles into million-dollar assets, a darker world emerged — robberies, black-market trading networks, counterfeit rings, and <span style={{ color: RED, fontWeight: 700 }}>even murder</span> tied to the pursuit of rare Pokémon.
              </p>
              <p style={{ fontSize: 17, lineHeight: 1.8, color: '#999', margin: 0 }}>
                This premium documentary series investigates how a game built on the thrill of the hunt helped create a global obsession — and a growing wave of real-world crime.
              </p>
              <div style={{ marginTop: 32, padding: '20px 24px', borderLeft: `4px solid ${GOLD}`, background: 'rgba(245,196,0,0.05)' }}>
                <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 20, color: GOLD, margin: 0, fontStyle: 'italic', lineHeight: 1.4 }}>
                  &ldquo;Gotta Catch &lsquo;Em All&rdquo; became more than a slogan. It became a mindset. And for some collectors — it became an obsession with deadly consequences.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. STATS BAR ─────────────────────────────────────────── */}
      <section style={{ background: '#0a0a0a', borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {STATS.map((s, i) => (
            <div
              key={s.value}
              style={{
                padding: '48px 32px',
                borderRight: i < 3 ? '1px solid #1a1a1a' : 'none',
                textAlign: 'center',
              }}
            >
              <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 54, color: GOLD, margin: '0 0 8px', lineHeight: 1, letterSpacing: '-1px' }}>
                {s.value}
              </p>
              <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#666', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. THE POKÉ-CONOMY ───────────────────────────────────── */}
      <section style={{ padding: '100px 40px', background: BLACK }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div style={{ position: 'relative', borderRadius: 4, overflow: 'hidden' }}>
            <img src="/available-thumbs/gcal-pokeconomy.png" alt="Inside the Poké-conomy" style={{ width: '100%', display: 'block', borderRadius: 4 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,5,5,0.2)' }} />
          </div>
          <div>
            <SectionLabel>Inside the Poké-conomy</SectionLabel>
            <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 44, textTransform: 'uppercase', color: '#fff', margin: '0 0 24px', lineHeight: 1.1 }}>
              The Highest-Grossing<br />
              <span style={{ color: GOLD }}>Media Franchise</span><br />
              in the World.
            </h2>
            <p style={{ fontSize: 15, color: '#999', lineHeight: 1.8, margin: '0 0 24px' }}>
              2026 marks the 30th anniversary of Pokémon, and the franchise is bigger than ever. The trading card market has exploded into a global industry estimated at more than <strong style={{ color: '#fff' }}>$147 billion</strong>.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                'Rare Pokémon cards are now treated like luxury assets — graded, auctioned like fine art, and stored in vaults.',
                'A single grading point can turn a $5,000 card into a $100,000 collectible.',
                'As trust in traditional financial systems erodes, collectors turn to trading cards as alternative assets alongside art, wine, and cryptocurrency.',
                'The rarest Pokémon cards can now be worth more than gold.',
              ].map((fact, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <span style={{ color: GOLD, fontWeight: 900, fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>◆</span>
                  <p style={{ fontSize: 14, color: '#bbb', lineHeight: 1.7, margin: 0 }}>{fact}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. A CRIME WAVE ──────────────────────────────────────── */}
      <section style={{ padding: '100px 40px', background: '#0a0008' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <SectionLabel>A Crime Wave</SectionLabel>
            <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 44, textTransform: 'uppercase', color: '#fff', margin: '0 0 24px', lineHeight: 1.1 }}>
              Wherever That Kind<br />of Money Exists,<br />
              <span style={{ color: RED }}>Crime Follows.</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { stat: '$180K', detail: 'In cards stolen from a single Anaheim, CA collectibles store — one of the largest reported Pokémon card thefts' },
                { stat: 'Mission Impossible', detail: 'Thieves descended from the ceiling of a card store to steal thousands in rare cards' },
                { stat: '$100K', detail: 'Cards stolen from Tag Collects, Atlanta — on Christmas Eve 2024' },
                { stat: 'At Gunpoint', detail: 'Missouri suspects used Pokémon GO\'s "lure" feature to ambush players' },
                { stat: '3 Deaths', detail: 'Calvin Riley (SF), Cayla Campos (NM), Jiansheng Chen (CA) — killed while playing Pokémon GO' },
                { stat: 'Millions/Year', detail: 'In counterfeit Pokémon cards flooding global marketplaces in fraudulent sales' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 20, alignItems: 'flex-start', padding: '16px 0', borderBottom: '1px solid #1a1a1a' }}>
                  <span style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 15, color: RED, flexShrink: 0, minWidth: 120, lineHeight: 1.3 }}>{item.stat}</span>
                  <p style={{ fontSize: 14, color: '#aaa', lineHeight: 1.6, margin: 0 }}>{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: 'relative', borderRadius: 4, overflow: 'hidden' }}>
            <img src="/available-thumbs/gcal-crime-wave.png" alt="A Crime Wave" style={{ width: '100%', display: 'block', borderRadius: 4 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(10,0,8,0.4))' }} />
          </div>
        </div>
      </section>

      <TapeDivider />

      {/* ── 6. SIZZLE REEL ───────────────────────────────────────── */}
      <section style={{ padding: '100px 40px', background: DARK }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <SectionLabel>Sizzle Reel</SectionLabel>
            <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 40, textTransform: 'uppercase', color: '#fff', margin: 0 }}>
              Watch the Sizzle
            </h2>
          </div>
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
            <div style={{
              position: 'relative', paddingBottom: '56.25%', height: 0,
              background: '#111', borderRadius: 4, border: `2px dashed ${GOLD}33`,
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <img src="/available-thumbs/gcal-episodes.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.15 }} />
                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                  <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>▶</span>
                  <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 24, textTransform: 'uppercase', letterSpacing: '0.2em', color: GOLD, margin: '0 0 8px' }}>
                    Sizzle Available Upon Request
                  </p>
                  <p style={{ fontSize: 14, color: '#666', margin: 0 }}>Contact info@myentertainment.tv for access</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 7. THE EPISODES ──────────────────────────────────────── */}
      <section style={{ background: BLACK }}>
        {/* Episode header with Pokéball image */}
        <div style={{ position: 'relative', height: 280, overflow: 'hidden' }}>
          <img src="/available-thumbs/gcal-episodes.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,5,5,0.6)' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <SectionLabel>Four-Part Cinematic Event</SectionLabel>
            <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 72, textTransform: 'uppercase', color: '#fff', margin: 0, letterSpacing: '-1px' }}>
              The Episodes
            </h2>
          </div>
        </div>

        {/* Episode grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', maxWidth: 1200, margin: '0 auto' }}>
          {EPISODES.map((ep, i) => (
            <div
              key={ep.num}
              style={{
                padding: '48px 32px',
                borderRight: i < 3 ? '1px solid #1a1a1a' : 'none',
                borderTop: '1px solid #1a1a1a',
                background: i % 2 === 0 ? '#0a0a0a' : BLACK,
              }}
            >
              <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 48, color: `${GOLD}33`, margin: '0 0 4px', lineHeight: 1 }}>
                {ep.num}
              </p>
              <div style={{ width: 32, height: 3, background: RED, margin: '0 0 16px' }} />
              <h3 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: '#fff', margin: '0 0 16px', letterSpacing: '0.05em' }}>
                {ep.title}
              </h3>
              <p style={{ fontSize: 13, color: '#888', lineHeight: 1.75, margin: 0 }}>
                {ep.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <TapeDivider />

      {/* ── 8. ACCESS ────────────────────────────────────────────── */}
      <section style={{ padding: '100px 40px', background: DARK }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 56 }}>
            <SectionLabel>Confirmed & Potential Access</SectionLabel>
            <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 44, textTransform: 'uppercase', color: '#fff', margin: 0 }}>
              Unprecedented Access
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            {TALENT.map((t) => (
              <div key={t.name} style={{ padding: '20px 24px', background: '#0f0f0f', borderBottom: '1px solid #1a1a1a' }}>
                <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 17, color: GOLD, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {t.name}
                </p>
                <p style={{ fontSize: 13, color: '#666', margin: 0, lineHeight: 1.5 }}>
                  {t.role}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. STYLE & TONE ──────────────────────────────────────── */}
      <section style={{ padding: '100px 40px', background: BLACK }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }}>
          <div>
            <SectionLabel>Style &amp; Tone</SectionLabel>
            <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 44, textTransform: 'uppercase', color: '#fff', margin: '0 0 24px', lineHeight: 1.1 }}>
              Vibrant Nostalgia Meets<br />
              <span style={{ color: RED }}>True-Crime Tension.</span>
            </h2>
            <p style={{ fontSize: 15, color: '#bbb', lineHeight: 1.8, margin: '0 0 24px' }}>
              The series blends the vibrant nostalgia of Pokémon with the tension and momentum of a true-crime investigation. Visually, the world moves between:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                'Childhood memories & archival of Pokémon\'s cultural explosion',
                'Cinematic recreations & CCTV footage of robberies and scams',
                'The surreal real-world hunts of Pokémon GO',
                'High-stakes card auctions and obsessive collectors',
                'Investigators tracking the modern Pokémon black market',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span style={{ color: GOLD, flexShrink: 0 }}>→</span>
                  <p style={{ fontSize: 14, color: '#999', lineHeight: 1.6, margin: 0 }}>{item}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 32, padding: '20px 24px', background: '#0f0f0f', borderLeft: `4px solid ${RED}` }}>
              <p style={{ fontSize: 13, color: '#888', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700 }}>Tone Arc</p>
              <p style={{ fontSize: 14, color: '#ccc', margin: 0, lineHeight: 1.7 }}>
                Begins playful and nostalgic — then reveals the darker reality beneath the fandom. By episode four, the stakes are unmistakable.
              </p>
            </div>
          </div>
          <div>
            <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#555', margin: '0 0 24px' }}>
              Comparable Titles
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {COMPARABLES.map((c) => (
                <div key={c.title} style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 4, padding: '24px 20px', textAlign: 'center' }}>
                  <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 18, textTransform: 'uppercase', color: '#fff', margin: '0 0 6px', lineHeight: 1.2 }}>
                    {c.title}
                  </p>
                  <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#555', margin: 0 }}>
                    {c.network}
                  </p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 32, position: 'relative', borderRadius: 4, overflow: 'hidden' }}>
              <img src="/available-thumbs/gcal-tone.png" alt="Style & Tone" style={{ width: '100%', display: 'block', borderRadius: 4 }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── 10. ABOUT MY ENTERTAINMENT ───────────────────────────── */}
      <section style={{ padding: '100px 40px', background: '#080808', borderTop: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '300px 1fr', gap: 80, alignItems: 'start' }}>
          <div>
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 900, fontSize: 36, color: '#e51d26', display: 'block', lineHeight: 1 }}>MY</span>
              <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#fff' }}>Entertainment</span>
            </div>
            <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: '#555', textTransform: 'uppercase', letterSpacing: '0.15em', lineHeight: 1.8, margin: 0 }}>
              Max · Discovery+ · A&E · VICE · PBS · Nat Geo · BBC · Lifetime · MTV · Comedy Central · Travel Channel · ID · Oxygen · Nickelodeon · Food Network · TruTV · Reelz · CMT
            </p>
          </div>
          <div>
            <p style={{ fontSize: 15, color: '#bbb', lineHeight: 1.85, margin: '0 0 20px' }}>
              My Entertainment is an independent production company creating undeniable content since 2000, best known for compelling characters, great storytelling, innovative deals, and high production value. With offices in Manhattan, Toronto, and London.
            </p>
            <p style={{ fontSize: 15, color: '#999', lineHeight: 1.85, margin: '0 0 20px' }}>
              Popular series include the <strong style={{ color: '#fff' }}>#1 paranormal show Ghost Adventures</strong>, Pros vs. Joes, Jane Doe Murders, Uninterrupted, Legacy List, Destination Fear, Baggage Battles, Sin City Justice, Manson Bloodlines, and critically acclaimed Breaking Borders.
            </p>
            <p style={{ fontSize: 15, color: '#999', lineHeight: 1.85, margin: 0 }}>
              Partnerships include LeBron James & Maverick Carter's SpringHill Company, Al Roker's ARE, Michael Sugar's Sugar23, and Mark Wahlberg's Unrealistic Ideas. Strong working relationships with <strong style={{ color: '#fff' }}>40+ producers in 15 countries</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* ── 11. CTA ──────────────────────────────────────────────── */}
      <section style={{ position: 'relative', padding: '120px 40px', background: BLACK, textAlign: 'center', overflow: 'hidden' }}>
        {/* Subtle key art background */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <img src="/available-thumbs/gcal-crime-bg.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.06 }} />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, ${BLACK}, rgba(5,5,5,0.9), ${BLACK})` }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 700, margin: '0 auto' }}>
          <TapeDivider />
          <div style={{ height: 64 }} />
          <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: '0.3em', textTransform: 'uppercase', color: GOLD, margin: '0 0 20px' }}>
            Ready to Acquire?
          </p>
          <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(40px, 6vw, 72px)', textTransform: 'uppercase', lineHeight: 1, color: '#fff', margin: '0 0 24px' }}>
            Sometimes the Rarest Pokémon<br />
            <span style={{ color: RED }}>Aren&rsquo;t Just Collectibles.<br />They&rsquo;re Targets.</span>
          </h2>
          <p style={{ fontSize: 16, color: '#888', lineHeight: 1.7, margin: '0 0 40px' }}>
            <em>Gotta Catch &lsquo;Em All: Inside the Pokémon Crime Wave</em> is available for international licensing, co-production, and domestic acquisition. Four episodes. All rights available.
          </p>
          <a
            href={`mailto:${title.contact_email || 'info@myentertainment.tv'}`}
            style={{
              display: 'inline-block',
              background: RED,
              color: '#fff',
              fontFamily: "'Roboto Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              textDecoration: 'none',
              padding: '16px 40px',
              borderRadius: 3,
            }}
          >
            Inquire Now
          </a>
          <div style={{ marginTop: 16 }}>
            <a
              href={`mailto:${title.contact_email || 'info@myentertainment.tv'}`}
              style={{ color: '#555', fontSize: 13, textDecoration: 'none', fontFamily: "'Roboto', sans-serif" }}
            >
              {title.contact_email || 'info@myentertainment.tv'}
            </a>
          </div>
          <div style={{ height: 64 }} />
          <TapeDivider />
        </div>
      </section>

    </div>
  );
}
