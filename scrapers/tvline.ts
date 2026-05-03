/**
 * TVLine Renewals Scraper
 * Target: https://tvline.com/tag/renewals/
 * Returns up to 20 recent renewal/cancellation articles.
 *
 * TVLine covers both scripted and unscripted renewals/cancellations.
 * Generally free to access without paywall. Strong for cancellation signals.
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

const SOURCE = 'tvline';
const INDEX_URL = 'https://tvline.com/tag/renewals/';
const MAX_ARTICLES = 20;

async function fetchArticleBody(url: string): Promise<string> {
  await rateLimit('tvline.com');
  const page = await newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const html = await page.content();
    const $ = cheerio.load(html);
    $('script, style, nav, header, footer, aside, .ad, .tvline-ad').remove();
    return $('article .article-content, .article__body, .post-body')
      .text().replace(/\s+/g, ' ').trim() ||
      $('article').text().replace(/\s+/g, ' ').trim();
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

    const links: Array<{ url: string; headline: string }> = [];
    const seen = new Set<string>();

    $('h2 a, h3 a, .article-title a, .entry-title a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const headline = $(el).text().trim();
      if (!href || !headline || seen.has(href)) return;
      seen.add(href);

      let url: string;
      try { url = new URL(href, 'https://tvline.com').toString(); } catch { return; }

      links.push({ url, headline });
    });

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
          item_type: extractItemType(headline),
          network: extractNetwork(fullText),
          genre: extractGenre(fullText),
          episode_count: extractEpisodeCount(fullText),
          location_type: locationHints.location_type,
          scraped_at: Date.now(),
        });
      } catch {
        // Skip individual article failures
      }
    }
  } catch (err) {
    console.error(`[${SOURCE}] scrape failed:`, (err as Error).message);
  }

  return articles;
}
