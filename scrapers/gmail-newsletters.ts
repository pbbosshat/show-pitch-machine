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

// Minimum story length to avoid treating ad-copy or footers as articles
const MIN_STORY_LENGTH = 80;

// Split newsletter email body into individual story segments.
// Newsletters typically use blank lines or common separators between items.
function splitIntoStories(body: string): string[] {
  // Try double-newline splits first (most common newsletter structure)
  const segments = body
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter((s) => s.length >= MIN_STORY_LENGTH);

  // If that yields nothing useful, fall back to returning the whole body as one story
  if (segments.length === 0 && body.trim().length >= MIN_STORY_LENGTH) {
    return [body.trim()];
  }

  return segments;
}

// Extract a headline from a story segment — first non-empty line is usually the headline
function extractHeadline(story: string): string {
  const lines = story.split('\n').map((l) => l.trim()).filter(Boolean);
  // Prefer shorter lines as headlines; very long first lines are likely paragraphs
  const firstLine = lines[0] || '';
  return firstLine.length <= 200 ? firstLine : firstLine.slice(0, 150) + '…';
}

// Extract a source URL from a story segment — look for http(s) links
function extractUrl(story: string): string | undefined {
  const match = story.match(/https?:\/\/[^\s\)\"\']+/);
  return match ? match[0].replace(/[.,;]+$/, '') : undefined;
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
    // Fetch newsletters since yesterday to get fresh content without processing old messages
    const since = new Date();
    since.setDate(since.getDate() - 1);

    const messages = await getNewsletterMessages(since);

    for (const msg of messages) {
      const stories = splitIntoStories(msg.body);

      stories.forEach((story, idx) => {
        const headline = extractHeadline(story);
        if (!headline) return;

        const url = extractUrl(story) || syntheticUrl(msg, idx);
        const fullText = `${headline} ${story}`;
        const locationHints = extractLocationHints(fullText);

        articles.push({
          source: SOURCE,
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
