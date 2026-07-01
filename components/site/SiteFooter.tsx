'use client';
/**
 * SiteFooter — matches myentertainment.tv footer exactly.
 * Two-column layout: COMPANY links | BUSINESS INFORMATION address + MCS logo.
 * Dark background (#1d1f21), muted footer-link text (#909499), Roboto font.
 *
 * Webflow CSS equivalents:
 *   footer background: #1d1f21 (--black token)
 *   .footer-link { color: #909499; }
 *   .footer-heading { color: #909499; font-family: 'Roboto Condensed'; font-size: 11px;
 *                     text-transform: uppercase; letter-spacing: 2px; }
 */
import Link from 'next/link';

// Shared column heading style — Webflow: .footer-heading
const colHeadingStyle: React.CSSProperties = {
  color: '#909499',
  fontFamily: "'Roboto Condensed', sans-serif",
  fontSize: 11,
  fontWeight: 400,
  textTransform: 'uppercase',
  letterSpacing: '2px',
  marginBottom: 20,
  marginTop: 0,
};

// Shared footer link style — Webflow: .footer-link
const footerLinkStyle: React.CSSProperties = {
  display: 'block',
  color: '#909499',
  fontSize: 13,
  fontFamily: "'Roboto', sans-serif",
  textDecoration: 'none',
  marginBottom: 8,
  // Hover handled via onMouseEnter/Leave inline — no CSS modules or Tailwind used here
};

// COMPANY column links — hrefs use clean URLs (rewrites handle /site mapping)
const COMPANY_LINKS = [
  { href: '/',                   label: 'Home' },
  { href: '/shows',              label: 'Shows' },
  { href: '/genres',             label: 'Genres' },
  { href: '/about',              label: 'About' },
  { href: '/international',      label: 'International' },
  { href: '/press-releases',     label: 'Press Releases' },
  { href: '/careers',            label: 'Careers' },
  { href: '/faq',                label: 'FAQs' },
  { href: '/film-commissions',   label: 'Film Commissions' },
  { href: '/contact',            label: 'Contact' },
  // Producer submission page — sitewide footer link ensures crawlability
  // and surfaces the /pitch conversion page for any producer browsing the site.
  { href: '/pitch',              label: 'Submit Your Show' },
];

// FOR BUYERS column — B2B money pages.
// Updated (seo/scale-mye 2026-05-27): /documentary and /buyers added.
// WHY footer placement: site-wide footer links are the single highest-equity
// internal link location — every page (homepage, show pages, about, FAQ, etc.)
// contributes PageRank to these destinations. A footer link from 100+ pages
// sends a much stronger topical signal than the same link on a single page.
// Anchor text is descriptive and buyer-intent-matched (not generic "click here")
// so Google treats them as editorial votes for buyer-intent queries.
// Updated 2026-07-01: /tv-distribution-company added. It is the PRIMARY
// distribution money-keyword pillar (sitemap priority 1.0, live since
// 2026-06-04) but had never been added to this sitewide footer column —
// meaning it was the one B2B money page NOT receiving footer PageRank from
// every page on the site. That gap, combined with the same omission in
// BuyerCTA.tsx, is the most likely cause of its 0-impression nightly finding.
const BUYER_LINKS = [
  { href: '/tv-distribution-company', label: 'TV Distribution Company' },
  { href: '/available',              label: 'Available Titles' },
  { href: '/tv-show-pitch',          label: 'TV Show Pitch' },
  { href: '/sizzle-reel',            label: 'Sizzle Reels' },
  { href: '/how-to-pitch-a-tv-show', label: 'How to Pitch a TV Show' },
  { href: '/tv-production-company',  label: 'TV Production Company' },
  { href: '/tv-show-pitch-deck',     label: 'TV Show Pitch Deck' },
  { href: '/documentary',            label: 'Documentary Production' },
  { href: '/tv-buyers',              label: 'TV Buyers & Licensing' },
];

export default function SiteFooter() {
  return (
    // Webflow: footer { background: #1d1f21; }
    <footer style={{
      background: '#1d1f21',
      padding: '60px 20px 40px',
      fontFamily: "'Roboto', sans-serif",
    }}>
      {/* Inner container — 940px max-width matching Webflow footer layout */}
      <div style={{ maxWidth: 940, margin: '0 auto' }}>

        {/* Three-column grid: COMPANY | BUSINESS INFORMATION | OWNERSHIP */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 60,
        }}>

          {/* ---- COMPANY column ---- */}
          <div style={{ flex: '1 1 160px' }}>
            <h4 style={colHeadingStyle}>COMPANY</h4>
            {COMPANY_LINKS.map(({ href, label }) => (
              <FooterLink key={href} href={href}>{label}</FooterLink>
            ))}
          </div>

          {/* ---- FOR BUYERS column ---- */}
          {/* Site-wide footer links are the highest-equity internal link
              placement: every page on the site — homepage, show pages, about,
              FAQ, press releases — passes PageRank through this column to the
              4 B2B money pages. One footer edit, maximum link equity reach.
              Heading "FOR BUYERS" matches the buyer-intent audience and signals
              topical relevance to Google crawlers reading the footer. */}
          <div style={{ flex: '1 1 160px' }}>
            <h4 style={colHeadingStyle}>FOR BUYERS</h4>
            {BUYER_LINKS.map(({ href, label }) => (
              <FooterLink key={href} href={href}>{label}</FooterLink>
            ))}
          </div>

          {/* ---- BUSINESS INFORMATION column ---- */}
          <div style={{ flex: '1 1 200px' }}>
            <h4 style={colHeadingStyle}>BUSINESS INFORMATION</h4>

            {/* Physical address block — line-height 1.8 matches Webflow spacing */}
            <address style={{
              fontStyle: 'normal',
              color: '#909499',
              fontSize: 13,
              lineHeight: 1.8,
              fontFamily: "'Roboto', sans-serif",
              marginBottom: 16,
            }}>
              MyEntertainment<br />
              235 E 45th St.<br />
              Floor 14 West<br />
              New York, NY 10017
            </address>

            {/* Email — same muted color, no underline */}
            <p style={{ color: '#909499', fontSize: 13, marginBottom: 0, lineHeight: 1.8 }}>
              E:{' '}
              <a
                href="mailto:info@myentertainment.tv"
                style={{ color: '#909499', textDecoration: 'none' }}
              >
                info@myentertainment.tv
              </a>
            </p>
          </div>

          {/* ---- OWNERSHIP column ---- */}
          <div style={{ flex: '1 1 160px' }}>
            <h4 style={colHeadingStyle}>&nbsp;</h4>
            <p style={{ color: '#909499', fontSize: 13, marginBottom: 12, lineHeight: 1.8, marginTop: 0 }}>
              MyEntertainment is owned &amp; operated by:
            </p>
            <img
              src="https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/63716462131625106f06ed9c_Media%20Content%20Services%20Logo%20-%20Dark%20Background%20(Horizontal).png"
              alt="media content services logo"
              width={140}
              style={{ display: 'block', maxWidth: '100%' }}
            />
          </div>
        </div>

      </div>
    </footer>
  );
}

/**
 * FooterLink — thin wrapper that adds hover highlight (#d9d9d9) to footer links
 * without needing CSS modules or Tailwind. Uses React state via onMouseEnter/Leave.
 */
function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={footerLinkStyle}
      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#d9d9d9'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = '#909499'; }}
    >
      {children}
    </Link>
  );
}
