// Webflow equivalent: .section with full-width hero image, then .section.darkgrey content,
// then CTA section. The live site uses a centered image container and paragraph text blocks.
// paddingTop 100px on the first section clears the fixed navbar.

import type { Metadata } from 'next';

const OG_IMAGE = 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/63deb3cc3700f02d45ba6814_international%20header.png';

export const metadata: Metadata = {
  title: 'International TV Co-Production | MyEntertainment',
  description: 'MyEntertainment partners with 40+ production companies across 15 countries. Offices in New York, Toronto, and London. Bringing international formats to US audiences since 2000.',
  alternates: { canonical: 'https://www.myentertainment.tv/international' },
  openGraph: {
    title: 'International TV Co-Production | MyEntertainment',
    description: 'MyEntertainment partners with 40+ production companies across 15 countries. Offices in New York, Toronto, and London.',
    url: 'https://www.myentertainment.tv/international',
    siteName: 'MyEntertainment',
    type: 'website',
    images: [{ url: OG_IMAGE, width: 940, height: 470, alt: 'MyEntertainment international co-production partnerships' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'International TV Co-Production | MyEntertainment',
    description: '40+ production partners in 15 countries. Offices in New York, Toronto, and London.',
    images: [OG_IMAGE],
  },
};

export default function InternationalPage() {
  return (
    // Webflow: body bg #000 — inherited from layout, explicit here for safety
    <div style={{ background: '#000' }}>

      {/* ── Section 1: Hero image ── */}
      {/*
        Webflow: .section with paddingTop 100px to clear the fixed nav.
        The image is centered using auto margins — it's not full-bleed, but
        displayed at native width (940px) centered within the container.
      */}
      <section
        style={{
          paddingTop: 100,
          paddingBottom: 0,
          paddingLeft: 20,
          paddingRight: 20,
          background: '#000',
          textAlign: 'center',
        }}
      >
        <img
          src="https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/63deb3cc3700f02d45ba6814_international%20header.png"
          alt="myentertainment productions international programming"
          // Native dimensions from scrape: 940×470
          width={940}
          height={470}
          style={{
            // Centers the image; maxWidth 100% prevents overflow on small screens
            maxWidth: '100%',
            height: 'auto',
            display: 'inline-block',
          }}
        />
      </section>

      {/* ── Section 2: International content / copy ── */}
      {/* Webflow: .section bg #000, padding 60px 20px */}
      <section
        style={{
          background: '#000',
          padding: '60px 20px',
        }}
      >
        {/* Webflow: .container max-width 1180px centered */}
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>

          {/* Page H1 — targets "international TV co-production" keyword cluster */}
          <h1
            style={{
              fontFamily: "'Oswald', sans-serif",
              fontSize: 36,
              fontWeight: 400,
              color: '#f2f4f7',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginTop: 0,
              marginBottom: 32,
            }}
          >
            International Co-Production
          </h1>

          {/* Para 1 — opening statement */}
          <p
            style={{
              // Webflow paragraph: Roboto 14px, #a5a7ad, line-height 1.7
              fontFamily: "'Roboto', sans-serif",
              fontSize: 14,
              color: '#a5a7ad',
              lineHeight: 1.7,
              marginBottom: 20,
              marginTop: 0,
            }}
          >
            Over the years, New York-based My Entertainment has built strong relationships with leading international producers around the world.
          </p>

          {/* Para 2 — strategic rationale for international focus */}
          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 14,
              color: '#a5a7ad',
              lineHeight: 1.7,
              marginBottom: 20,
              marginTop: 0,
            }}
          >
            While many U.S. production companies focus almost exclusively on serving the domestic market—the world&#39;s largest—My Entertainment has taken a different approach. Recognizing that U.S. producers often retain fewer rights compared to counterparts in markets like the UK, we&#39;ve strategically cultivated global partnerships to expand our rights ownership and bring fresh, international formats to the U.S. audience.
          </p>

          {/* Para 3 — mutual benefit model */}
          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 14,
              color: '#a5a7ad',
              lineHeight: 1.7,
              marginBottom: 20,
              marginTop: 0,
            }}
          >
            This model benefits both sides: international producers gain a direct pathway into the highly competitive U.S. market, while My Entertainment retains greater control over intellectual property worldwide.
          </p>

          {/* Para 4 — offices and co-development */}
          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 14,
              color: '#a5a7ad',
              lineHeight: 1.7,
              marginBottom: 20,
              marginTop: 0,
            }}
          >
            Our commitment to global collaboration is reflected in our offices in Canada and the UK. our international production partners, allow us to explore co-development opportunities, and secure additional funding for original projects.
          </p>

          {/* Para 5 — scale / reach summary */}
          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 14,
              color: '#a5a7ad',
              lineHeight: 1.7,
              marginBottom: 0,
              marginTop: 0,
            }}
          >
            To date, My Entertainment has co-created, developed, and funded original content with more than 40 companies across 15 countries. We have co-productions currently airing.
          </p>

        </div>
      </section>

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
