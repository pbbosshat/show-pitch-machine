/**
 * C21 Media Commissions Scraper
 * Source: https://www.c21media.net/feed/
 * Returns up to 20 recent commission news articles.
 *
 * Previously targeted the /news/commissions/ category page which returned 404.
 * Now parses the site-wide RSS feed and filters by commission-related keywords
 * before fetching article bodies — avoids fetching irrelevant content.
 *
 * C21 is a UK-based trade covering international TV commissions.
 * Articles focus on non-scripted and factual programming globally.
 * Subscription required for full access; headlines always available.
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

const SOURCE = 'c21';
// Site-wide RSS feed — filtered by keyword below to commission/greenlight articles
const RSS_URL = 'https://www.c21media.net/feed/';
const MAX_ARTICLES = 20;

/**
 * Keywords that indicate an article is about a commission, greenlight, or order.
 * Checked against the concatenated title + description from the RSS item.
 */
const COMMISSION_KEYWORDS = [
  'commission', 'commissioned', 'greenlit', 'greenlight',
  'order', 'ordered', 'picked up', 'pickup',
  'co-produce', 'factual', 'unscripted', 'documentary', 'series',
];

/**
 * Returns true if the title or description suggests a commission/greenlight article.
 * Checked before fetching the article body to avoid unnecessary Puppeteer calls.
 */
function isCommissionArticle(title: string, desc: string): boolean {
  const text = `${title} ${desc}`.toLowerCase();
  return COMMISSION_KEYWORDS.some(k => text.includes(k));
}

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
 * Fetch the full article body from a C21 article URL via Puppeteer.
 * networkidle2 (vs domcontentloaded) gives JS-rendered content time to settle.
 */
async function fetchArticleBody(url: string): Promise<string> {
  await rateLimit('c21media.net');
  const page = await newPage();
  try {
    // networkidle2 + 30s timeout — handles JS-rendered article bodies
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const html = await page.content();
    const $ = cheerio.load(html);
    $('script, style, nav, header, footer, aside, .ad, .members-only').remove();
    return $('article .entry-content, .post-content, .article-body')
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
    // Fetch the site-wide RSS feed instead of the defunct /news/commissions/ page
    const rssItems = await withRetry(() => fetchRSS(RSS_URL));

    // Filter to commission/greenlight articles before fetching bodies —
    // avoids wasting Puppeteer calls on unrelated C21 content
    const toProcess = rssItems
      .filter(item => isCommissionArticle(item.title, item.description))
      .slice(0, MAX_ARTICLES);

    for (const { title: headline, link: url, description } of toProcess) {
      try {
        const item_type = extractItemType(headline);

        // Only Puppeteer-fetch the full body for greenlit/cancelled articles —
        // articles that passed the keyword filter but have non-greenlit headlines
        // (e.g. "factual" or "documentary" context pieces) use the RSS excerpt.
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
