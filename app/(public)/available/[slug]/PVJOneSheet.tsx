'use client';

import type { SafeTitle } from './page';

// Charcoal — gritty documentary aesthetic
const PRIMARY = '#3A3A3A';
const ACCENT  = '#AAAAAA';
const BLACK   = '#0A0A0A';
const DARK    = '#141414';
const WHITE   = '#F0F0F0';
const MUTED   = '#666666';

export default function PVJOneSheet({ title }: { title: SafeTitle }) {
  // Stub one-sheet — full pitch deck coming soon
  void title; // title prop reserved for future use

  return (
    <div style={{ background: BLACK, color: WHITE, fontFamily: "'Roboto', sans-serif", minHeight: '100vh' }}>

      {/* ── HERO ── */}
      <section style={{
        position: 'relative', minHeight: '100vh', overflow: 'hidden',
        background: `linear-gradient(135deg, ${BLACK} 0%, ${DARK} 50%, ${PRIMARY} 100%)`,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', textAlign: 'center', padding: '64px 48px',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(ellipse at 50% 40%, ${ACCENT}11 0%, transparent 60%)`,
        }} />
        <div style={{ position: 'relative', maxWidth: 700 }}>
          <span style={{
            display: 'inline-block', padding: '5px 16px', marginBottom: 24,
            background: `${ACCENT}11`, border: `1px solid ${ACCENT}33`,
            borderRadius: 3, color: `${WHITE}88`, fontSize: 11,
            fontFamily: "'Roboto Condensed', sans-serif",
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em',
          }}>Documentary</span>
          <h1 style={{
            fontFamily: "'Roboto Condensed', sans-serif",
            fontWeight: 900, fontSize: 'clamp(72px, 12vw, 150px)',
            textTransform: 'uppercase', letterSpacing: '-0.02em',
            lineHeight: 0.88, margin: '0 0 32px', color: WHITE,
            textShadow: '0 4px 32px rgba(0,0,0,0.8)',
          }}>
            PVJ
          </h1>
          <div style={{
            width: 60, height: 3, background: ACCENT,
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
            href="mailto:info@myentertainment.tv?subject=PVJ — Inquiry"
            style={{
              display: 'inline-block', padding: '16px 40px',
              background: ACCENT, color: BLACK, borderRadius: 4,
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
