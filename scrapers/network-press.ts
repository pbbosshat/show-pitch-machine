/**
 * Network Press Site Scraper
 *
 * Fetches official show announcements from three major network press portals.
 * These sites serve authoritative, first-party data — a premiere date or renewal
 * here is confirmed, not speculative.
 *
 * Targets:
 *   discovery-press   — https://press.discovery.com/us/
 *   aenetworks-press  — https://press.aenetworks.com/
 *   nbcuniversal-press — https://www.nbcuniversalmediavillage.com/
 *
 * Scraping strategy: pure fetch() + cheerio — no Puppeteer.
 * All three sites deliver HTML without JS rendering requirements.
 *
 * DB enrichment: after storing articles in trade_articles, looks up each
 * press release's show in the shows table and updates premiere_date,
 * air_status, source, source_url, and confidence where not already set.
 */

import * as cheerio from 'cheerio';
import {
  type ScrapedArticle,
  extractEpisodeCount,
  extractNetwork,
  extractGenre,
  extractLocationHints,
  withRetry,
  rateLimit,
} from './base';

// ─── Source identifiers ───────────────────────────────────────────────────────

export type NetworkPressSource =
  | 'discovery-press'
  | 'aenetworks-press'
  | 'nbcuniversal-press';

// ─── Item type inference ──────────────────────────────────────────────────────

/**
 * Classify a press release headline into order | renewal | cancellation |
 * premiere | general. Press-site vocabulary differs slightly from trade press
 * (e.g. "premieres" is far more common than "greenlights" on press sites).
 */
function inferItemType(headline: string): string {
  const h = headline.toLowerCase();

  // Cancellation signals
  if (/\b(cancel|cancels?|cancelled|canceled|end[s]?|ending)\b/.test(h)) return 'cancellation';

  // Renewal signals
  if (/\b(renew[s]?|renewed|renewal|second\s+season|third\s+season|returns?)\b/.test(h)) return 'renewal';

  // New order / greenlit signals
  if (/\b(order[s]?|picks?\s+up|pickup|greenlights?|green-lights?|commissions?|announces?\s+new)\b/.test(h)) return 'order';

  // Premiere / launch signals — very common on press sites
  if (/\b(premiere[s]?|premiering|debut[s]?|debuting|launches?|launching|kicks?\s+off)\b/.test(h)) return 'premiere';

  return 'general';
}

// ─── Show title extraction ────────────────────────────────────────────────────

/**
 * Attempt to extract a show title from a press release headline.
 * Press site headlines frequently follow patterns like:
 *   "Discovery Premieres SHOW NAME on [date]"
 *   "[SHOW NAME] Returns for Season 2"
 *   "History Channel Orders New Series SHOW NAME"
 *
 * Returns undefined when no clear title can be inferred — better to return
 * nothing than a false match that poisons the DB enrichment lookup.
 */
function extractShowTitle(headline: string): string | undefined {
  // Pattern: title in ALL CAPS or Title Case after a network/verb phrase
  // e.g. "Discovery Premieres EXPEDITION UNKNOWN Season 11..."
  const capsMatch = headline.match(/(?:premieres?|orders?|renews?|debuts?|returns?|launches?)\s+([A-Z][A-Z\s:!'&\-]{3,40})(?:\s+(?:on|for|season|returns|with|in)|\s*$)/i);
  if (capsMatch) {
    const candidate = capsMatch[1].trim();
    // Reject if it's just a generic phrase
    if (!/^(NEW|THE|A|AN|ALL|SEASON|SERIES)\s*$/.test(candidate)) {
      return candidate.replace(/\s+/g, ' ');
    }
  }

  // Pattern: quoted title
  const quotedMatch = headline.match(/["""']([^"""']{3,60})["""']/);
  if (quotedMatch) return quotedMatch[1].trim();

  return undefined;
}

// ─── Air status inference ─────────────────────────────────────────────────────

/**
 * Map a press release item_type to an air_status value for the shows table.
 * Only update when we have a confident signal — return undefined to skip update.
 */
function inferAirStatus(itemType: string): string | undefined {
  if (itemType === 'premiere' || itemType === 'renewal' || itemType === 'order') return 'on_air';
  if (itemType === 'cancellation') return 'off_air';
  return undefined;
}

// ─── Premiere date extraction ─────────────────────────────────────────────────

/**
 * Extract a premiere date from article body text as a Unix ms timestamp.
 * Looks for common press release date patterns:
 *   "premieres Sunday, January 12 at 9/8c"
 *   "January 12, 2025"
 *   "Jan. 12"
 *
 * Returns undefined rather than guessing — bad dates corrupt the DB.
 */
function extractPremiereDate(text: string): number | undefined {
  // Full date with year: January 12, 2025 or Jan 12, 2025
  const fullDateMatch = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2}),?\s+(20\d{2})\b/i
  );
  if (fullDateMatch) {
    const ts = Date.parse(`${fullDateMatch[1]} ${fullDateMatch[2]}, ${fullDateMatch[3]}`);
    if (!isNaN(ts)) return ts;
  }

  // Month/day without year — assume current or next year
  const shortDateMatch = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})(?!\s*,\s*\d{4})\b/i
  );
  if (shortDateMatch) {
    const year = new Date().getFullYear();
    const ts = Date.parse(`${shortDateMatch[1]} ${shortDateMatch[2]}, ${year}`);
    if (!isNaN(ts)) {
      // If the date is more than 3 months in the past it's probably next year
      const now = Date.now();
      const adjusted = ts < now - 90 * 24 * 60 * 60 * 1000 ? ts + 365 * 24 * 60 * 60 * 1000 : ts;
      return adjusted;
    }
  }

  return undefined;
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

/**
 * Fetch a URL using Node fetch() with a browser-ish User-Agent and sensible
 * timeout. Returns the response text or throws on HTTP error.
 */
async function fetchHtml(url: string): Promise<string> {
  const domain = new URL(url).hostname;
  await rateLimit(domain);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Strip noise elements and return the first `maxChars` of text content.
 * Used for article body extraction — we don't need the full press release for
 * classification, just enough to extract dates, episode counts, and context.
 */
function extractBodyText(html: string, maxChars = 2000): string {
  const $ = cheerio.load(html);
  $('script, style, nav, header, footer, aside, .ad, .advertisement, .social-share, .related').remove();
  const text = $('article, .press-release, .release-body, main, .content, body')
    .first()
    .text()
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, maxChars);
}

// ─── Per-site scrapers ────────────────────────────────────────────────────────

/**
 * Warner Bros. Discovery Press (press.wbd.com/us/)
 * Replaced press.discovery.com (defunct since WBD merger).
 * Covers Discovery, TLC, HGTV, Food Network, ID, Animal Planet, Travel Channel,
 * HBO, Max, TNT, CNN, and all other WBD brands.
 * Article links follow /us/media-release/<slug> pattern; headlines in h6 tags.
 */
async function scrapeDiscovery(maxArticles = 20): Promise<ScrapedArticle[]> {
  const SOURCE: NetworkPressSource = 'discovery-press';
  const BASE_URL = 'https://press.wbd.com';
  const INDEX_URL = `${BASE_URL}/us/`;
  const articles: ScrapedArticle[] = [];

  try {
    const html = await withRetry(() => fetchHtml(INDEX_URL));
    const $ = cheerio.load(html);

    const links: Array<{ url: string; headline: string }> = [];
    const seen = new Set<string>();

    $('a[href*="/media-release/"], h6 a, h4 a, h3 a, h2 a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const headline = $(el).text().trim();
      if (!href || !headline || headline.length < 10 || seen.has(href)) return;
      seen.add(href);

      let url: string;
      try { url = new URL(href, BASE_URL).toString(); } catch { return; }

      if (/\/(about|contact|privacy|terms|category|tag|page|search)\b/i.test(url)) return;

      links.push({ url, headline });
    });

    const toProcess = links.slice(0, maxArticles);

    for (const { url, headline } of toProcess) {
      try {
        const articleHtml = await withRetry(() => fetchHtml(url), 2);
        const body = extractBodyText(articleHtml);
        const fullText = `${headline} ${body}`;
        const locationHints = extractLocationHints(fullText);
        const itemType = inferItemType(headline);

        articles.push({
          source: SOURCE,
          url,
          headline,
          body: body || headline,
          item_type: itemType,
          show_title: extractShowTitle(headline),
          network: extractNetwork(fullText) ?? 'Warner Bros. Discovery',
          genre: extractGenre(fullText),
          episode_count: extractEpisodeCount(fullText),
          location_type: locationHints.location_type,
          scraped_at: Date.now(),
        });
      } catch {
        // Individual article failures should not abort the entire source run
      }
    }
  } catch (err) {
    console.error(`[${SOURCE}] scrape failed:`, (err as Error).message);
  }

  return articles;
}

/**
 * A+E Networks Press (press.aenetworks.com/)
 * Covers A&E, History, Lifetime, FYI, Vice TV, and LMN.
 * Press releases are listed on the main index and linked from category pages.
 */
async function scrapeAENetworks(maxArticles = 20): Promise<ScrapedArticle[]> {
  const SOURCE: NetworkPressSource = 'aenetworks-press';
  const BASE_URL = 'https://press.aenetworks.com';
  const INDEX_URL = `${BASE_URL}/`;
  const articles: ScrapedArticle[] = [];

  try {
    const html = await withRetry(() => fetchHtml(INDEX_URL));
    const $ = cheerio.load(html);

    const links: Array<{ url: string; headline: string }> = [];
    const seen = new Set<string>();

    $('a[href*="/releases/"], a[href*="/news/"], a[href*="/press-release/"], .press-list a, article a, h2 a, h3 a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const headline = $(el).text().trim();
      if (!href || !headline || headline.length < 10 || seen.has(href)) return;
      seen.add(href);

      let url: string;
      try { url = new URL(href, BASE_URL).toString(); } catch { return; }

      if (/\/(about|contact|privacy|terms|category|tag|page|search)\b/i.test(url)) return;

      links.push({ url, headline });
    });

    const toProcess = links.slice(0, maxArticles);

    for (const { url, headline } of toProcess) {
      try {
        const articleHtml = await withRetry(() => fetchHtml(url), 2);
        const body = extractBodyText(articleHtml);
        const fullText = `${headline} ${body}`;
        const locationHints = extractLocationHints(fullText);
        const itemType = inferItemType(headline);

        // Infer the specific A+E sub-network from article text
        const network = extractNetwork(fullText) ??
          (/lifetime/i.test(fullText) ? 'Lifetime' :
           /history/i.test(fullText) ? 'History' :
           /a&e|aetv/i.test(fullText) ? 'A&E' : 'A+E Networks');

        articles.push({
          source: SOURCE,
          url,
          headline,
          body: body || headline,
          item_type: itemType,
          show_title: extractShowTitle(headline),
          network,
          genre: extractGenre(fullText),
          episode_count: extractEpisodeCount(fullText),
          location_type: locationHints.location_type,
          scraped_at: Date.now(),
        });
      } catch {
        // Skip and continue
      }
    }
  } catch (err) {
    console.error(`[${SOURCE}] scrape failed:`, (err as Error).message);
  }

  return articles;
}

/**
 * NBCUniversal Press (nbcuniversal.com/press-releases)
 * Covers NBC, Bravo, Peacock, Oxygen, USA Network, Syfy, MSNBC, CNBC, Telemundo.
 * Moved from nbcuniversalmediavillage.com (defunct) to nbcuniversal.com in 2025.
 * Article links follow /article/<slug> pattern.
 */
async function scrapeNBCUniversal(maxArticles = 20): Promise<ScrapedArticle[]> {
  const SOURCE: NetworkPressSource = 'nbcuniversal-press';
  const BASE_URL = 'https://www.nbcuniversal.com';
  const INDEX_URL = `${BASE_URL}/press-releases`;
  const articles: ScrapedArticle[] = [];

  try {
    const html = await withRetry(() => fetchHtml(INDEX_URL));
    const $ = cheerio.load(html);

    const links: Array<{ url: string; headline: string }> = [];
    const seen = new Set<string>();

    // New site uses /article/<slug> paths; headlines sit in h6 tags or adjacent anchors
    $('a[href^="/article/"], h6 a, h4 a, h3 a, h2 a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const headline = $(el).text().trim();
      if (!href || !headline || headline.length < 10 || seen.has(href)) return;
      seen.add(href);

      let url: string;
      try { url = new URL(href, BASE_URL).toString(); } catch { return; }

      if (/\/(about|contact|privacy|terms|category|tag|page|search)\b/i.test(url)) return;

      links.push({ url, headline });
    });

    const toProcess = links.slice(0, maxArticles);

    for (const { url, headline } of toProcess) {
      try {
        const articleHtml = await withRetry(() => fetchHtml(url), 2);
        const body = extractBodyText(articleHtml);
        const fullText = `${headline} ${body}`;
        const locationHints = extractLocationHints(fullText);
        const itemType = inferItemType(headline);

        // Infer the specific NBCU sub-network from article text
        const network = extractNetwork(fullText) ??
          (/bravo/i.test(fullText) ? 'Bravo' :
           /\bsyfy\b/i.test(fullText) ? 'Syfy' :
           /oxygen/i.test(fullText) ? 'Oxygen' :
           /\be!\b|e!\s+network/i.test(fullText) ? 'E!' :
           /usa\s+network/i.test(fullText) ? 'USA Network' :
           /\bnbc\b/i.test(fullText) ? 'NBC' : 'NBCUniversal');

        articles.push({
          source: SOURCE,
          url,
          headline,
          body: body || headline,
          item_type: itemType,
          show_title: extractShowTitle(headline),
          network,
          genre: extractGenre(fullText),
          episode_count: extractEpisodeCount(fullText),
          location_type: locationHints.location_type,
          scraped_at: Date.now(),
        });
      } catch {
        // Skip and continue
      }
    }
  } catch (err) {
    console.error(`[${SOURCE}] scrape failed:`, (err as Error).message);
  }

  return articles;
}

// ─── DB enrichment ────────────────────────────────────────────────────────────

export interface EnrichmentResult {
  /** Number of shows rows updated with press-site data */
  showsEnriched: number;
}

/**
 * Walk through scraped press articles and attempt to enrich the shows table.
 *
 * Matching strategy:
 *   1. Extract a candidate show title from the article headline
 *   2. Normalize it (lowercase, strip punctuation) for fuzzy comparison
 *   3. Look up against shows.title_normalized with optional network filter
 *   4. If matched, update with COALESCE guards so existing data is never overwritten
 *
 * All DB calls use the run/queryOne helpers from lib/db and are synchronous.
 * Import via the caller — this module does not import db directly to keep it
 * testable in isolation. The runner script (scripts/scrape-network-press.ts)
 * passes the helpers in.
 */
export async function enrichShows(
  articles: ScrapedArticle[],
  dbRun: (sql: string, params: unknown[]) => { changes: number },
  dbQueryOne: <T>(sql: string, params: unknown[]) => T | undefined
): Promise<EnrichmentResult> {
  let showsEnriched = 0;

  for (const article of articles) {
    // Only attempt enrichment when we have a candidate show title
    if (!article.show_title) continue;

    // Normalize: lowercase, strip all non-alphanumeric, collapse whitespace
    const normalized = article.show_title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!normalized || normalized.length < 3) continue;

    // Look up by normalized title — also filter by network if we have one
    // to avoid false matches when two networks have similarly titled shows
    const show = article.network
      ? dbQueryOne<{ id: string; premiere_date: number | null; source: string | null; source_url: string | null }>(
          `SELECT id, premiere_date, source, source_url
           FROM shows
           WHERE title_normalized = ?
             AND LOWER(REPLACE(network, ' ', '')) LIKE ?
           LIMIT 1`,
          [normalized, `%${article.network.toLowerCase().replace(/\s/g, '')}%`]
        )
      : dbQueryOne<{ id: string; premiere_date: number | null; source: string | null; source_url: string | null }>(
          `SELECT id, premiere_date, source, source_url
           FROM shows
           WHERE title_normalized = ?
           LIMIT 1`,
          [normalized]
        );

    if (!show) continue;

    // Extract premiere date from article body if available
    const premiereDate = extractPremiereDate(`${article.headline} ${article.body}`);

    // Infer air_status from item_type — only update if we have a confident signal
    const airStatus = inferAirStatus(article.item_type);

    // Build the update — COALESCE ensures we never overwrite existing data
    // Press sites are authoritative (confidence = 'confirmed') but we don't
    // want to demote existing confirmed data, only promote missing data.
    const result = dbRun(
      `UPDATE shows SET
         premiere_date = COALESCE(premiere_date, ?),
         air_status    = COALESCE(air_status, ?),
         source        = COALESCE(source, ?),
         source_url    = COALESCE(source_url, ?),
         confidence    = CASE
                           WHEN confidence IS NULL OR confidence = 'pending'
                           THEN 'confirmed'
                           ELSE confidence
                         END,
         updated_at    = ?
       WHERE id = ?`,
      [
        premiereDate ?? null,
        airStatus ?? null,
        article.source,
        article.url,
        Date.now(),
        show.id,
      ]
    );

    if (result.changes > 0) showsEnriched++;
  }

  return { showsEnriched };
}

// ─── Public scrape() entry point ──────────────────────────────────────────────

/**
 * Scrape one or all network press sources.
 *
 * @param source - Which source(s) to run. Defaults to all three.
 * @returns Combined ScrapedArticle[] ready for persist() in scrape-all.ts
 */
export default async function scrape(
  source: NetworkPressSource | 'all' = 'all'
): Promise<ScrapedArticle[]> {
  const results: ScrapedArticle[] = [];

  if (source === 'all' || source === 'discovery-press') {
    const items = await scrapeDiscovery();
    results.push(...items);
  }

  if (source === 'all' || source === 'aenetworks-press') {
    const items = await scrapeAENetworks();
    results.push(...items);
  }

  if (source === 'all' || source === 'nbcuniversal-press') {
    const items = await scrapeNBCUniversal();
    results.push(...items);
  }

  return results;
}
