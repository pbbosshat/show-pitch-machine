// /work-with-us/ — B2B landing page for production partnerships and co-productions.
//
// Target audience: network executives, brands, IP holders, and international producers
// looking for an experienced NYC unscripted production partner.
//
// SEO intent: "unscripted TV production company NYC", "co-production partnerships",
// "work with a production company". The page is the new destination for the
// "WORK WITH MYE" nav CTA (previously /contact, now /work-with-us).
//
// Schema: Organization (company identity) + WebPage (page metadata) via JSON-LD.
// ContactForm component at the bottom converts B2B visitors directly.

import type { Metadata } from 'next';
import ContactForm from '@/app/(public)/contact/ContactForm';
import SubmissionDownloadLink from '@/app/(public)/contact/SubmissionDownloadLink';
import { JsonLd } from '@/components/site/JsonLd';

const OG_IMAGE = 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67c9c4bc80ecce7a341a501c_MYE%20Banner%20.png';

export const metadata: Metadata = {
  title: 'Work with MyEntertainment | Production Company NYC',
  // 155 chars — within the 150-160 char target for meta descriptions
  description:
    'Partner with MyEntertainment, a New York unscripted production company. Co-productions, branded content, international formats, and network deals since 2000.',
  alternates: { canonical: 'https://www.myentertainment.tv/work-with-us' },
  openGraph: {
    title: 'Work with MyEntertainment | Production Company NYC',
    description:
      'Partner with MyEntertainment on unscripted TV, documentary, and branded content. 40+ shows across Discovery, PBS, A&E, and 28+ networks. Based in New York.',
    url: 'https://www.myentertainment.tv/work-with-us',
    siteName: 'MyEntertainment',
    type: 'website',
    images: [{ url: OG_IMAGE, width: 1887, alt: 'Work with MyEntertainment — NYC unscripted production company' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Work with MyEntertainment | Production Company NYC',
    description: 'Co-produce unscripted TV, documentary, and branded content with MyEntertainment. Based in New York with offices in Toronto and London.',
    images: [OG_IMAGE],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Network logos — reused from the same Webflow CDN URLs as the show pages.
// These are the primary distribution partners shown throughout the site.
//
// IMPORTANT — two properties of these source PNGs drive the render styles below:
//   1. The artwork is PURE BLACK on a transparent background (verified: every
//      non-transparent pixel has luminance 0). They are therefore invisible on
//      this page's dark background without `filter: invert(1)`.
//   2. Every file is a 400x400 SQUARE canvas holding a short, wide wordmark —
//      the artwork fills as little as 14% of it (Nickelodeon is 395x58). Sizing
//      by height collapses the wordmark to a few pixels tall, so these must be
//      sized by WIDTH with height auto, exactly as the homepage does.
// Both are matched to the "AS SEEN ON" grid in app/(public)/page.tsx.
// ─────────────────────────────────────────────────────────────────────────────
const NETWORK_LOGOS = [
  { src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8853eb68c398dcf2ac_DISCOVERY%20CHANNEL.png', alt: 'Discovery Channel' },
  { src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b2c6bbe853695d916_travel%20channel.png', alt: 'Travel Channel' },
  { src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8aed58056074c5cde7_PBS.png', alt: 'PBS' },
  { src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8853eb6890cddcf2ae_FOOD%20NETWORK.png', alt: 'Food Network' },
  { src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8a92aded6fa14432e3_OXYGEN.png', alt: 'Oxygen' },
  { src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e88d44a43a5c5a55109_investigation%20discovery.png', alt: 'Investigation Discovery' },
  { src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8a94d7ef1ce62aa6bc_NICKELODEON.png', alt: 'Nickelodeon' },
  { src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8834ed9efe05c943dc_COMEDY%20CENTRAL.png', alt: 'Comedy Central' },
  { src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8aa7bb587d184d554b_national%20geographic.png', alt: 'National Geographic' },
  { src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e9e956e474e3f871d0ac4_bbc.png', alt: 'BBC' },
];

// ─────────────────────────────────────────────────────────────────────────────
// JSON-LD schemas
// ─────────────────────────────────────────────────────────────────────────────
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'MyEntertainment',
  alternateName: 'MY Entertainment',
  url: 'https://www.myentertainment.tv',
  logo: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8ebea7bb58375c4d58c7_My%20Entertainment%20Square%20(Dark%20Background%20-%20Gradient).png',
  description:
    'Independent New York unscripted TV production company founded in 2000. Known for Ghost Adventures, Pros vs Joes, Legacy List, and 40+ shows across major US and international networks.',
  foundingDate: '2000',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'New York',
    addressRegion: 'NY',
    addressCountry: 'US',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'info@myentertainment.tv',
    contactType: 'business',
  },
  sameAs: [
    'https://www.myentertainment.tv/about',
  ],
};

const webPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Work with MyEntertainment | Production Company NYC',
  url: 'https://www.myentertainment.tv/work-with-us',
  description:
    'Partner with MyEntertainment on unscripted TV, documentary, and branded content productions.',
  inLanguage: 'en-US',
  isPartOf: {
    '@type': 'WebSite',
    name: 'MyEntertainment',
    url: 'https://www.myentertainment.tv',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared inline styles — match the Webflow design system used throughout the site
// ─────────────────────────────────────────────────────────────────────────────
const bodyText: React.CSSProperties = {
  fontFamily: "'Roboto', sans-serif",
  fontSize: 14,
  color: '#a5a7ad',
  lineHeight: 1.7,
  marginBottom: 16,
  marginTop: 0,
};

const sectionHeading: React.CSSProperties = {
  fontFamily: "'Roboto Condensed', sans-serif",
  fontSize: 24,
  fontWeight: 400,
  color: '#f2f4f7',
  textTransform: 'uppercase',
  marginTop: 0,
  marginBottom: 20,
};

const container: React.CSSProperties = {
  maxWidth: 1180,
  margin: '0 auto',
  padding: '0 20px',
};

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkWithUsPage() {
  return (
    <div style={{ background: '#000' }}>
      <JsonLd data={organizationSchema} />
      <JsonLd data={webPageSchema} />

      {/* ── Section 1: Page heading ── */}
      {/* paddingTop 100px clears the fixed navbar, consistent with other public pages */}
      <section
        style={{
          paddingTop: 100,
          paddingBottom: 40,
          paddingLeft: 20,
          paddingRight: 20,
          background: '#000',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            // Webflow .subtitle-small: #e51d26, 48px, uppercase, Roboto, letter-spacing 0.2em
            fontFamily: "'Roboto', sans-serif",
            fontSize: 48,
            fontWeight: 400,
            color: '#e51d26',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            textAlign: 'center',
            marginTop: 0,
            marginBottom: 16,
          }}
        >
          Work with MyEntertainment
        </h1>
        <p
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 14,
            color: '#a5a7ad',
            textAlign: 'center',
            margin: 0,
            maxWidth: 640,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Partner with one of New York&rsquo;s most experienced independent production companies
          — 25+ years of unscripted, documentary, and branded content across every major network.
        </p>
      </section>

      {/* ── Section 2: Who we are ── */}
      <section style={{ background: '#000', padding: '60px 20px', borderTop: '1px solid #1a1a1a' }}>
        <div style={container}>
          <h2 style={sectionHeading}>Who We Are</h2>
          <p style={bodyText}>
            MyEntertainment is an independent New York production company founded in 2000.
            We have produced thousands of hours of non-fiction television spanning paranormal,
            true crime, sports, lifestyle, food, and documentary formats. Our work has aired
            on Discovery, Travel Channel, PBS, A&amp;E, Investigation Discovery, Oxygen, Food Network,
            National Geographic, BBC, Nickelodeon, Comedy Central, and 20+ additional US and
            international networks.
          </p>
          <p style={bodyText}>
            We are best known for compelling characters, great storytelling, innovative deals,
            and high production value. Notable series include Ghost Adventures (28 seasons on
            Discovery), Pros vs Joes, Legacy List (Emmy nominated), Destination Fear, Baggage
            Battles, Sin City Justice, and Peabody-recognized Breaking Borders.
          </p>
          <p style={bodyText}>
            With offices in Manhattan, Toronto, and London, we have been at the forefront of
            the international format business — co-producing series across the globe, forging
            strong relationships with independent producers, and importing ideas to the US market.
            We have established working relationships with more than 40 producers in 15 countries.
            MyEntertainment is a Media Content Services company.
          </p>
        </div>
      </section>

      {/* ── Section 3: Our networks ── */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <h2 style={sectionHeading}>Networks We Deliver For</h2>
          <p style={{ ...bodyText, marginBottom: 32 }}>
            We have active relationships with buyers at every major US network and several leading
            international broadcasters. If your project needs a home, we know the right doors.
          </p>
          {/* Responsive logo grid — wraps naturally, matching the homepage grid */}
          <div className="work-with-us-logos">
            {NETWORK_LOGOS.map((logo) => (
              <img
                key={logo.src}
                src={logo.src}
                alt={logo.alt}
                width={120}
                loading="lazy"
                style={{
                  display: 'block',
                  height: 'auto',
                  // The source PNGs are pure-black artwork on transparency (see note
                  // above), so they render as invisible smudges on this dark section
                  // without inverting them to white first.
                  filter: 'invert(1)',
                  opacity: 0.85,
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: What we do ── */}
      <section style={{ background: '#000', padding: '60px 20px', borderTop: '1px solid #1a1a1a' }}>
        <div style={container}>
          <h2 style={sectionHeading}>What We Do</h2>
          <div
            className="work-with-us-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 40,
            }}
          >
            {/* Unscripted & Reality */}
            <div>
              <h3
                style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 16,
                  fontWeight: 400,
                  color: '#e51d26',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginTop: 0,
                  marginBottom: 12,
                }}
              >
                Unscripted &amp; Reality
              </h3>
              <p style={bodyText}>
                Competition formats, social experiments, game shows, and character-driven series.
                We develop both original IP and adapt proven international formats for US networks.
                Ghost Adventures is our flagship — 28 seasons and counting.
              </p>
            </div>

            {/* Documentary */}
            <div>
              <h3
                style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 16,
                  fontWeight: 400,
                  color: '#e51d26',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginTop: 0,
                  marginBottom: 12,
                }}
              >
                Documentary
              </h3>
              <p style={bodyText}>
                From investigative true crime (The Jane Doe Murders, Sin City Justice) to access
                documentary (Red Alaska, Sherman&rsquo;s Warriors) to prestige journalism (Breaking
                Borders). We bring rigorous storytelling and real access to every project.
              </p>
            </div>

            {/* Branded &amp; Co-Production */}
            <div>
              <h3
                style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 16,
                  fontWeight: 400,
                  color: '#e51d26',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginTop: 0,
                  marginBottom: 12,
                }}
              >
                Branded &amp; Co-Production
              </h3>
              <p style={bodyText}>
                We have partnered with brands including Stolichnaya on serialized branded content,
                and co-produced with international partners in France, Germany, Spain, Australia,
                the Netherlands, Sweden, Finland, and the UK. If you have IP, a talent relationship,
                or a distribution deal — we can help get it made.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 5: Case studies by genre ── */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <h2 style={sectionHeading}>Case Studies by Genre</h2>

          {/* Paranormal */}
          <div style={{ marginBottom: 40 }}>
            <h3
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: 18,
                fontWeight: 500,
                color: '#f2f4f7',
                marginTop: 0,
                marginBottom: 8,
              }}
            >
              Paranormal — Ghost Adventures (Travel Channel, 28 seasons)
            </h3>
            <p style={bodyText}>
              Started as an independent documentary feature, Ghost Adventures became the
              #1 paranormal show in cable TV history. We developed the format, produced
              every season, and expanded it into five spin-off series (Destination Fear,
              Ghost Adventures: Live, Screaming Room, Aftershocks, Serial Killer Spirits,
              Haunted Museum Live). The franchise demonstrates our ability to build
              long-running IP from a single compelling idea.
            </p>
          </div>

          {/* True Crime */}
          <div style={{ marginBottom: 40 }}>
            <h3
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: 18,
                fontWeight: 500,
                color: '#f2f4f7',
                marginTop: 0,
                marginBottom: 8,
              }}
            >
              True Crime — Sin City Justice &amp; The Jane Doe Murders (ID, Oxygen)
            </h3>
            <p style={bodyText}>
              Sin City Justice delivered unprecedented access to the Las Vegas District
              Attorney&rsquo;s Office for a real-time look at high-profile prosecutions.
              The Jane Doe Murders brought attention to unidentified victims on Oxygen.
              Both series show our ability to negotiate institutional access and produce
              sensitive subject matter with journalistic integrity.
            </p>
          </div>

          {/* Sports */}
          <div style={{ marginBottom: 40 }}>
            <h3
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: 18,
                fontWeight: 500,
                color: '#f2f4f7',
                marginTop: 0,
                marginBottom: 8,
              }}
            >
              Sports — Pros vs Joes (Spike TV, 5 seasons)
            </h3>
            <p style={bodyText}>
              We cast and produced five seasons of Pros vs Joes — one of the first shows
              to put real sports fans against professional athletes on camera. Guest athletes
              included Jerry Rice, Dennis Rodman, Roy Jones Jr., Michael Irvin, and Hakeem
              Olajuwon. The show ran for five seasons on Spike, proving our ability to
              negotiate talent deals and deliver high-energy competition formats.
            </p>
          </div>

          {/* International Format */}
          <div>
            <h3
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: 18,
                fontWeight: 500,
                color: '#f2f4f7',
                marginTop: 0,
                marginBottom: 8,
              }}
            >
              International Format — Pregnant &amp; Platonic (8 country format)
            </h3>
            <p style={bodyText}>
              Pregnant &amp; Platonic is a social experiment format co-created with Israeli
              producer Assaf Gil that has been optioned in France, Germany, Spain, Italy,
              Australia, Sweden, Finland, and the UK. It is an example of our ability to
              develop original formats that travel globally and attract interest from
              major international broadcasters.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 6: Capabilities deck download ── */}
      <section style={{ background: '#000', padding: '60px 20px', borderTop: '1px solid #1a1a1a' }}>
        <div style={container}>
          <h2 style={sectionHeading}>Capabilities Deck</h2>
          <p style={bodyText}>
            Want a comprehensive overview of our portfolio, production capabilities, and current
            development slate? Download our capabilities deck below, then reach out via the
            contact form to start a conversation.
          </p>
          {/*
            SubmissionDownloadLink reuses the same 'use client' wrapper as the contact page
            download, fires the same download_epk GA4 Key Event, and points at the same
            PDF. Reusing the pattern keeps GA4 event taxonomy clean.
          */}
          <SubmissionDownloadLink
            href="/submission-release-form.pdf"
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 14,
              color: '#e02027',
              textDecoration: 'underline',
            }}
          >
            Download Capabilities &amp; Submission Deck (PDF)
          </SubmissionDownloadLink>
        </div>
      </section>

      {/* ── Section 7: Contact form CTA ── */}
      <section style={{ background: '#111', padding: '60px 20px', borderTop: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 20px' }}>
          <h2
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 32,
              fontWeight: 400,
              color: '#f2f4f7',
              textTransform: 'capitalize',
              marginTop: 0,
              marginBottom: 8,
              textAlign: 'center',
            }}
          >
            Let&rsquo;s Work Together
          </h2>
          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 14,
              color: '#a5a7ad',
              textAlign: 'center',
              marginBottom: 32,
              marginTop: 0,
              lineHeight: 1.7,
            }}
          >
            Tell us about your project, format, IP, or partnership idea.
            Someone from our development team will be in touch.
          </p>
          {/*
            Reuse the existing ContactForm component — it posts to /api/contact
            which persists to the contact_leads table and fires a notification email.
            No need to build a separate B2B form in V1.
          */}
          <ContactForm source="work-with-us" />
        </div>
      </section>

      {/* Responsive grid breakpoints */}
      <style>{`
        @media (max-width: 767px) {
          .work-with-us-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 768px) and (max-width: 991px) {
          .work-with-us-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }

        /* Network logo strip — mirrors .mye-logo-grid on the homepage */
        .work-with-us-logos {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 24px 32px;
        }
      `}</style>
    </div>
  );
}
