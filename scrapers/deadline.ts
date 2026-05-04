/**
 * Deadline Greenlight Scraper
 * Target: https://deadline.com/tag/greenlights/
 * Returns up to 20 recent greenlight articles with full body text.
 *
 * Deadline requires no login for tag pages but may serve a consent wall in EU.
 * The scraper will fail gracefully with empty array if blocked or rate-limited.
 */

import * as cheerio from 'cheerio';
import {
  type ScrapedArticle,
  fetchPage,
  extractText,
  extractEpisodeCount,
  extractNetwork,
  extractGenre,
  extractItemType,
  extractLocationHints,
  withRetry,
  rateLimit,
} from './base';
import { newPage } from '@/lib/browser';

const SOURCE = 'deadline';
const INDEX_URL = 'https://deadline.com/tag/greenlights/';
const MAX_ARTICLES = 20;

// Fetch full article body from a Deadline article URL
async function fetchArticleBody(url: string): Promise<string> {
  await rateLimit('deadline.com');
  const page = await newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const html = await page.content();
    const $ = cheerio.load(html);
    // Deadline article body lives in .pmc-paywall or .a-content or article
    $('script, style, nav, header, footer, aside, .ad, .related-articles').remove();
    return $('article').text().replace(/\s+/g, ' ').trim() ||
           $('main').text().replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  } finally {
    await page.close();
  }
}

export default async function scrape(): Promise<ScrapedArticle[]> {
  const articles: ScrapedArticle[] = [];

  try {
    const html = await withRetry(() => fetchPage(INDEX_URL));
    const $ = cheerio.load(html);

    // Collect article links from the tag listing page
    const links: Array<{ url: string; headline: string }> = [];
    const seen = new Set<string>();

    // Deadline tag pages list articles in h2.article-title > a or .title > a
    $('h2 a, h3 a, .article-title a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const headline = $(el).text().trim();
      if (!href || !headline || seen.has(href)) return;
      seen.add(href);

      let url: string;
      try { url = new URL(href, 'https://deadline.com').toString(); } catch { return; }

      links.push({ url, headline });
    });

    // Process up to MAX_ARTICLES — cap prevents runaway scraping
    const toProcess = links.slice(0, MAX_ARTICLES);

    for (const { url, headline } of toProcess) {
      try {
        const body = await withRetry(() => fetchArticleBody(url), 2);
        const fullText = `${headline} ${body}`;
        const locationHints = extractLocationHints(fullText);

        articles.push({
          source: SOURCE,
          url,
          headline,
          body: body || headline,
          // Force greenlit — this scraper targets /tag/greenlights/ specifically
          item_type: 'greenlit',
          network: extractNetwork(fullText),
          genre: extractGenre(fullText),
          episode_count: extractEpisodeCount(fullText),
          location_type: locationHints.location_type,
          scraped_at: Date.now(),
        });
      } catch {
        // Skip individual article failures — partial results are better than none
      }
    }
  } catch (err) {
    // Log but don't rethrow — let the scraper/run route mark this as error
    console.error(`[${SOURCE}] scrape failed:`, (err as Error).message);
  }

  return articles;
}
