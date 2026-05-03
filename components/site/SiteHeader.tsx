'use client';
// Public site header — dark cinematic nav matching myentertainment.tv.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/site/shows',         label: 'Shows' },
  { href: '/site/genres',        label: 'Genres' },
  { href: '/site/reel',          label: 'Reel' },
  { href: '/site/about',         label: 'About' },
  { href: '/site/available',     label: 'Available' },
  { href: '/site/international', label: 'International' },
  { href: '/site/press-releases', label: 'Press' },
  { href: '/site/faq',           label: 'FAQ' },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header style={{ background: '#0A0A0F', borderBottom: '1px solid #1A1A2E', position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        {/* Wordmark */}
        <Link href="/site" style={{ textDecoration: 'none', display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#CC1212', fontFamily: 'Inter, sans-serif', lineHeight: 1 }}>MY</span>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.14em', color: '#F0F0F0', fontFamily: 'Inter, sans-serif' }}>ENTERTAINMENT</span>
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="hidden md:flex">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link key={href} href={href} style={{ textDecoration: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500, color: active ? '#CC1212' : '#8A9DC0', transition: 'color 150ms' }}>
                {label}
              </Link>
            );
          })}
          <Link href="/site/contact" style={{ marginLeft: 8, padding: '8px 16px', borderRadius: 6, background: '#CC1212', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Work With MYE
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ display: 'none', background: 'none', border: 'none', color: '#F0F0F0', cursor: 'pointer' }} className="block md:hidden">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ background: '#0F1729', borderTop: '1px solid #1A1A2E', padding: '12px 24px 20px' }}>
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '10px 0', fontSize: 15, color: '#8A9DC0', textDecoration: 'none', borderBottom: '1px solid #1A1A2E' }}>
              {label}
            </Link>
          ))}
          <Link href="/site/contact" onClick={() => setMenuOpen(false)} style={{ display: 'block', marginTop: 12, padding: '10px 16px', background: '#CC1212', color: '#fff', borderRadius: 6, fontSize: 14, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
            Work With MYE
          </Link>
        </div>
      )}
    </header>
  );
}
