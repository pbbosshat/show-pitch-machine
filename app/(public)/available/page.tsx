// Webflow equivalent: .section.darkgrey with .container and a responsive image grid.
// The Available page on myentertainment.tv displays artwork images that contain the
// show title and description embedded in the graphic — no separate text labels needed.
// paddingTop 100px clears the fixed nav.

import type { Metadata } from 'next';

const OG_IMAGE = 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67c9c4bc80ecce7a341a501c_MYE%20Banner%20.png';

export const metadata: Metadata = {
  title: 'Available Titles | MyEntertainment',
  description: 'Available TV show titles from MyEntertainment for development, licensing, and international co-production. Browse formats ready for your market.',
  alternates: { canonical: 'https://www.myentertainment.tv/available' },
  openGraph: {
    title: 'Available Titles | MyEntertainment',
    description: 'TV show titles available for development, licensing, and international co-production from MyEntertainment.',
    url: 'https://www.myentertainment.tv/available',
    siteName: 'MyEntertainment',
    type: 'website',
    images: [{ url: OG_IMAGE, width: 1887, alt: 'MyEntertainment available titles' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Available Titles | MyEntertainment',
    description: 'TV show titles available for development, licensing, and international co-production.',
    images: [OG_IMAGE],
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Available show entries — images from the Webflow CDN.
// Each item carries a "large" image (used in the grid card) and an optional
// "thumb" for reference. Since the artwork contains show name + description,
// we render only the large image.
// ──────────────────────────────────────────────────────────────────────────────
const CDN = 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e';
const AVAILABLE_SHOWS = [
  {
    id: 'show-1',
    large: `${CDN}/69135d967002171d5a647bad_The%20Art%20of%20Murder%20.png`,
    alt: 'The Art of Murder — available title from MyEntertainment',
    vimeoUrl: 'https://vimeo.com/1116791591/20323057f9',
  },
  {
    id: 'show-2',
    large: `${CDN}/69135d954ceff19e50189482_Botched%20by%20A%20TikTok%20Doc.png`,
    alt: 'Botched by A TikTok Doc — available title from MyEntertainment',
    vimeoUrl: 'https://vimeo.com/1085697854/293bac573a',
  },
  {
    id: 'show-3',
    large: `${CDN}/67c9e60a3d655f35fff44d19_Michelle%20Renee.png`,
    alt: 'Michelle Renee — available title from MyEntertainment',
    vimeoUrl: 'https://vimeo.com/1020264275/55db128984',
  },
  {
    id: 'show-4',
    large: `${CDN}/67ca10121d2919ac535085cc_Screenshot%202025-03-06%20at%204.13.45%20PM.png`,
    alt: 'Available title from MyEntertainment',
    vimeoUrl: 'https://vimeo.com/993640958/2e9d74f1da',
  },
  {
    id: 'show-5',
    large: `${CDN}/67c9ec19ddb6a5c59357144c_Screenshot%202025-03-06%20at%201.40.21%20PM.png`,
    alt: 'Available title from MyEntertainment',
    vimeoUrl: 'https://vimeo.com/1014504642/460bb75ad2',
  },
  {
    id: 'show-6',
    large: `${CDN}/67c9eb45e42d97eecedf274f_Screenshot%202025-03-06%20at%201.36.50%20PM.png`,
    alt: 'Available title from MyEntertainment',
    vimeoUrl: 'https://vimeo.com/1010691070/4d09f2144a',
  },
  {
    id: 'show-7',
    large: `${CDN}/69135d95e837871818cf12c5_Storm%20Warriors.png`,
    alt: 'Storm Warriors — available title from MyEntertainment',
    vimeoUrl: 'https://vimeo.com/1058661997/d23befd589',
  },
  {
    id: 'show-8',
    large: `${CDN}/67c9fd7bd89ef81a97ad9cdc_Screenshot%202025-03-06%20at%202.54.32%20PM.png`,
    alt: 'Available title from MyEntertainment',
    vimeoUrl: 'https://vimeo.com/958547025/93220f9860',
  },
  {
    id: 'show-9',
    large: `${CDN}/67c9eaf2adc0918387bf9935_Give%20Me%20Shelter%20.png`,
    alt: 'Give Me Shelter — available title from MyEntertainment',
    vimeoUrl: 'https://vimeo.com/1052365375/913e7080e5',
  },
];

export default function AvailablePage() {
  return (
    // Webflow: body bg #000 — inherited from layout
    <div style={{ background: '#000' }}>

      {/* ── Section 1: "AVAILABLE NOW" heading ── */}
      {/*
        Webflow: .section with paddingTop 100px (fixed nav clearance), paddingBottom 40px.
        h1 uses .subtitle-small: #e51d26, 48px, uppercase, centered, Roboto, letter-spacing 0.2em
      */}
      <section
        style={{
          paddingTop: 100,
          paddingBottom: 40,
          paddingLeft: 20,
          paddingRight: 20,
          textAlign: 'center',
          background: '#000',
        }}
      >
        <h1
          style={{
            // .subtitle-small in Webflow: color #e51d26, font-size 48px, uppercase,
            // letter-spacing 0.2em, Roboto, text-align center
            fontFamily: "'Roboto', sans-serif",
            fontSize: 48,
            fontWeight: 400,
            color: '#e51d26',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            textAlign: 'center',
            margin: 0,
          }}
        >
          Available Now
        </h1>
      </section>

      {/* ── Section 2: Show artwork grid ── */}
      {/* Webflow: .section bg #000, padding 60px 20px */}
      <section
        style={{
          background: '#000',
          padding: '60px 20px',
        }}
      >
        {/* Webflow: .container max-width 1180px centered */}
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>

          {/*
            2-column grid on desktop, 1-column on mobile.
            Webflow uses .w-layout-grid with 2 equal columns.
            Each card is just the artwork image — no overlay text since the
            show title and description are baked into the image itself.
          */}
          <div
            className="available-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 24,
              marginBottom: 48,
            }}
          >
            {AVAILABLE_SHOWS.map((show) => {
              const inner = (
                <img
                  src={show.large}
                  alt={show.alt}
                  loading="lazy"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              );
              return show.vimeoUrl ? (
                <a
                  key={show.id}
                  href={show.vimeoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'block', overflow: 'hidden' }}
                >
                  {inner}
                </a>
              ) : (
                <div key={show.id} style={{ display: 'block', overflow: 'hidden' }}>
                  {inner}
                </div>
              );
            })}
          </div>

          {/* Contact note — Roboto 14px #a5a7ad, centered */}
          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 14,
              color: '#a5a7ad',
              lineHeight: 1.7,
              textAlign: 'center',
              margin: '0 auto',
            }}
          >
            Contact us to inquire about available titles:{' '}
            <a
              href="mailto:info@myentertainment.tv"
              style={{
                // Webflow: .get-started-link color (#e02027) used for inline email links too
                color: '#e02027',
                textDecoration: 'none',
              }}
            >
              info@myentertainment.tv
            </a>
          </p>

        </div>
      </section>

      {/* ── Responsive breakpoints ── */}
      {/*
        Webflow mobile portrait (≤479px): collapse to single column
        Webflow tablet (≤991px): still 2 columns — matches Webflow behavior
      */}
      <style>{`
        @media (max-width: 479px) {
          .available-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── CTA section ── */}
      {/* Webflow: .section bg #000 padding 80px 20px text-align center */}
      <section
        style={{
          padding: '80px 20px',
          textAlign: 'center',
          background: '#000',
          borderTop: '1px solid #1a1a1a',
        }}
      >
        {/* Webflow: h2 32px Roboto 400 #f2f4f7 capitalize */}
        <h2
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 32,
            fontWeight: 400,
            color: '#f2f4f7',
            textTransform: 'capitalize',
            marginBottom: 16,
            marginTop: 0,
          }}
        >
          Ready To Work With The Best?
        </h2>

        {/* Webflow: paragraph 14px Roboto #a5a7ad line-height 1.7 */}
        <p
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 14,
            color: '#a5a7ad',
            lineHeight: 1.7,
            marginBottom: 28,
            marginTop: 0,
          }}
        >
          Reach out to learn more about how we can make great content together.
        </p>

        {/* Webflow: .get-started-link — #e02027, uppercase, weight 500, Roboto Condensed, no underline */}
        <a
          href="/contact"
          style={{
            fontFamily: "'Roboto Condensed', sans-serif",
            fontSize: 14,
            fontWeight: 500,
            color: '#e02027',
            textTransform: 'uppercase',
            textDecoration: 'none',
            letterSpacing: '0.05em',
          }}
        >
          CONTACT US &nbsp;&#10095;
        </a>
      </section>

    </div>
  );
}
