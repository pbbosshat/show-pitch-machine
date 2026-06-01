// ============================================================
// /tv-production-company — B2B Services Positioning Page
// Target keywords (updated 2026-05-27, seo/scale-mye):
//   "tv production company"           (vol 100, KD 5  — primary, H1 exact)
//   "unscripted production company"   (vol ~20, KD ~8 — H2 section)
//   "reality tv production company"   (vol 10,  KD 0  — H2/FAQ)
//   "commissioning editor"            (vol 40,  KD 0  — existing H2)
//
// Intent: IP holders, showrunners, and content creators actively
// searching for a production partner. This page positions MY
// Entertainment as the expert production company that can take
// an unscripted concept from pitch to commission.
//
// Server Component — no 'use client'. All styles inline.
// Design tokens mirror Webflow source: bg #000, body #a5a7ad,
// headings #f2f4f7, accent #e51d26, fonts Roboto/Roboto Condensed/Oswald.
// ============================================================

import type { Metadata } from 'next';
import Link from 'next/link';

// ------------------------------------------------------------
// Metadata — title.absolute bypasses root layout title.template
// ('%s | MY Entertainment') so the exact keyword string is the
// <title> value in the SERP, maximising click-through rate.
// ------------------------------------------------------------
export const metadata: Metadata = {
  title: {
    absolute: 'TV Production Company | MY Entertainment — 25 Years, 28+ Networks',
  },
  description:
    'MY Entertainment is a New York unscripted TV production company with 25+ years selling shows to Discovery, PBS, A&E, Max, and 28+ networks. We develop, produce, and pitch your concept directly to commissioning editors.',
  keywords: [
    'tv production company', 'unscripted tv production company', 'commissioning editor',
    'television production company', 'reality tv production company', 'new york production company',
    'pitch to tv networks', 'production company partner',
  ],
  alternates: { canonical: 'https://www.myentertainment.tv/tv-production-company' },
  openGraph: {
    title: 'TV Production Company | MY Entertainment — 25 Years, 28+ Networks',
    description:
      'MY Entertainment is a New York unscripted TV production company with 25+ years selling shows to Discovery, PBS, A&E, Max, and 28+ networks. We develop, produce, and pitch your concept.',
    url: 'https://www.myentertainment.tv/tv-production-company',
    siteName: 'MY Entertainment',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TV Production Company | MY Entertainment',
    description:
      '25+ years selling unscripted TV to 28+ networks. MY Entertainment develops, produces, and pitches your concept to commissioning editors worldwide.',
  },
};

// ------------------------------------------------------------
// Design token constants — identical across all cluster pages
// for visual consistency with the rest of the public site.
// ------------------------------------------------------------
const container: React.CSSProperties = {
  maxWidth: 1180,
  margin: '0 auto',
  padding: '0 20px',
};

const bodyText: React.CSSProperties = {
  fontFamily: "'Roboto', sans-serif",
  fontSize: 14,
  color: '#a5a7ad',
  lineHeight: 1.7,
  marginBottom: 16,
  marginTop: 0,
};

const h2Style: React.CSSProperties = {
  fontFamily: "'Roboto', sans-serif",
  fontSize: 28,
  fontWeight: 400,
  color: '#f2f4f7',
  marginTop: 0,
  marginBottom: 16,
};

const h3Style: React.CSSProperties = {
  fontFamily: "'Roboto Condensed', sans-serif",
  fontSize: 16,
  fontWeight: 400,
  color: '#e51d26',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  marginTop: 0,
  marginBottom: 8,
};

const inlineLink: React.CSSProperties = {
  color: '#e02027',
  textDecoration: 'none',
};

// ------------------------------------------------------------
// FAQ data — single source of truth for both visible text and
// FAQPage JSON-LD. Question text must match schema verbatim.
// Extended (2026-05-27, seo/scale-mye): added "unscripted production
// company" and "reality tv production company" FAQ items.
// ------------------------------------------------------------
const FAQ_ITEMS = [
  {
    q: 'What does a TV production company do?',
    a: 'A TV production company develops, produces, and delivers television content on behalf of networks and streaming platforms. For an independent creator, a production company provides the infrastructure (crew, equipment, post-production), network access (direct relationships with commissioning editors), and experience to take a concept from idea to broadcast-ready series.',
  },
  {
    q: 'What is an unscripted production company?',
    a: 'An unscripted production company specializes in non-fiction television — reality formats, documentary series, competition shows, lifestyle programming, and paranormal or true crime series. Unlike scripted production companies that develop fictional dramas and comedies, an unscripted production company\'s expertise is in finding and developing real characters, real stories, and real formats that translate to compelling non-fiction television. MY Entertainment is an unscripted production company that has sold over 25 years of non-fiction programming to Discovery, Travel Channel, PBS, A&E, Max, and 28+ other networks.',
  },
  {
    q: 'What does a reality TV production company do differently?',
    a: 'A reality TV production company specializes in the unscripted format specifically — casting real people, developing format structures that generate recurring conflict, shooting in real environments, and editing documentary-style footage to tell narrative stories without a script. The skills are distinct from scripted production: reality TV requires deep casting expertise, format development experience, and the ability to build stories from real raw footage rather than from a writer\'s room. MY Entertainment has produced reality and unscripted formats across paranormal, sports, lifestyle, crime, and food genres.',
  },
  {
    q: 'How do I approach a TV production company with my idea?',
    a: 'Start with a clear, one-page concept document: logline, format description, target audience, and why this show is relevant now. If you have a sizzle reel, attach it. Contact MY Entertainment through our pitch submission page — we review every concept that comes in and respond to those that fit our current development slate.',
  },
  {
    q: 'What is a commissioning editor and how do I reach one?',
    a: 'A commissioning editor is the network executive responsible for acquiring new programming. They typically only accept submissions through established production companies — cold submissions from unknown producers are rarely reviewed. The fastest path to a commissioning editor is through a production company like MY Entertainment that has existing relationships at your target network.',
  },
  {
    q: 'Do you take pitches from independent creators?',
    a: 'Yes. MY Entertainment actively looks for strong unscripted concepts from independent creators, IP holders, and talent. We evaluate each pitch on its merit — the strength of the concept, the characters, and the network fit. You do not need representation or a prior track record to pitch to us.',
  },
  {
    q: 'What percentage does a production company take?',
    a: 'Production company arrangements vary widely depending on the deal structure. MY Entertainment works under co-production and option agreements that are negotiated case by case. We are transparent about deal terms and will always explain the structure before any agreement is signed. Contact us directly to discuss what a partnership would look like for your specific concept.',
  },
];

// ------------------------------------------------------------
// JSON-LD schemas — Service + Organization + FAQPage
// Service schema positions MYE as the entity providing B2B TV
// production services (not just a publisher). Organization is
// the same entity; FAQPage enables rich SERP snippets.
// ------------------------------------------------------------
const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Unscripted TV Production Services',
  description:
    'MY Entertainment develops, produces, and pitches unscripted TV concepts to networks and streaming platforms worldwide. Services include concept development, sizzle reel production, pitch deck creation, network submission, and full series production.',
  provider: {
    '@type': 'Organization',
    name: 'MY Entertainment',
    url: 'https://www.myentertainment.tv',
    logo: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8ebea7bb58375c4d58c7_My%20Entertainment%20Square%20(Dark%20Background%20-%20Gradient).png',
  },
  areaServed: [
    { '@type': 'Country', name: 'United States' },
    { '@type': 'Country', name: 'Canada' },
    { '@type': 'Country', name: 'United Kingdom' },
  ],
  serviceType: 'Television Production',
  url: 'https://www.myentertainment.tv/tv-production-company',
};

const orgSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'MY Entertainment',
  url: 'https://www.myentertainment.tv',
  foundingDate: '2000',
  description:
    'MY Entertainment is a New York-based unscripted television production company. Founded in 2000, the company has produced thousands of hours of non-fiction content including Ghost Adventures (28 seasons), Destination Fear, Pros vs Joes, and Legacy List.',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '235 E 45th St., Floor 14 West',
    addressLocality: 'New York',
    addressRegion: 'NY',
    postalCode: '10017',
    addressCountry: 'US',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  // mainEntity generated from FAQ_ITEMS — single source of truth,
  // avoids any drift between on-page text and structured data.
  mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

// ------------------------------------------------------------
// BreadcrumbList schema — SERP breadcrumb trail for this services page.
// Shows "Home > TV Production Company" in Google results.
// Complements the Service + Organization schemas already on this page.
// Added 2026-06-01 as part of cluster-wide BreadcrumbList rollout.
// ------------------------------------------------------------
const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://www.myentertainment.tv/',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'TV Production Company',
      item: 'https://www.myentertainment.tv/tv-production-company',
    },
  ],
};

// ------------------------------------------------------------
// Service offerings — rendered as a feature card grid.
// Defines what "working with MY Entertainment" means in practice.
// ------------------------------------------------------------
const SERVICES = [
  {
    icon: '💡',
    title: 'Concept Development',
    body: 'We work with you to sharpen your concept into a pitch-ready format — defining the logline, format structure, episode arc, target network, and character selection before a dollar is spent on production.',
  },
  {
    icon: '🎬',
    title: 'Sizzle Reel Production',
    body: 'Our in-house production team shoots and edits sizzle reels designed for a specific buyer. Every creative choice — pacing, music, VO, character selection — is made with the target commissioning editor in mind.',
  },
  {
    icon: '📋',
    title: 'Pitch Deck Creation',
    body: 'We build the pitch deck alongside the reel — not as a separate deliverable but as an integrated system. The deck and reel tell the same story in complementary formats for the pitch meeting.',
  },
  {
    icon: '📡',
    title: 'Network Submission',
    body: 'We submit your package through our established relationships at the target network. You are not going into a cold inbox — you are going to a specific commissioning editor who knows and trusts us.',
  },
  {
    icon: '🤝',
    title: 'Co-Production Partnerships',
    body: 'For concepts that need a production partner from the ground up, we co-develop, co-produce, and share in the long-term rights alongside you. We are invested in the show\'s success across its entire lifecycle.',
  },
  {
    icon: '🌍',
    title: 'International Distribution',
    body: 'With offices in New York, Toronto, and London, we can structure international co-production deals and bring your concept to UK broadcasters and Canadian networks as well as US buyers.',
  },
];

// Network logos — text-only representation (no image CDN needed)
// These are the primary networks MY Entertainment has sold to.
const NETWORKS = [
  'Discovery', 'Travel Channel', 'PBS', 'A&E', 'Max',
  'Oxygen', 'ID', 'Food Network', 'National Geographic', 'BBC',
  'MTV', 'TruTV', 'Lifetime', 'CMT', 'Reelz',
];

// ------------------------------------------------------------
// Page Component
// ------------------------------------------------------------
export default function TVProductionCompanyPage() {
  return (
    <div style={{ background: '#000' }}>
      {/* ── Schema markup ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {/* BreadcrumbList — SERP breadcrumb trail for this services page */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Responsive styles — grid layouts, tooltip, CTA hover */}
      <style>{`
        .prodco-prose { max-width: 780px; margin: 0 auto; }
        .prodco-service-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-top: 32px;
        }
        @media (max-width: 900px) {
          .prodco-service-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 600px) {
          .prodco-service-grid { grid-template-columns: 1fr; }
        }
        .prodco-network-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 20px;
        }
        .prodco-faq-item + .prodco-faq-item { margin-top: 28px; }
        /* CTA hover/focus — opacity shift matches Webflow hover state */
        .prodco-cta-btn:hover,
        .prodco-cta-btn:focus-visible { opacity: 0.85; }
        /* Tooltip — shows on hover AND :focus-within for keyboard access */
        .mye-tooltip-wrap { position: relative; display: inline-block; }
        .mye-tooltip {
          position: absolute;
          bottom: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%);
          background: #333;
          color: #fff;
          font-family: 'Roboto', sans-serif;
          font-size: 12px;
          white-space: nowrap;
          padding: 4px 8px;
          border-radius: 3px;
          pointer-events: none;
          opacity: 0;
          transition: opacity 150ms;
        }
        .mye-tooltip-wrap:hover .mye-tooltip,
        .mye-tooltip-wrap:focus-within .mye-tooltip { opacity: 1; }
      `}</style>

      {/* ================================================================== */}
      {/* SECTION 1 — Hero / Heading                                          */}
      {/* paddingTop 100px clears the fixed navbar (75px + margin).          */}
      {/* Single H1 — "TV production company" keyword appears in H1 text.    */}
      {/* ================================================================== */}
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
        {/* Eyebrow label — Webflow .subtitle-small token */}
        <p
          style={{
            fontFamily: "'Roboto Condensed', sans-serif",
            fontSize: 12,
            color: '#e51d26',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            marginBottom: 12,
            marginTop: 0,
          }}
        >
          Production Services
        </p>

        {/*
          H1 — one per page (accessibility + SEO).
          Oswald matches the editorial headline treatment on other cluster pages.
          "TV production company" is the primary keyword target.
        */}
        <h1
          style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 'clamp(30px, 5vw, 52px)',
            fontWeight: 600,
            color: '#f2f4f7',
            margin: '0 auto 20px',
            maxWidth: 820,
            lineHeight: 1.15,
          }}
        >
          New York Unscripted TV Production Company
        </h1>

        <p
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 16,
            color: '#a5a7ad',
            lineHeight: 1.7,
            margin: '0 auto 32px',
            maxWidth: 700,
          }}
        >
          25 years. 28+ networks. Thousands of hours. MY Entertainment takes unscripted
          TV concepts from idea to commission — with the network relationships and production
          infrastructure to get your show on air.
        </p>

        {/* Stat row — three proof points supporting the positioning claim */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 48,
            flexWrap: 'wrap',
            marginBottom: 8,
          }}
        >
          {[
            { stat: '25+', label: 'Years in Business' },
            { stat: '28+', label: 'Network Relationships' },
            { stat: '1,000s', label: 'Hours Produced' },
          ].map(({ stat, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontSize: 42,
                  fontWeight: 700,
                  color: '#e51d26',
                  margin: '0 0 4px',
                  lineHeight: 1,
                }}
              >
                {stat}
              </p>
              <p
                style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 12,
                  color: '#a5a7ad',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  margin: 0,
                }}
              >
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 2 — What we do                                              */}
      {/* Explains the company's role for searchers who may not know what a  */}
      {/* production company does — captures "what does a prodco do" intent. */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div className="prodco-prose">
            <h2 style={h2Style}>What MY Entertainment Does</h2>
            <p style={bodyText}>
              MY Entertainment is an independent unscripted television production company based in
              New York, with offices in Toronto and London. Since 2000, we have developed, produced,
              and sold non-fiction programming to broadcasters and streaming platforms across the United
              States, Canada, the UK, and internationally.
            </p>
            <p style={bodyText}>
              For independent creators, IP holders, and talent with a concept they believe in, we are
              the production partner that brings three things to the table:
            </p>
            <ul
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: 14,
                color: '#a5a7ad',
                lineHeight: 1.7,
                paddingLeft: 20,
                marginBottom: 16,
                marginTop: 0,
              }}
            >
              <li style={{ marginBottom: 10 }}>
                <strong style={{ color: '#f2f4f7' }}>Network access.</strong> We have direct
                relationships with commissioning editors at every major US cable network, broadcast
                network, and streaming platform. Your pitch goes to a specific person who knows us —
                not an anonymous development inbox.
              </li>
              <li style={{ marginBottom: 10 }}>
                <strong style={{ color: '#f2f4f7' }}>Production infrastructure.</strong> Our in-house
                team handles concept development, sizzle reel production, pitch deck creation, and full
                series production through delivery. You do not need to hire separate vendors; we are the
                vendor.
              </li>
              <li>
                <strong style={{ color: '#f2f4f7' }}>25 years of pitch experience.</strong> We know
                what networks are buying right now, what commissioning editors respond to, and what
                makes a pitch package land. This institutional knowledge dramatically accelerates the
                pitch-to-greenlight timeline.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 2b — Unscripted Production Company (H2 keyword target)      */}
      {/* Targets "unscripted production company" (vol ~20, KD ~8, CPC $80). */}
      {/* Positions MYE's specialty explicitly for ICP searchers.           */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="prodco-prose">
            <h2 style={h2Style}>Unscripted TV Production Company</h2>
            <p style={bodyText}>
              MY Entertainment is an <strong style={{ color: '#f2f4f7' }}>unscripted production
              company</strong> — meaning our entire business is built around non-fiction television.
              We do not produce scripted dramas or comedies. We develop, produce, and pitch unscripted
              formats: docuseries, reality, competition, lifestyle, paranormal, true crime, travel,
              and food programming.
            </p>
            <p style={bodyText}>
              The unscripted production specialization matters because the craft is fundamentally different:
            </p>
            <ul
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: 14,
                color: '#a5a7ad',
                lineHeight: 1.7,
                paddingLeft: 20,
                marginBottom: 16,
                marginTop: 0,
              }}
            >
              <li style={{ marginBottom: 10 }}>
                <strong style={{ color: '#f2f4f7' }}>Casting is everything.</strong> In unscripted TV,
                the characters are real people — and finding people who are compelling on camera,
                whose lives generate genuine conflict, and who can sustain a series is a specialized
                skill that takes years to develop.
              </li>
              <li style={{ marginBottom: 10 }}>
                <strong style={{ color: '#f2f4f7' }}>Format design, not screenplay.</strong> An
                unscripted production company does not work from a script — it designs the format
                conditions that generate compelling real moments. Structure, not writing, is the
                creative tool.
              </li>
              <li>
                <strong style={{ color: '#f2f4f7' }}>Network relationships are genre-specific.</strong>{' '}
                The commissioning editors at Discovery, Travel Channel, A&amp;E, and ID who buy
                unscripted content are not the same people who buy scripted dramas at HBO or Netflix.
                Unscripted network access requires 25 years of relationship-building in the non-fiction
                space — which is exactly what MY Entertainment brings.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 2c — Reality TV Production Company (H2 keyword target)      */}
      {/* Targets "reality tv production company" (vol 10, KD 0).            */}
      {/* Zero KD = easy win; marginal volume but correct ICP term.         */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div className="prodco-prose">
            <h2 style={h2Style}>Reality TV Production Company</h2>
            <p style={bodyText}>
              Within the unscripted television category, MY Entertainment has deep experience as a{' '}
              <strong style={{ color: '#f2f4f7' }}>reality TV production company</strong> — producing
              formats built around real people, real competition, and real stakes. Reality TV is a
              broad genre that spans competition formats, docufollows, makeover shows, relationship formats,
              and talent searches.
            </p>
            <p style={bodyText}>
              Key examples from MY Entertainment&apos;s catalog that span the reality TV spectrum:
            </p>
            <ul
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: 14,
                color: '#a5a7ad',
                lineHeight: 1.7,
                paddingLeft: 20,
                marginBottom: 16,
                marginTop: 0,
              }}
            >
              <li style={{ marginBottom: 8 }}>
                <strong style={{ color: '#f2f4f7' }}>Ghost Adventures</strong> — paranormal reality
                series, 28 seasons, Travel Channel / Discovery
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong style={{ color: '#f2f4f7' }}>Baggage Battles</strong> — competition reality,
                Travel Channel
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong style={{ color: '#f2f4f7' }}>Wild and Crazy Kids</strong> — children&apos;s
                reality / competition
              </li>
              <li>
                <strong style={{ color: '#f2f4f7' }}>Billy Buys Brooklyn</strong> — lifestyle / real
                estate reality
              </li>
            </ul>
            <p style={bodyText}>
              If you are developing a reality TV concept and looking for a production partner with a
              proven track record across these formats,{' '}
              <Link href="/work-with-us" style={inlineLink}>reach out to discuss your concept →</Link>
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 3 — Services grid                                           */}
      {/* Six service cards in a 3-column grid. Each card represents a       */}
      {/* specific B2B offering that maps to a stage of the pitch journey.   */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <h2
            style={{
              ...h2Style,
              textAlign: 'center',
            }}
          >
            How We Work With Creators
          </h2>
          <p
            style={{
              ...bodyText,
              textAlign: 'center',
              maxWidth: 620,
              margin: '0 auto 8px',
            }}
          >
            Whether you come to us with a finished sizzle reel or a raw idea on a napkin,
            we have a pathway to get your concept in front of the right buyer.
          </p>

          {/* Six-card service grid — 3 col desktop, 2 tablet, 1 mobile */}
          <div className="prodco-service-grid">
            {SERVICES.map(({ icon, title, body }) => (
              <div
                key={title}
                style={{
                  // Card: dark border, slightly elevated background for visual separation
                  background: '#111',
                  border: '1px solid #2a2a2a',
                  borderRadius: 4,
                  padding: '24px 20px',
                }}
              >
                {/* Icon — decorative, aria-hidden; each service is labelled by its h3 */}
                <p
                  aria-hidden="true"
                  style={{
                    fontSize: 28,
                    margin: '0 0 12px',
                    lineHeight: 1,
                  }}
                >
                  {icon}
                </p>
                <h3 style={{ ...h3Style, color: '#f2f4f7', textTransform: 'none' as const, letterSpacing: 0, fontSize: 16 }}>
                  {title}
                </h3>
                <p style={{ ...bodyText, marginBottom: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 4 — Network relationships                                   */}
      {/* Demonstrates reach to buyers scanning for a prodco with their      */}
      {/* target network's relationship. Also targets "commissioning editor"  */}
      {/* keyword by contextualizing who MYE has access to.                  */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div className="prodco-prose">
            <h2 style={h2Style}>Our Network Relationships</h2>
            <p style={bodyText}>
              Over 25 years, MY Entertainment has built direct working relationships with commissioning
              editors at more than 28 US and international networks and streaming platforms. These are
              not cold contacts — they are buyers we have sold to, developed with, and delivered for.
            </p>
            <p style={bodyText}>
              Networks and platforms we have sold programming to or have active development relationships with:
            </p>

            {/* Network chip list — text chips, no images needed */}
            <div className="prodco-network-chips">
              {NETWORKS.map((network) => (
                <span
                  key={network}
                  style={{
                    fontFamily: "'Roboto Condensed', sans-serif",
                    fontSize: 12,
                    color: '#f2f4f7',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    borderRadius: 2,
                    padding: '4px 10px',
                  }}
                >
                  {network}
                </span>
              ))}
            </div>

            <p style={{ ...bodyText, marginTop: 24 }}>
              This network reach is why partnering with MY Entertainment accelerates your pitch timeline.
              Instead of cold-submitting to a development inbox that may not be reviewed for months,
              your package goes directly to a commissioning editor relationship we have — typically with
              a specific development season or programming gap in mind.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 5 — The commissioning editor explained                      */}
      {/* Directly targets "commissioning editor" keyword (KD0) by defining  */}
      {/* the term and showing how MYE provides access to these gatekeepers. */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="prodco-prose">
            <h2 style={h2Style}>How to Reach a Commissioning Editor</h2>
            <p style={bodyText}>
              A <strong style={{ color: '#f2f4f7' }}>commissioning editor</strong> is the network
              executive responsible for acquiring new programming. They decide which unscripted
              concepts move from pitch to development deal — and ultimately to greenlight. They are
              the gatekeepers between your idea and a broadcast slot.
            </p>
            <p style={bodyText}>
              The problem: commissioning editors typically do not accept submissions directly from
              independent creators. They accept packages from production companies with established
              track records at their network. A cold email or an unsolicited script that lands in a
              development inbox is almost never reviewed.
            </p>
            <p style={bodyText}>
              The solution: partner with a production company that has those relationships. When MY
              Entertainment submits a package to a commissioning editor, it arrives in a context of
              trust — the editor knows our track record, our production quality, and our ability to
              deliver. That context dramatically improves the odds that your concept gets a real read.
            </p>

            {/* Inline cross-link to pitch guide — passes PageRank to /how-to-pitch-a-tv-show */}
            <p style={bodyText}>
              For a full breakdown of the pitch process from concept to commission, read our guide on{' '}
              <Link href="/how-to-pitch-a-tv-show" style={inlineLink}>
                how to pitch a TV show
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 6 — Featured shows                                          */}
      {/* Social proof: named shows build credibility for B2B buyers         */}
      {/* evaluating whether to partner with MYE.                           */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <h2
            style={{
              ...h2Style,
              textAlign: 'center',
            }}
          >
            Shows We&apos;ve Produced
          </h2>
          <p
            style={{
              ...bodyText,
              textAlign: 'center',
              maxWidth: 640,
              margin: '0 auto 32px',
            }}
          >
            Twenty-five years of unscripted TV production across paranormal, sports, crime,
            lifestyle, food, and documentary formats.
          </p>

          {/* Show credential grid — 2 columns, minimal card */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 16,
              maxWidth: 780,
              margin: '0 auto',
            }}
          >
            {[
              { show: 'Ghost Adventures', detail: '28 seasons · Discovery / Travel Channel' },
              { show: 'Destination Fear', detail: 'Travel Channel · paranormal docuseries' },
              { show: 'Pros vs. Joes', detail: 'Spike TV · celebrity sports competition' },
              { show: 'Legacy List', detail: 'PBS · Emmy-nominated lifestyle' },
              { show: 'Sin City Justice', detail: 'ID: Investigation Discovery' },
              { show: 'Breaking Borders', detail: 'Travel Channel · critically acclaimed' },
            ].map(({ show, detail }) => (
              <div
                key={show}
                style={{
                  borderLeft: '3px solid #e51d26',
                  paddingLeft: 14,
                }}
              >
                <p
                  style={{
                    fontFamily: "'Roboto Condensed', sans-serif",
                    fontSize: 16,
                    fontWeight: 400,
                    color: '#f2f4f7',
                    margin: '0 0 4px',
                  }}
                >
                  {show}
                </p>
                <p
                  style={{
                    fontFamily: "'Roboto', sans-serif",
                    fontSize: 12,
                    color: '#a5a7ad',
                    margin: 0,
                  }}
                >
                  {detail}
                </p>
              </div>
            ))}
          </div>

          {/* Link to full show catalog */}
          <p
            style={{
              ...bodyText,
              textAlign: 'center',
              marginTop: 28,
              marginBottom: 0,
            }}
          >
            <Link href="/shows" style={inlineLink}>
              Browse our full show catalog →
            </Link>
          </p>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 7 — FAQ                                                     */}
      {/* FAQPage schema enables rich SERP results. Text MUST match          */}
      {/* faqSchema.mainEntity above verbatim — no paraphrasing.            */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="prodco-prose">
            <h2 style={h2Style}>Frequently Asked Questions</h2>

            {/* Each FAQ item rendered with its question as an H3 and answer as a p.
                Text here must be byte-for-byte identical to the JSON-LD above. */}
            {FAQ_ITEMS.map(({ q, a }, idx) => (
              <div key={idx} className="prodco-faq-item">
                <h3
                  style={{
                    fontFamily: "'Roboto', sans-serif",
                    fontSize: 16,
                    fontWeight: 500,
                    color: '#f2f4f7',
                    marginTop: idx === 0 ? 0 : undefined,
                    marginBottom: 8,
                  }}
                >
                  {q}
                </h3>
                {/* Answer text — matches schema acceptedAnswer.text verbatim */}
                <p style={{ ...bodyText, marginBottom: 0 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 8 — CTA                                                     */}
      {/* Primary conversion goal: contact form submission. Cross-links the  */}
      {/* cluster A↔B↔C↔D so PageRank flows across all four pages.         */}
      {/* ================================================================== */}
      <section
        style={{
          padding: '80px 20px',
          textAlign: 'center',
          background: '#111',
          borderTop: '1px solid #1a1a1a',
        }}
      >
        <div style={container}>
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
            Partner With MY Entertainment
          </h2>

          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 14,
              color: '#a5a7ad',
              lineHeight: 1.7,
              maxWidth: 560,
              margin: '0 auto 32px',
            }}
          >
            We are actively developing new unscripted concepts. If you have a show idea,
            an IP opportunity, or a talent package, reach out — we review every pitch and
            respond to those that fit our current development slate.
          </p>

          {/*
            Primary CTA — contact form.
            Icon + visible label + hover tooltip + aria-label per CLAUDE.md button rules.
            No bare text-only or unlabeled icon buttons.
            Error handling: N/A — this is a static link, not an interactive element that can fail.
          */}
          <span className="mye-tooltip-wrap" style={{ display: 'inline-block', marginBottom: 24 }}>
            <a
              href="/contact"
              className="prodco-cta-btn"
              aria-label="Contact MY Entertainment to pitch your TV show concept"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: '#e51d26',
                color: '#fff',
                fontFamily: "'Roboto Condensed', sans-serif",
                fontSize: 16,
                fontWeight: 500,
                textTransform: 'uppercase',
                textDecoration: 'none',
                borderRadius: 4,
                padding: '14px 32px',
                transition: 'opacity 150ms',
              }}
            >
              {/* Leading icon — envelope affordance matching other cluster CTAs */}
              <span aria-hidden="true">✉</span>
              Pitch Your Concept to MYE
            </a>
            {/* Tooltip: aria-hidden so it is not double-announced by screen readers */}
            <span className="mye-tooltip" aria-hidden="true">
              Open the MYE contact form
            </span>
          </span>

          {/* Cluster cross-links — connects all four B2B pages in both directions */}
          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 13,
              color: '#a5a7ad',
              marginTop: 24,
              marginBottom: 0,
            }}
          >
            Also read:{' '}
            <Link href="/how-to-pitch-a-tv-show" style={inlineLink}>
              How to Pitch a TV Show
            </Link>
            {' · '}
            <Link href="/sizzle-reel" style={inlineLink}>
              What Is a Sizzle Reel?
            </Link>
            {' · '}
            <Link href="/tv-show-pitch-deck" style={inlineLink}>
              Free Pitch Deck Template
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
