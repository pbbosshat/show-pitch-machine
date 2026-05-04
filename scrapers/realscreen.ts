/**
 * Realscreen News Scraper
 * Target: https://realscreen.com/ (homepage — /news/ slug conflicts with a 2001 WP post)
 * Returns up to 20 recent articles focused on unscripted/factual TV.
 *
 * Realscreen is the primary trade for non-scripted/reality/documentary news.
 * High signal-to-noise for MYE's genre focus. Subscription required for full articles.
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

const SOURCE = 'realscreen';
const INDEX_URL = 'https://realscreen.com/';
const MAX_ARTICLES = 20;

async function fetchArticleBody(url: string): Promise<string> {
  await rateLimit('realscreen.com');
  const page = await newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const html = await page.content();
    const $ = cheerio.load(html);
    $('script, style, nav, header, footer, aside, .ad, .paywall').remove();
    return $('article .entry-content, .post-content, .article-content')
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
    // Inline fetch instead of fetchPage() to control waitUntil — homepage needs
    // networkidle2 to fully render the WordPress article listing before extraction.
    const page = await newPage();
    let html = '';
    try {
      await page.goto(INDEX_URL, { waitUntil: 'networkidle2', timeout: 30000 });
      html = await page.content();
    } finally {
      await page.close();
    }
    const $ = cheerio.load(html);

    const links: Array<{ url: string; headline: string }> = [];
    const seen = new Set<string>();

    // Realscreen uses date-based WP permalinks (/YYYY/MM/DD/slug).
    // Match any <a> pointing at those URLs — works regardless of where on the
    // page the link appears (homepage widgets, nav promos, article lists).
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (!/realscreen\.com\/20\d\d\/\d\d\/\d\d\//.test(href)) return;
      const headline = $(el).text().trim();
      if (!headline || headline.length < 10 || seen.has(href)) return;
      seen.add(href);

      let url: string;
      try { url = new URL(href, 'https://realscreen.com').toString(); } catch { return; }

      links.push({ url, headline });
    });

    const toProcess = links.slice(0, MAX_ARTICLES);

    for (const { url, headline } of toProcess) {
      try {
        const item_type = extractItemType(headline);

        // Only Puppeteer-fetch the full body for greenlit/cancelled articles —
        // headline alone is enough to classify everything else.
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
