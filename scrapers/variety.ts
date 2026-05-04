/**
 * Variety Orders & Pickups Scraper
 * Source: https://variety.com/v/tv/news/feed/
 * Returns up to 20 recent order/pickup articles with full body text.
 *
 * Previously targeted the /t/orders-and-pickups/ tag page which PMC deprecated
 * (404). Now parses the TV/news RSS feed instead — no Puppeteer index fetch.
 *
 * Variety has a metered paywall — first ~3 articles per session are usually free.
 * Body extraction may be partial if the paywall kicks in; headline is always captured.
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

const SOURCE = 'variety';
// RSS feed replaces the defunct /t/orders-and-pickups/ tag page
const RSS_URL = 'https://variety.com/v/tv/news/feed/';
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
    // <link> in RSS is a text node sibling of the tag, not an attribute
    const link = $(el).find('link').text().trim();
    // Strip any inline HTML from the description snippet
    const description = $(el).find('description').text()
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (title && link) items.push({ title, link, description });
  });
  return items;
}

/**
 * Fetch the full article body from a Variety article URL via Puppeteer.
 * networkidle2 (vs domcontentloaded) gives JS-rendered content time to settle.
 */
async function fetchArticleBody(url: string): Promise<string> {
  await rateLimit('variety.com');
  const page = await newPage();
  try {
    // networkidle2 + 30s timeout — handles JS-rendered article bodies
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const html = await page.content();
    const $ = cheerio.load(html);
    $('script, style, nav, header, footer, aside, .ad, .paywall-content, .subscribe-bar').remove();
    return $('article .article-content, article .c-content, .article-body')
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
    // Fetch the RSS feed instead of scraping the (defunct) index page
    const rssItems = await withRetry(() => fetchRSS(RSS_URL));
    const toProcess = rssItems.slice(0, MAX_ARTICLES);

    for (const { title: headline, link: url, description } of toProcess) {
      try {
        const item_type = extractItemType(headline);

        // Only open the full article via Puppeteer for greenlit/cancelled items —
        // SNL recaps, reviews, casting news etc. use the RSS excerpt as body.
        // This cuts Puppeteer calls from ~20 down to typically 2-5 per run.
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
