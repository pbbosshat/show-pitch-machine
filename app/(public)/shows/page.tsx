export const dynamic = 'force-dynamic';

// ============================================================
// Public shows page — queries site_shows directly (no HTTP fetch, no auth loop).
// Edits made in /marketing/shows are reflected here immediately on next page load.
// Server Component — no 'use client'. Inline styles only.
// ============================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { query } from '@/lib/db';

const OG_IMAGE = 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67c9c4bc80ecce7a341a501c_MYE%20Banner%20.png';

export const metadata: Metadata = {
  title: 'Shows | MY Entertainment',
  description:
    'Browse all unscripted TV shows produced by MY Entertainment — including Ghost Adventures (28 seasons on Discovery), Destination Fear, Pros vs Joes, Paranormal Challenge, Legacy List (Emmy nominated), and 40+ more productions across paranormal, sports, crime, and lifestyle genres.',
  alternates: { canonical: 'https://www.myentertainment.tv/shows' },
  openGraph: {
    title: 'TV Shows | MY Entertainment',
    description: 'Browse 40+ unscripted TV shows from MY Entertainment — Ghost Adventures, Destination Fear, Pros vs Joes, Legacy List, Breaking Borders, and more for Discovery, PBS, A&E, and 28+ networks.',
    url: 'https://www.myentertainment.tv/shows',
    siteName: 'MY Entertainment',
    type: 'website',
    images: [{ url: OG_IMAGE, width: 1887, alt: 'MY Entertainment TV show catalog' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TV Shows | MY Entertainment',
    description: 'Browse 40+ unscripted TV shows from MY Entertainment — Ghost Adventures, Destination Fear, Pros vs Joes, and more.',
    images: [OG_IMAGE],
  },
};

interface SiteShow {
  id: string;
  title: string;
  slug: string;
  image_url: string | null;
  imdb_url: string | null;
  status: string;
  sort_order: number;
}

// Async because query() returns a Promise in Postgres mode
async function getShows(): Promise<SiteShow[]> {
  try {
    const rows = await query<SiteShow>(
      "SELECT id, title, slug, image_url, imdb_url, status, sort_order FROM site_shows WHERE status != 'archived' ORDER BY sort_order ASC, title ASC LIMIT 200"
    );
    return JSON.parse(JSON.stringify(rows));
  } catch { return []; }
}

// ---------------------------------------------------------------------------
// Shared styles mirroring Webflow CSS
// ---------------------------------------------------------------------------
const container: React.CSSProperties = {
  maxWidth: 1180,
  margin: '0 auto',
  padding: '0 20px',
};

const subtitleSmall: React.CSSProperties = {
  fontFamily: "'Roboto', sans-serif",
  fontSize: 48,
  fontWeight: 400,
  color: '#e51d26',
  textTransform: 'uppercase',
  letterSpacing: '0.2em',
  textAlign: 'center',
  marginBottom: 35,
};

const h2Style: React.CSSProperties = {
  fontFamily: "'Roboto', sans-serif",
  fontSize: 32,
  fontWeight: 400,
  color: '#f2f4f7',
  textTransform: 'capitalize',
  marginTop: 0,
  marginBottom: 12,
};

const getStartedLink: React.CSSProperties = {
  color: '#e02027',
  textTransform: 'uppercase',
  fontWeight: 500,
  fontFamily: "'Roboto Condensed', sans-serif",
  textDecoration: 'none',
  display: 'inline-block',
  marginTop: 24,
};

const bodyText: React.CSSProperties = {
  color: '#a5a7ad',
  fontFamily: "'Roboto', sans-serif",
  fontSize: 14,
  lineHeight: 1.7,
  margin: 0,
};

// ---------------------------------------------------------------------------
// BreadcrumbList schema — helps search engines understand page hierarchy and
// display breadcrumb trails in SERPs. Updated to use canonical "MY Entertainment" name.
const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'MY Entertainment', item: 'https://www.myentertainment.tv/' },
    { '@type': 'ListItem', position: 2, name: 'Shows', item: 'https://www.myentertainment.tv/shows' },
  ],
};

export default async function ShowsPage() {
  const shows = await getShows();

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <style>{`
        .mye-shows-page-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 4px;
        }
        @media (max-width: 1100px) { .mye-shows-page-grid { grid-template-columns: repeat(4, 1fr); } }
        @media (max-width: 700px)  { .mye-shows-page-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 480px)  { .mye-shows-page-grid { grid-template-columns: repeat(2, 1fr); } }
        .mye-show-thumb-page:hover { opacity: 0.85; }
        .mye-show-thumb-page img { width: 100%; display: block; }
        .mye-show-no-img {
          width: 100%;
          aspect-ratio: 16/9;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #111;
          color: #555;
          font-family: 'Roboto', sans-serif;
          font-size: 12px;
          text-align: center;
          padding: 8px;
        }
      `}</style>

      {/* PAGE HEADER */}
      <section style={{ background: '#000', paddingTop: 100, paddingBottom: 40, textAlign: 'center' }}>
        <h1 style={{ ...subtitleSmall, marginBottom: 0 }}>SHOWS</h1>
      </section>

      {/* SHOWS GRID */}
      <section style={{ background: '#000', padding: '40px 0 80px' }}>
        <div style={container}>
          <div className="mye-shows-page-grid">
            {shows.map((show) => {
              const isExternal = !!show.imdb_url;
              const href = isExternal ? show.imdb_url! : `/shows/${show.slug}`;

              return isExternal ? (
                <a
                  key={show.id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mye-show-thumb-page"
                  style={{ display: 'block', transition: 'opacity 200ms' }}
                  title={show.title}
                >
                  {show.image_url
                    ? <img src={show.image_url} alt={show.title} loading="lazy" />
                    : <div className="mye-show-no-img">{show.title}</div>
                  }
                </a>
              ) : (
                <Link
                  key={show.id}
                  href={href}
                  className="mye-show-thumb-page"
                  style={{ display: 'block', transition: 'opacity 200ms' }}
                  title={show.title}
                >
                  {show.image_url
                    ? <img src={show.image_url} alt={show.title} loading="lazy" />
                    : <div className="mye-show-no-img">{show.title}</div>
                  }
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#000', padding: '80px 0', textAlign: 'center' }}>
        <div style={container}>
          <h2 style={{ ...h2Style, textAlign: 'center' }}>Ready To Work With The Best?</h2>
          <p style={{ ...bodyText, textAlign: 'center' }}>
            Reach out to learn more about how we can make great content together.
          </p>
          <a href="/contact" style={getStartedLink}>CONTACT US&nbsp; ❯</a>
        </div>
      </section>
    </>
  );
}