// Gmail API wrapper with two auth modes:
//   1. Service account + domain-wide delegation → newsletter/trade alert scraping
//   2. OAuth refresh token → MYE pipeline email polling (Patrick's mailbox)
// Keeping both modes here avoids duplicating the Google auth boilerplate across scrapers.

import { google } from 'googleapis';
import { convert } from 'html-to-text';
import fs from 'node:fs';
import { query } from './db';
import type { GmailMessage } from '../types';

// ── Auth helpers ──────────────────────────────────────────────────────────────

// Service account auth — used for newsletter scraper and outbound invite emails.
// subject defaults to GMAIL_NEWSLETTER_USER but can be overridden to impersonate
// any gototeam.com / assignmentdesk.com mailbox via domain-wide delegation.
function getServiceAccountAuth(scopes: string[], subject?: string) {
  const keyPath =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ||
    'C:/Users/pb/.claude/google/service_account.json';
  const key = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));

  const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes,
    subject: subject ?? process.env.GMAIL_NEWSLETTER_USER,
  });

  return auth;
}

// OAuth2 auth — used for pipeline poller reading Patrick's real pitch mailbox
function getOAuthClient() {
  const client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  );

  client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  return client;
}

// ── Message fetching ──────────────────────────────────────────────────────────

// Parse a raw Gmail message payload into a clean GmailMessage object.
// Handles both plain-text and HTML bodies, plus base64url encoding.
function parseMessage(msg: {
  id?: string | null;
  threadId?: string | null;
  payload?: {
    headers?: Array<{ name?: string | null; value?: string | null }> | null;
    body?: { data?: string | null } | null;
    parts?: Array<{
      mimeType?: string | null;
      body?: { data?: string | null } | null;
    }> | null;
  } | null;
  internalDate?: string | null;
}): GmailMessage {
  const headers = msg.payload?.headers ?? [];
  const get = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';

  // Walk the MIME tree to find the best body part (prefer plain text over HTML)
  let body = '';
  const parts = msg.payload?.parts ?? [];
  const textPart = parts.find((p) => p.mimeType === 'text/plain');
  const htmlPart = parts.find((p) => p.mimeType === 'text/html');

  if (textPart?.body?.data) {
    body = Buffer.from(textPart.body.data, 'base64url').toString('utf-8');
  } else if (htmlPart?.body?.data) {
    const html = Buffer.from(htmlPart.body.data, 'base64url').toString('utf-8');
    // Convert HTML to readable text so the LLM classifier gets clean input
    body = convert(html, { wordwrap: false, selectors: [{ selector: 'a', options: { ignoreHref: true } }] });
  } else if (msg.payload?.body?.data) {
    const raw = Buffer.from(msg.payload.body.data, 'base64url').toString('utf-8');
    // Treat single-part messages as plain text (could be HTML, convert just in case)
    body = raw.includes('<html') ? convert(raw, { wordwrap: false }) : raw;
  }

  return {
    id: msg.id ?? '',
    threadId: msg.threadId ?? '',
    subject: get('subject'),
    sender: get('from'),
    recipient: get('to'),
    body: body.slice(0, 8000), // cap at 8 KB — enough context for classification
    receivedAt: msg.internalDate ? parseInt(msg.internalDate, 10) : Date.now(),
  };
}

// Check which thread IDs have already been ingested so we skip duplicates
function getIngestedThreadIds(): Set<string> {
  const rows = query<{ source_id: string }>(
    "SELECT source_id FROM ingestion_log WHERE source_type = 'gmail'"
  );
  return new Set(rows.map((r) => r.source_id));
}

// ── Outbound email ────────────────────────────────────────────────────────────

const INVITE_FROM = 'cc@assignmentdesk.com';

// Send an HTML email from cc@assignmentdesk.com using the service account with
// domain-wide delegation — no separate OAuth flow needed.
export async function sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
  const auth = getServiceAccountAuth(
    ['https://www.googleapis.com/auth/gmail.send'],
    INVITE_FROM
  );
  const gmail = google.gmail({ version: 'v1', auth });

  const raw = Buffer.from(
    `From: MY Entertainment <${INVITE_FROM}>\r\n` +
    `To: ${to}\r\n` +
    `Subject: ${subject}\r\n` +
    `MIME-Version: 1.0\r\n` +
    `Content-Type: text/html; charset=utf-8\r\n` +
    `\r\n` +
    htmlBody
  ).toString('base64url');

  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
}

// ── Public API ────────────────────────────────────────────────────────────────

// Known trade newsletter sender domains for sm@gototeam.com.
// Label_378 ("industry newsletters") exists but emails arrive unlabeled —
// we search by sender domain instead, which is more robust.
const NEWSLETTER_SENDER_QUERY = [
  'deadline.com', 'variety.com', 'hollywoodreporter.com', 'thr.com',
  'tvline.com', 'cynopsis.com', 'realscreen.com', 'c21media.net',
  'broadcastingcable.com', 'nexttv.com', 'productionweekly.com',
  'worldscreen.com', 'senalnews.com', 'broadbandtvnews.com', 'indiewire.com',
].map((d) => `from:${d}`).join(' OR ');

// Fetch trade newsletter emails from sm@gototeam.com.
// Uses service account with domain-wide delegation (client ID 101663092871827294753
// authorized on gototeam.com workspace with gmail.readonly scope).
export async function getNewsletterMessages(sinceDate?: Date): Promise<GmailMessage[]> {
  const auth = getServiceAccountAuth(['https://www.googleapis.com/auth/gmail.readonly']);
  const gmail = google.gmail({ version: 'v1', auth });

  const after = sinceDate ? Math.floor(sinceDate.getTime() / 1000) : undefined;
  const q = [`(${NEWSLETTER_SENDER_QUERY})`, after ? `after:${after}` : ''].filter(Boolean).join(' ');

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q,
    maxResults: 100,
  });

  const messages = listRes.data.messages ?? [];
  if (messages.length === 0) return [];

  const ingested = getIngestedThreadIds();

  const results: GmailMessage[] = [];
  for (const m of messages) {
    if (!m.id) continue;
    const full = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'full' });
    const parsed = parseMessage(full.data);
    // Skip threads we've already processed to avoid re-embedding the same articles
    if (!ingested.has(parsed.threadId)) results.push(parsed);
  }

  return results;
}

// Fetch MYE pitch mailbox emails for pipeline classification.
// Uses OAuth so it reads the actual user's Sent + Inbox for buyer correspondence.
export async function getPipelineMessages(sinceDate?: Date): Promise<GmailMessage[]> {
  const auth = getOAuthClient();
  const gmail = google.gmail({ version: 'v1', auth });

  const after = sinceDate ? Math.floor(sinceDate.getTime() / 1000) : undefined;
  // Scope to pitch-relevant senders: @wbd.com, @nbcuni.com, @netflix.com, etc.
  const domainFilter = [
    'wbd.com', 'nbcuni.com', 'netflix.com', 'hbo.com', 'aenetworks.com',
    'paramount.com', 'fox.com', 'amazon.com', 'apple.com',
  ].map((d) => `from:${d}`).join(' OR ');

  const q = [`(${domainFilter})`, after ? `after:${after}` : ''].filter(Boolean).join(' ');

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q,
    maxResults: 50,
  });

  const messages = listRes.data.messages ?? [];
  if (messages.length === 0) return [];

  const ingested = getIngestedThreadIds();

  const results: GmailMessage[] = [];
  for (const m of messages) {
    if (!m.id) continue;
    const full = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'full' });
    const parsed = parseMessage(full.data);
    if (!ingested.has(parsed.threadId)) results.push(parsed);
  }

  return results;
}
