'use client';

import { useState } from 'react';
import type { SafeTitle } from './page';

function vimeoEmbedUrl(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)(?:\/([a-f0-9]+))?/);
  if (!m) return null;
  return `https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}&autoplay=0` : '?autoplay=0'}`;
}

const MIST   = '#E8EEF4';   // ghostly white — primary headings
const GOLD   = '#C8A96E';   // aged parchment — accent labels
const BLUE   = '#6BA3BE';   // eerie pale blue — secondary accent
const RED    = '#8B1A1A';   // blood red — tragedy/dark history
const BLACK  = '#06060E';   // deep night — page background
const DARK   = '#0C0C18';   // alternate section background
const PANEL  = '#10101E';   // panel / card background

const inputStyle: React.CSSProperties = {
  background: '#0a0a14', border: '1px solid #2a2a3e', color: '#fff',
  borderRadius: 6, padding: '10px 14px', width: '100%',
  fontSize: 14, fontFamily: "'Roboto', sans-serif", boxSizing: 'border-box',
};

// Atmospheric mist divider
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

const EPISODE_THEMES = [
  'BATTLEFIELDS', 'PRISONS', 'HOSPITALS', 'ABANDONED PLACES',
  'HOTELS', 'MINING TOWNS', 'SACRED GROUNDS', 'MILITARY SITES',
];

const THEME_LOCATIONS = [
  { theme: 'BATTLEFIELDS', location: 'Gettysburg, PA' },
  { theme: 'HOTELS', location: 'Hotel Eden — La Falda, Argentina' },
  { theme: 'PRISONS', location: 'Spike Island — Cork, Ireland' },
  { theme: 'HOSPITALS', location: 'Waverly Hills Sanatorium — Louisville, KY' },
  { theme: 'HOSPITAL (ALT)', location: 'Old Hospital On College Hill — Williamson, WV' },
  { theme: 'MINING TOWNS', location: 'Garnet Ghost Town — Montana' },
  { theme: 'MILITARY SITES', location: 'Fort George — Canada' },
  { theme: 'SACRED GROUNDS', location: 'Templo Mayor Ruins — Mexico City, Mexico' },
];

const ACCESS_LOCATIONS = [
  'Norwich State Hospital — Norwich, CT',
  'Old Diplomat Hotel — Baguio, Philippines',
  'Poveglia Island — Venice, Italy',
  'Bell Island Mines — Nova Scotia, Canada',
  'Cresson State Prison & Sanatorium — Cresson, PA',
  'BANFF Springs Hotel — Canada',
  'Island of the Dolls — Mexico',
  'Eloise Psychiatric Hospital — Detroit, MI',
];

const FORMAT_BEATS = [
  { num: '1', title: 'The Place', desc: 'The episode introduces the location — its landscape, architecture, and historical context — establishing why it became significant in the region\'s history.' },
  { num: '2', title: 'The History', desc: 'The real events tied to the location are revealed through archival material and expert historians. Wars, crimes, disasters, and cultural conflicts provide the historical foundation.' },
  { num: '3', title: 'The Legend', desc: 'Local folklore and eyewitness accounts recount the paranormal stories that have emerged over time — sightings, unexplained sounds, and encounters that shaped the site\'s haunted reputation.' },
  { num: '4', title: 'The Witnesses', desc: 'Caretakers, historians, and locals share firsthand testimony about experiences that continue to fuel the legend today.' },
  { num: '5', title: 'The Legacy', desc: 'The story concludes by reflecting on how the haunting persists — exploring how history, memory, and folklore continue to shape the way the location is understood today.' },
];

const COMPARABLES = [
  { title: 'Ghost Adventures',         network: 'Max / Discovery+' },
  { title: 'Destination Fear',          network: 'Travel Channel' },
  { title: 'Haunted (Netflix)',          network: 'Netflix' },
  { title: 'Hellier',                   network: 'Planet Weird' },
];

const NETWORKS = ['Max', 'Discovery+', 'A&E', 'VICE', 'PBS', 'National Geographic', 'BBC', 'Lifetime', 'MTV', 'Travel Channel', 'ID: Investigation Discovery', 'Oxygen'];

export default function HauntedWorldOneSheet({ title }: { title: SafeTitle }) {
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

      {/* ── PASSWORD GATE ─────────────────────────────────────────── */}
      {!unlocked && (
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
              A Paranormal History Documentary Series
            </p>
            <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 10px' }}>Have Access?</p>
            <form onSubmit={handlePasswordSubmit}>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" style={inputStyle} />
              {pwError && <p style={{ color: '#e51d26', fontSize: 13, margin: '6px 0 0' }}>{pwError}</p>}
              <button type="submit" disabled={pwLoading} style={{ background: BLUE, color: '#fff', width: '100%', padding: 10, borderRadius: 6, border: 'none', cursor: 'pointer', marginTop: 8, fontSize: 14, opacity: pwLoading ? 0.7 : 1 }}>
                {pwLoading ? 'Verifying…' : 'Unlock'}
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
      )}

      {/* ── 1. HERO ──────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <img
            src="/available-thumbs/hw-bg.jpg"
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block', filter: 'brightness(0.6) saturate(0.7)' }}
          />
          {/* deep gradient overlays for atmospheric effect */}
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(6,6,14,0.5) 0%, rgba(6,6,14,0) 25%, rgba(6,6,14,0.7) 65%, rgba(6,6,14,1) 100%)` }} />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(6,6,14,0.85) 0%, rgba(6,6,14,0) 18%)` }} />
          {/* subtle blue tint for eerie atmosphere */}
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
          <h1 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(64px, 10vw, 120px)', textTransform: 'uppercase', lineHeight: 0.88, margin: '0 0 24px', letterSpacing: '-2px', color: MIST }}>
            Haunted<br />
            <span style={{ color: BLUE }}>World</span>
          </h1>
          <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 400, fontSize: 'clamp(18px, 2.5vw, 26px)', color: '#aabccc', margin: '0 0 40px', letterSpacing: '0.04em', fontStyle: 'italic' }}>
            Every haunting begins with a story.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7a8fa0', border: '1px solid #2a3a4e', padding: '7px 16px', borderRadius: 3 }}>
              Documentary Series · 60 Min
            </span>
            <span style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7a8fa0', border: '1px solid #2a3a4e', padding: '7px 16px', borderRadius: 3 }}>
              All Rights Available
            </span>
            <span style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7a8fa0', border: '1px solid #2a3a4e', padding: '7px 16px', borderRadius: 3 }}>
              Worldwide
            </span>
          </div>
        </div>
      </section>

      {/* ── MIST DIVIDER ─────────────────────────────────────────── */}
      <MistDivider />

      {/* ── 2. THE SERIES ────────────────────────────────────────────── */}
      <section style={{ position: 'relative', padding: '90px 40px', overflow: 'hidden', background: DARK }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <img src="/available-thumbs/hw-hero.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.04, filter: 'blur(2px)' }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 70, alignItems: 'center' }}>
            <div>
              <div style={{ width: 3, height: 56, background: BLUE, marginBottom: 20, boxShadow: `0 0 20px ${BLUE}88` }} />
              <SectionLabel>The Series</SectionLabel>
              <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 'clamp(30px, 3.5vw, 46px)', lineHeight: 1.05, color: MIST, textTransform: 'uppercase', margin: 0 }}>
                Across the world,<br />
                thousands of places<br />
                are rumored to be<br />
                <span style={{ color: BLUE }}>haunted.</span>
              </p>
            </div>
            <div>
              <p style={{ fontSize: 18, lineHeight: 1.85, color: '#b8c8d8', margin: '0 0 24px' }}>
                But behind every haunting is a real story. A battle. A tragedy. A forgotten chapter of history.
              </p>
              <p style={{ fontSize: 17, lineHeight: 1.8, color: '#8a9aaa', margin: '0 0 24px' }}>
                <strong style={{ color: MIST }}>Haunted World</strong> is a documentary series exploring the real stories behind the world&apos;s most legendary haunted locations. From abandoned prisons and battlefields to cursed islands, historic hotels, and forgotten towns, each episode uncovers the <em style={{ color: GOLD }}>historical events, human tragedies, and cultural conflicts</em> that shaped these enduring legends.
              </p>
              <p style={{ fontSize: 17, lineHeight: 1.8, color: '#8a9aaa', margin: 0 }}>
                Through archival research, historians, eyewitness testimony, and cinematic storytelling, the series reveals how history, folklore, and memory intertwine to create the ghost stories that continue to haunt these places today.
              </p>
              <div style={{ marginTop: 32, padding: '22px 28px', borderLeft: `4px solid ${BLUE}`, background: `rgba(107,163,190,0.06)` }}>
                <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 20, color: BLUE, margin: 0, fontStyle: 'italic', lineHeight: 1.5 }}>
                  &ldquo;Rather than investigating the paranormal itself, <em>Haunted World</em> explores the history behind the haunting.&rdquo;
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MistDivider />

      {/* ── 3. THE DIFFERENCE ───────────────────────────────────────── */}
      <section style={{ padding: '90px 40px', background: BLACK }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <SectionLabel>The Difference</SectionLabel>
            <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(32px, 4vw, 52px)', color: MIST, textTransform: 'uppercase', margin: '0 0 16px', letterSpacing: '-0.5px' }}>
              Most paranormal series focus on <span style={{ color: '#666', textDecoration: 'line-through' }}>ghost hunting.</span>
            </h2>
            <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(32px, 4vw, 52px)', color: BLUE, textTransform: 'uppercase', margin: 0, letterSpacing: '-0.5px' }}>
              Haunted World focuses on the story.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32 }}>
            {[
              { icon: '📜', label: 'Real Historical Events', desc: 'Every episode investigates the documented history behind legendary hauntings — from wars and executions to disasters and cultural conflict.' },
              { icon: '🔍', label: 'Investigative Storytelling', desc: 'By uncovering the past that shaped these places, the series reveals how history, folklore, and human memory combine to create legends that endure.' },
              { icon: '🎞', label: 'Historical Documentary', desc: 'This approach elevates paranormal storytelling into a premium historical documentary — cinematic, atmospheric, and grounded in fact.' },
            ].map(item => (
              <div key={item.label} style={{ background: PANEL, border: `1px solid #1e2038`, borderRadius: 8, padding: '32px 28px' }}>
                <p style={{ fontSize: 32, margin: '0 0 16px' }}>{item.icon}</p>
                <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD, margin: '0 0 12px' }}>{item.label}</p>
                <p style={{ fontSize: 15, lineHeight: 1.75, color: '#8a9aaa', margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. UNPARALLELED ACCESS ───────────────────────────────────── */}
      <section style={{ padding: '90px 40px', background: DARK }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
            <div>
              <SectionLabel>Unparalleled Access</SectionLabel>
              <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 'clamp(28px, 3vw, 42px)', color: MIST, textTransform: 'uppercase', lineHeight: 1.1, margin: '0 0 28px' }}>
                Decades of<br />relationships at<br /><span style={{ color: BLUE }}>the world&apos;s most<br />haunted locations.</span>
              </h2>
              <p style={{ fontSize: 16, lineHeight: 1.8, color: '#8a9aaa', margin: '0 0 20px' }}>
                Through decades producing some of television&apos;s most successful paranormal series, MY Entertainment has built long-standing relationships with historians, caretakers, paranormal investigators, and property owners around the globe.
              </p>
              <p style={{ fontSize: 16, lineHeight: 1.8, color: '#8a9aaa', margin: 0 }}>
                The team has filmed in <strong style={{ color: MIST }}>hundreds of historically significant haunted locations</strong>, providing the series with unique access to the people, places, and eyewitness accounts behind the world&apos;s most enduring paranormal legends.
              </p>
            </div>
            <div>
              <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: GOLD, margin: '0 0 20px' }}>
                Sample Locations
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {ACCESS_LOCATIONS.map(loc => (
                  <div key={loc} style={{ background: PANEL, border: '1px solid #1e2038', borderRadius: 6, padding: '14px 16px' }}>
                    <p style={{ fontSize: 12, color: '#8a9aaa', margin: 0, lineHeight: 1.5 }}>{loc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <MistDivider />

      {/* ── 5. THE FORMAT ────────────────────────────────────────────── */}
      <section style={{ padding: '90px 40px', background: BLACK }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 80 }}>
            <div>
              <SectionLabel>The Format</SectionLabel>
              <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 'clamp(26px, 3vw, 40px)', color: MIST, textTransform: 'uppercase', lineHeight: 1.1, margin: '0 0 24px' }}>
                Each episode:<br /><span style={{ color: GOLD }}>3–4 haunted locations</span><br />under one theme.
              </h2>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: '#8a9aaa', margin: '0 0 32px' }}>
                Stories unfold through historical research and archival material, historians and subject specialists, eyewitness testimony from locals and caretakers, and cinematic location photography.
              </p>
              <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: GOLD, margin: '0 0 16px' }}>
                Episode Themes
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {EPISODE_THEMES.map(t => (
                  <span key={t} style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: BLUE, border: `1px solid ${BLUE}44`, padding: '5px 12px', borderRadius: 3 }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: GOLD, margin: '0 0 24px' }}>
                Every Location Segment Follows 5 Acts
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {FORMAT_BEATS.map(beat => (
                  <div key={beat.num} style={{ display: 'flex', gap: 20, alignItems: 'flex-start', background: PANEL, border: '1px solid #1e2038', borderRadius: 8, padding: '20px 24px' }}>
                    <div style={{ flexShrink: 0, fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 36, color: `${BLUE}40`, lineHeight: 1 }}>{beat.num}</div>
                    <div>
                      <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: '0.15em', textTransform: 'uppercase', color: MIST, margin: '0 0 6px' }}>{beat.title}</p>
                      <p style={{ fontSize: 14, lineHeight: 1.7, color: '#8a9aaa', margin: 0 }}>{beat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <MistDivider />

      {/* ── 6. SAMPLE PACKAGE: TWIN BRIDGES ORPHANAGE ──────────────── */}
      <section style={{ padding: '90px 40px', background: DARK }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionLabel color={RED}>Sample Package</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'start' }}>
            <div>
              <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(28px, 3.5vw, 46px)', color: MIST, textTransform: 'uppercase', lineHeight: 0.95, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                Twin Bridges<br /><span style={{ color: RED }}>Orphanage</span>
              </h2>
              <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#666', margin: '0 0 32px' }}>
                Twin Bridges, Montana
              </p>
              <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
                {[
                  { value: '1894', label: 'Founded' },
                  { value: '6,000+', label: 'Children housed' },
                  { value: '100+', label: 'Deaths on grounds' },
                  { value: '1975', label: 'Facility closed' },
                ].map(s => (
                  <div key={s.label}>
                    <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 28, color: RED, margin: '0 0 2px', lineHeight: 1 }}>{s.value}</p>
                    <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#666', margin: 0 }}>{s.label}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: '#8a9aaa', margin: '0 0 16px' }}>
                Hidden in a quiet basin between the Montana mountains lies the abandoned Twin Bridges Orphanage — once one of the largest children&apos;s homes in the American West.
              </p>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: '#8a9aaa', margin: '0 0 16px' }}>
                Built in 1894, the sprawling campus housed nearly 6,000 children over its 80 years of operation. Many were not true orphans. During the Great Depression and World War II, families unable to feed their children placed them here. Children were separated by age and gender, subjected to harsh discipline and abuse.
              </p>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: '#8a9aaa', margin: '0 0 16px' }}>
                Tragedy also haunted the grounds. Over 100 children died at the orphanage, from disease outbreaks to accidents — including a six-year-old girl who suffered a <span style={{ color: RED, fontWeight: 600 }}>fatal skull fracture</span> after being kicked by a horse.
              </p>
              <div style={{ padding: '18px 22px', borderLeft: `4px solid ${RED}`, background: `rgba(139,26,26,0.08)`, borderRadius: '0 6px 6px 0' }}>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: '#a88080', margin: 0, fontStyle: 'italic' }}>
                  Visitors today report hearing children laughing, singing, and playing games across the empty property. Others describe a darker presence lingering in certain buildings — an imprint of decades of loneliness, fear, and hardship.
                </p>
              </div>
            </div>
            <div>
              <div style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                <img src="/available-thumbs/hw-orphanage.png" alt="Twin Bridges Orphanage" style={{ width: '100%', display: 'block', filter: 'brightness(0.85)' }} />
              </div>
              <img src="/available-thumbs/hw-themes.png" alt="Episode Themes" style={{ width: '100%', borderRadius: 8, display: 'block', opacity: 0.8 }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. SAMPLE PACKAGE: VOLTERRA ASYLUM ──────────────────────── */}
      <section style={{ padding: '90px 40px', background: BLACK }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionLabel color={RED}>Sample Package</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'start' }}>
            <div style={{ borderRadius: 8, overflow: 'hidden' }}>
              <img src="/available-thumbs/hw-volterra.png" alt="Volterra Asylum" style={{ width: '100%', display: 'block', filter: 'brightness(0.85)' }} />
            </div>
            <div>
              <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(28px, 3.5vw, 46px)', color: MIST, textTransform: 'uppercase', lineHeight: 0.95, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                Volterra<br /><span style={{ color: RED }}>Asylum</span>
              </h2>
              <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#666', margin: '0 0 32px' }}>
                Tuscany, Italy
              </p>
              <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
                {[
                  { value: '1888', label: 'Founded' },
                  { value: '6,000+', label: 'Patients held' },
                  { value: '0', label: '"Place of no return"' },
                  { value: '1978', label: 'Condemned & closed' },
                ].map((s, i) => (
                  <div key={s.label}>
                    {i !== 2 ? (
                      <>
                        <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 28, color: RED, margin: '0 0 2px', lineHeight: 1 }}>{s.value}</p>
                        <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#666', margin: 0 }}>{s.label}</p>
                      </>
                    ) : (
                      <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: RED, margin: '6px 0 0', fontStyle: 'italic' }}>{s.label}</p>
                    )}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: '#8a9aaa', margin: '0 0 16px' }}>
                Hidden in the hills of Tuscany stands the abandoned Volterra Psychiatric Hospital — once one of Italy&apos;s largest and most notorious asylums. Founded in 1888, the institution held more than 6,000 patients, many sent there for depression, political dissent, or accusations of moral misconduct.
              </p>
              <p style={{ fontSize: 15, lineHeight: 1.8, color: '#8a9aaa', margin: '0 0 16px' }}>
                Patients were subjected to brutal treatments: electroshock therapy, insulin-induced comas, experimental drugs, and prolonged isolation. Some were restrained for <span style={{ color: RED, fontWeight: 600 }}>months or even years</span>. The hospital closed in 1978 after its practices were condemned as inhumane.
              </p>
              <div style={{ padding: '18px 22px', borderLeft: `4px solid ${RED}`, background: `rgba(139,26,26,0.08)`, borderRadius: '0 6px 6px 0' }}>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: '#a88080', margin: 0, fontStyle: 'italic' }}>
                  In the courtyard walls, thousands of words carved by a patient imprisoned there for over a decade remain etched into the stone. Today, visitors report unexplained sounds, equipment failures, and an overwhelming sense of dread.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MistDivider />

      {/* ── 8. SIZZLE REEL ────────────────────────────────────────────── */}
      <section style={{ padding: '90px 40px', background: DARK }}>
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

      {/* ── 9. STYLE & TONE ───────────────────────────────────────────── */}
      <section style={{ padding: '90px 40px', background: BLACK }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
            <div>
              <SectionLabel>Style &amp; Tone</SectionLabel>
              <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 'clamp(28px, 3vw, 44px)', color: MIST, textTransform: 'uppercase', lineHeight: 1.05, margin: '0 0 32px' }}>
                Cinematic.<br />
                <span style={{ color: BLUE }}>Atmospheric.</span><br />
                Historically grounded.
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  'Sweeping landscape cinematography',
                  'Historic architecture and interiors',
                  'Archival photographs and documents',
                  'Atmospheric storytelling',
                ].map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: BLUE, flexShrink: 0, boxShadow: `0 0 8px ${BLUE}` }} />
                    <p style={{ fontSize: 16, color: '#8a9aaa', margin: 0 }}>{item}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 40, padding: '22px 28px', borderLeft: `4px solid ${GOLD}`, background: `rgba(200,169,110,0.06)` }}>
                <p style={{ fontSize: 16, lineHeight: 1.75, color: '#a89060', margin: 0, fontStyle: 'italic' }}>
                  &ldquo;The result is a series that feels both investigative and immersive, revealing how the past continues to shape the stories we tell today.&rdquo;
                </p>
              </div>
            </div>
            <div style={{ borderRadius: 8, overflow: 'hidden' }}>
              <img src="/available-thumbs/hw-style.png" alt="Style and Tone" style={{ width: '100%', display: 'block', filter: 'brightness(0.9)' }} />
            </div>
          </div>
        </div>
      </section>

      <MistDivider />

      {/* ── 10. PRODUCTION MODEL ─────────────────────────────────────── */}
      <section style={{ padding: '80px 40px', background: DARK }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionLabel>Production Model</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
            {[
              { icon: '📍', label: 'Location-Based\nStorytelling' },
              { icon: '📷', label: 'Small Mobile\nDocumentary Crews' },
              { icon: '🚁', label: 'Cinematic Drone &\nLandscape Photography' },
              { icon: '📁', label: 'Archival\nIntegration' },
              { icon: '🎙', label: 'Expert\nInterviews' },
            ].map(item => (
              <div key={item.label} style={{ background: PANEL, border: '1px solid #1e2038', borderRadius: 8, padding: '28px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 28, margin: '0 0 12px' }}>{item.icon}</p>
                <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8a9aaa', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{item.label}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 15, color: '#666', margin: '28px 0 0', textAlign: 'center', fontStyle: 'italic' }}>
            This approach allows the series to explore historic locations around the world while delivering visually rich storytelling.
          </p>
        </div>
      </section>

      {/* ── 11. COMPARABLE TITLES ────────────────────────────────────── */}
      <section style={{ padding: '80px 40px', background: BLACK }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionLabel>Style &amp; Comparables</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {COMPARABLES.map(c => (
              <div key={c.title} style={{ background: PANEL, border: `1px solid #1e2038`, borderRadius: 8, padding: '28px 24px', textAlign: 'center' }}>
                <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 18, color: MIST, textTransform: 'uppercase', margin: '0 0 8px' }}>{c.title}</p>
                <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: GOLD, margin: 0 }}>{c.network}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <MistDivider />

      {/* ── 12. COMPANY BIO ───────────────────────────────────────────── */}
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
                {['Ghost Adventures (#1 Paranormal Show)', 'Snooki: Paranormal Rookie', 'Destination Fear', 'Destinations of the Damned', 'Deadly Possessions', 'Help! My House Is Haunted'].map(s => (
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
                {NETWORKS.map(n => (
                  <span key={n} style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7a8a9a', border: '1px solid #1e2038', padding: '6px 14px', borderRadius: 4 }}>
                    {n}
                  </span>
                ))}
              </div>
              <SectionLabel>Strategic Partnerships</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { name: "LeBron James & Maverick Carter's SpringHill Company" },
                  { name: "Al Roker's ARE (Al Roker Entertainment)" },
                  { name: "Michael Sugar's Sugar23" },
                  { name: "Mark Wahlberg's Unrealistic Ideas" },
                ].map(p => (
                  <div key={p.name} style={{ background: PANEL, border: '1px solid #1e2038', borderRadius: 6, padding: '14px 18px' }}>
                    <p style={{ fontSize: 14, color: '#8a9aaa', margin: 0 }}>{p.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 13. CTA ───────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 40px', background: BLACK, textAlign: 'center' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ width: 2, height: 60, background: `linear-gradient(to bottom, transparent, ${BLUE})`, margin: '0 auto 40px' }} />
          <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 'clamp(22px, 2.5vw, 32px)', color: MIST, lineHeight: 1.5, margin: '0 0 16px', fontStyle: 'italic' }}>
            &ldquo;Every haunting begins with a story.<br />
            <span style={{ color: BLUE }}>We tell the ones history forgot.&rdquo;</span>
          </p>
          <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#555', margin: '0 0 48px' }}>
            MY Entertainment · Haunted World
          </p>
          <a
            href="mailto:info@myentertainment.tv"
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
