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
  // Priorities follow the SEO spec: homepage = 1.0, shows/genres = 0.8,
  // press = 0.6, utility pages (contact/faq) = 0.5.
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`,               lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
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
  const showPages: MetadataRoute.Sitemap = showRows.map(({ slug }) => ({
    url: `${BASE_URL}/shows/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.8,
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
