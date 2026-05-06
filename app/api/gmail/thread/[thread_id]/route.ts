/**
 * GET /api/gmail/thread/[thread_id]
 * Called by: Email tab modal on the buyer detail page
 * Auth: session cookie (middleware enforces it — this route is not in PUBLIC_PREFIXES)
 * Response: { messages: Array<{ id, sender, recipient, subject, date, internalDate, body }>, mailbox: string }
 *
 * Tries two auth strategies in order:
 *   1. OAuth2 token.json — the same account used by cross-ref-emails.ts to populate
 *      project_email_threads (sm@gototeam.com / Patrick's pitch mailbox). Most threads
 *      in the DB come from here.
 *   2. myentprod.com service account DWD — catches threads ingested from myentprod.com
 *      mailboxes via getMYEPipelineMessages().
 */

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { convert } from 'html-to-text';
import fs from 'node:fs';

// All mailboxes to try via service account DWD.
// sm@gototeam.com is first — the JSON exports (shawn_pitch_threads_full.json,
// pitch_threads_full.json) that populate project_email_threads came from that mailbox.
const MYE_MAILBOXES = [
  'sm@gototeam.com',
  'michael@myentprod.com',
  'hhansen@myentprod.com',
  'admin@myentprod.com',
  'jtownley@myentprod.com',
  'kmiles@myentprod.com',
];

// Service account DWD — authorized on both gototeam.com and myentprod.com workspaces.
function getServiceAuth(mailbox: string) {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
    : JSON.parse(fs.readFileSync(
        process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ||
        'C:/Users/pb/.claude/google/service_account.json',
        'utf-8'
      ));
  return new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    subject: mailbox,
  });
}

// Recursively extract the best plain-text body from a Gmail MIME payload.
// Prefers text/plain; converts text/html via html-to-text; recurses into multipart.
function extractBody(payload: {
  mimeType?: string | null;
  body?: { data?: string | null } | null;
  parts?: unknown[] | null;
} | null | undefined): string {
  if (!payload) return '';

  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
  }

  if (payload.mimeType === 'text/html' && payload.body?.data) {
    const html = Buffer.from(payload.body.data, 'base64url').toString('utf-8');
    return convert(html, { wordwrap: false, selectors: [{ selector: 'a', options: { ignoreHref: true } }] });
  }

  // Recurse into multipart children — prefer text/plain, then text/html, then any
  const parts = (payload.parts ?? []) as typeof payload[];
  const textPart = parts.find((p) => p?.mimeType === 'text/plain');
  if (textPart) return extractBody(textPart);

  const htmlPart = parts.find((p) => p?.mimeType === 'text/html');
  if (htmlPart) return extractBody(htmlPart);

  for (const part of parts) {
    const body = extractBody(part);
    if (body) return body;
  }

  if (payload.body?.data) {
    const raw = Buffer.from(payload.body.data, 'base64url').toString('utf-8');
    return raw.includes('<html') ? convert(raw, { wordwrap: false }) : raw;
  }

  return '';
}

function parseMessages(messages: NonNullable<Awaited<ReturnType<ReturnType<typeof google.gmail>['users']['threads']['get']>>['data']['messages']>) {
  return messages.map((msg) => {
    const headers = msg.payload?.headers ?? [];
    const get = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';
    return {
      id: msg.id ?? '',
      sender: get('from'),
      recipient: get('to'),
      subject: get('subject'),
      date: get('date'),
      internalDate: msg.internalDate ?? null,
      body: extractBody(msg.payload).slice(0, 10000),
    };
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ thread_id: string }> }
) {
  const { thread_id } = await params;

  // Try each mailbox via service account DWD — sm@gototeam.com first since that's
  // the source of the JSON-exported threads in project_email_threads.
  for (const mailbox of MYE_MAILBOXES) {
    try {
      const auth = getServiceAuth(mailbox);
      const gmail = google.gmail({ version: 'v1', auth });
      const res = await gmail.users.threads.get({ userId: 'me', id: thread_id, format: 'full' });
      const messages = parseMessages(res.data.messages ?? []);
      return NextResponse.json({ messages, mailbox });
    } catch (err) {
      console.error(`[gmail/thread] ${mailbox} failed:`, err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json(
    { error: 'Thread not found in any mailbox' },
    { status: 404 }
  );
}
