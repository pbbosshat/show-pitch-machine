/**
 * Cynopsis TV News Scraper
 * Target: https://cynopsis.com/category/tv-news/
 * Returns up to 20 recent TV news articles.
 *
 * Cynopsis covers daily TV industry news with a focus on ratings, deals, and
 * executive moves. Free access — no paywall. Good signal for exec moves.
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

const SOURCE = 'cynopsis';
const INDEX_URL = 'https://cynopsis.com/category/tv-news/';
const MAX_ARTICLES = 20;

async function fetchArticleBody(url: string): Promise<string> {
  await rateLimit('cynopsis.com');
  const page = await newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const html = await page.content();
    const $ = cheerio.load(html);
    $('script, style, nav, header, footer, aside, .ad').remove();
    return $('article .entry-content, .post-content, .single-post-content')
      .text().replace(/\s+/g, ' ').trim() ||
      $('.content').text().replace(/\s+/g, ' ').trim();
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

    $('h2 a, h3 a, .entry-title a, .post-title a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const headline = $(el).text().trim();
      if (!href || !headline || seen.has(href)) return;
      seen.add(href);

      let url: string;
      try { url = new URL(href, 'https://cynopsis.com').toString(); } catch { return; }

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
