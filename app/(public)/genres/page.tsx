// ============================================================
// Public genres page — driven by site_genres + site_shows DB tables.
// Genre order from site_genres.sort_order; shows ordered by sort_order
// within each genre. Server Component — no 'use client'. Inline styles only.
// ============================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { query } from '@/lib/db';

// --- SEO metadata ---
const OG_IMAGE = 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67c9c4bc80ecce7a341a501c_MYE%20Banner%20.png';

export const metadata: Metadata = {
  title: 'TV Show Genres | MY Entertainment',
  description:
    'Browse MY Entertainment shows by genre: Paranormal & Supernatural, Sports & Competition, Home & Lifestyle, Crime & Mystery, Comedy, and Food & Travel.',
  alternates: { canonical: 'https://www.myentertainment.tv/genres' },
  openGraph: {
    title: 'TV Show Genres | MY Entertainment',
    description: 'Browse MY Entertainment productions by genre — Paranormal, Sports, Crime, Comedy, Lifestyle, and more.',
    url: 'https://www.myentertainment.tv/genres',
    siteName: 'MY Entertainment',
    type: 'website',
    images: [{ url: OG_IMAGE, width: 1887, alt: 'MY Entertainment TV genres' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TV Show Genres | MY Entertainment',
    description: 'Browse MY Entertainment productions by genre — Paranormal, Sports, Crime, Comedy, and more.',
    images: [OG_IMAGE],
  },
};

// ---------------------------------------------------------------------------
// Design token constants (from live Webflow CSS)
// ---------------------------------------------------------------------------
// --mye-red: #e51d26
// body bg: #000
// section padding: 80px 0
// container max-width: 1180px

// ---------------------------------------------------------------------------
// Shared style helpers
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

const genreHeading: React.CSSProperties = {
  fontFamily: "'Roboto', sans-serif",
  fontSize: 32,
  fontWeight: 400,
  color: '#e51d26',
  textTransform: 'uppercase',
  marginTop: 0,
  marginBottom: 24,
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
// DB row types
// ---------------------------------------------------------------------------

type SiteGenre = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

type SiteShow = {
  title: string;
  slug: string;
  image_url: string | null;
  imdb_url: string | null;
  genre: string;
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.myentertainment.tv/' },
    { '@type': 'ListItem', position: 2, name: 'Genres', item: 'https://www.myentertainment.tv/genres' },
  ],
};

export default function GenresPage() {
  const genresRaw = query<SiteGenre>(
    `SELECT id, name, slug, sort_order FROM site_genres ORDER BY sort_order ASC, name ASC`
  );
  const genres = JSON.parse(JSON.stringify(genresRaw)) as SiteGenre[];

  const showsRaw = query<SiteShow>(
    `SELECT title, slug, image_url, imdb_url, genre
     FROM site_shows
     WHERE status = 'active' AND image_url IS NOT NULL
     ORDER BY sort_order ASC, title ASC`
  );
  const shows = JSON.parse(JSON.stringify(showsRaw)) as SiteShow[];

  // Group shows by genre name for O(1) lookup per section
  const showsByGenre: Record<string, SiteShow[]> = {};
  for (const show of shows) {
    if (!showsByGenre[show.genre]) showsByGenre[show.genre] = [];
    showsByGenre[show.genre].push(show);
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <style>{`
        .mye-genre-shows-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 4px;
        }
        @media (max-width: 640px) {
          .mye-genre-shows-grid { grid-template-columns: 1fr; }
        }
        .mye-genre-show-thumb:hover { opacity: 0.85; }
      `}</style>

      {/* PAGE HEADER */}
      <section
        style={{
          background: '#000',
          paddingTop: 100,
          paddingBottom: 40,
          textAlign: 'center',
        }}
      >
        <h1 style={{ ...subtitleSmall, marginBottom: 0 }}>GENRES</h1>
      </section>

      {/* GENRE SECTIONS — driven by site_genres table */}
      {genres.map((genre, i) => {
        const genreShows = showsByGenre[genre.name] ?? [];
        if (genreShows.length === 0) return null;

        return (
          <section
            id={genre.slug}
            key={genre.id}
            style={{
              background: '#000',
              padding: i === 0 ? '20px 0 80px' : '80px 0',
            }}
          >
            <div style={container}>
              <h2 style={genreHeading}>{genre.name.toUpperCase()}</h2>

              <div className="mye-genre-shows-grid">
                {genreShows.map((show) => {
                  const isExternal = !!show.imdb_url?.includes('youtube.com') || !!show.imdb_url?.includes('youtu.be');
                  const href = isExternal ? show.imdb_url! : `/shows/${show.slug}`;

                  return isExternal ? (
                    <a
                      key={show.slug}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mye-genre-show-thumb"
                      style={{ display: 'block', transition: 'opacity 200ms' }}
                      title={show.title}
                    >
                      <img
                        src={show.image_url!}
                        alt={show.title}
                        loading="lazy"
                        style={{ width: '100%', display: 'block' }}
                      />
                    </a>
                  ) : (
                    <Link
                      key={show.slug}
                      href={href}
                      className="mye-genre-show-thumb"
                      style={{ display: 'block', transition: 'opacity 200ms' }}
                      title={show.title}
                    >
                      <img
                        src={show.image_url!}
                        alt={show.title}
                        loading="lazy"
                        style={{ width: '100%', display: 'block' }}
                      />
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      {/* CTA SECTION */}
      <section
        style={{
          background: '#000',
          padding: '80px 0',
          textAlign: 'center',
        }}
      >
        <div style={container}>
          <h2 style={{ ...h2Style, textAlign: 'center' }}>Ready To Work With The Best?</h2>
          <p style={{ ...bodyText, textAlign: 'center' }}>
            Reach out to learn more about how we can make great content together.
          </p>
          <a href="/contact" style={getStartedLink}>
            CONTACT US&nbsp; ❯
          </a>
        </div>
      </section>
    </>
  );
}
