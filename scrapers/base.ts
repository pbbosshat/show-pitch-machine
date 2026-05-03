/**
 * Scraper base utilities: shared types, rate limiter, retry logic, and
 * rule-based extraction helpers used by all source scrapers.
 *
 * No AI calls here — all extraction is deterministic regex/keyword matching.
 * The rule-based approach keeps scrapers fast, auditable, and offline-capable.
 */

import * as cheerio from 'cheerio';
import { newPage } from '@/lib/browser';
import type { Page } from 'puppeteer';

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface ScrapedArticle {
  source: string;
  url: string;
  headline: string;
  body: string;
  item_type: string;
  show_title?: string;
  network?: string;
  format?: string;
  genre?: string;
  episode_count?: number;
  location_type?: string;
  greenlit_date?: number;
  scraped_at: number;
}

// ─── Known Networks ───────────────────────────────────────────────────────────

// Canonical list used by extractNetwork() — add new networks here and all scrapers benefit
export const KNOWN_NETWORKS = [
  'Netflix', 'HBO', 'Hulu', 'Disney+', 'Amazon Prime', 'Apple TV+',
  'Peacock', 'Paramount+', 'Max', 'Warner Bros. Discovery', 'NBCUniversal',
  'A+E Networks', 'Fox', 'CBS', 'ABC', 'CNN', 'Bravo', 'Lifetime',
  'History', 'Nat Geo', 'Discovery', 'Reelz', 'Oxygen', 'TLC', 'HGTV',
  'AMC', 'FX', 'Comedy Central', 'MTV', 'VH1', 'E!', 'USA Network',
  'Syfy', 'BBC', 'ITV', 'Channel 4', 'Sky', 'Channel 5',
];

// ─── Genre Taxonomy ───────────────────────────────────────────────────────────

// Genre keywords are matched case-insensitively against article body text
export const GENRE_TAXONOMY = [
  'Paranormal', 'True Crime', 'Nature/Weather', 'Sports', 'Documentary',
  'Reality/Unscripted', 'Docuseries', 'Competition', 'Lifestyle', 'Travel',
  'Food', 'Music', 'Celebrity', 'History', 'Science', 'Kids', 'Comedy',
];

// Genre keyword aliases — maps common text patterns to taxonomy entries
const GENRE_ALIASES: Record<string, string> = {
  'true crime': 'True Crime',
  'crime': 'True Crime',
  'murder': 'True Crime',
  'docuseries': 'Docuseries',
  'documentary': 'Documentary',
  'documental': 'Documentary',
  'reality': 'Reality/Unscripted',
  'unscripted': 'Reality/Unscripted',
  'competition': 'Competition',
  'cooking': 'Food',
  'food': 'Food',
  'travel': 'Travel',
  'nature': 'Nature/Weather',
  'weather': 'Nature/Weather',
  'paranormal': 'Paranormal',
  'ghost': 'Paranormal',
  'haunted': 'Paranormal',
  'supernatural': 'Paranormal',
  'sports': 'Sports',
  'music': 'Music',
  'celebrity': 'Celebrity',
  'history': 'History',
  'historical': 'History',
  'science': 'Science',
  'lifestyle': 'Lifestyle',
  'kids': 'Kids',
  'children': 'Kids',
  'comedy': 'Comedy',
};

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

// Track last request time per domain so we wait 2s between requests to the same host
const lastRequestTime: Record<string, number> = {};

export async function rateLimit(domain: string): Promise<void> {
  const last = lastRequestTime[domain] || 0;
  const elapsed = Date.now() - last;
  const WAIT_MS = 2000;

  if (elapsed < WAIT_MS) {
    await sleep(WAIT_MS - elapsed);
  }

  lastRequestTime[domain] = Date.now();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Retry Wrapper ────────────────────────────────────────────────────────────

// Exponential backoff retry — 3 attempts with 1s, 2s, 4s delays
export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastErr: Error = new Error('No attempts made');

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err as Error;
      if (i < attempts - 1) {
        await sleep(baseDelayMs * Math.pow(2, i));
      }
    }
  }

  throw lastErr;
}

// ─── Extraction Helpers ───────────────────────────────────────────────────────

// Extract episode count from text — matches patterns like "8 episodes", "10-ep", "six episodes"
export function extractEpisodeCount(text: string): number | undefined {
  const wordToNum: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  };

  // Try numeric first: "10 episodes", "10-ep", "10-episode"
  const numMatch = text.match(/(\d+)\s*[\s-]*(episodes?|eps?)\b/i);
  if (numMatch) return parseInt(numMatch[1], 10);

  // Try word form: "six-episode", "eight episodes"
  const wordMatch = text.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s*[\s-]*(episodes?|eps?)\b/i);
  if (wordMatch) return wordToNum[wordMatch[1].toLowerCase()];

  return undefined;
}

// Extract first matching known network from text — case-insensitive
export function extractNetwork(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const network of KNOWN_NETWORKS) {
    if (lower.includes(network.toLowerCase())) return network;
  }
  return undefined;
}

// Extract genre from text using alias map and taxonomy
export function extractGenre(text: string): string | undefined {
  const lower = text.toLowerCase();
  for (const [alias, genre] of Object.entries(GENRE_ALIASES)) {
    if (lower.includes(alias)) return genre;
  }
  return undefined;
}

// Classify article type from headline keywords
export function extractItemType(headline: string): string {
  const h = headline.toLowerCase();

  if (/\b(greenlights?|green-lights?|orders?|picks?\s+up|pickups?|commissions?)\b/.test(h)) {
    return 'greenlit';
  }
  if (/\b(renews?|renewed|renewal)\b/.test(h)) return 'greenlit';
  if (/\b(cancels?|cancelled|canceled)\b/.test(h)) return 'cancelled';
  if (/\b(named|joins?|promoted|exits?|departs?|leaves?|appoints?|hired)\b/.test(h)) {
    return 'exec-move';
  }
  if (/\b(mandate|looking\s+for|seeking|wants?)\b/.test(h)) return 'mandate-statement';

  return 'other';
}

// Extract US state names and international location hints from article text
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming',
];

export function extractLocationHints(text: string): { location_type?: string; primary_state?: string } {
  const lower = text.toLowerCase();

  // Check for explicit studio/stage hints first
  if (/\b(studio|soundstage|back\s*lot)\b/.test(lower)) {
    return { location_type: 'studio' };
  }

  // Check for international hints
  if (/\b(uk|united\s+kingdom|england|australia|canada|new\s+zealand|ireland)\b/.test(lower)) {
    return { location_type: 'international' };
  }

  // Check for US state mentions
  for (const state of US_STATES) {
    if (text.includes(state)) {
      return { location_type: 'on-location', primary_state: state };
    }
  }

  return {};
}

// ─── Page Fetch Helpers ───────────────────────────────────────────────────────

// Fetch a URL with Puppeteer, apply rate limiting, return HTML string
export async function fetchPage(url: string): Promise<string> {
  const domain = new URL(url).hostname;
  await rateLimit(domain);

  const page = await newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const html = await page.content();
    return html;
  } finally {
    await page.close();
  }
}

// Parse HTML with cheerio and extract visible text from body
export function extractText(html: string): string {
  const $ = cheerio.load(html);

  // Remove noise elements before extracting text
  $('script, style, nav, header, footer, aside, .ad, .advertisement, .paywall').remove();

  return $('body').text().replace(/\s+/g, ' ').trim();
}

// Extract article links and headlines from a listing page
export interface ArticleLink {
  url: string;
  headline: string;
}

export function extractArticleLinks(
  html: string,
  baseUrl: string,
  linkSelector: string,
  headlineSelector?: string
): ArticleLink[] {
  const $ = cheerio.load(html);
  const links: ArticleLink[] = [];
  const seen = new Set<string>();

  $(linkSelector).each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    const headline = headlineSelector
      ? $el.find(headlineSelector).text().trim()
      : $el.text().trim();

    if (!href || !headline) return;

    // Resolve relative URLs against the base
    let absoluteUrl: string;
    try {
      absoluteUrl = new URL(href, baseUrl).toString();
    } catch {
      return;
    }

    // Deduplicate by URL
    if (seen.has(absoluteUrl)) return;
    seen.add(absoluteUrl);

    links.push({ url: absoluteUrl, headline });
  });

  return links;
}
