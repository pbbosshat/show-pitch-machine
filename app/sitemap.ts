// Dynamic sitemap generated from the SQLite database.
// show and genre slugs are pulled live so new CMS entries appear in the sitemap
// immediately without a code deploy. Falls back to an empty array if the DB is
// unreachable (e.g. during a build in a blank-DB CI environment).
//
// MUST be force-dynamic: the Railway Docker build runs against an empty data/db.sqlite
// (the file is gitignored and the volume isn't mounted at build time). Without this
// directive, Next.js statically generates an empty sitemap at build time and caches
// it forever — runtime DB rows never appear. force-dynamic ensures the function
// re-runs against the volume DB on every request.

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import type { MetadataRoute } from 'next';
import { query } from '@/lib/db';

const BASE_URL = 'https://www.myentertainment.tv';

interface SlugRow { slug: string }

// Safely query the DB — return empty array instead of crashing the sitemap on schema errors
async function safeQuery<T>(sql: string): Promise<T[]> {
  try {
    return await query<T>(sql);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Pull all non-archived show slugs from the CMS table
  const showRows = await safeQuery<SlugRow>(
    "SELECT slug FROM site_shows WHERE status != 'archived' ORDER BY sort_order ASC, title ASC"
  );

  // Pull all genre slugs — the table is small and stable (6 genres seeded in 002_marketing.sql)
  const genreRows = await safeQuery<SlugRow>(
    'SELECT slug FROM site_genres ORDER BY sort_order ASC'
  );

  // Pull any press release slugs that exist in the DB
  const pressRows = await safeQuery<SlugRow>(
    'SELECT slug FROM press_releases ORDER BY published_at DESC LIMIT 100'
  );

  const now = new Date();

  // ── Static pages ──────────────────────────────────────────────────────────
  // Priority tiers (SEO spec, updated 2026-05-19 for B2B money-page cluster):
  //   1.0  — homepage: highest crawl frequency signal
  //   0.9  — B2B money pages: buyer-intent queries, core commercial value;
  //           weekly changeFreq tells Googlebot to recrawl often so fresh
  //           PageRank from show-page feeders registers quickly
  //   0.8  — catalog/genre indexes: high-value browse surfaces
  //   0.7  — brand/editorial pages: about, international, available catalog
  //   0.6  — press: regularly updated but not buyer-facing
  //   0.5  — utility: contact, faq — stable, low churn
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,               lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },

    // ── B2B money pages — buyer-intent cluster (PR #3) ──────────────────
    // priority: 0.9 (second only to homepage) so Googlebot allocates
    // proportionally more crawl budget here than to any individual show page.
    // changeFrequency: weekly signals that PageRank flow from new show-page
    // feeder links should be re-evaluated frequently.
    { url: `${BASE_URL}/sizzle-reel`,           lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/how-to-pitch-a-tv-show`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/tv-production-company`,  lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/tv-show-pitch-deck`,     lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    // /tv-show-pitch — pillar page tying together the B2B buyer-intent cluster (added PR #4)
    { url: `${BASE_URL}/tv-show-pitch`,          lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    // /work-with-us/ — B2B partnership page, primary CTA destination from site header
    // (seo/option-a-fan-and-b2b). Priority 0.9 alongside the other buyer-intent money
    // pages: it is the nav-level CTA so it receives sitewide internal link equity
    // from every page via the "WORK WITH MYE" header button.
    { url: `${BASE_URL}/work-with-us`,           lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    // /documentary — "documentary production company" (vol 100, KD 44, CPC $140)
    // (added seo/scale-mye). Priority 0.9: buyer-intent money keyword, high CPC signal.
    { url: `${BASE_URL}/documentary`,            lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    // /tv-buyers — "unscripted tv buyers" + "tv content licensing" (B2B distribution page)
    // (added seo/scale-mye). /buyers conflicts with (internal)/buyers CRM route,
    // so the public SEO page is at /tv-buyers.
    // Priority 0.9: B2B buyer-facing page, ICP-matched intent.
    { url: `${BASE_URL}/tv-buyers`,              lastModified: now, changeFrequency: 'weekly', priority: 0.9 },

    { url: `${BASE_URL}/shows`,          lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/genres`,         lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/about`,          lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/available`,      lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE_URL}/international`,  lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/press-releases`, lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${BASE_URL}/reel`,           lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/contact`,        lastModified: now, changeFrequency: 'yearly',  priority: 0.5 },
    { url: `${BASE_URL}/faq`,            lastModified: now, changeFrequency: 'yearly',  priority: 0.5 },
  ];

  // ── Dynamic show pages ────────────────────────────────────────────────────
  // priority: 0.4 (reduced from 0.8) — show pages are long-tail brand queries
  // that feed qualified traffic to the site, but they should NOT compete with
  // the B2B money pages (0.9) for crawl budget or ranking signals on buyer-
  // intent queries. Lowering priority tells Googlebot to rank the money pages
  // above individual show pages when both could theoretically satisfy a query.
  // changeFrequency: monthly — show metadata changes infrequently; no need to
  // recrawl weekly and waste budget that the money pages need.
  const showPages: MetadataRoute.Sitemap = showRows.map(({ slug }) => ({
    url: `${BASE_URL}/available/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.4,
  }));

  // ── Dynamic genre pages ───────────────────────────────────────────────────
  const genrePages: MetadataRoute.Sitemap = genreRows.map(({ slug }) => ({
    url: `${BASE_URL}/genres/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  // ── Dynamic press release pages ───────────────────────────────────────────
  const pressPages: MetadataRoute.Sitemap = pressRows.map(({ slug }) => ({
    url: `${BASE_URL}/press-releases/${slug}`,
    lastModified: now,
    changeFrequency: 'yearly',
    priority: 0.6,
  }));

  return [...staticPages, ...showPages, ...genrePages, ...pressPages];
}
