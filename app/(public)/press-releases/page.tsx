// Press releases list page — /press-releases
//
// DATA FLOW:
//   Three sources are merged into ONE flat list, sorted by dateIso DESCENDING
//   (newest first).  Items with no date sort last, keeping their relative order.
//     1. COVERAGE_ENTRIES  — hardcoded EXTERNAL press coverage (links off-site)
//     2. EDITORIAL_ENTRIES — hardcoded internal static Next.js routes
//     3. DB rows           — press_releases table (internal [slug] route)
//   Nothing is pinned to the top any more: the list is purely date-ordered.
//
// MUST be force-dynamic: Railway's Docker build has no reachable Postgres
// (DATABASE_URL is not wired up at build time). Without this directive Next.js
// statically generates the page at build time → 0 DB rows → only the hardcoded
// entries ever surface. force-dynamic re-runs the DB query on every request.

export const dynamic = 'force-dynamic';
export const revalidate = 0;
//
// WHY HYBRID (not 100% DB-driven):
//   The two editorial pages (film-commission-crew-directories,
//   myentertainment-careers-assignment-desk) are hand-authored static Next.js routes,
//   NOT scraped into the DB.  They live at fixed URLs, so they are hardcoded here with
//   data that matches the original PRESS_RELEASES array values.
//   The coverage entries are third-party articles about our shows — they are not ours
//   to publish, so they are hardcoded, open in a new tab, and credit their own outlet
//   as publisher in the JSON-LD.
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
  description: 'MyEntertainment press releases: announcements, partnerships, show orders, and news from the leading independent non-fiction production company.',
  alternates: { canonical: 'https://www.myentertainment.tv/press-releases' },
  openGraph: {
    title: 'Press Releases | MyEntertainment',
    description: 'News and press releases from MyEntertainment: show orders, partnerships, and company announcements.',
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
  href: string;        // internal path, or an absolute URL when external
  outlet?: string;     // external only — the publication that ran the piece
  show?: string;       // external only — which MYE show the item is about
  external?: boolean;  // true → off-site link, opens in a new tab
};

// ─── Hardcoded external press coverage ────────────────────────────────────────
// Third-party articles about MyEntertainment shows.  These link off-site, so they
// open in a new tab and credit their own outlet (never MyEntertainment) as publisher.
const COVERAGE_ENTRIES: ListItem[] = [
  {
    id: 'pr-coverage-yt-ctv-news-snooki-on-crave',
    date: 'October 2, 2026',
    dateIso: '2026-10-02',
    title: 'Snooki: The Paranormal Rookie is on Crave!',
    href: 'https://www.youtube.com/watch?v=dguhVxxh43E',
    outlet: 'YouTube',
    show: 'Snooki: The Paranormal Rookie',
    external: true,
  },
  {
    id: 'pr-coverage-bellmedia-snooki-ghosties',
    date: 'October 1, 2026',
    dateIso: '2026-10-01',
    title: 'Are The Ghosties Ready for SNOOKI: THE PARANORMAL ROOKIE? ‘It’s scary, it’s spooky, and you’re seeing it the way we’re seeing it’',
    href: 'https://www.bellmedia.ca/the-lede/press/are-the-ghosties-ready-for-snooki-the-paranormal-rookie-its-scary-its-spooky-and-youre-seeing-it-the-way-were-seeing-it/',
    outlet: 'Bell Media',
    show: 'Snooki: The Paranormal Rookie',
    external: true,
  },
  {
    id: 'pr-coverage-yt-ctv-your-morning-snooki',
    date: 'October 1, 2026',
    dateIso: '2026-10-01',
    title: 'From Seaside to Spooky: Snooki on Becoming a Paranormal Investigator | Your Morning - CTV',
    href: 'https://www.youtube.com/watch?v=XLdozmFk7_k',
    outlet: 'YouTube',
    show: 'Snooki: The Paranormal Rookie',
    external: true,
  },
  {
    id: 'pr-coverage-pennlive-ghost-adventures-s30',
    date: 'September 30, 2026',
    dateIso: '2026-09-30',
    title: '‘Ghost Adventures’ returns for season 30 with haunting Las Vegas premiere',
    href: 'https://www.pennlive.com/tv/2026/09/ghost-adventures-returns-for-season-30-with-haunting-las-vegas-premiere.html',
    outlet: 'PennLive',
    show: 'Ghost Adventures',
    external: true,
  },
  {
    id: 'pr-coverage-tvinsider-ghost-adventures-escape-room',
    date: 'September 30, 2026',
    dateIso: '2026-09-30',
    title: '‘Ghost Adventures’: Zak Bagans & Team Capture Unexplained Activity Inside Escape Room',
    href: 'https://www.tvinsider.com/1292118/ghost-adventures-zak-bagans-team-capture-unexplained-activity-inside-escape-room/',
    outlet: 'TV Insider',
    show: 'Ghost Adventures',
    external: true,
  },
  {
    id: 'pr-coverage-hfh-14-days-review',
    date: 'September 16, 2026',
    dateIso: '2026-09-16',
    title: '14 Days in Gainesville review: ESPN finds its storytelling fastball again',
    href: 'https://hailfloridahail.com/14-days-in-gainesville-review-espn-finds-its-storytelling-fastball-again',
    outlet: 'Hail Florida Hail',
    show: '14 Days in Gainesville',
    external: true,
  },
  {
    id: 'pr-coverage-espn-14-days-premiere',
    date: 'September 11, 2026',
    dateIso: '2026-09-11',
    title: 'ESPN Films’ “14 Days in Gainesville” Premieres September 15 at 8 p.m. ET on ESPN',
    href: 'https://espnpressroom.com/press-release/espn-films-14-days-in-gainesville-premieres-september-15-at-8-p-m-et-on-espn/',
    outlet: 'ESPN Press Room',
    show: '14 Days in Gainesville',
    external: true,
  },
  {
    id: 'pr-coverage-bellmedia-snooki-oct2',
    date: 'September 10, 2026',
    dateIso: '2026-09-10',
    title: 'Nicole “Snooki” Polizzi Explores Canada’s Most-Haunted Locations in Crave Original Snooki: The Paranormal Rookie, October 2',
    href: 'https://www.bellmedia.ca/the-lede/press/nicole-snooki-polizzi-explores-canadas-most-haunted-locations-in-crave-original-snooki-the-paranormal-rookie-october-2/',
    outlet: 'Bell Media',
    show: 'Snooki: The Paranormal Rookie',
    external: true,
  },
  {
    id: 'pr-coverage-yt-snooki-trailer',
    date: 'September 10, 2026',
    dateIso: '2026-09-10',
    title: 'Official Trailer | Snooki: The Paranormal Rookie | Crave Original',
    href: 'https://www.youtube.com/watch?v=AirGz3ce1lE',
    outlet: 'YouTube',
    show: 'Snooki: The Paranormal Rookie',
    external: true,
  },
  {
    id: 'pr-coverage-extra-ghost-adventures-first-look',
    date: 'September 9, 2026',
    dateIso: '2026-09-09',
    title: '‘Ghost Adventures’: A Chilling First Look at the Season Premiere (Exclusive)',
    href: 'https://extratv.com/2026/09/09/ghost-adventures-a-chilling-first-look-at-the-season-premiere-exclusive/',
    outlet: 'Extra',
    show: 'Ghost Adventures',
    external: true,
  },
  {
    id: 'pr-coverage-tvinsider-ghost-adventures-s30',
    date: 'September 9, 2026',
    dateIso: '2026-09-09',
    title: '‘Ghost Adventures’ Season 30 Premiere Date Revealed as Zak Bagans Teases ‘Sinister’ Investigations',
    href: 'https://www.tvinsider.com/1288164/ghost-adventures-season-30-premiere-date-trailer-locations-cast-more/',
    outlet: 'TV Insider',
    show: 'Ghost Adventures',
    external: true,
  },
  {
    id: 'pr-coverage-yt-ghost-adventures-premiere',
    date: 'September 8, 2026',
    dateIso: '2026-09-08',
    title: 'Ghost Adventures | New Season Premieres Wed, September 30 on Discovery Channel',
    href: 'https://www.youtube.com/watch?v=EC2XqDEiDPQ',
    outlet: 'YouTube',
    show: 'Ghost Adventures',
    external: true,
  },
  {
    id: 'pr-coverage-bellmedia-2026-27-slate',
    date: 'June 4, 2026',
    dateIso: '2026-06-04',
    title: 'Bell Media Announces 2026/27 Original Content Slate',
    href: 'https://www.bellmedia.ca/the-lede/press/bell-media-announces-2026-27-original-content-slate/',
    outlet: 'Bell Media',
    show: 'Snooki: The Paranormal Rookie',
    external: true,
  },
  {
    id: 'pr-coverage-bellmedia-gaba-ghouls',
    date: 'October 30, 2025',
    dateIso: '2025-10-30',
    title: 'Ghosts, Goblins, and Gaba-Ghouls! Crave Greenlights Reality Ghost Hunting Series, Snooki: Paranormal Rookie',
    href: 'https://www.bellmedia.ca/the-lede/press/ghosts-goblins-and-gaba-ghouls-crave-greenlights-reality-ghost-hunting-series-snooki-paranormal-rookie/',
    outlet: 'Bell Media',
    show: 'Snooki: The Paranormal Rookie',
    external: true,
  },
  {
    id: 'pr-coverage-deadline-snooki-paranormal-rookie',
    date: 'October 30, 2025',
    dateIso: '2025-10-30',
    title: '‘Jersey Shore’s Nicole “Snooki” Polizzi To Star In ‘Paranormal Rookie’ Ghost-Hunting Series For Bell Media’s Crave',
    href: 'https://deadline.com/2025/10/jersey-shore-nicole-snooki-polizzi-paranormal-rookie-crave-1236602834/',
    outlet: 'Deadline',
    show: 'Snooki: The Paranormal Rookie',
    external: true,
  },
  {
    id: 'pr-coverage-realscreen-crave-snooki',
    date: 'October 30, 2025',
    dateIso: '2025-10-30',
    title: 'Canada’s Crave greenlights Snooki-led paranormal series',
    href: 'https://realscreen.com/2025/10/30/crave-greenlights-snooki-led-paranormal-series/',
    outlet: 'Realscreen',
    show: 'Snooki: The Paranormal Rookie',
    external: true,
  },
];

// ─── Hardcoded editorial entries ──────────────────────────────────────────────
// These 2 press releases are static Next.js page routes, not DB records.
// Slugs must exactly match the directory names under app/(public)/press-releases/.
// They sort by date alongside everything else — they are no longer pinned.
const EDITORIAL_ENTRIES: ListItem[] = [
  {
    id: 'pr-editorial-careers',
    date: 'May 3, 2026',
    dateIso: '2026-05-03',
    title: 'WORKING AT MYENTERTAINMENT IS A TOTAL BLAST. ALL HIRING THROUGH ASSIGNMENT DESK',
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
    // Don't crash the page — show hardcoded entries only and log the problem
    console.error('[press-releases page] DB query failed:', err);
    return [];
  }
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

/**
 * Newest first by ISO date.  Undated items sink to the bottom and keep their
 * original relative order (Array.prototype.sort is stable in ES2019+).
 * ISO "YYYY-MM-DD" strings compare correctly as plain strings.
 */
function byDateDesc(a: ListItem, b: ListItem): number {
  if (!a.dateIso && !b.dateIso) return 0;
  if (!a.dateIso) return 1;
  if (!b.dateIso) return -1;
  if (a.dateIso === b.dateIso) return 0;
  return a.dateIso < b.dateIso ? 1 : -1;
}

// ─── Page component ───────────────────────────────────────────────────────────

export default async function PressReleasesPage() {
  // Merge all three sources into one date-ordered list (newest first).
  // Hardcoded entries are guaranteed to appear even when the DB is empty.
  const dbEntries = await fetchDbPressReleases();
  const allItems: ListItem[] = [...COVERAGE_ENTRIES, ...EDITORIAL_ENTRIES, ...dbEntries].sort(
    byDateDesc
  );

  // ── ItemList schema.org JSON-LD ────────────────────────────────────────────
  // Combines coverage + editorial + DB entries in one ItemList for Google News
  // rich results.  External coverage credits its own outlet as publisher and
  // points at the off-site URL — we must not claim to publish someone else's article.
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
        url: pr.external ? pr.href : `https://www.myentertainment.tv${pr.href}`,
        publisher: pr.external
          ? {
              '@type': 'Organization',
              name: pr.outlet ?? '',
            }
          : {
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
        Each item is a linked headline, newest first.
        Editorial items link to their static page.tsx routes; DB items link to the
        [slug] dynamic route; coverage items link off-site in a new tab and carry the
        show name in the red date line plus an outlet credit beneath the headline.
        Items without a date omit the date label entirely (rather than showing "").
      */}
      <section style={{ background: '#000', padding: '40px 20px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          {allItems.map((item) => (
            <div key={item.id} style={{ padding: '24px 0', borderBottom: '1px solid #1a1a1a' }}>
              {/* Date label — only rendered when we have a formatted date.
                  External items append the show name: "SEPTEMBER 16, 2026 · 14 DAYS IN GAINESVILLE" */}
              {item.date && (
                <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, color: '#e51d26', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                  {item.external && item.show ? `${item.date} · ${item.show}` : item.date}
                </div>
              )}
              <h3 style={{ margin: 0 }}>
                <a
                  href={item.href}
                  {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 18, fontWeight: 400, color: '#f2f4f7', textTransform: 'uppercase', textDecoration: 'none', lineHeight: 1.4 }}
                >
                  {item.title}
                </a>
              </h3>
              {/* Outlet credit — external coverage only */}
              {item.external && item.outlet && (
                <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 12, color: '#a5a7ad', marginTop: 6 }}>
                  {item.outlet}
                </div>
              )}
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
