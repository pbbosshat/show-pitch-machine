// ============================================================
// /tv-buyers — B2B Distribution / Licensing Page
// Target keywords: "unscripted tv buyers" (vol 0, correct ICP term)
//                  "tv content licensing" (vol 20, correct ICP term)
//
// CONDITIONAL RESOLUTION (seo/scale-mye 2026-05-27):
//   The spec calls for a /buyers page targeting B2B distribution/licensing.
//   HOWEVER: the internal CRM already uses /buyers (app/(internal)/buyers)
//   and /buyers/[id] for buyer contact management — it is wired into Nav.tsx,
//   NetworkDetailClient, and DashboardBuyerCards with 20+ references.
//   Moving the internal route would break the CRM application.
//   Resolution: public SEO page built at /tv-buyers instead.
//   URL: https://www.myentertainment.tv/tv-buyers
//   All footer/header/sitemap references updated to /tv-buyers accordingly.
//
// Schema: Organization + Service (distribution/licensing entity signals)
// Server Component — no 'use client'. All styles inline.
// Design tokens: bg #000, body #a5a7ad, headings #f2f4f7, accent #e51d26.
// ============================================================

import type { Metadata } from 'next';
import Link from 'next/link';

// ------------------------------------------------------------
// Metadata — title.absolute bypasses root layout title.template
// so the buyer-intent keyword phrase is the <title> in the SERP.
// ------------------------------------------------------------
export const metadata: Metadata = {
  title: {
    absolute: 'TV Buyers & Content Licensing | MY Entertainment',
  },
  description:
    'MY Entertainment works with broadcasters, streamers, and unscripted TV buyers worldwide. Browse our available catalog, explore co-production opportunities, and contact us about TV content licensing for your market.',
  keywords: [
    'unscripted tv buyers', 'tv content licensing', 'tv format licensing',
    'tv series distribution', 'tv format rights', 'unscripted tv distribution',
    'tv co-production', 'tv format acquisition',
  ],
  alternates: { canonical: 'https://www.myentertainment.tv/tv-buyers' },
  openGraph: {
    title: 'TV Buyers & Content Licensing | MY Entertainment',
    description:
      'MY Entertainment works with broadcasters, streamers, and TV buyers worldwide. Browse our available catalog and explore TV content licensing opportunities.',
    url: 'https://www.myentertainment.tv/tv-buyers',
    siteName: 'MY Entertainment',
    type: 'website',
    images: [{
      url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67c9c4bc80ecce7a341a501c_MYE%20Banner%20.png',
      width: 1887,
      alt: 'MY Entertainment — TV Buyers & Content Licensing',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TV Buyers & Content Licensing | MY Entertainment',
    description:
      'MY Entertainment works with broadcasters, streamers, and TV buyers worldwide. Browse our available catalog and explore TV content licensing opportunities.',
  },
};

// ------------------------------------------------------------
// Design token constants — verbatim from /sizzle-reel and
// /tv-production-company for visual consistency.
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
// Organization JSON-LD schema — signals MY Entertainment as a
// content distribution entity to Google and LLMs.
// ------------------------------------------------------------
const orgSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'MY Entertainment',
  url: 'https://www.myentertainment.tv',
  foundingDate: '2000',
  description:
    'MY Entertainment is an unscripted TV production and distribution company based in New York, with offices in Toronto and London. We develop, produce, and distribute non-fiction television content for broadcasters and streaming platforms worldwide. We work with TV buyers on content licensing, international co-production, and format acquisition.',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '235 E 45th St., Floor 14 West',
    addressLocality: 'New York',
    addressRegion: 'NY',
    postalCode: '10017',
    addressCountry: 'US',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'info@myentertainment.tv',
    contactType: 'business development',
  },
};

// Service schema — positions this page as a distribution/licensing service
const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'TV Content Licensing & Distribution',
  description:
    'MY Entertainment licenses completed TV series and format rights to broadcasters and streaming platforms worldwide. We also structure international co-production deals for markets that prefer local production.',
  provider: {
    '@type': 'Organization',
    name: 'MY Entertainment',
    url: 'https://www.myentertainment.tv',
  },
  areaServed: [
    { '@type': 'Country', name: 'United States' },
    { '@type': 'Country', name: 'Canada' },
    { '@type': 'Country', name: 'United Kingdom' },
    { '@type': 'Country', name: 'International' },
  ],
  serviceType: 'TV Content Licensing',
  url: 'https://www.myentertainment.tv/tv-buyers',
};

// What MY Entertainment offers buyers — the three deal types
const BUYER_OFFERINGS = [
  {
    title: 'Content Licensing',
    body: 'License completed series from the MY Entertainment catalog for broadcast or streaming in your territory. We offer flexible windowing arrangements — broadcast-first, SVOD, AVOD — and can accommodate exclusive and non-exclusive deals depending on market and territory.',
  },
  {
    title: 'Format Acquisition',
    body: 'Acquire the local production rights to an MY Entertainment format for your market. We have developed format structures that have proven themselves across multiple territories — a local production can move faster than a licensing negotiation in markets with strong production infrastructure.',
  },
  {
    title: 'International Co-Production',
    body: 'MY Entertainment has co-production experience across the US, Canada, and UK. If you represent a broadcaster looking to share production costs and intellectual property across multiple markets, our Toronto and London offices can structure a co-production deal that gives you local editorial input and territorial rights.',
  },
];

// Genres available in the distribution catalog
const CATALOG_GENRES = [
  'Paranormal & Supernatural',
  'True Crime & Investigation',
  'Travel & Adventure',
  'Lifestyle & Home',
  'Sports & Competition',
  'Food & Culture',
  'Documentary Series',
  'Children\'s Programming',
];

// ------------------------------------------------------------
// Page Component
// ------------------------------------------------------------
export default function TVBuyersPage() {
  return (
    <div style={{ background: '#000' }}>
      {/* ── Schema markup ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />

      {/* Responsive styles */}
      <style>{`
        .tvbuyers-prose { max-width: 780px; margin: 0 auto; }
        .tvbuyers-offering-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-top: 32px;
        }
        @media (max-width: 900px) {
          .tvbuyers-offering-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 600px) {
          .tvbuyers-offering-grid { grid-template-columns: 1fr; }
        }
        .tvbuyers-genre-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 20px;
        }
        .tvbuyers-cta-btn:hover, .tvbuyers-cta-btn:focus-visible { opacity: 0.85; }
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
      {/* H1 targets "unscripted tv buyers" and "tv content licensing" ICP.  */}
      {/* paddingTop 100px clears the fixed navbar.                          */}
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
          For Broadcasters &amp; Buyers
        </p>

        {/* H1 — one per page; targets "tv buyers" and "content licensing" intent */}
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
          TV Buyers &amp; Content Licensing
        </h1>

        {/* AnswerBlock intro — definitional paragraph for broadcasters and buyers */}
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
          MY Entertainment licenses unscripted TV content and format rights to broadcasters,
          streamers, and co-production partners worldwide. With 25+ years of unscripted production
          and distribution experience — and offices in New York, Toronto, and London — we have the
          catalog depth, the format range, and the deal-structure flexibility to serve buyers across
          every major English-language market.
        </p>

        {/* Stat row — proof points for buyers evaluating MYE as a partner */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 48,
            flexWrap: 'wrap',
          }}
        >
          {[
            { stat: '25+', label: 'Years in Business' },
            { stat: '28+', label: 'Network Relationships' },
            { stat: '3', label: 'Offices Worldwide' },
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
      {/* SECTION 2 — What we offer buyers (three deal types)                 */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <h2 style={{ ...h2Style, textAlign: 'center' }}>
            How We Work With TV Buyers
          </h2>
          <p
            style={{
              ...bodyText,
              textAlign: 'center',
              maxWidth: 640,
              margin: '0 auto 8px',
            }}
          >
            Whether you are a linear broadcaster, a streaming platform, or an international
            co-production partner, MY Entertainment can structure a deal that works for your market.
          </p>

          {/* Three-card offering grid */}
          <div className="tvbuyers-offering-grid">
            {BUYER_OFFERINGS.map(({ title, body }) => (
              <div
                key={title}
                style={{
                  background: '#000',
                  border: '1px solid #2a2a2a',
                  borderTop: '3px solid #e51d26',
                  borderRadius: 4,
                  padding: '24px 20px',
                }}
              >
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
      {/* SECTION 3 — Catalog genres                                          */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="tvbuyers-prose">
            <h2 style={h2Style}>Our Content Catalog by Genre</h2>
            <p style={bodyText}>
              The MY Entertainment catalog spans the full range of unscripted and non-fiction television
              genres. We have produced content in each of the following categories — available for
              licensing, format acquisition, or co-production depending on territorial availability:
            </p>

            <div className="tvbuyers-genre-chips">
              {CATALOG_GENRES.map((genre) => (
                <span
                  key={genre}
                  style={{
                    fontFamily: "'Roboto Condensed', sans-serif",
                    fontSize: 12,
                    color: '#f2f4f7',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    borderRadius: 2,
                    padding: '5px 12px',
                  }}
                >
                  {genre}
                </span>
              ))}
            </div>

            <p style={{ ...bodyText, marginTop: 24 }}>
              For a complete catalog of available titles — including episode counts, format descriptions,
              and territorial availability — see our{' '}
              <Link href="/available" style={inlineLink}>
                Available Titles page
              </Link>
              {' '}or contact us directly at{' '}
              <a href="mailto:info@myentertainment.tv" style={inlineLink}>
                info@myentertainment.tv
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 4 — TV Content Licensing explained                          */}
      {/* Targets "tv content licensing" sub-query.                          */}
      {/* ================================================================== */}
      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={container}>
          <div className="tvbuyers-prose">
            <h2 style={h2Style}>TV Content Licensing — How It Works</h2>
            <p style={bodyText}>
              <strong style={{ color: '#f2f4f7' }}>TV content licensing</strong> is the process by which
              a production company grants a broadcaster or streaming platform the right to air a completed
              television series within a specific territory and for a defined time window.
            </p>
            <p style={bodyText}>
              For unscripted TV content, the typical licensing deal includes:
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
                <strong style={{ color: '#f2f4f7' }}>Territory:</strong> The geographic market in which
                the licensee can broadcast or stream the content.
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong style={{ color: '#f2f4f7' }}>Window:</strong> The time period during which
                the license is active — typically 2–5 years with options to renew.
              </li>
              <li style={{ marginBottom: 8 }}>
                <strong style={{ color: '#f2f4f7' }}>Platform rights:</strong> Whether the license
                covers linear broadcast, SVOD, AVOD, or a combination.
              </li>
              <li>
                <strong style={{ color: '#f2f4f7' }}>Exclusivity:</strong> Whether the licensee has
                exclusive rights in the territory.
              </li>
            </ul>
            <p style={bodyText}>
              MY Entertainment&apos;s distribution team can walk you through the available deal structures
              for any title in our catalog. Contact us at{' '}
              <a href="mailto:info@myentertainment.tv" style={inlineLink}>
                info@myentertainment.tv
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 5 — Why buyers choose MY Entertainment                      */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={container}>
          <div className="tvbuyers-prose">
            <h2 style={h2Style}>Why Broadcasters Choose MY Entertainment</h2>
            <p style={bodyText}>
              MY Entertainment has been a production and distribution partner for broadcasters across
              three continents for 25 years. Here is what buyers consistently value about working with us:
            </p>

            {[
              {
                label: 'Proven formats with long track records',
                body: 'Ghost Adventures — 28 seasons on Travel Channel — is the longest-running paranormal series in US cable history. Buyers who license formats with that kind of track record know the audience is real and the format is proven.',
              },
              {
                label: 'Flexible deal structure',
                body: 'We work with broadcasters at every budget level — from single-territory AVOD licensing through to multi-territory co-production with shared IP. We do not apply a one-size deal structure to every buyer.',
              },
              {
                label: 'Multi-territory experience',
                body: 'With offices in New York, Toronto, and London, we have structured deals in the US, Canada, UK, Australia, and across Europe. We understand the regulatory and commissioning context in each major English-language market.',
              },
            ].map(({ label, body }) => (
              <div
                key={label}
                style={{
                  borderLeft: '3px solid #e51d26',
                  paddingLeft: 16,
                  marginBottom: 24,
                }}
              >
                <h3 style={{ ...h3Style, marginBottom: 8 }}>{label}</h3>
                <p style={{ ...bodyText, marginBottom: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 6 — CTA + cluster cross-links                               */}
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
            Explore Our Content Catalog
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
            Browse our available titles or contact us directly to discuss licensing, format
            acquisition, or co-production opportunities for your market.
          </p>

          {/* Primary CTA — available titles catalog */}
          <span className="mye-tooltip-wrap" style={{ display: 'inline-block', marginBottom: 16 }}>
            <Link
              href="/available"
              className="tvbuyers-cta-btn"
              aria-label="Browse MY Entertainment's available TV titles for licensing"
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
              <span aria-hidden="true">→</span>
              Browse Available Titles
            </Link>
            <span className="mye-tooltip" aria-hidden="true">
              Go to the Available Titles catalog
            </span>
          </span>

          {/* Secondary CTA — /work-with-us, ghost/outline style. /work-with-us was
              previously only a buried cross-link at the bottom of this page; this
              promotes it to a real button next to the primary catalog CTA. */}
          <span className="mye-tooltip-wrap" style={{ display: 'inline-block', marginBottom: 16, marginLeft: 12 }}>
            <Link
              href="/work-with-us"
              className="tvbuyers-cta-btn"
              aria-label="Work with MY Entertainment"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'transparent',
                color: '#a5a7ad',
                border: '2px solid #5f6266',
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
              Work With MY Entertainment →
            </Link>
            <span className="mye-tooltip" aria-hidden="true">
              Go to the Work With MYE page
            </span>
          </span>

          {/* Secondary CTA — email inquiry */}
          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 14,
              color: '#a5a7ad',
              marginTop: 16,
              marginBottom: 24,
            }}
          >
            Or contact us directly:{' '}
            <a href="mailto:info@myentertainment.tv" style={inlineLink}>
              info@myentertainment.tv
            </a>
          </p>

          {/* Cluster cross-links — passes PageRank to distribution and production pages */}
          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 13,
              color: '#a5a7ad',
              marginTop: 24,
              marginBottom: 0,
            }}
          >
            Also explore:{' '}
            <Link href="/tv-production-company" style={inlineLink}>
              TV Production Services
            </Link>
            {' · '}
            <Link href="/documentary" style={inlineLink}>
              Documentary Production
            </Link>
            {' · '}
            <Link href="/international" style={inlineLink}>
              International
            </Link>
            {' · '}
            <Link href="/work-with-us" style={inlineLink}>
              Work With MYE
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
