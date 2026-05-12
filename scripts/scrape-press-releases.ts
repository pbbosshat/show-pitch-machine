/**
 * scrape-press-releases.ts
 *
 * Scrapes all press release detail pages from the live Webflow site
 * (https://www.myentertainment.tv) and writes a SQLite seed migration file.
 *
 * WHY THIS EXISTS: The new Next.js site on Railway is replacing the Webflow site.
 * When DNS flips, every existing inbound link, Google index entry, and bookmark
 * to a press release detail page must resolve to a real page with the SAME slug.
 * This script guarantees slug fidelity by deriving slugs from actual Webflow URLs
 * rather than re-slugifying headlines (which caused mismatches with the existing 9
 * broken rows that were truncated to 80 chars).
 *
 * Usage:
 *   npx tsx scripts/scrape-press-releases.ts
 *
 * Output: migrations/032_seed_press_releases.sql
 */

import * as https from 'https';
import * as http from 'http';
import { load } from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

// ─── Constants ────────────────────────────────────────────────────────────────

const SITEMAP_URL = 'https://www.myentertainment.tv/sitemap.xml';
const BASE_URL    = 'https://www.myentertainment.tv';
const SOURCE      = 'myentertainment.tv';

// Webflow "internal" pages that exist under /press-releases/ but are NOT
// individual press release articles — skip them.
const EXCLUDED_SLUGS = new Set([
  'film-commission-crew-directories',
  'myentertainment-careers-assignment-desk',
]);

// Polite crawl delay — 200ms between requests to avoid hammering Webflow.
const CRAWL_DELAY_MS = 200;

// Output paths
const PROJECT_ROOT  = path.join(__dirname, '..');
const OUTPUT_SQL    = path.join(PROJECT_ROOT, 'migrations', '032_seed_press_releases.sql');

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

/**
 * Fetches a URL and returns the response body as a string.
 * Handles HTTP → HTTPS redirects (301/302).
 * Throws on non-2xx status.
 */
function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const req = protocol.get(url, {
      headers: {
        // Identify as a real browser to avoid bot-detection blocks on Webflow CDN
        'User-Agent': 'Mozilla/5.0 (compatible; MyEntertainment-Migrator/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    }, (res) => {
      // Follow redirects (301/302) up to one level deep
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchUrl(res.headers.location).then(resolve).catch(reject);
        return;
      }

      if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }

      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      res.on('error', reject);
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

/** Sleep for `ms` milliseconds — used to enforce crawl delay. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Slug extraction ──────────────────────────────────────────────────────────

/**
 * Fetches the sitemap XML and extracts all press-release slugs.
 * De-duplicates and excludes known non-article "internal" pages.
 *
 * @returns Array of slugs, e.g. ['coming-soon-sin-city-justice', ...]
 */
async function getSlugsFromSitemap(): Promise<string[]> {
  console.log(`Fetching sitemap: ${SITEMAP_URL}`);
  const xml = await fetchUrl(SITEMAP_URL);

  // Match every /press-releases/{slug} loc entry (greedy-safe, anchored to /press-releases/)
  const regex = /https:\/\/www\.myentertainment\.tv\/press-releases\/([^<\s]+)/g;
  const slugs: string[] = [];
  const seen = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    const slug = match[1].trim();
    // De-duplicate and skip known internal pages
    if (!seen.has(slug) && !EXCLUDED_SLUGS.has(slug)) {
      seen.add(slug);
      slugs.push(slug);
    }
  }

  console.log(`Found ${slugs.length} press release slugs in sitemap`);

  if (slugs.length < 60) {
    console.warn(`WARNING: Only ${slugs.length} slugs found — expected ~80. Investigate the sitemap.`);
  }

  return slugs;
}

// ─── Page parsing ─────────────────────────────────────────────────────────────

/**
 * Parses the date string from a press release page into a Unix timestamp (seconds).
 * Webflow dates look like "May 25, 2017" or "December 14, 2021".
 *
 * Uses Date.parse() which handles US-English month names correctly.
 * Returns null if the date can't be parsed — caller should warn and use 0.
 */
function parseDateToUnix(dateStr: string): number | null {
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  const ms = Date.parse(trimmed);
  if (isNaN(ms)) return null;

  // Divide by 1000 to convert milliseconds → Unix seconds
  return Math.floor(ms / 1000);
}

/**
 * Decodes HTML entities in a plain-text string.
 * Cheerio text() calls already do this for most entities, but the headline
 * sometimes contains double-encoded entities like &amp;quot; → &quot; → ".
 *
 * We handle the double-encoding case explicitly.
 */
function decodeEntities(str: string): string {
  return str
    .replace(/&amp;quot;/g, '"')
    .replace(/&amp;#x27;/g, "'")
    .replace(/&amp;amp;/g, '&')
    .replace(/&amp;lt;/g, '<')
    .replace(/&amp;gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * Extracts the body HTML from the rich-text div, stripping Webflow-specific
 * CSS class attributes while preserving semantic tags (p, strong, em, a, ul, li).
 *
 * We keep the inner HTML as-is (Webflow uses clean semantic markup inside
 * rich-text-block) but remove the class="" attributes since the Railway app
 * applies its own CSS.
 */
function cleanBodyHtml(html: string): string {
  // Remove class attributes from all elements inside the body
  return html.replace(/ class="[^"]*"/g, '').trim();
}

/**
 * Generates a plain-text excerpt from the body HTML — first ~200 chars.
 * Strips all HTML tags, collapses whitespace.
 */
function makeExcerpt(html: string): string {
  // Strip tags and decode entities for plain-text excerpt
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text.length > 200 ? text.slice(0, 197) + '…' : text;
}

interface PressRelease {
  slug: string;
  headline: string;
  excerpt: string;
  body: string;
  publishedAt: number;
  sourceUrl: string;
}

/**
 * Fetches and parses a single press release page.
 * Returns null on 404 or parse failure — caller should skip and continue.
 */
async function scrapePage(slug: string): Promise<PressRelease | null> {
  const url = `${BASE_URL}/press-releases/${slug}`;

  let html: string;
  try {
    html = await fetchUrl(url);
  } catch (err) {
    console.warn(`  WARN: Fetch failed for ${slug}: ${(err as Error).message}`);
    return null;
  }

  const $ = load(html);

  // ── Headline ────────────────────────────────────────────────────────────────
  // The h1 may contain double-encoded HTML entities from Webflow's CMS template.
  // cheerio's .text() decodes one layer; we decode the second layer manually.
  const headlineRaw = $('h1.heading-7').first().text().trim();
  if (!headlineRaw) {
    console.warn(`  WARN: No headline found for ${slug} — skipping`);
    return null;
  }
  const headline = decodeEntities(headlineRaw);

  // ── Date ────────────────────────────────────────────────────────────────────
  // The date lives in a bare <div> inside .w-container, right after the h1 block.
  // We look for the first short text-only div in the second .w-container block.
  // Strategy: find the w-container that does NOT contain heading-7, then grab
  // its first direct <div> child whose text looks like a date.
  let dateStr = '';
  let publishedAt = 0;

  // Walk all .w-container divs and find the one that has a date-like child div
  $('.w-container').each((_, container) => {
    if (dateStr) return; // already found
    const $container = $(container);
    // Skip the container that holds heading-7 (the title block)
    if ($container.find('h1.heading-7').length > 0) return;

    // The date div is the first direct div child with no nested tags — just text
    $container.children('div').each((_, child) => {
      if (dateStr) return;
      const $child = $(child);
      // Only consider divs that are NOT the rich-text-block
      if ($child.hasClass('rich-text-block')) return;
      // Only consider short, text-only divs (dates are at most ~20 chars)
      const childText = $child.text().trim();
      if (childText.length > 0 && childText.length < 40 && $child.children().length === 0) {
        dateStr = childText;
      }
    });
  });

  if (dateStr) {
    const ts = parseDateToUnix(dateStr);
    if (ts !== null) {
      publishedAt = ts;
    } else {
      console.warn(`  WARN: Could not parse date "${dateStr}" for ${slug} — using 0`);
    }
  } else {
    console.warn(`  WARN: No date found for ${slug} — using 0`);
  }

  // ── Body HTML ───────────────────────────────────────────────────────────────
  // Grab the inner HTML of the rich-text-block div and strip Webflow class attrs.
  const $richText = $('.rich-text-block.w-richtext').first();
  if (!$richText.length) {
    console.warn(`  WARN: No rich-text-block found for ${slug} — skipping`);
    return null;
  }

  const bodyHtml = cleanBodyHtml($richText.html() ?? '');
  const excerpt  = makeExcerpt(bodyHtml);

  return {
    slug,
    headline,
    excerpt,
    body: bodyHtml,
    publishedAt,
    sourceUrl: url,
  };
}

// ─── SQL generation ───────────────────────────────────────────────────────────

/**
 * Escapes a string for use in a SQLite single-quoted string literal.
 * SQLite uses '' to represent a literal single-quote character.
 */
function sqlStr(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Generates the full SQL migration file content from a list of press releases.
 * Uses DELETE + INSERT for idempotency — safe to re-run.
 */
function generateSql(releases: PressRelease[]): string {
  const header = `-- 032_seed_press_releases.sql
-- Seed all ${releases.length} press releases from the previous Webflow site so
-- /press-releases/{slug} URLs continue to resolve after the DNS cutover.
--
-- Idempotent: scoped DELETE + INSERT means re-running is safe.
-- Only touches rows where source = 'myentertainment.tv'.
--
-- Generated: ${new Date().toISOString()}
-- Source: ${SITEMAP_URL}

DELETE FROM press_releases WHERE source = '${SOURCE}';

INSERT INTO press_releases
  (id, headline, slug, excerpt, body, source, source_url, published_at, is_featured, created_at, updated_at)
VALUES`;

  const rows = releases.map((r) => {
    const id         = sqlStr(r.slug);
    const headline   = sqlStr(r.headline);
    const slug       = sqlStr(r.slug);
    const excerpt    = sqlStr(r.excerpt);
    const body       = sqlStr(r.body);
    const sourceUrl  = sqlStr(r.sourceUrl);

    return (
      `  ('${id}', '${headline}', '${slug}', '${excerpt}', '${body}', ` +
      `'${SOURCE}', '${sourceUrl}', ${r.publishedAt}, 0, ` +
      `strftime('%s','now'), strftime('%s','now'))`
    );
  });

  return header + '\n' + rows.join(',\n') + ';\n';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nPress Release Scraper — Webflow → Railway Migration');
  console.log('─────────────────────────────────────────────────────');

  // Step 1: Get the list of slugs from the live sitemap
  const slugs = await getSlugsFromSitemap();

  // Step 2: Scrape each page with a polite delay between requests
  const releases: PressRelease[] = [];
  const failures: string[]       = [];

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];

    // Throttle — wait before each request (except the first)
    if (i > 0) await sleep(CRAWL_DELAY_MS);

    const result = await scrapePage(slug);

    if (result) {
      releases.push(result);
      const dateLabel = result.publishedAt
        ? new Date(result.publishedAt * 1000).toISOString().slice(0, 10)
        : 'no-date';
      console.log(`Scraped ${releases.length}/${slugs.length}: ${slug} (${dateLabel})`);
    } else {
      failures.push(slug);
    }
  }

  // Step 3: Write the SQL migration file
  if (releases.length === 0) {
    console.error('\nERROR: No press releases scraped — aborting. Check network access.');
    process.exit(1);
  }

  const sql = generateSql(releases);
  fs.writeFileSync(OUTPUT_SQL, sql, 'utf-8');

  // Step 4: Summary report
  console.log('\n─────────────────────────────────────────────────────');
  console.log(`Scraped:  ${releases.length} press releases`);
  console.log(`Failed:   ${failures.length}`);
  console.log(`Output:   ${OUTPUT_SQL}`);

  if (failures.length > 0) {
    console.log('\nFailed slugs:');
    for (const slug of failures) {
      console.log(`  - ${slug}`);
    }
  }

  // Spot-check: print first 3 rows for manual verification
  console.log('\nSpot-check (first 3 results):');
  for (const r of releases.slice(0, 3)) {
    const date = r.publishedAt
      ? new Date(r.publishedAt * 1000).toISOString().slice(0, 10)
      : 'no-date';
    console.log(`  slug:        ${r.slug}`);
    console.log(`  headline:    ${r.headline}`);
    console.log(`  published:   ${date} (${r.publishedAt})`);
    console.log('');
  }

  console.log('Done.\n');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
