// Press releases list page — /press-releases
//
// DATA FLOW:
//   DB (press_releases table, published_at DESC) is merged with 2 hardcoded editorial
//   entries at the top, then rendered as a flat list.
//
// MUST be force-dynamic: Railway's Docker build runs against an empty data/db.sqlite
// (gitignored, volume not mounted at build time). Without this directive Next.js
// statically generates the page at build time → 0 DB rows → only the 2 editorial
// entries ever surface. force-dynamic re-runs the DB query on every request.

export const dynamic = 'force-dynamic';
export const revalidate = 0;
//
// WHY HYBRID (not 100% DB-driven):
//   The two editorial pages (film-commission-crew-directories,
//   myentertainment-careers-assignment-desk) are hand-authored static Next.js routes,
//   NOT scraped into the DB.  They live at fixed URLs and must always appear at the
//   top of this list.  They are pinned here with hardcoded data that matches the
//   original PRESS_RELEASES array values.
//
// Server component — metadata export requires no 'use client'.
// Interactive FAQ accordion is in PressReleasesAccordion.tsx (client child).
// Webflow equivalent: .section heading + press list + FAQ accordion + CTA.

import type { Metadata } from 'next';
import PressReleasesAccordion from './PressReleasesAccordion';
import { query } from '@/lib/db';

const OG_IMAGE = 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67c9c4bc80ecce7a341a501c_MYE%20Banner%20.png';

export const metadata: Metadata = {
  title: 'Press Releases | MyEntertainment',
  description: 'MyEntertainment press releases — announcements, partnerships, show orders, and news from the leading independent non-fiction production company.',
  alternates: { canonical: 'https://www.myentertainment.tv/press-releases' },
  openGraph: {
    title: 'Press Releases | MyEntertainment',
    description: 'News and press releases from MyEntertainment — show orders, partnerships, and company announcements.',
    url: 'https://www.myentertainment.tv/press-releases',
    siteName: 'MyEntertainment',
    type: 'website',
    images: [{ url: OG_IMAGE, width: 1887, alt: 'MyEntertainment press releases' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Press Releases | MyEntertainment',
    description: 'News and press releases from MyEntertainment.',
    images: [OG_IMAGE],
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

type ListItem = {
  id: string;
  date: string;        // formatted "Month DD, YYYY"
  dateIso: string;     // "YYYY-MM-DD" for schema.org
  title: string;
  href: string;        // absolute internal path
};

// ─── Hardcoded editorial entries ──────────────────────────────────────────────
// These 2 press releases are static Next.js page routes, not DB records.
// They must always appear at the top of the list in reverse-chronological order.
// Slugs must exactly match the directory names under app/(public)/press-releases/.
const EDITORIAL_ENTRIES: ListItem[] = [
  {
    id: 'pr-editorial-careers',
    date: 'May 3, 2026',
    dateIso: '2026-05-03',
    title: 'WORKING AT MYENTERTAINMENT IS A TOTAL BLAST — ALL HIRING THROUGH ASSIGNMENT DESK',
    href: '/press-releases/myentertainment-careers-assignment-desk',
  },
  {
    id: 'pr-editorial-film-commission',
    date: 'May 3, 2026',
    dateIso: '2026-05-03',
    title: 'HOW TO FIND PRODUCTION CREW: FILM COMMISSION DIRECTORIES AND ASSIGNMENTDESK',
    href: '/press-releases/film-commission-crew-directories',
  },
];

// ─── DB helper ────────────────────────────────────────────────────────────────

/**
 * Query all press releases from the DB, ordered newest first.
 * Returns [] if the table is empty or if DB is unreachable at render time
 * (e.g. a cold Railway deploy before migrations have run).
 * Errors are surfaced to the console so they show up in Railway logs.
 */
// Async because query() returns a Promise in Postgres mode
async function fetchDbPressReleases(): Promise<ListItem[]> {
  try {
    const rows = await query<{
      id: string;
      headline: string;
      slug: string;
      published_at: number | null;
    }>(
      'SELECT id, headline, slug, published_at FROM press_releases ORDER BY published_at DESC'
    );

    return rows.map((row) => {
      // Format unix timestamp → human date.  Rows without a timestamp get
      // an empty date so the UI can omit the date label rather than show "Invalid Date".
      const displayDate =
        row.published_at && row.published_at > 0
          ? new Date(row.published_at * 1000).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : '';

      const isoDate =
        row.published_at && row.published_at > 0
          ? new Date(row.published_at * 1000).toISOString().split('T')[0]
          : '';

      return {
        id: row.id,
        date: displayDate,
        dateIso: isoDate,
        title: row.headline,
        href: `/press-releases/${row.slug}`,
      };
    });
  } catch (err) {
    // Don't crash the page — show editorial entries only and log the problem
    console.error('[press-releases page] DB query failed:', err);
    return [];
  }
}

// ─── Page component ───────────────────────────────────────────────────────────

export default async function PressReleasesPage() {
  // Merge: 2 pinned editorial entries first, then DB-driven entries below.
  // The editorial entries are guaranteed to appear even when the DB is empty.
  const dbEntries = await fetchDbPressReleases();
  const allItems: ListItem[] = [...EDITORIAL_ENTRIES, ...dbEntries];

  // ── ItemList schema.org JSON-LD ────────────────────────────────────────────
  // Combines editorial + DB entries in one ItemList for Google News rich results.
  const newsSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'MyEntertainment Press Releases',
    itemListElement: allItems.map((pr, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'NewsArticle',
        headline: pr.title,
        ...(pr.dateIso ? { datePublished: pr.dateIso } : {}),
        url: `https://www.myentertainment.tv${pr.href}`,
        publisher: {
          '@type': 'Organization',
          name: 'MyEntertainment',
          url: 'https://www.myentertainment.tv',
        },
      },
    })),
  };

  return (
    <div style={{ background: '#000' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(newsSchema) }} />

      {/* ── Section 1: Heading ── */}
      <section style={{ paddingTop: 100, paddingBottom: 40, paddingLeft: 20, paddingRight: 20, textAlign: 'center', background: '#000' }}>
        <h1 style={{ fontFamily: "'Roboto', sans-serif", fontSize: 48, fontWeight: 400, color: '#e51d26', textTransform: 'uppercase', letterSpacing: '0.2em', textAlign: 'center', margin: 0 }}>
          Press Releases
        </h1>
      </section>

      {/* ── Section 2: Press release list ── */}
      {/*
        Each item is a linked headline.  Editorial items link to their static page.tsx routes.
        DB items link to the [slug] dynamic route.
        Items without a date omit the date label entirely (rather than showing "").
      */}
      <section style={{ background: '#000', padding: '40px 20px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          {allItems.map((item) => (
            <div key={item.id} style={{ padding: '24px 0', borderBottom: '1px solid #1a1a1a' }}>
              {/* Date label — only rendered when we have a formatted date */}
              {item.date && (
                <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, color: '#e51d26', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                  {item.date}
                </div>
              )}
              <h3 style={{ margin: 0 }}>
                <a
                  href={item.href}
                  style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 18, fontWeight: 400, color: '#f2f4f7', textTransform: 'uppercase', textDecoration: 'none', lineHeight: 1.4 }}
                >
                  {item.title}
                </a>
              </h3>
            </div>
          ))}

          {/* Show count when DB has populated entries, hide placeholder when empty */}
          {dbEntries.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: "'Roboto', sans-serif", fontSize: 14, color: '#a5a7ad' }}>
              Additional press releases loading…
            </div>
          )}
        </div>
      </section>

      {/* ── FAQ accordion (client component) ── */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <h2 style={{ fontFamily: "'Roboto', sans-serif", fontSize: 32, fontWeight: 400, color: '#f2f4f7', textAlign: 'center', marginTop: 0, marginBottom: 40 }}>
          Frequently Asked Questions
        </h2>
        <PressReleasesAccordion />
      </section>

      {/* ── CTA section ── */}
      <section style={{ padding: '80px 20px', textAlign: 'center', background: '#000', borderTop: '1px solid #1a1a1a' }}>
        <h2 style={{ fontFamily: "'Roboto', sans-serif", fontSize: 32, fontWeight: 400, color: '#f2f4f7', textTransform: 'capitalize', marginBottom: 16, marginTop: 0 }}>
          Ready To Work With The Best?
        </h2>
        <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 14, color: '#a5a7ad', lineHeight: 1.7, marginBottom: 28, marginTop: 0 }}>
          Reach out to learn more about how we can make great content together.
        </p>
        <a href="/contact" style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 14, fontWeight: 500, color: '#e02027', textTransform: 'uppercase', textDecoration: 'none', letterSpacing: '0.05em' }}>
          CONTACT US &nbsp;&#10095;
        </a>
      </section>
    </div>
  );
}
