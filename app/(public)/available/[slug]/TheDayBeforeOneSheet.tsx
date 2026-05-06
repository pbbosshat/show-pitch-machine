'use client';

import type { SafeTitle } from './page';

// Dark slate blue — documentary, gravitas
const PRIMARY = '#2A3F5F';
const BLACK   = '#080C14';
const DARK    = '#0C1220';
const WHITE   = '#E8EEF8';
const MUTED   = '#4A6080';

export default function TheDayBeforeOneSheet({ title }: { title: SafeTitle }) {
  // Stub one-sheet — full pitch deck coming soon
  void title; // title prop reserved for future use

  return (
    <div style={{ background: BLACK, color: WHITE, fontFamily: "'Roboto', sans-serif", minHeight: '100vh' }}>

      {/* ── HERO ── */}
      <section style={{
        position: 'relative', minHeight: '100vh', overflow: 'hidden',
        background: `linear-gradient(135deg, ${BLACK} 0%, ${DARK} 60%, ${PRIMARY}44 100%)`,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', textAlign: 'center', padding: '64px 48px',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(ellipse at 50% 40%, ${PRIMARY}22 0%, transparent 60%)`,
        }} />
        <div style={{ position: 'relative', maxWidth: 700 }}>
          <span style={{
            display: 'inline-block', padding: '5px 16px', marginBottom: 24,
            background: `${PRIMARY}33`, border: `1px solid ${PRIMARY}66`,
            borderRadius: 3, color: `${WHITE}99`, fontSize: 11,
            fontFamily: "'Roboto Condensed', sans-serif",
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em',
          }}>Documentary</span>
          <h1 style={{
            fontFamily: "'Roboto Condensed', sans-serif",
            fontWeight: 900, fontSize: 'clamp(52px, 8vw, 110px)',
            textTransform: 'uppercase', letterSpacing: '-0.02em',
            lineHeight: 0.88, margin: '0 0 32px', color: WHITE,
            textShadow: '0 4px 32px rgba(0,0,0,0.8)',
          }}>
            The Day<br /><span style={{ color: PRIMARY }}>Before</span>
          </h1>
          <div style={{
            width: 60, height: 3, background: PRIMARY,
            margin: '0 auto 32px', borderRadius: 2,
          }} />
          <p style={{
            fontSize: 'clamp(15px, 1.8vw, 19px)', color: `${WHITE}88`,
            lineHeight: 1.7, marginBottom: 48,
          }}>
            Full pitch deck and materials coming soon.<br />
            Contact us for more information.
          </p>
          <a
            href="mailto:info@myentertainment.tv?subject=The Day Before — Inquiry"
            style={{
              display: 'inline-block', padding: '16px 40px',
              background: PRIMARY, color: WHITE, borderRadius: 4,
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.15em',
              textDecoration: 'none',
            }}
          >
            Contact Us
          </a>
          <p style={{ color: MUTED, fontSize: 13, marginTop: 16 }}>info@myentertainment.tv</p>
        </div>
      </section>

    </div>
  );
}
