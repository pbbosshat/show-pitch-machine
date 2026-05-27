/**
 * SiteHeader — Fixed navbar matching myentertainment.tv exactly.
 * Black background, Roboto Condensed uppercase nav links, MYE logo image from Webflow CDN.
 * "WORK WITH MYE" is a bordered right-aligned CTA link, not a filled button.
 *
 * Webflow CSS equivalents:
 *   .navbar { background-color: #000; position: fixed; top: 0; left: 0; right: 0; z-index: 100; }
 *   .nav-link { color: #fff; letter-spacing: 2px; text-transform: uppercase;
 *               padding: 20px 13px 20px 10px; font-size: 11px; font-family: 'Roboto Condensed'; }
 *   .nav-link.w--current { color: #e51d26; }
 *   .work-with-mye { border: 1px solid #5f6266; border-radius: 2px;
 *                    margin-top: 15px; margin-bottom: 16px;
 *                    padding: 4px 0 4px 20px; float: right; }
 */
'use client';
import Link from 'next/link';
import { useState } from 'react';

// All public nav links — hrefs use clean URLs (no /site prefix, rewrites handle routing)
const NAV_LINKS = [
  { href: '/shows',         label: 'SHOWS' },
  { href: '/genres',        label: 'GENRES' },
  { href: '/reel',          label: 'REEL' },
  { href: '/about',         label: 'ABOUT' },
  { href: '/available',     label: 'AVAILABLE' },
  { href: '/international', label: 'INTERNATIONAL' },
  { href: '/press-releases', label: 'PRESS' },
  { href: '/faq',           label: 'FAQ' },
  { href: '/login',         label: 'LOGIN' },
];

// B2B money-page links surfaced in the mobile nav under a "FOR BUYERS" divider.
// WHY mobile-only for the grouped list: the desktop nav is already at capacity
// (9 links + CTA button). Adding 4 more would overflow on mid-size screens.
// The footer "FOR BUYERS" column handles desktop sitewide link equity.
// Mobile nav gets the full list because it's a vertical stack with no overflow risk.
// The desktop nav already has /available which provides one crawlable sitewide
// entry point to the buyer cluster from the header.
const BUYER_NAV_LINKS = [
  { href: '/tv-show-pitch',          label: 'TV SHOW PITCH' },
  { href: '/sizzle-reel',            label: 'SIZZLE REELS' },
  { href: '/how-to-pitch-a-tv-show', label: 'HOW TO PITCH A TV SHOW' },
  { href: '/tv-production-company',  label: 'TV PRODUCTION COMPANY' },
  { href: '/tv-show-pitch-deck',     label: 'TV SHOW PITCH DECK' },
];

// Shared nav link style — Webflow: .nav-link
const navLinkStyle: React.CSSProperties = {
  color: '#fff',
  textDecoration: 'none',
  fontFamily: "'Roboto Condensed', sans-serif",
  fontSize: 11,
  fontWeight: 400,
  textTransform: 'uppercase',
  letterSpacing: '2px',
  // Webflow padding: 20px 13px 20px 10px (top right bottom left)
  padding: '20px 13px 20px 10px',
  whiteSpace: 'nowrap',
};

// "WORK WITH MYE" bordered CTA — Webflow: .nav-link.right (floated, bordered)
const workWithMYEStyle: React.CSSProperties = {
  color: '#fff',
  textDecoration: 'none',
  fontFamily: "'Roboto Condensed', sans-serif",
  fontSize: 11,
  fontWeight: 400,
  textTransform: 'uppercase',
  letterSpacing: '2px',
  border: '1px solid #5f6266',
  borderRadius: 2,
  // Webflow: margin-top 15px, margin-bottom 16px, padding-top 4px, padding-bottom 4px, padding-left 20px
  marginTop: 15,
  marginBottom: 16,
  paddingTop: 4,
  paddingBottom: 4,
  paddingLeft: 20,
  paddingRight: 13,
  whiteSpace: 'nowrap',
};

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    // Webflow: .navbar — fixed full-width black bar at top
    <header style={{
      background: '#000',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
    }}>
      {/* Inner container — max-width 1180px centered, Webflow container width */}
      <div style={{
        maxWidth: 1180,
        margin: '0 auto',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* MYE Logo — links to homepage, image from Webflow CDN */}
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <img
            src="https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8ebea7bb58375c4d58c7_My%20Entertainment%20Square%20(Dark%20Background%20-%20Gradient).png"
            alt="MyEntertainment logo"
            style={{ height: 75, width: 'auto' }}
          />
        </Link>

        {/* Desktop nav — horizontal flex row of links, hidden below 768px */}
        <nav
          style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap' }}
          className="mye-desktop-nav"
        >
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} style={navLinkStyle}>
              {label}
            </Link>
          ))}
          {/* "WORK WITH MYE" — bordered button floated right, Webflow: .nav-link.right */}
          {/* Redirected from /contact to /work-with-us (seo/option-a-fan-and-b2b) */}
          <Link href="/work-with-us" style={workWithMYEStyle}>
            WORK WITH MYE
          </Link>
        </nav>

        {/* Mobile hamburger — only visible below 768px */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation menu"
          style={{
            display: 'none', // shown via media query class below
            background: 'none',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 22,
            lineHeight: 1,
            padding: '10px 0',
          }}
          className="mye-mobile-hamburger"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile dropdown menu — stacked links, shown when menuOpen */}
      {menuOpen && (
        <div style={{
          background: '#000',
          borderTop: '1px solid #2a2a2a',
          padding: '8px 20px 16px',
        }}>
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block',
                color: '#fff',
                textDecoration: 'none',
                fontFamily: "'Roboto Condensed', sans-serif",
                fontSize: 13,
                fontWeight: 400,
                textTransform: 'uppercase',
                letterSpacing: '2px',
                padding: '12px 0',
                borderBottom: '1px solid #1a1a1a',
              }}
            >
              {label}
            </Link>
          ))}

          {/* ── FOR BUYERS section — mobile only ─────────────────────────
              These 4 links are the B2B money pages. Surfacing them in the
              mobile nav ensures every page type (including show pages) has
              a crawlable path to the money pages via the header, not just
              the footer. The divider label "FOR BUYERS" adds topical context
              for both users and search crawlers reading the nav DOM. */}
          <div style={{
            borderTop: '1px solid #333',
            marginTop: 8,
            paddingTop: 8,
          }}>
            <p style={{
              fontFamily: "'Roboto Condensed', sans-serif",
              fontSize: 10,
              color: '#909499',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              margin: '8px 0 4px',
            }}>
              For Buyers
            </p>
            {BUYER_NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'block',
                  color: '#e51d26',
                  textDecoration: 'none',
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 13,
                  fontWeight: 400,
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  padding: '10px 0',
                  borderBottom: '1px solid #1a1a1a',
                }}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Mobile "WORK WITH MYE" — bordered same as desktop */}
          {/* Redirected from /contact to /work-with-us (seo/option-a-fan-and-b2b) */}
          <Link
            href="/work-with-us"
            onClick={() => setMenuOpen(false)}
            style={{
              display: 'inline-block',
              marginTop: 12,
              color: '#fff',
              textDecoration: 'none',
              fontFamily: "'Roboto Condensed', sans-serif",
              fontSize: 13,
              fontWeight: 400,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              border: '1px solid #5f6266',
              borderRadius: 2,
              padding: '6px 20px',
            }}
          >
            WORK WITH MYE
          </Link>
        </div>
      )}

      {/*
        Responsive styles: hide desktop nav and show hamburger below 768px.
        Using a style tag here avoids adding Tailwind classes to a public site component.
      */}
      <style>{`
        @media (max-width: 767px) {
          .mye-desktop-nav { display: none !important; }
          .mye-mobile-hamburger { display: block !important; }
        }
      `}</style>
    </header>
  );
}
