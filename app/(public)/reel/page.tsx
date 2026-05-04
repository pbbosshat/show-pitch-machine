// Webflow equivalent: .section.darkgrey + .container with YouTube embed
// The live site uses a full-width dark section with a centered 16:9 embed container.
// paddingTop 100px clears the fixed ~64px navbar with room to breathe.

import type { Metadata } from 'next';

const OG_IMAGE = 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67c9c4bc80ecce7a341a501c_MYE%20Banner%20.png';

export const metadata: Metadata = {
  title: 'Sizzle Reel | MyEntertainment',
  description: 'Watch the MyEntertainment sizzle reel — highlights from Ghost Adventures, Legacy List, Destination Fear, Breaking Borders, and more award-winning productions.',
  alternates: { canonical: 'https://www.myentertainment.tv/reel' },
  openGraph: {
    title: 'Sizzle Reel | MyEntertainment',
    description: 'Watch highlights from Ghost Adventures, Legacy List, Breaking Borders, and more MyEntertainment productions.',
    url: 'https://www.myentertainment.tv/reel',
    siteName: 'MyEntertainment',
    type: 'video.other',
    images: [{ url: OG_IMAGE, width: 1887, alt: 'MyEntertainment sizzle reel' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sizzle Reel | MyEntertainment',
    description: 'Watch highlights from Ghost Adventures, Legacy List, Breaking Borders, and more MyEntertainment productions.',
    images: [OG_IMAGE],
  },
};

const videoSchema = {
  '@context': 'https://schema.org',
  '@type': 'VideoObject',
  name: 'MyEntertainment Sizzle Reel',
  description: 'Highlights from MyEntertainment productions including Ghost Adventures, Legacy List, Destination Fear, Breaking Borders, and more award-winning non-fiction series.',
  thumbnailUrl: 'https://img.youtube.com/vi/OjQMdG4ewxo/maxresdefault.jpg',
  embedUrl: 'https://www.youtube.com/embed/OjQMdG4ewxo',
  uploadDate: '2023-01-01',
  publisher: {
    '@type': 'Organization',
    name: 'MyEntertainment',
    url: 'https://www.myentertainment.tv',
  },
};

export default function ReelPage() {
  return (
    <div style={{ background: '#000', minHeight: '100vh' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoSchema) }} />

      {/* Clears the fixed nav */}
      <div style={{ paddingTop: 64 }} />

      {/* Visually hidden H1 — required for SEO; reel page has no visible page title */}
      <h1 style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
        MyEntertainment Sizzle Reel
      </h1>

      {/* Full-width YouTube embed */}
      <section style={{ padding: 0 }}>
        <div style={{ width: '100%' }}>
          {/* 16:9 aspect ratio — padding-top trick */}
          <div
            style={{
              position: 'relative',
              paddingTop: '56.25%',
              height: 0,
              overflow: 'hidden',
              background: '#000',
            }}
          >
            <iframe
              src="https://www.youtube.com/embed/OjQMdG4ewxo?rel=0&controls=1&autoplay=0&mute=0&start=0"
              title="MyEntertainment Sizzle Reel"
              // Webflow embed uses width=940 height=506 as a 16:9 base; we override with CSS
              width="100%"
              height="506"
              allowFullScreen
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              style={{
                // Absolute fill so the iframe occupies the full padded container
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
          </div>
        </div>
      </section>

      {/* ── CTA section — appears on every public page ── */}
      {/* Webflow: .section with bg #000, text-align center, padding 80px 20px */}
      <section
        style={{
          padding: '80px 20px',
          textAlign: 'center',
          background: '#000',
          // Webflow: subtle top border separates the CTA from the content above
          borderTop: '1px solid #1a1a1a',
        }}
      >
        {/* Webflow: h2 — Roboto 400 32px #f2f4f7, text-transform capitalize */}
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

        {/* Webflow: paragraph — Roboto 14px #a5a7ad, line-height 1.7 */}
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

        {/*
          Webflow: .get-started-link — color #e02027, uppercase, font-weight 500,
          Roboto Condensed, no underline
        */}
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
