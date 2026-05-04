/**
 * NextTV (Broadcasting & Cable) News Scraper
 * Target: https://www.nexttv.com/news
 * Returns up to 20 recent news articles covering TV orders and deals.
 *
 * NextTV (formerly Broadcasting & Cable) covers cable and broadcast TV programming.
 * /news used instead of /programming — /programming covers industry business, not greenlight orders;
 * RSS feed for /programming stale since Oct 2025; React-rendered page requires networkidle2.
 */

import * as cheerio from 'cheerio';
import {
  type ScrapedArticle,
  extractEpisodeCount,
  extractNetwork,
  extractGenre,
  extractItemType,
  extractLocationHints,
  withRetry,
  rateLimit,
} from './base';
import { newPage } from '@/lib/browser';

const SOURCE = 'bc';
const INDEX_URL = 'https://www.nexttv.com/news';
const MAX_ARTICLES = 20;

async function fetchArticleBody(url: string): Promise<string> {
  await rateLimit('nexttv.com');
  const page = await newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('article, .article-body, .content-body', { timeout: 8000 }).catch(() => {});
    const html = await page.content();
    const $ = cheerio.load(html);
    $('script, style, nav, header, footer, aside, .ad').remove();
    return $('article .article-body, .content-body, .entry-content')
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
    // nexttv.com is React-rendered; networkidle2 never fires because analytics run forever.
    // Use domcontentloaded + waitForSelector to get article cards without waiting for all scripts.
    const page = await newPage();
    let html = '';
    try {
      await page.goto(INDEX_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
      // Wait for at least one article card to hydrate — bail after 12s if nothing
      await page.waitForSelector('.article-link, .listingResult', { timeout: 12000 }).catch(() => {});
      html = await page.content();
    } finally {
      await page.close();
    }
    const $ = cheerio.load(html);

    const links: Array<{ url: string; headline: string }> = [];
    const seen = new Set<string>();

    // .article-link is the <a> card element; h3.article-name inside it has the
    // clean headline (the full card text also includes author/date noise).
    $('.article-link').each((_, el) => {
      const href = $(el).attr('href') || '';
      const headline = $(el).find('.article-name').text().trim() ||
                       $(el).find('h3').text().trim();
      if (!href || !headline || seen.has(href)) return;
      seen.add(href);

      let url: string;
      try { url = new URL(href, 'https://www.nexttv.com').toString(); } catch { return; }

      links.push({ url, headline });
    });

    const toProcess = links.slice(0, MAX_ARTICLES);

    for (const { url, headline } of toProcess) {
      try {
        const item_type = extractItemType(headline);

        // Only Puppeteer-fetch the full body for greenlit/cancelled articles —
        // ratings news, exec moves etc. use the headline alone.
        let body = '';
        if (item_type === 'greenlit' || item_type === 'cancelled') {
          body = await withRetry(() => fetchArticleBody(url), 2);
        }

        const fullText = `${headline} ${body}`;
        const locationHints = extractLocationHints(fullText);

        articles.push({
          source: SOURCE,
          url,
          headline,
          body: body || headline,
          item_type,
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
