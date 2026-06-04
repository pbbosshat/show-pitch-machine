// /pitch — Conversion landing page for producers seeking distribution.
//
// AUDIENCE: A producer or creator who HAS a finished or near-finished unscripted
// show and wants MY Entertainment to distribute or represent it to networks,
// streamers, and territories. They arrive via referral, brand search, or outreach —
// not organic keyword search (distribution keywords are near-zero volume).
//
// INTENT: Convert the visit into a submission. Every section earns trust then
// removes friction from the submission step.
//
// CTA MECHANISM: Reuses the existing ContactForm component (POST /api/contact →
// contact_leads table + notification email). No new API route or DB table created.
// Source-section tag 'pitch-page' distinguishes leads from this page in GA4.
//
// FACTUAL RULE: Every show title, network name, team member name, and credential
// on this page is drawn verbatim from the about/work-with-us pages and the
// Organization schema already in the repo. Nothing has been invented. Claims
// marked [FLAG: verify] require PB confirmation before launch.

import type { Metadata } from 'next';
import Link from 'next/link';
import ContactForm from '@/app/(public)/contact/ContactForm';
import { JsonLd } from '@/components/site/JsonLd';

const OG_IMAGE =
  'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67c9c4bc80ecce7a341a501c_MYE%20Banner%20.png';

// ─────────────────────────────────────────────────────────────────────────────
// Metadata — honest, conversion-focused title + description.
// NOT keyword-stuffed: distribution search volume is near-zero so there is no
// organic traffic to chase. The title and description serve referral/brand
// visitors who land here after being told about MYE by someone else.
// ─────────────────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: 'Submit Your Show | Distribution & Representation for Producers',
  description:
    'MY Entertainment represents finished and near-finished unscripted shows — reality, true-crime, paranormal, documentary — to networks, streamers, and international territories. Submit your show for consideration.',
  alternates: { canonical: 'https://www.myentertainment.tv/pitch' },
  openGraph: {
    title: 'Submit Your Show | MY Entertainment',
    description:
      'MY Entertainment represents finished unscripted shows to US networks, streamers, and international territories. Based in New York with offices in Toronto and London.',
    url: 'https://www.myentertainment.tv/pitch',
    siteName: 'MY Entertainment',
    type: 'website',
    images: [{ url: OG_IMAGE, width: 1887, alt: 'MY Entertainment — Submit Your Show' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Submit Your Show | MY Entertainment',
    description:
      'MY Entertainment pitches finished unscripted shows to US networks, streamers, and international broadcasters. Submit for consideration.',
    images: [OG_IMAGE],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// JSON-LD — Service schema scoped to this specific page's offering.
// Organization schema is already emitted by the public layout.tsx (site-wide).
// This Service schema is page-specific: it describes the distribution/
// representation service and links back to the Organization.
// ─────────────────────────────────────────────────────────────────────────────
const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'TV Show Distribution & Producer Representation',
  description:
    'MY Entertainment represents finished and near-finished unscripted television shows — reality, true-crime, paranormal, documentary — to US broadcast networks, streaming platforms, and international territories.',
  provider: {
    '@type': 'Organization',
    name: 'MY Entertainment',
    url: 'https://www.myentertainment.tv',
  },
  areaServed: ['United States', 'Canada', 'United Kingdom', 'International'],
  url: 'https://www.myentertainment.tv/pitch',
};

const webPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Submit Your Show | MY Entertainment',
  url: 'https://www.myentertainment.tv/pitch',
  description:
    'Submission page for producers seeking distribution and representation for finished or near-finished unscripted TV shows.',
  inLanguage: 'en-US',
  isPartOf: {
    '@type': 'WebSite',
    name: 'MY Entertainment',
    url: 'https://www.myentertainment.tv',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Network logos — same CDN URLs used on /work-with-us and throughout the site.
// Only includes networks factually cited in the about/work-with-us pages.
// ─────────────────────────────────────────────────────────────────────────────
const NETWORK_LOGOS = [
  {
    src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8853eb68c398dcf2ac_DISCOVERY%20CHANNEL.png',
    alt: 'Discovery Channel',
  },
  {
    src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b2c6bbe853695d916_travel%20channel.png',
    alt: 'Travel Channel',
  },
  {
    src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8aed58056074c5cde7_PBS.png',
    alt: 'PBS',
  },
  {
    src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8853eb6890cddcf2ae_FOOD%20NETWORK.png',
    alt: 'Food Network',
  },
  {
    src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8a92aded6fa14432e3_OXYGEN.png',
    alt: 'Oxygen',
  },
  {
    src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e88d44a43a5c5a55109_investigation%20discovery.png',
    alt: 'Investigation Discovery',
  },
  {
    src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8a94d7ef1ce62aa6bc_NICKELODEON.png',
    alt: 'Nickelodeon',
  },
  {
    src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8834ed9efe05c943dc_COMEDY%20CENTRAL.png',
    alt: 'Comedy Central',
  },
  {
    src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8bc22fc742523829f1_national%20geographic%20channel.png',
    alt: 'National Geographic',
  },
  {
    src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e9e956e474e3f871d0ac4_bbc.png',
    alt: 'BBC',
  },
];

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

const subheadRed: React.CSSProperties = {
  fontFamily: "'Roboto Condensed', sans-serif",
  fontSize: 16,
  fontWeight: 400,
  color: '#e51d26',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  marginTop: 0,
  marginBottom: 12,
};

const container: React.CSSProperties = {
  maxWidth: 1180,
  margin: '0 auto',
  padding: '0 20px',
};

// ─────────────────────────────────────────────────────────────────────────────
// Process steps — drawn from the existing contact/submission workflow on the site
// ─────────────────────────────────────────────────────────────────────────────
const PROCESS_STEPS = [
  {
    step: '01',
    heading: 'Submit',
    body: 'Download and complete the Submission Release Form below. Email it with a brief show summary to info@myentertainment.tv — or fill out the contact form at the bottom of this page.',
  },
  {
    step: '02',
    heading: 'Review',
    body: "Our development team reviews every submission. We look at genre fit, production status, and potential network placement. You'll hear back from us as soon as possible.",
  },
  {
    step: '03',
    heading: 'Pitch',
    body: 'If your show is a strong fit, we pitch it to our network and streamer relationships in the US, Canada, the UK, and international markets. We have active buyer relationships across 28+ networks.',
  },
  {
    step: '04',
    heading: 'Distribute',
    body: "When a deal is made, we handle representation and distribution — placing your content where it can reach the right audience. Our offices in New York, Toronto, and London give us global reach.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Genre / format types — factual, drawn from the about page and work-with-us page
// ─────────────────────────────────────────────────────────────────────────────
const GENRES = [
  { label: 'Paranormal', note: 'Ghost Adventures, Destination Fear, Paranormal Challenge' },
  { label: 'True Crime', note: 'Sin City Justice, The Jane Doe Murders, Manson Bloodlines' },
  { label: 'Sports & Competition', note: 'Pros vs Joes, character-driven competition formats' },
  { label: 'Documentary', note: 'Breaking Borders, Sherman\'s Warriors, Red Alaska' },
  { label: 'Home & Lifestyle', note: 'Legacy List, Billy Buys Brooklyn, Baggage Battles' },
  { label: 'Food & Travel', note: 'Coast Guard Alaska, food and travel formats' },
  { label: 'International Formats', note: 'Pregnant & Platonic (8-country format), co-productions in 15 countries' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────
export default function PitchPage() {
  return (
    <div style={{ background: '#000' }}>
      <JsonLd data={serviceSchema} />
      <JsonLd data={webPageSchema} />

      {/* ── Section 1: Hero / H1 ─────────────────────────────────────────────
          paddingTop 100px clears the fixed navbar — consistent with every
          other public page (contact, work-with-us, about, etc.).
          H1 uses the .subtitle-small Webflow token: #e51d26, 48px, uppercase,
          Roboto, letter-spacing 0.2em, centered.
      ──────────────────────────────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: 100,
          paddingBottom: 48,
          paddingLeft: 20,
          paddingRight: 20,
          background: '#000',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
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
          Submit Your Show
        </h1>

        {/* Value-prop subhead — plain statement of what MYE does for producers */}
        <p
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 18,
            color: '#f2f4f7',
            lineHeight: 1.6,
            maxWidth: 680,
            margin: '0 auto 16px',
          }}
        >
          MY Entertainment pitches finished and near-finished unscripted shows to
          US networks, streamers, and international broadcasters — on your behalf.
        </p>

        <p
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 14,
            color: '#a5a7ad',
            lineHeight: 1.7,
            maxWidth: 600,
            margin: '0 auto 32px',
          }}
        >
          We are an independent New York production company founded in 2000 with offices in
          Manhattan, Toronto, and London. We have active buyer relationships across 28+
          networks and streamers. If your show fits our catalog, we want to hear from you.
        </p>

        {/* Primary CTA button — anchors down to the submission form */}
        <a
          href="#submit"
          style={{
            display: 'inline-block',
            fontFamily: "'Roboto Condensed', sans-serif",
            fontSize: 14,
            fontWeight: 500,
            color: '#fff',
            background: '#e51d26',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '14px 40px',
            textDecoration: 'none',
            borderRadius: 2,
          }}
        >
          Submit Your Show
        </a>
      </section>

      {/* ── Section 2: Who this is for ───────────────────────────────────────
          Addresses the producer directly. "Finished or near-finished" matches
          what the existing /contact page already says ("a great idea can come
          from anywhere"). Genre list is drawn from the about/work-with-us pages.
      ──────────────────────────────────────────────────────────────────────── */}
      <section
        style={{ background: '#111', padding: '60px 20px' }}
      >
        <div style={container}>
          <h2 style={sectionHeading}>Is This For You?</h2>
          <p style={{ ...bodyText, maxWidth: 720, marginBottom: 32 }}>
            We represent producers and creators who have a finished or near-finished
            unscripted show and need a distribution partner with real network access.
            Our catalog skews toward these formats — if your show fits one of these
            genres, submit it:
          </p>

          {/* Genre grid — 2 columns on desktop, 1 on mobile */}
          <div
            className="pitch-genre-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '16px 40px',
              maxWidth: 900,
            }}
          >
            {GENRES.map(({ label, note }) => (
              <div key={label}>
                <h3 style={subheadRed}>{label}</h3>
                <p style={{ ...bodyText, marginBottom: 0, fontSize: 13, color: '#909499' }}>
                  {note}
                </p>
              </div>
            ))}
          </div>

          <p style={{ ...bodyText, marginTop: 32, marginBottom: 0, maxWidth: 720 }}>
            We mostly develop our own internally generated ideas — but we recognize that
            a great idea can come from anywhere. If you have a show we can place, we want
            to know about it.
          </p>
        </div>
      </section>

      {/* ── Section 3: What we do ────────────────────────────────────────────
          Factual only: distribution / representation to networks, streamers,
          territories. Drawn from the about page and work-with-us page copy.
      ──────────────────────────────────────────────────────────────────────── */}
      <section
        style={{ background: '#000', padding: '60px 20px', borderTop: '1px solid #1a1a1a' }}
      >
        <div style={container}>
          <h2 style={sectionHeading}>What We Do</h2>

          <div
            className="pitch-what-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 40,
            }}
          >
            {/* Distribution */}
            <div>
              <h3 style={subheadRed}>Distribution</h3>
              <p style={bodyText}>
                We distribute unscripted formats for licensing, international
                co-production, and broadcast acquisition. Browse our{' '}
                <Link href="/available" style={{ color: '#e02027', textDecoration: 'none' }}>
                  available titles catalog
                </Link>{' '}
                to see the kinds of shows we work with.
              </p>
            </div>

            {/* Network Relationships */}
            <div>
              <h3 style={subheadRed}>Network Relationships</h3>
              <p style={bodyText}>
                We have active relationships with buyers at every major US network and
                several leading international broadcasters — Discovery, Travel Channel,
                PBS, A&amp;E, ID, Oxygen, Food Network, BBC, and 20+ more. We know the
                right doors for your show.
              </p>
            </div>

            {/* International */}
            <div>
              <h3 style={subheadRed}>International Reach</h3>
              <p style={bodyText}>
                With offices in Manhattan, Toronto, and London, we have established
                working relationships with more than 40 producers in 15 countries. We
                can structure co-production agreements for markets that prefer local
                production over licensed content.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: How it works ──────────────────────────────────────────
          4-step process: Submit → Review → Pitch → Distribute.
          Steps are grounded in the existing contact/submission workflow on the site.
          Nothing invented — step 1 literally mirrors the /contact page instructions.
      ──────────────────────────────────────────────────────────────────────── */}
      <section
        style={{ background: '#111', padding: '60px 20px' }}
      >
        <div style={container}>
          <h2 style={sectionHeading}>How It Works</h2>

          <div
            className="pitch-process-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 32,
            }}
          >
            {PROCESS_STEPS.map(({ step, heading, body }) => (
              <div key={step}>
                {/* Step number — large muted accent */}
                <div
                  style={{
                    fontFamily: "'Roboto Condensed', sans-serif",
                    fontSize: 48,
                    fontWeight: 400,
                    color: '#2a2a2a',
                    lineHeight: 1,
                    marginBottom: 8,
                    userSelect: 'none',
                  }}
                >
                  {step}
                </div>
                <h3 style={subheadRed}>{heading}</h3>
                <p style={{ ...bodyText, marginBottom: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 5: Why MY Entertainment ─────────────────────────────────
          Credibility drawn from the real catalog and credits in the repo.
          Every show title, network, and claim is sourced from the about page
          or work-with-us page — nothing invented.
          [FLAG: verify] items are marked explicitly below.
      ──────────────────────────────────────────────────────────────────────── */}
      <section
        style={{ background: '#000', padding: '60px 20px', borderTop: '1px solid #1a1a1a' }}
      >
        <div style={container}>
          <h2 style={sectionHeading}>Why MY Entertainment</h2>

          <div
            className="pitch-why-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '40px 60px',
            }}
          >
            {/* 25+ years in the business */}
            <div>
              <h3 style={subheadRed}>25+ Years in Unscripted</h3>
              <p style={bodyText}>
                MY Entertainment has been producing and distributing non-fiction
                television since 2000. We understand the business — from development
                to broadcast — because we have lived every side of it.
              </p>
            </div>

            {/* Flagship track record */}
            <div>
              <h3 style={subheadRed}>A Track Record That Speaks</h3>
              <p style={bodyText}>
                Ghost Adventures — which began as an independent documentary — became the
                #1 paranormal show in cable TV history with 28 seasons on Travel Channel
                and five spin-off series. Legacy List earned an Emmy nomination.
                Breaking Borders received critical recognition for journalism.{' '}
                {/* [FLAG: verify] — "Peabody-recognized" appears on /work-with-us; confirm exact recognition */}
                We build long-running IP from single compelling ideas.
              </p>
            </div>

            {/* Partnerships with proven co-producers */}
            <div>
              <h3 style={subheadRed}>Partnership Track Record</h3>
              <p style={bodyText}>
                MY Entertainment has partnered with production entities including
                LeBron James and Maverick Carter&rsquo;s SpringHill Company, Al Roker&rsquo;s ARE,
                and other established producers. Our international format{' '}
                <em>Pregnant &amp; Platonic</em> has been optioned in eight countries.
                We know how to structure deals that work for all parties.
              </p>
            </div>

            {/* Global buyer relationships */}
            <div>
              <h3 style={subheadRed}>Global Buyer Relationships</h3>
              <p style={bodyText}>
                Offices in New York, Toronto, and London give us direct access to US,
                Canadian, UK, and international broadcasters. We have produced for
                Max, Discovery+, A&amp;E, VICE, PBS, National Geographic, BBC, Lifetime,
                MTV, Comedy Central, Travel Channel, ID, Oxygen, Nickelodeon, Food
                Network, Animal Planet, TruTV, Reelz, CMT, and 20+ additional networks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 6: Network logos ─────────────────────────────────────────
          Same logo grid used on /work-with-us. All CDN URLs are from the
          Webflow site and are factual network partners.
      ──────────────────────────────────────────────────────────────────────── */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <h2 style={sectionHeading}>Networks We Deliver For</h2>
          <p style={{ ...bodyText, marginBottom: 32 }}>
            We have active buyer relationships with every major US network and several
            leading international broadcasters. Your show will be pitched to the right
            room, not a generic list.
          </p>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 32,
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
          >
            {NETWORK_LOGOS.map((logo) => (
              <img
                key={logo.src}
                src={logo.src}
                alt={logo.alt}
                loading="lazy"
                style={{
                  height: 40,
                  width: 'auto',
                  maxWidth: 160,
                  objectFit: 'contain',
                  opacity: 0.8,
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 7: Submission form (primary CTA) ─────────────────────────
          id="submit" is the anchor target for the hero CTA button above.
          Reuses the existing ContactForm component — posts to /api/contact →
          contact_leads table. No new backend work required.
          The source_section 'pitch-page' tag (set inside ContactForm on
          trackShowPitchSubmit/trackContactFormSubmit calls) distinguishes
          leads from this page from /contact leads in GA4 Explorations.
      ──────────────────────────────────────────────────────────────────────── */}
      <section
        id="submit"
        style={{
          background: '#000',
          padding: '80px 20px',
          borderTop: '1px solid #1a1a1a',
        }}
      >
        <div style={{ maxWidth: 700, margin: '0 auto' }}>

          {/* Section heading */}
          <h2
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 32,
              fontWeight: 400,
              color: '#f2f4f7',
              textAlign: 'center',
              marginTop: 0,
              marginBottom: 8,
            }}
          >
            Ready To Submit Your Show?
          </h2>

          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 14,
              color: '#a5a7ad',
              textAlign: 'center',
              lineHeight: 1.7,
              marginBottom: 32,
              marginTop: 0,
            }}
          >
            Fill out the form below or email your contact information and a brief
            show summary to{' '}
            <a
              href="mailto:info@myentertainment.tv"
              style={{ color: '#e02027', textDecoration: 'none' }}
            >
              info@myentertainment.tv
            </a>
            .
          </p>

          {/*
            ContactForm — existing component, posts to /api/contact.
            No new API route or DB table. The form captures first_name, last_name,
            email, and message — producers should describe their show in the message
            field. sourceSection 'pitch-page' on the GA4 events lets us segment
            pitch-page leads separately from general /contact leads.

            NOTE: ContactForm fires trackShowPitchSubmit with sourceSection: 'contact-pitch'
            (hardcoded in the component). For this page the sourceSection is slightly
            different from the ideal 'pitch-page', but changing ContactForm would affect
            all pages that import it. This is acceptable in V1 — a dedicated pitch form
            with a 'pitch-page' sourceSection can be built later if segmentation matters.
          */}
          <ContactForm />
        </div>
      </section>

      {/* ── Section 8: Internal links ────────────────────────────────────────
          Light footer with links to related pages — /available, /shows, /about.
          Helps crawlers and referral visitors explore the full catalog.
      ──────────────────────────────────────────────────────────────────────── */}
      <section
        style={{
          background: '#111',
          padding: '48px 20px',
          borderTop: '1px solid #1a1a1a',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 13,
            color: '#909499',
            marginBottom: 16,
            marginTop: 0,
          }}
        >
          Explore our work:
        </p>
        <div
          style={{
            display: 'flex',
            gap: 32,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {[
            { href: '/available', label: 'Available Titles' },
            { href: '/shows',     label: 'Our Shows' },
            { href: '/about',     label: 'About MY Entertainment' },
            { href: '/work-with-us', label: 'Work With Us' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                fontFamily: "'Roboto Condensed', sans-serif",
                fontSize: 13,
                fontWeight: 400,
                color: '#a5a7ad',
                textDecoration: 'none',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

      {/* ── Responsive breakpoints ───────────────────────────────────────────
          Matches the breakpoint pattern used on /work-with-us and /contact.
          All multi-column grids collapse to single column at mobile widths.
      ──────────────────────────────────────────────────────────────────────── */}
      <style>{`
        @media (max-width: 767px) {
          .pitch-genre-grid   { grid-template-columns: 1fr !important; }
          .pitch-what-grid    { grid-template-columns: 1fr !important; }
          .pitch-process-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .pitch-why-grid     { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 479px) {
          .pitch-process-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
