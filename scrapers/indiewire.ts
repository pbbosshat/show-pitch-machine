/**
 * IndieWire TV Scraper
 * Source: https://www.indiewire.com/t/tv/feed/
 * Returns up to 20 recent TV articles.
 *
 * Previously targeted the /t/tv/ tag index page, which loads article links via
 * JS after domcontentloaded — causing empty result sets. Now parses the RSS
 * feed directly, then fetches individual article bodies via Puppeteer.
 *
 * IndieWire covers independent and prestige TV, documentaries, and limited series.
 * Useful for documentary and docuseries greenlight intelligence.
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

const SOURCE = 'indiewire';
// RSS feed replaces the JS-rendered /t/tv/ index page
const RSS_URL = 'https://www.indiewire.com/t/tv/feed/';
const MAX_ARTICLES = 20;

/**
 * Fetch and parse an RSS feed, returning title/link/description for each item.
 * Uses Node fetch + cheerio in xmlMode — no Puppeteer, no rate-limit needed.
 */
async function fetchRSS(url: string): Promise<Array<{ title: string; link: string; description: string }>> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
  });
  const xml = await res.text();
  const $ = cheerio.load(xml, { xmlMode: true });

  const items: Array<{ title: string; link: string; description: string }> = [];
  $('item').each((_, el) => {
    const title = $(el).find('title').text().trim();
    // <link> in RSS is a text node, not an attribute
    const link = $(el).find('link').text().trim();
    // Strip inline HTML from description snippet
    const description = $(el).find('description').text()
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (title && link) items.push({ title, link, description });
  });
  return items;
}

/**
 * Fetch the full article body from an IndieWire article URL via Puppeteer.
 * networkidle2 (vs domcontentloaded) gives JS-rendered content time to settle.
 */
async function fetchArticleBody(url: string): Promise<string> {
  await rateLimit('indiewire.com');
  const page = await newPage();
  try {
    // networkidle2 + 30s timeout — handles JS-rendered article bodies
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const html = await page.content();
    const $ = cheerio.load(html);
    $('script, style, nav, header, footer, aside, .ad, .newsletter-subscribe').remove();
    return $('article .entry-content, .a-content, .article-body')
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
    // Fetch the RSS feed instead of scraping the JS-rendered index page
    const rssItems = await withRetry(() => fetchRSS(RSS_URL));
    const toProcess = rssItems.slice(0, MAX_ARTICLES);

    for (const { title: headline, link: url, description } of toProcess) {
      try {
        const item_type = extractItemType(headline);

        // Only open the full article via Puppeteer for greenlit/cancelled items —
        // reviews, commentary, craft pieces etc. use the RSS excerpt as body.
        let body = description;
        if (item_type === 'greenlit' || item_type === 'cancelled') {
          body = await withRetry(() => fetchArticleBody(url), 2) || description;
        }

        const fullText = `${headline} ${body}`;
        const locationHints = extractLocationHints(fullText);

        articles.push({
          source: SOURCE,
          url,
          headline,
          body,
          item_type,
          network: extractNetwork(fullText),
          genre: extractGenre(fullText),
          episode_count: extractEpisodeCount(fullText),
          location_type: locationHints.location_type,
          scraped_at: Date.now(),
        });
      } catch {
        // Skip individual article failures — one bad article shouldn't abort the run
      }
    }
  } catch (err) {
    console.error(`[${SOURCE}] scrape failed:`, (err as Error).message);
  }

  return articles;
}
