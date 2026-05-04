/**
 * Production Weekly Scraper
 * Target: https://productionweekly.com/
 * Returns up to 20 recent production listings.
 *
 * Production Weekly is a subscription database of active productions.
 * Free homepage may show limited listings; full access requires subscription.
 * Captures whatever is publicly visible without credentials.
 *
 * Integration: after fetching each issue page, parsePWTitles() extracts the show
 * titles from bullet-separated <p> tags, then upsertPWShows() inserts any new
 * titles into the shows table and triggers TVMaze enrichment on new rows.
 * These functions live in scripts/enrich-tvmaze.ts and are imported here.
 */

import * as cheerio from 'cheerio';
import {
  type ScrapedArticle,
  fetchPage,
  extractEpisodeCount,
  extractNetwork,
  extractGenre,
  extractItemType,
  extractLocationHints,
  withRetry,
  rateLimit,
} from './base';
import { newPage } from '@/lib/browser';
import { parsePWTitles, upsertPWShows } from '../scripts/enrich-tvmaze';

const SOURCE = 'production-weekly';
const INDEX_URL = 'https://productionweekly.com/';
const MAX_ARTICLES = 20;

/**
 * Fetches raw HTML for a PW issue article page via Puppeteer.
 * Returns the full page HTML (not just text) so parsePWTitles can operate on it.
 * Separate from fetchArticleBody() which returns stripped text.
 */
async function fetchArticleHtml(url: string): Promise<string> {
  await rateLimit('productionweekly.com');
  const page = await newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    return await page.content();
  } catch {
    return '';
  } finally {
    await page.close();
  }
}

/**
 * Main PW scrape function.
 * @param dryRun - when true, upsertPWShows logs but makes no DB writes
 *
 * Called by: scripts/scrape-all.ts (no dryRun arg — defaults to false)
 *            scripts/enrich-tvmaze.ts runPWIntegration() (passes dryRun flag)
 */
export default async function scrape(dryRun = false): Promise<ScrapedArticle[]> {
  const articles: ScrapedArticle[] = [];

  try {
    const html = await withRetry(() => fetchPage(INDEX_URL));
    const $ = cheerio.load(html);

    const links: Array<{ url: string; headline: string }> = [];
    const seen = new Set<string>();

    $('h2 a, h3 a, .entry-title a, .production-title a, .listing-title a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const headline = $(el).text().trim();
      if (!href || !headline || seen.has(href)) return;
      seen.add(href);

      let url: string;
      try { url = new URL(href, 'https://productionweekly.com').toString(); } catch { return; }

      links.push({ url, headline });
    });

    const toProcess = links.slice(0, MAX_ARTICLES);

    for (const { url, headline } of toProcess) {
      try {
        // Fetch full HTML for this issue page — used by both the article body extractor
        // and parsePWTitles() which needs raw <p> tags with bullet-separated titles.
        const pageHtml = await withRetry(() => fetchArticleHtml(url), 2);

        // Extract plain text body for the trade article record
        const $page = cheerio.load(pageHtml);
        $page('script, style, nav, header, footer, aside, .ad, .members-only, .login-required').remove();
        const body =
          $page('article .entry-content, .production-details, .listing-body')
            .text().replace(/\s+/g, ' ').trim() ||
          $page('main').text().replace(/\s+/g, ' ').trim();

        const fullText = `${headline} ${body}`;
        const locationHints = extractLocationHints(fullText);

        articles.push({
          source: SOURCE,
          url,
          headline,
          body: body || headline,
          item_type: extractItemType(headline),
          network: extractNetwork(fullText),
          genre: extractGenre(fullText),
          episode_count: extractEpisodeCount(fullText),
          location_type: locationHints.location_type,
          scraped_at: Date.now(),
        });

        // ── PW Show DB integration ──────────────────────────────────────────────
        // Parse bullet-separated show titles out of the issue HTML, then upsert
        // any titles not already in the shows table. This runs on every article
        // page during a live scrape so newly announced productions are captured
        // as soon as the scraper sees them.
        //
        // issueDate: PW articles don't always expose a machine-readable date in
        // the URL or headline, so we approximate with "now" for new inserts.
        // The created_at / updated_at timestamps on the shows row carry the real
        // insertion time; issueDate is metadata only.
        const pwTitles = parsePWTitles(pageHtml);
        if (pwTitles.length > 0) {
          await upsertPWShows(pwTitles, new Date(), dryRun);
        }
        // ── End PW integration ──────────────────────────────────────────────────

      } catch {
        // Skip individual article failures — one bad page shouldn't abort the run
      }
    }
  } catch (err) {
    console.error(`[${SOURCE}] scrape failed:`, (err as Error).message);
  }

  return articles;
}
