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
    'Browse all unscripted TV shows produced by MY Entertainment, including Ghost Adventures (28 seasons on Discovery), Destination Fear, Pros vs Joes, Paranormal Challenge, Legacy List (Emmy nominated), and 40+ more productions across paranormal, sports, crime, and lifestyle genres.',
  alternates: { canonical: 'https://www.myentertainment.tv/shows' },
  openGraph: {
    title: 'TV Shows | MY Entertainment',
    description: 'Browse 40+ unscripted TV shows from MY Entertainment: Ghost Adventures, Destination Fear, Pros vs Joes, Legacy List, Breaking Borders, and more for Discovery, PBS, A&E, and 28+ networks.',
    url: 'https://www.myentertainment.tv/shows',
    siteName: 'MY Entertainment',
    type: 'website',
    images: [{ url: OG_IMAGE, width: 1887, alt: 'MY Entertainment TV show catalog' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TV Shows | MY Entertainment',
    description: 'Browse 40+ unscripted TV shows from MY Entertainment: Ghost Adventures, Destination Fear, Pros vs Joes, and more.',
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

// ─── Hardcoded pinned shows ───────────────────────────────────────────────────
// Same hybrid pattern as /press-releases: hardcoded entries merged with DB rows.
// These two titles have real detail pages (their data lives in lib/data/shows.ts)
// and artwork in public/shows/, but no site_shows row yet — so they are declared
// here to guarantee they surface in the grid.
//   • imdb_url is null → they render as INTERNAL <Link> tiles to /shows/<slug>.
//   • sort_order is unused for these; PINNED_ORDER below drives their position.
// MIGRATION PATH: once a real site_shows row exists for either slug, the DB row
// wins (see the de-duplication guard in mergeShows) and the matching entry here
// becomes inert and can simply be deleted.
const PINNED_SHOWS: SiteShow[] = [
  {
    id: 'pinned-14-days-in-gainesville',
    title: '14 Days in Gainesville',
    slug: '14-days-in-gainesville',
    image_url: '/shows/14-days-in-gainesville.png',
    imdb_url: null,
    status: 'active',
    sort_order: 0,
  },
  {
    id: 'pinned-snooki-the-paranormal-rookie',
    title: 'Snooki: The Paranormal Rookie',
    slug: 'snooki-the-paranormal-rookie',
    image_url: '/shows/snooki-the-paranormal-rookie.png',
    imdb_url: null,
    status: 'active',
    sort_order: 0,
  },
];

// ─── Explicit lead-off order ──────────────────────────────────────────────────
// The first six tiles of the grid, by slug, in the exact order they must appear.
// Anything not listed here keeps its DB order (sort_order ASC, title ASC) and
// follows after them. Slugs verified against site_shows — do not guess them.
const PINNED_ORDER: string[] = [
  'ghost-adventures',
  '14-days-in-gainesville',
  'snooki-the-paranormal-rookie',
  'billy-buys-brooklyn',
  'baggage-battles',
  'uninterrupted-the-real-stories-of-basketball',
];

// ─── TEMPORARY image overrides ───────────────────────────────────────────────
// Code-side override for a show's artwork, keyed by slug. Applied to DB rows
// after they are fetched, so the grid can show new key art without a DB write.
// PROPER HOME: the image_url column on site_shows, editable from the
// /marketing/shows admin screen. Once image_url is updated there, DELETE the
// matching entry below — it only exists because we could not write to the DB.
const IMAGE_OVERRIDES: Record<string, string> = {
  'ghost-adventures': '/shows/ghost-adventures-new-season.jpg',
};

// ─── TEMPORARY hidden slugs ──────────────────────────────────────────────────
// Code-side hide for a site_shows row that has NO matching entry in
// lib/data/shows.ts, so its tile links to a /shows/<slug> detail page that does
// not exist and 404s. Filtered out in mergeShows so the dead tile never renders.
// PROPER FIX: set status='archived' on that row from the /marketing/shows admin
// screen — the grid query already excludes archived rows. Once that is done,
// DELETE the matching entry below; it only exists because we could not write to
// the DB.
const HIDDEN_SLUGS = new Set<string>([
  'sandy-show-and-tell-killer',
]);

/**
 * Merge hardcoded PINNED_SHOWS with the DB rows, then apply PINNED_ORDER.
 *
 * De-duplication guard: a hardcoded entry is dropped whenever a site_shows row
 * with the same slug exists. The DB always wins, so adding the rows later can
 * never produce a duplicate tile.
 *
 * Ordering: slugs in PINNED_ORDER come first, in that exact order; everything
 * else follows in the order the DB returned it (Array.sort is stable in ES2019+).
 */
function mergeShows(dbShows: SiteShow[]): SiteShow[] {
  // Drop the temporary HIDDEN_SLUGS above before anything else sees these rows.
  dbShows = dbShows.filter((s) => !HIDDEN_SLUGS.has(s.slug));
  const dbSlugs = new Set(dbShows.map((s) => s.slug));
  // Apply the temporary IMAGE_OVERRIDES above; every other row passes through unchanged.
  const overridden = dbShows.map((s) =>
    IMAGE_OVERRIDES[s.slug] ? { ...s, image_url: IMAGE_OVERRIDES[s.slug] } : s
  );
  const merged = [...overridden, ...PINNED_SHOWS.filter((s) => !dbSlugs.has(s.slug))];

  // Not in the list → Infinity, i.e. sorts after every pinned slug and keeps DB order.
  const rank = (s: SiteShow) => {
    const i = PINNED_ORDER.indexOf(s.slug);
    return i === -1 ? Number.POSITIVE_INFINITY : i;
  };

  return merged.sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra === rb) return 0;
    return ra < rb ? -1 : 1;
  });
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
  const shows = mergeShows(await getShows());

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
        .mye-show-thumb-page img {
          width: 100%;
          aspect-ratio: 2/1;
          object-fit: cover;
          display: block;
        }
        .mye-show-no-img {
          width: 100%;
          aspect-ratio: 2/1;
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