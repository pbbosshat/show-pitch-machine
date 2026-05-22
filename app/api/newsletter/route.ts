/**
 * POST /api/newsletter
 * Called by: NewsletterSignup component on show pages and any future page that
 *   embeds the signup form (unauthenticated, public).
 * Auth: none — intentionally public
 * Body (JSON): { email, showSlug? }
 * Response: { data: { id, email, showSlug } } at 201, or error JSON
 *
 * V1: stores submissions in newsletter_signups Postgres table.
 * No external provider (Mailchimp / ConvertKit) in V1 — those need API keys.
 * When a provider is wired up later, add the provider sync call here in fire-
 * and-forget mode (same pattern as the contact lead notification email).
 *
 * Duplicate handling: if the same email submits for the same show_slug, we
 * return 200 with { duplicate: true } instead of 201. This is not an error —
 * the user can safely click twice. We insert on first submit and silently skip
 * subsequent identical submissions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { run, queryOne } from '@/lib/db';

interface NewsletterSignup {
  id: string;
  email: string;
  show_slug: string | null;
}

// Basic email regex — catches obvious non-emails without being overly strict.
// The browser <input type="email"> handles UX validation; this is server-side safety.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as {
    email?: string;
    showSlug?: string;
  };

  const email = body.email?.trim().toLowerCase() ?? '';
  const showSlug = body.showSlug?.trim() || null;

  // Validate required fields and email format
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: 'A valid email address is required.' },
      { status: 400 }
    );
  }

  // Deduplication check — same email + show_slug pair already exists
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM newsletter_signups WHERE email = ? AND (show_slug = ? OR (show_slug IS NULL AND ? IS NULL)) LIMIT 1',
    [email, showSlug, showSlug]
  );

  if (existing) {
    // Idempotent response — not an error, just a no-op
    return NextResponse.json(
      { data: { id: existing.id, email, showSlug, duplicate: true } },
      { status: 200 }
    );
  }

  const id = randomBytes(16).toString('hex');
  const createdAt = Date.now(); // ms epoch, consistent with contact_leads

  await run(
    'INSERT INTO newsletter_signups (id, email, show_slug, source, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, email, showSlug, 'show-page', createdAt]
  );

  const signup: NewsletterSignup = { id, email, show_slug: showSlug };
  return NextResponse.json({ data: { ...signup, showSlug } }, { status: 201 });
}
