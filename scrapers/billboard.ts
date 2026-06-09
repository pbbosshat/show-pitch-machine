/**
 * Billboard Charts + News Scraper
 * ================================
 * Source: https://www.billboard.com/charts/ (chart pages) and
 *         https://www.billboard.com/c/business/ + /c/music/ (news listing pages)
 *
 * AUTH NOTE: As of June 2026, current chart pages AND historical archive pages
 * return clean HTTP 200 to a plain fetch() with a desktop User-Agent. No Cloudflare
 * challenge, no login wall, no cookies required for chart data (current or historical)
 * or general news articles. Historical URLs follow the pattern:
 *   https://www.billboard.com/charts/{slug}/{YYYY-MM-DD}/
 * where the date is the Saturday of the chart week.
 *
 * IMPLEMENTATION CHOICE — plain fetch() + cheerio, NOT Puppeteer:
 * Using plain fetch keeps this scraper runnable without the Bang machine (which uses
 * a CDP bridge for headless Chrome). The Bang machine was down when this was written
 * and Billboard's public pages don't require JS rendering to return chart HTML.
 * If Billboard ever adds a Cloudflare JS challenge, switch to fetchPage() from base.ts.
 *
 * SLUG MAINTENANCE (June 2026 audit — update this when re-verifying):
 * Billboard occasionally renames or retires chart slugs. Some slugs return 301 → year-end
 * archive pages rather than the current weekly chart. Always verify with a curl test
 * (HTTP 200 + `o-chart-results-list-row-container` present) before adding new slugs.
 * The scraper self-heals on non-200 / empty-row responses (warns + skips), so stale
 * slugs won't break a run — but do fix them so they don't silently drop data.
 */

import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import {
  type ScrapedArticle,
  rateLimit,
  withRetry,
  extractItemType,
  extractNetwork,
  extractGenre,
} from './base';

const SOURCE = 'billboard';
const BASE_URL = 'https://www.billboard.com';

// Desktop User-Agent — required to get full HTML (Billboard serves reduced markup to bots)
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ─── Chart Definitions ────────────────────────────────────────────────────────

/**
 * Central chart registry — add new slugs here without touching any other code.
 * genre is the tag that goes into the ScrapedArticle.genre field; 'Music' is
 * the umbrella used when no more specific genre applies.
 */
const CHARTS: Array<{ slug: string; name: string; genre: string }> = [
  // ── All-Genre / Cross-Format ──────────────────────────────────────────────
  // Verified June 2026: all return HTTP 200 with chart rows
  { slug: 'hot-100',                  name: 'Hot 100',               genre: 'Music'       },
  { slug: 'billboard-200',            name: 'Billboard 200',         genre: 'Music'       },
  { slug: 'artist-100',               name: 'Artist 100',            genre: 'Music'       },
  { slug: 'billboard-global-200',     name: 'Global 200',            genre: 'Music'       },
  { slug: 'billboard-global-excl-us', name: 'Global Excl. US',       genre: 'Music'       },
  { slug: 'streaming-songs',          name: 'Streaming Songs',       genre: 'Music'       },
  { slug: 'radio-songs',              name: 'Radio Songs',           genre: 'Music'       },
  { slug: 'digital-song-sales',       name: 'Digital Song Sales',    genre: 'Music'       },
  { slug: 'top-album-sales',          name: 'Top Album Sales',       genre: 'Music'       },

  // NOTE: 'tiktok-billboard-top-50' is retired — Billboard ended the TikTok chart
  // partnership in 2024. No replacement slug exists as of June 2026 (all TikTok-related
  // candidates return 404). If Billboard launches a successor chart, add it here.

  // ── Country ───────────────────────────────────────────────────────────────
  { slug: 'country-songs',            name: 'Hot Country Songs',     genre: 'Country'     },
  { slug: 'country-albums',           name: 'Top Country Albums',    genre: 'Country'     },

  // ── Rock ──────────────────────────────────────────────────────────────────
  { slug: 'rock-songs',               name: 'Hot Rock Songs',        genre: 'Rock'        },
  { slug: 'rock-albums',              name: 'Top Rock Albums',       genre: 'Rock'        },
  { slug: 'hot-alternative-songs',    name: 'Hot Alternative Songs', genre: 'Rock'        },

  // ── R&B / Hip-Hop ─────────────────────────────────────────────────────────
  { slug: 'r-b-hip-hop-songs',        name: 'Hot R&B/Hip-Hop Songs', genre: 'R&B/Hip-Hop' },
  // FIXED June 2026: was 'r-and-b-hip-hop-albums' (404) → corrected to 'r-b-hip-hop-albums'
  { slug: 'r-b-hip-hop-albums',       name: 'Top R&B/Hip-Hop Albums',genre: 'R&B/Hip-Hop' },
  { slug: 'rap-song',                 name: 'Hot Rap Songs',         genre: 'R&B/Hip-Hop' },

  // ── Latin ─────────────────────────────────────────────────────────────────
  // FIXED June 2026: was 'hot-latin-songs' (301 → year-end archive) → 'latin-songs'
  { slug: 'latin-songs',              name: 'Hot Latin Songs',       genre: 'Latin'       },
  { slug: 'latin-albums',             name: 'Top Latin Albums',      genre: 'Latin'       },

  // ── Dance / Electronic ────────────────────────────────────────────────────
  // FIXED June 2026: was 'hot-dance-electronic-songs' (301 → year-end) → 'dance-electronic-songs'
  { slug: 'dance-electronic-songs',   name: 'Hot Dance/Electronic',  genre: 'Music'       },

  // ── Christian / Gospel ────────────────────────────────────────────────────
  // FIXED June 2026: both were 301ing to year-end pages; corrected slugs below
  { slug: 'christian-songs',          name: 'Hot Christian Songs',   genre: 'Music'       },
  { slug: 'gospel-songs',             name: 'Hot Gospel Songs',      genre: 'Music'       },

  // ── Pop / Adult Contemporary ──────────────────────────────────────────────
  // FIXED June 2026: was 'pop-airplay' (404) → 'pop-songs' (Billboard's current slug
  // for the "Pop Airplay" chart — verified via og:title = "Pop Airplay")
  { slug: 'pop-songs',                name: 'Pop Airplay',           genre: 'Music'       },
  { slug: 'adult-contemporary',       name: 'Adult Contemporary',    genre: 'Music'       },
];

// News listing pages — /c/business/ is highest-priority (trade/industry news);
// /c/music/ adds general music industry coverage useful for trend context.
const NEWS_LISTINGS = [
  'https://www.billboard.com/c/business/',
  'https://www.billboard.com/c/music/',
];

const MAX_NEWS_PER_LISTING = 20; // cap per listing page before dedup

// ─── Fetch Helpers ────────────────────────────────────────────────────────────

/**
 * Plain fetch wrapper with the desktop UA header.
 * Returns null on non-200 so callers can self-heal (skip bad slugs) without throwing.
 */
async function fetchHtml(url: string): Promise<string | null> {
  await rateLimit('billboard.com');
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    // No credentials/cookies needed for current chart/news data
  });
  if (!res.ok) return null;
  return res.text();
}

// ─── Chart Parsing ────────────────────────────────────────────────────────────

/**
 * One parsed chart entry — exported so the backfill script can import it for
 * type annotations without duplicating the interface definition.
 */
export interface ChartEntry {
  rank: string;
  title: string;
  artist: string;
  last_week: string | null;
  peak: string | null;
  weeks_on_chart: string | null;
}

/**
 * Parse one chart row container into a structured entry.
 *
 * WHY regex for stats (LW/PEAK/WEEKS):
 * Billboard's chart rows contain a mobile-render duplicate of the stats block — the
 * DOM structure varies between mobile and desktop copies of the same data. Pulling
 * the full row text and matching "LW N", "PEAK N", "WEEKS N" is more resilient than
 * navigating the nested div structure, and the first regex match is always the correct
 * value regardless of which copy appears first in source order.
 */
function parseChartRow($: cheerio.CheerioAPI, row: AnyNode): ChartEntry | null {
  const $row = $(row);

  // Remove the hidden detail/accordion panel that Billboard embeds inside each row
  // container for the "Credits" expand section. If left in, its text ("Songwriter(s)",
  // "Producer(s)", "Imprint/Label" labels + values) bleeds into title and stats extraction.
  $row.find('.charts-result-detail').remove();

  // Rank: first .c-label text in the row (plain number string like "1", "23")
  // collapse whitespace since Billboard inlines newlines around the number
  const rank = $row.find('.c-label').first().text().replace(/\s+/g, ' ').trim();
  if (!rank || !/^\d+$/.test(rank)) return null; // skip malformed rows (ads, headers)

  // Title: h3#title-of-a-story (Billboard's stable id) or h3.c-title as fallback.
  // collapse whitespace — the heading text has surrounding newlines/tabs in the source.
  const title =
    $row.find('h3#title-of-a-story').text().replace(/\s+/g, ' ').trim() ||
    $row.find('h3.c-title').text().replace(/\s+/g, ' ').trim();
  if (!title) return null;

  // Artist: Billboard renders it in a span.c-label.a-no-trucate (note their typo —
  // "trucate" not "truncate"). This selector is more specific than span.c-label alone
  // and avoids matching the rank label or the "NEW"/"RE-ENTRY" badge spans.
  // Fallback: walk all descendants in DOM order, find the h3 node, take the next
  // span.c-label after it — handles any future class name change.
  let artist = $row.find('span.c-label.a-no-trucate').first().text().replace(/\s+/g, ' ').trim();
  if (!artist) {
    // Fallback: iterate all descendants in order, grab first span.c-label after the h3
    let pastH3 = false;
    $row.find('*').each((_, el) => {
      if (artist) return;
      const $el = $(el);
      if (el.type === 'tag' && (el as any).name === 'h3') { pastH3 = true; return; }
      if (pastH3 && $el.is('span.c-label')) {
        const t = $el.text().replace(/\s+/g, ' ').trim();
        if (t && !/^\d+$/.test(t) && t !== 'NEW' && t !== 'RE-ENTRY') artist = t;
      }
    });
  }

  // Stats via full-row text regex — handles the mobile/desktop duplicate gracefully
  const rowText = $row.text();
  const lwMatch = rowText.match(/LW\s+([\d-]+)/);
  const peakMatch = rowText.match(/PEAK\s+([\d-]+)/);
  const weeksMatch = rowText.match(/WEEKS\s+([\d-]+)/);

  // "-" means new entry this week — store as null so consumers know it's absent
  const nullIfDash = (s: string | undefined) => (!s || s === '-' ? null : s);

  return {
    rank,
    title,
    artist,
    last_week:      nullIfDash(lwMatch?.[1]),
    peak:           nullIfDash(peakMatch?.[1]),
    weeks_on_chart: nullIfDash(weeksMatch?.[1]),
  };
}

/**
 * Try to extract the chart date from the page (Billboard shows "Week of Month DD, YYYY"
 * near the chart header). Returns undefined if not found so the headline omits it
 * rather than showing a wrong date.
 */
function extractChartDate(html: string): string | undefined {
  // Billboard encodes the week date in various spots; try a broad pattern first
  const match = html.match(/week\s+of\s+([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/i);
  return match?.[1];
}

/**
 * Parse a full Billboard chart HTML page into an array of ChartEntry objects.
 *
 * EXPORTED so the backfill script (`scripts/backfill-billboard-charts.ts`) can
 * reuse this logic without duplicating the cheerio parsing. The existing
 * `scrapeChart()` function calls this internally — behaviour is unchanged.
 *
 * Returns an empty array (not null) when the page contains no parseable chart
 * rows (e.g. a 404 page that was somehow returned as 200, or a redirect target).
 * Callers should treat length === 0 as a skip signal.
 */
export function parseChartPage(html: string): ChartEntry[] {
  const $ = cheerio.load(html);
  const rows = $('div.o-chart-results-list-row-container').toArray();
  const entries: ChartEntry[] = [];
  for (const row of rows) {
    const entry = parseChartRow($, row);
    if (entry) entries.push(entry);
  }
  return entries;
}

/**
 * Fetch and parse one Billboard chart page into a ScrapedArticle.
 *
 * SELF-HEAL: If the fetch returns non-200 or the page has no chart rows, we
 * return null and the caller logs a warning + skips this slug. This prevents a
 * bad/renamed chart URL from aborting the entire run.
 *
 * Internally delegates HTML parsing to parseChartPage() — any fix to the
 * parsing logic benefits both current scrapes and backfill runs.
 */
async function scrapeChart(chart: (typeof CHARTS)[number]): Promise<ScrapedArticle | null> {
  const url = `${BASE_URL}/charts/${chart.slug}/`;

  const html = await withRetry(() => fetchHtml(url));
  if (!html) {
    console.warn(`[billboard] SKIP chart slug "${chart.slug}" — non-200 response`);
    return null;
  }

  // Delegate to the exported parser so backfill reuses the same cheerio logic
  const entries = parseChartPage(html);

  if (entries.length === 0) {
    console.warn(`[billboard] SKIP chart slug "${chart.slug}" — no chart rows found in page`);
    return null;
  }

  // Chart date from page header (best-effort; absent for some charts)
  const chartDate = extractChartDate(html);
  const dateStr = chartDate ? ` (week of ${chartDate})` : '';

  // Headline used as the RAG document title
  const headline = `Billboard ${chart.name} — Top ${entries.length}${dateStr}`;

  // Body is a clean ranked list — one song per line, easy to scan in RAG results
  const bodyLines = entries.map((e) => {
    const lw    = e.last_week      ? `LW ${e.last_week}`      : 'LW NEW';
    const peak  = e.peak           ? `Peak ${e.peak}`         : 'Peak -';
    const weeks = e.weeks_on_chart ? `${e.weeks_on_chart} wks` : '1 wk';
    return `${e.rank}. ${e.title} — ${e.artist} (${lw}, ${peak}, ${weeks})`;
  });

  return {
    source:     SOURCE,
    url,
    headline,
    body:       bodyLines.join('\n'),
    item_type:  'chart',
    genre:      chart.genre,
    scraped_at: Date.now(),
  };
}

// ─── News Scraping ────────────────────────────────────────────────────────────

interface NewsLink {
  url: string;
  headline: string;
}

/**
 * Extract article links from a Billboard news listing page (e.g. /c/business/).
 * Links are <a class="c-title__link"> elements; headline text is inside the same tag.
 * Relative hrefs are resolved against BASE_URL.
 */
function extractNewsLinks(html: string): NewsLink[] {
  const $ = cheerio.load(html);
  const links: NewsLink[] = [];
  const seen = new Set<string>();

  $('a.c-title__link').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href') || '';
    const headline = $a.text().trim();
    if (!href || !headline) return;

    // Resolve relative URLs (Billboard often omits the domain on internal links)
    let absoluteUrl: string;
    try {
      absoluteUrl = new URL(href, BASE_URL).toString();
    } catch {
      return;
    }

    // Deduplicate by URL
    if (seen.has(absoluteUrl)) return;
    seen.add(absoluteUrl);

    links.push({ url: absoluteUrl, headline });
  });

  return links;
}

/**
 * Fetch the full text body from a single Billboard article page.
 *
 * Strategy: strip all noise (script/style/nav/header/footer/aside/ads), then
 * try known article-body selectors in order. If the resulting text is very short
 * (< 100 chars), it likely hit a paywall or returned a redirect — return '' so
 * the caller falls back to the listing-card summary instead.
 *
 * Uses plain fetch() — Billboard article bodies are server-rendered for the parts
 * we need. JS-gated paywall modals exist but the article text itself is in the HTML.
 */
async function fetchArticleBody(url: string): Promise<string> {
  const html = await withRetry(() => fetchHtml(url));
  if (!html) return '';

  const $ = cheerio.load(html);

  // Remove noise before extracting text
  $('script, style, nav, header, footer, aside, .ad, .advertisement, .paywall, .subscribe').remove();

  // Try progressively broader selectors
  const body =
    $('article .a-content').text().replace(/\s+/g, ' ').trim() ||
    $('article .article-body').text().replace(/\s+/g, ' ').trim() ||
    $('article .a-body').text().replace(/\s+/g, ' ').trim() ||
    $('article').text().replace(/\s+/g, ' ').trim() ||
    $('main').text().replace(/\s+/g, ' ').trim();

  // Treat very-short bodies as paywalled/failed
  return body.length >= 100 ? body : '';
}

/**
 * Scrape news from one Billboard listing page and return ScrapedArticles.
 * /c/business/ has industry/trade news (deals, exec moves, chart analysis) —
 * most relevant to the Show Pitch Machine pipeline.
 * /c/music/ adds broader music industry coverage for trend context.
 */
async function scrapeNewsListing(listingUrl: string): Promise<ScrapedArticle[]> {
  const html = await withRetry(() => fetchHtml(listingUrl));
  if (!html) {
    console.warn(`[billboard] SKIP news listing "${listingUrl}" — non-200`);
    return [];
  }

  const links = extractNewsLinks(html).slice(0, MAX_NEWS_PER_LISTING);
  const articles: ScrapedArticle[] = [];

  for (const { url, headline } of links) {
    try {
      // Fetch individual article body (best-effort; don't fail the whole listing on one bad article)
      let body = await withRetry(() => fetchArticleBody(url), 2);

      // Fallback: if body is empty/paywalled, try to get a dek/summary from the listing card
      if (!body) {
        // Some listing cards include a short dek below the title — use it as the fallback body
        const $listing = cheerio.load(html);
        // Billboard listing cards sometimes have a .c-dek or .a-description element
        const cardDek = $listing(`a[href="${new URL(url).pathname}"]`)
          .closest('[class*="o-hit"]')
          .find('.c-dek, .a-description, .c-title__description')
          .text()
          .trim();
        body = cardDek || `(No body available — may be paywalled) ${headline}`;
      }

      const fullText = `${headline} ${body}`;

      articles.push({
        source:     SOURCE,
        url,
        headline,
        body,
        item_type:  extractItemType(headline),
        network:    extractNetwork(fullText),
        genre:      extractGenre(fullText) ?? 'Music', // Billboard is music-first
        scraped_at: Date.now(),
      });
    } catch (err) {
      // One bad article fetch should not abort the listing — warn and continue
      console.warn(`[billboard] SKIP article "${url}": ${(err as Error).message}`);
    }
  }

  return articles;
}

// ─── Main Scrape Function ─────────────────────────────────────────────────────

/**
 * Billboard scraper entry point — called by scrape-all.ts.
 * Returns a combined array of chart articles + news articles.
 *
 * Part 1 (Charts): one ScrapedArticle per working chart, body = ranked song list.
 * Part 2 (News): one ScrapedArticle per article from /c/business/ and /c/music/.
 * Deduplication by URL happens in persist() via ON CONFLICT(url); we dedup
 * within each listing here to avoid fetching the same article twice.
 */
export default async function scrape(): Promise<ScrapedArticle[]> {
  const results: ScrapedArticle[] = [];
  const workingCharts: string[] = [];
  const droppedCharts: string[] = [];

  // ── Part 1: Charts ──────────────────────────────────────────────────────────

  for (const chart of CHARTS) {
    try {
      const article = await scrapeChart(chart);
      if (article) {
        results.push(article);
        workingCharts.push(chart.slug);
      } else {
        droppedCharts.push(chart.slug);
      }
    } catch (err) {
      console.warn(`[billboard] ERROR chart "${chart.slug}": ${(err as Error).message}`);
      droppedCharts.push(chart.slug);
    }
  }

  console.log(
    `[billboard] Charts: ${workingCharts.length} working, ${droppedCharts.length} dropped` +
    (droppedCharts.length > 0 ? ` (${droppedCharts.join(', ')})` : '')
  );

  // ── Part 2: News ────────────────────────────────────────────────────────────

  // Collect news from all listing pages, deduplicating across them by URL
  const seenNewsUrls = new Set<string>();
  for (const listingUrl of NEWS_LISTINGS) {
    try {
      const listingArticles = await scrapeNewsListing(listingUrl);
      for (const article of listingArticles) {
        if (!seenNewsUrls.has(article.url)) {
          seenNewsUrls.add(article.url);
          results.push(article);
        }
      }
    } catch (err) {
      console.warn(`[billboard] ERROR news listing "${listingUrl}": ${(err as Error).message}`);
    }
  }

  return results;
}
