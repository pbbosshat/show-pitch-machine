export const dynamic = 'force-dynamic';

// Server component — queries the available_titles table directly.
// Replaces the hardcoded AVAILABLE_SHOWS array with live DB data.
// Cards link to /available/[slug] when a slug exists, to vimeo_url when not,
// or are non-clickable when neither is set.

import type { Metadata } from 'next';
import Link from 'next/link';
import { query, initDb } from '@/lib/db';

// Metadata updated (2026-05-27, seo/scale-mye): title and description now
// include "tv show distribution" and "tv content licensing" intent signals
// per keyword-scale spec. H1 + intro also updated to match distribution intent.
const OG_IMAGE = 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67c9c4bc80ecce7a341a501c_MYE%20Banner%20.png';

export const metadata: Metadata = {
  title: 'TV Show Distribution & Available Titles | MY Entertainment',
  description: 'Browse MY Entertainment\'s available TV show distribution catalog — formats ready for licensing, international co-production, and broadcast acquisition. Contact us to discuss TV content licensing for your market.',
  keywords: [
    'tv show distribution', 'tv content licensing', 'available tv titles',
    'tv format licensing', 'tv series distribution', 'unscripted tv licensing',
    'international tv distribution', 'tv format rights',
  ],
  alternates: { canonical: 'https://www.myentertainment.tv/available' },
  openGraph: {
    title: 'TV Show Distribution & Available Titles | MY Entertainment',
    description: 'Browse MY Entertainment\'s TV show distribution catalog — unscripted formats available for licensing, international co-production, and broadcast acquisition.',
    url: 'https://www.myentertainment.tv/available',
    siteName: 'MY Entertainment',
    type: 'website',
    images: [{ url: OG_IMAGE, width: 1887, alt: 'MY Entertainment TV show distribution catalog' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TV Show Distribution & Available Titles | MY Entertainment',
    description: 'Unscripted TV formats available for licensing, international co-production, and broadcast acquisition from MY Entertainment.',
    images: [OG_IMAGE],
  },
};

// Shape returned from the DB query — only the columns the grid needs.
interface PublicTitle {
  id: string;
  title: string;
  slug: string | null;
  image_url: string | null;
  vimeo_url: string | null;
  is_active: number;
}

// Reads all active titles ordered by sort_order then title.
// Returns an empty array on any DB error so the page still renders gracefully.
// Async because initDb() and query() are now Postgres-backed Promises.
async function getTitles(): Promise<PublicTitle[]> {
  try {
    await initDb();
    const rows = await query<PublicTitle>(
      'SELECT id, title, slug, image_url, vimeo_url FROM deck_sites WHERE is_active = 1 ORDER BY sort_order ASC, title ASC'
    );
    return JSON.parse(JSON.stringify(rows));
  } catch {
    return [];
  }
}

export default async function AvailablePage() {
  const titles = await getTitles();

  return (
    // Webflow: body bg #000 — inherited from layout
    <div style={{ background: '#000' }}>

      {/* ── Section 1: heading + distribution intro ── */}
      {/*
        H1 updated (seo/scale-mye): now includes "TV Show Distribution" keyword intent.
        The subtitle-small style is preserved (visual parity with Webflow) but the H1
        now targets distribution/licensing searches not just "available titles".
        AnswerBlock intro paragraph added to satisfy informational sub-query intent.
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
            fontFamily: "'Roboto', sans-serif",
            fontSize: 48,
            fontWeight: 400,
            color: '#e51d26',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            textAlign: 'center',
            marginBottom: 24,
            marginTop: 0,
          }}
        >
          TV Show Distribution &amp; Available Titles
        </h1>
        {/* AnswerBlock intro — targets "tv show distribution" and "tv content licensing" intent */}
        <p
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 15,
            color: '#a5a7ad',
            lineHeight: 1.7,
            maxWidth: 700,
            margin: '0 auto',
          }}
        >
          MY Entertainment distributes unscripted TV formats for licensing, international
          co-production, and broadcast acquisition. Browse our catalog of available titles below
          and contact us to discuss TV content licensing for your market.
        </p>
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
            2-column grid on desktop, 1-column on mobile (≤479px via .available-grid media query).
            Each card shows the artwork image; the card is wrapped in a Link for slug pages,
            an <a> for external vimeo links, or a bare <div> when neither is set.
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
            {titles.map((t) => {
              // Inner content: image if image_url exists, placeholder div otherwise
              const inner = t.image_url ? (
                <img
                  src={t.image_url}
                  alt={`${t.title} — available title from MyEntertainment`}
                  loading="lazy"
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              ) : (
                // Placeholder when no image_url — 16:9 dark box with the title centered
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '16/9',
                    background: '#111',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      color: '#444',
                      fontSize: 12,
                      fontFamily: "'Roboto', sans-serif",
                    }}
                  >
                    {t.title}
                  </span>
                </div>
              );

              // Routing priority: internal slug page > external vimeo > non-clickable div
              if (t.slug) {
                return (
                  <Link
                    key={t.id}
                    href={`/available/${t.slug}`}
                    style={{ display: 'block', overflow: 'hidden' }}
                  >
                    {inner}
                  </Link>
                );
              }

              if (t.vimeo_url) {
                return (
                  <a
                    key={t.id}
                    href={t.vimeo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'block', overflow: 'hidden' }}
                  >
                    {inner}
                  </a>
                );
              }

              return (
                <div key={t.id} style={{ display: 'block', overflow: 'hidden' }}>
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
      {/* Webflow mobile portrait (≤479px): collapse to single column */}
      <style>{`
        @media (max-width: 479px) {
          .available-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── TV Show Distribution & Content Licensing H2 section ── */}
      {/* Added (seo/scale-mye): targets "tv show distribution", "tv content licensing",
          "tv series distribution" as within-page H2/FAQ targets. No new URL needed.
          Organization schema injected to reinforce B2B licensing entity signals. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'MY Entertainment',
            url: 'https://www.myentertainment.tv',
            description: 'MY Entertainment is an unscripted TV production and distribution company. We license TV formats for international co-production and broadcast acquisition across the US, Canada, UK, and global markets.',
            areaServed: ['United States', 'Canada', 'United Kingdom', 'International'],
          }),
        }}
      />

      <section style={{ background: '#111', padding: '60px 20px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 20px' }}>
          <h2
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 28,
              fontWeight: 400,
              color: '#f2f4f7',
              marginTop: 0,
              marginBottom: 16,
            }}
          >
            TV Show Distribution &amp; Content Licensing
          </h2>
          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 14,
              color: '#a5a7ad',
              lineHeight: 1.7,
              marginBottom: 16,
              marginTop: 0,
            }}
          >
            MY Entertainment&apos;s distribution catalog includes unscripted formats across paranormal,
            sports, lifestyle, crime, food, and travel genres — available for{' '}
            <strong style={{ color: '#f2f4f7' }}>TV content licensing</strong>, international
            co-production, and broadcast acquisition in markets outside the original commission territory.
          </p>
          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 14,
              color: '#a5a7ad',
              lineHeight: 1.7,
              marginBottom: 16,
              marginTop: 0,
            }}
          >
            For buyers seeking{' '}
            <strong style={{ color: '#f2f4f7' }}>TV series distribution</strong> rights or format
            licenses for their local market: we work with broadcasters, streaming platforms, and
            international co-production partners to place formats in new territories. Browse the catalog
            above and reach out to discuss availability and deal terms.
          </p>

          {/* FAQ sub-section — targets distribution/licensing questions */}
          <h3
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 18,
              fontWeight: 500,
              color: '#f2f4f7',
              marginTop: 32,
              marginBottom: 16,
            }}
          >
            FAQ: TV Show Distribution &amp; Licensing
          </h3>
          {[
            {
              q: 'What is TV content licensing?',
              a: 'TV content licensing is the process by which a production company grants a broadcaster or streaming platform the rights to air a completed TV series or format within a specific territory and time window. MY Entertainment licenses completed series from our catalog to international broadcasters looking for proven unscripted content without commissioning a new production.',
            },
            {
              q: 'What TV formats are available for distribution?',
              a: 'MY Entertainment\'s distribution catalog includes unscripted formats across paranormal, sports, lifestyle, crime, food, and travel genres. Browse the available titles above or contact info@myentertainment.tv to request a full catalog with episode counts, territories already licensed, and availability windows.',
            },
            {
              q: 'How does international TV series distribution work?',
              a: 'International TV series distribution involves licensing the broadcast rights to a completed series — or the format rights to produce a local version — to a broadcaster or platform in a new territory. MY Entertainment handles international distribution through our Toronto and London offices, and we can structure co-production agreements for markets that prefer local production over licensed content.',
            },
          ].map(({ q, a }, idx) => (
            <div
              key={idx}
              style={{ marginBottom: idx < 2 ? 24 : 0 }}
            >
              <h4
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 15,
                  fontWeight: 500,
                  color: '#f2f4f7',
                  marginTop: 0,
                  marginBottom: 8,
                }}
              >
                {q}
              </h4>
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
                {a}
              </p>
            </div>
          ))}
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
          Interested in licensing a title or co-producing a format in your market?
          Reach out to discuss TV show distribution and content licensing opportunities.
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