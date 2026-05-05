export const dynamic = 'force-dynamic';

// Server component — queries the available_titles table directly.
// Replaces the hardcoded AVAILABLE_SHOWS array with live DB data.
// Cards link to /available/[slug] when a slug exists, to vimeo_url when not,
// or are non-clickable when neither is set.

import type { Metadata } from 'next';
import Link from 'next/link';
import { query, initDb } from '@/lib/db';

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
function getTitles(): PublicTitle[] {
  try {
    initDb();
    const rows = query<PublicTitle>(
      'SELECT id, title, slug, image_url, vimeo_url FROM deck_sites WHERE is_active = 1 ORDER BY sort_order ASC, title ASC'
    );
    // Serialize through JSON to detach from the node:sqlite result proxy
    return JSON.parse(JSON.stringify(rows));
  } catch {
    return [];
  }
}

export default function AvailablePage() {
  const titles = getTitles();

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