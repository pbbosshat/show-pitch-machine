/**
 * Gmail Newsletter Scraper
 * Source: MYE's newsletter Gmail label (Label_378) via service account auth
 * Returns ScrapedArticle[] extracted from trade newsletter email bodies.
 *
 * Newsletters scraped include: Cynopsis Daily, Deadline Alerts, Variety Daily,
 * C21 Commission Digest, Realscreen Daily, and other trade subscriptions.
 *
 * Uses getNewsletterMessages() from lib/gmail.ts — service account auth required.
 * HTML email bodies are converted to plain text before extraction.
 * Each newsletter email may contain multiple story items; we split by article
 * boundaries (blank lines, datelines, story markers) to extract individual items.
 */

import { getNewsletterMessages } from '@/lib/gmail';
import { run } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import {
  type ScrapedArticle,
  extractEpisodeCount,
  extractNetwork,
  extractGenre,
  extractItemType,
  extractLocationHints,
} from './base';
import type { GmailMessage } from '@/types';

const SOURCE = 'gmail-newsletters';

// Maps sender domain → the source key used in trade_articles.
// Allows newsletter articles to appear under their publication's filter pill.
const SENDER_SOURCE_MAP: Record<string, string> = {
  'deadline.com':         'deadline',
  'variety.com':          'variety',
  'thr.com':              'thr',
  'hollywoodreporter.com':'thr',
  'tvline.com':           'tvline',
  'cynopsis.com':         'cynopsis',
  'realscreen.com':       'realscreen',
  'c21media.net':         'c21',
  'broadcastingcable.com':'bc',
  'nexttv.com':           'nexttv.com',
  'productionweekly.com': 'production-weekly',
  'worldscreen.com':      'worldscreen.com',
  'senalnews.com':        'senalnews.com',
  'broadbandtvnews.com':  'broadbandtvnews.com',
  'indiewire.com':        'indiewire',
};

// Resolve source key from sender address — falls back to 'gmail-newsletters'
function resolveSource(sender: string): string {
  const domain = sender.match(/@([\w.-]+)/)?.[1]?.toLowerCase() ?? '';
  return SENDER_SOURCE_MAP[domain] ?? SOURCE;
}

// Minimum story length to avoid treating ad-copy or footers as articles
const MIN_STORY_LENGTH = 80;

// Split newsletter email body into individual story segments.
// Newsletters typically use blank lines or common separators between items.
function splitIntoStories(body: string): string[] {
  // Try double-newline splits first (most common newsletter structure)
  const segments = body
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter((s) => s.length >= MIN_STORY_LENGTH)
    // Drop segments where every non-empty line is a URL/image tag — pure ad/image blocks
    .filter((s) => {
      const lines = s.split('\n').map((l) => l.trim()).filter(Boolean);
      return lines.some((l) => !/^\[?https?:\/\//i.test(l));
    });

  // If that yields nothing useful, fall back to returning the whole body as one story
  if (segments.length === 0 && body.trim().length >= MIN_STORY_LENGTH) {
    return [body.trim()];
  }

  return segments;
}

// Returns true for lines that are purely a URL or bracket-wrapped image/ad tag.
// These come from HTML-to-text conversion of <img> and <a> tags in newsletter emails.
function isUrlLine(line: string): boolean {
  return /^\[?https?:\/\//i.test(line.trim());
}

// Extract a headline from a story segment.
// Skips leading URL/image lines (e.g. "[https://cdnstoryimages...]") that are
// HTML image tags converted to plain text — the real headline follows them.
function extractHeadline(story: string): string {
  const lines = story.split('\n').map((l) => l.trim()).filter(Boolean);
  const headlineLine = lines.find((l) => !isUrlLine(l) && l.length >= 8) ?? lines[0] ?? '';
  return headlineLine.length <= 200 ? headlineLine : headlineLine.slice(0, 150) + '…';
}

// Extract a source URL from a story segment.
// Prefers article-path URLs over CDN image/ad URLs from newsletter templates.
function extractUrl(story: string): string | undefined {
  const allUrls = [...story.matchAll(/https?:\/\/[^\s\)\"\'>\]]+/g)]
    .map((m) => m[0].replace(/[.,;]+$/, ''));
  const articleUrl = allUrls.find(
    (u) => !/\.(jpg|jpeg|png|gif|webp|svg|mp4|css|js)(\?|$)/i.test(u) &&
           !/\b(newsletterads|cdnstoryimages|aimediaserver|marketoemail|tracker)\b/i.test(u)
  );
  return articleUrl ?? allUrls[0];
}

// Derive a synthetic URL from sender domain + subject when no real URL is found
function syntheticUrl(msg: GmailMessage, idx: number): string {
  const senderDomain = msg.sender.match(/@([\w.-]+)/)?.[1] || 'unknown.com';
  const subject = msg.subject.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40);
  return `gmail-newsletter://${senderDomain}/${subject}#story-${idx}`;
}

export default async function scrape(): Promise<ScrapedArticle[]> {
  const articles: ScrapedArticle[] = [];

  try {
    // Look back 3 days — newsletters often arrive on Friday and aren't scraped until Monday
    const since = new Date();
    since.setDate(since.getDate() - 3);

    const messages = await getNewsletterMessages(since);

    for (const msg of messages) {
      const stories = splitIntoStories(msg.body);
      const msgSource = resolveSource(msg.sender);

      stories.forEach((story, idx) => {
        const headline = extractHeadline(story);
        if (!headline) return;

        const url = extractUrl(story) || syntheticUrl(msg, idx);
        const fullText = `${headline} ${story}`;
        const locationHints = extractLocationHints(fullText);

        articles.push({
          source: msgSource,
          url,
          headline,
          body: story,
          item_type: extractItemType(headline),
          network: extractNetwork(fullText),
          genre: extractGenre(fullText),
          episode_count: extractEpisodeCount(fullText),
          location_type: locationHints.location_type,
          scraped_at: Date.now(),
        });
      });

      // Record this thread in ingestion_log so future scraper runs skip it
      run(
        `INSERT OR IGNORE INTO ingestion_log (id, source_type, source_id, ingested_at, chunk_count, status)
         VALUES (?, 'gmail', ?, ?, ?, 'ok')`,
        [uuidv4(), msg.threadId, Date.now(), stories.length]
      );
    }
  } catch (err) {
    // Log but don't rethrow — missing Gmail credentials is not a fatal error for the full run
    console.error(`[${SOURCE}] scrape failed:`, (err as Error).message);
  }

  return articles;
}
