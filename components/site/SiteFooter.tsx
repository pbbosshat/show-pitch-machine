// Public site footer — dark, with quick links and company info.
import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer style={{ background: '#080D18', borderTop: '1px solid #1A1A2E', padding: '48px 24px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, marginBottom: 40 }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 12 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#CC1212', fontFamily: 'Inter, sans-serif' }}>MY</span>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: '#F0F0F0', fontFamily: 'Inter, sans-serif' }}>ENTERTAINMENT</span>
            </div>
            <p style={{ fontSize: 13, color: '#4A5D80', lineHeight: 1.6, maxWidth: 240 }}>
              Compelling characters. Great storytelling. Innovative deals. High production value.
            </p>
          </div>
          {/* Quick links */}
          <div>
            <h4 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#8A9DC0', marginBottom: 12, textTransform: 'uppercase' }}>Explore</h4>
            {[
              { href: '/site/shows', label: 'Shows' },
              { href: '/site/genres', label: 'Genres' },
              { href: '/site/available', label: 'Available' },
              { href: '/site/international', label: 'International' },
              { href: '/site/reel', label: 'Reel' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} style={{ display: 'block', fontSize: 13, color: '#4A5D80', textDecoration: 'none', marginBottom: 8 }}>{label}</Link>
            ))}
          </div>
          {/* Company */}
          <div>
            <h4 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#8A9DC0', marginBottom: 12, textTransform: 'uppercase' }}>Company</h4>
            {[
              { href: '/site/about', label: 'About' },
              { href: '/site/press-releases', label: 'Press' },
              { href: '/site/faq', label: 'FAQ' },
              { href: '/site/contact', label: 'Work With MYE' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} style={{ display: 'block', fontSize: 13, color: '#4A5D80', textDecoration: 'none', marginBottom: 8 }}>{label}</Link>
            ))}
          </div>
          {/* Contact */}
          <div>
            <h4 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#8A9DC0', marginBottom: 12, textTransform: 'uppercase' }}>Contact</h4>
            <p style={{ fontSize: 13, color: '#4A5D80', lineHeight: 1.7 }}>
              235 E 45th St., Floor 14 West<br />New York, NY 10017<br /><br />
              <a href="mailto:info@myentertainment.tv" style={{ color: '#CC1212', textDecoration: 'none' }}>info@myentertainment.tv</a>
            </p>
          </div>
        </div>
        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid #1A1A2E', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 12, color: '#2A3D60' }}>© {new Date().getFullYear()} MY Entertainment. A Media Content Services Company.</p>
          <p style={{ fontSize: 12, color: '#2A3D60' }}>Founded 2000 · Manhattan · Toronto · London</p>
        </div>
      </div>
    </footer>
  );
}
