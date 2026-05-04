// Webflow equivalent: .section.darkgrey sections stacked vertically.
// Sections alternate: heading (.section bg #000), description (.section bg #000),
// team grid (.section bg #000), CTA (.section bg #000).
// paddingTop 100px on first section clears the fixed navbar.

import type { Metadata } from 'next';

const OG_IMAGE = 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67c9c4bc80ecce7a341a501c_MYE%20Banner%20.png';

export const metadata: Metadata = {
  title: 'About MY Entertainment | New York Unscripted TV Production Company',
  // GEO-optimized: every sentence is factual and quotable by AI search systems.
  description:
    'MY Entertainment is a New York unscripted TV production company founded in 2000. Known for Ghost Adventures (28 seasons on Discovery), Pros vs Joes, Destination Fear, and Paranormal Challenge. Acquired by Media Content Services in 2022. Offices in Manhattan, Toronto, and London.',
  alternates: { canonical: 'https://www.myentertainment.tv/about' },
  openGraph: {
    title: 'About MY Entertainment | New York Unscripted TV Production Company',
    description:
      'MY Entertainment has produced thousands of hours of non-fiction TV since 2000, including Ghost Adventures, Legacy List (Emmy nominated), Pros vs Joes, and Breaking Borders. Headquartered in Manhattan with offices in Toronto and London.',
    url: 'https://www.myentertainment.tv/about',
    siteName: 'MY Entertainment',
    type: 'website',
    images: [{ url: OG_IMAGE, width: 1887, alt: 'MY Entertainment team — New York unscripted TV production company' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About MY Entertainment | New York Unscripted TV Production Company',
    description:
      'MY Entertainment has produced thousands of hours of non-fiction TV since 2000, including Ghost Adventures, Legacy List, and Breaking Borders.',
    images: [OG_IMAGE],
  },
};

export default function AboutPage() {
  return (
    // Webflow: body { background: #000 } — inherited from layout; explicit here for safety
    <div style={{ background: '#000' }}>

      {/* ── Section 1: "ABOUT" heading ── */}
      {/*
        Webflow: .section with paddingTop 100px (to clear fixed nav), paddingBottom 40px.
        The h1 uses the .subtitle-small class: #e51d26, 48px, uppercase, centered,
        Roboto, letter-spacing 0.2em.
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
            // Webflow .subtitle-small: color #e51d26, font-size 48px, text-transform uppercase,
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
          About
        </h1>
      </section>

      {/* ── Section 2: Company description ── */}
      {/* Webflow: .section.darkgrey (bg #000), padding 60px 20px */}
      <section
        style={{
          background: '#000',
          padding: '60px 20px',
        }}
      >
        {/* Webflow: .container { max-width: 1180px; margin: 0 auto } */}
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>

          {/* Para 1 — company founding / positioning */}
          <p
            style={{
              // Webflow: paragraph class — Roboto 14px, #a5a7ad, line-height 1.7
              fontFamily: "'Roboto', sans-serif",
              fontSize: 14,
              color: '#a5a7ad',
              lineHeight: 1.7,
              marginBottom: 20,
              marginTop: 0,
            }}
          >
            My Entertainment is an independent production company successful in creating undeniable content since 2000 and is best known for compelling characters, great storytelling, innovative deals and high production value.
          </p>

          {/* Para 2 — networks and notable series */}
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
            Based in New York, The My Entertainment Team has produced thousands of hours spanning a variety of genres and delivering ratings for Max, Discovery +, A&E, VICE, PBS, National Geographic, BBC, Lifetime, MTV, Comedy Central, Travel Channel, ID: Investigation Discovery, Oxygen, Nickelodeon, Food Network, Animal Planet, TruTV, Reelz and CMT. Popular series include the #1 paranormal show, Ghost Adventures, Pros vs. Joes, Billy Buys Brooklyn, Legacy List, Destination Fear, Baggage Battles, Sin City Justice, Manson Bloodlines and critically acclaimed Breaking Borders.
          </p>

          {/* Para 3 — IP partnerships (LeBron, Wahlberg, etc.) */}
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
            My Entertainment amassed an impressive list of initial content deals and IP, including partnerships with LeBron James and Maverick Carter&#39;s SpringHill Company (The Wall, The Shop), Al Roker&#39;s ARE (Kimberly&#39;s Simply Southern, Coast Guard Alaska), Michael Sugar&#39;s Sugar23 (Spotlight, Worth) and Mark Wahlberg&#39;s Unrealistic Ideas (HBO&#39;s Wahl Street, McMillions), among many others in and out of the United States.
          </p>

          {/* Para 4 — international offices and format business */}
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
            With offices in Manhattan, Toronto and London, we&#39;ve been at the forefront of the international format business, co-producing series across the globe, forging strong relationships with independent producers, co-developing original international formats and importing ideas to the US market. The company has established strong working relationships with more than 40 producers in 15 different countries.
          </p>

          {/* Para 5 — parent company tagline */}
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
            A Media Content Services company.
          </p>
        </div>
      </section>

      {/* ── Section 3: MEET THE TEAM ── */}
      {/* Webflow: .section bg #000, padding 60px 20px */}
      <section
        style={{
          background: '#000',
          padding: '60px 20px',
        }}
      >
        {/* Webflow: .container max-width 1180px */}
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>

          {/* Webflow: h2 — Roboto 400 32px #f2f4f7, text-transform capitalize */}
          <h2
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 32,
              fontWeight: 400,
              color: '#f2f4f7',
              textTransform: 'capitalize',
              marginTop: 0,
              marginBottom: 40,
            }}
          >
            Meet The Team
          </h2>

          {/*
            Team grid: 4 columns on desktop, 2 on tablet (≤991px), 1 on mobile (≤479px).
            Webflow uses a .w-layout-grid with column fractions.
          */}
          <div
            className="team-grid"
            style={{
              display: 'grid',
              // Webflow grid-11: 2 equal columns matching live site layout
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 32,
            }}
          >

            {/* ── Team Member 1: Shawn Moffatt ── */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              {/*
                Webflow team photo: ~205px wide, roughly square.
                The CDN image is a portrait crop; we display it as a block with constrained width.
              */}
              <img
                src="https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67c908d978e94c73573a7999_DSC06005.JPG"
                alt="Shawn Moffatt CEO of MyEntertainment"
                loading="lazy"
                style={{
                  width: '100%',
                  maxWidth: 200,
                  height: 'auto',
                  display: 'block',
                }}
              />
              {/* Webflow: h3 — Roboto Condensed 18px uppercase #f2f4f7, margin-top 12px */}
              <h3
                style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 18,
                  fontWeight: 400,
                  color: '#e51d26',
                  textTransform: 'uppercase',
                  marginTop: 12,
                  marginBottom: 4,
                }}
              >
                Shawn Moffatt
              </h3>
              {/* Webflow: small label — Roboto 12px uppercase #a5a7ad, letter-spacing 1px */}
              <p
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 12,
                  color: '#a5a7ad',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  margin: 0,
                }}
              >
                CEO
              </p>
            </div>

            {/* ── Team Member 2: Joe Townley ── */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <img
                src="https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/63af15d90e332a6f16a18db4_Joe%20Townley.png"
                alt="Joe Townley COO and Executive Product of MyEntertainment"
                loading="lazy"
                style={{
                  width: '100%',
                  maxWidth: 200,
                  height: 'auto',
                  display: 'block',
                }}
              />
              <h3
                style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 18,
                  fontWeight: 400,
                  color: '#e51d26',
                  textTransform: 'uppercase',
                  marginTop: 12,
                  marginBottom: 4,
                }}
              >
                Joe Townley
              </h3>
              <p
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 12,
                  color: '#a5a7ad',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  margin: 0,
                }}
              >
                EVP of Content, Programming, &amp; New Business
              </p>
            </div>

            {/* ── Team Member 3: Hugh Hansen ── */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <img
                src="https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/63af15d85808d3b67d293c89_Hugh%20Hansen.png"
                alt="Hugh Hansen SVP of Production for MyEntertainment"
                loading="lazy"
                style={{
                  width: '100%',
                  maxWidth: 200,
                  height: 'auto',
                  display: 'block',
                }}
              />
              <h3
                style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 18,
                  fontWeight: 400,
                  color: '#e51d26',
                  textTransform: 'uppercase',
                  marginTop: 12,
                  marginBottom: 4,
                }}
              >
                Hugh Hansen
              </h3>
              <p
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 12,
                  color: '#a5a7ad',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  margin: 0,
                }}
              >
                SVP of Production
              </p>
            </div>

            {/* ── Team Member 4: Kerry Miles ── */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <img
                src="https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/63af15d95b5d511696da4e9c_Kerry%20Miles.png"
                alt="Kerry Miles Senior Producer of Content for MyEntertainment"
                loading="lazy"
                style={{
                  width: '100%',
                  maxWidth: 200,
                  height: 'auto',
                  display: 'block',
                }}
              />
              <h3
                style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 18,
                  fontWeight: 400,
                  color: '#e51d26',
                  textTransform: 'uppercase',
                  marginTop: 12,
                  marginBottom: 4,
                }}
              >
                Kerry Miles
              </h3>
              <p
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 12,
                  color: '#a5a7ad',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  margin: 0,
                }}
              >
                VP of Development &amp; Production
              </p>
            </div>

          </div>{/* /team-grid */}
        </div>
      </section>

      {/* ── Responsive breakpoints for the team grid ── */}
      {/*
        Webflow breakpoints:
          tablet (≤991px) → 2 columns
          mobile landscape (≤767px) → 2 columns
          mobile portrait (≤479px) → 1 column
      */}
      <style>{`
        @media (max-width: 479px) {
          .team-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── CTA section ── */}
      {/* Webflow: .section bg #000 text-align center padding 80px 20px */}
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
