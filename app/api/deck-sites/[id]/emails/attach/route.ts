/**
 * POST /api/deck-sites/[id]/emails/attach
 *   Manually link an existing package_emails row to this deck (and optionally
 *   to a specific buyer contact). Sets attachment_source to 'manual' so the UI
 *   can distinguish user-curated links from AI-classified ones.
 *
 *   Body: { emailId: string, buyer_contact_id?: string }
 *   Response: { data: EmailRow }
 *
 * Called by: deck editor email attachment drawer (user drags an email onto a deck)
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';

// Full package_emails row shape (post-migration 027 columns included)
interface EmailRow {
  id: string;
  package_id: string | null;
  gmail_thread_id: string | null;
  subject: string | null;
  sender: string | null;
  received_at: number | null;
  grok_signal: string | null;
  grok_raw: string | null;
  stage_moved_to: string | null;
  processed_at: number | null;
  deck_id: string | null;
  buyer_contact_id: string | null;
  attachment_source: string | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deckId } = await params;

    // Verify the parent deck exists before attaching emails to it
    const deck = await queryOne<{ id: string }>(
      `SELECT id FROM deck_sites WHERE id = ?`,
      [deckId]
    );

    if (!deck) {
      return NextResponse.json({ error: 'Deck site not found' }, { status: 404 });
    }

    const body = await request.json();

    if (!body.emailId) {
      return NextResponse.json({ error: 'emailId is required' }, { status: 400 });
    }

    // Verify the email exists before trying to update it
    const email = await queryOne<{ id: string }>(
      `SELECT id FROM package_emails WHERE id = ?`,
      [body.emailId]
    );

    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Link the email to this deck. attachment_source = 'manual' marks it as
    // user-initiated so it is not later overwritten by the AI classifier.
    await run(
      `UPDATE package_emails
          SET deck_id           = ?,
              buyer_contact_id  = ?,
              attachment_source = 'manual'
        WHERE id = ?`,
      [deckId, body.buyer_contact_id ?? null, body.emailId]
    );

    const updated = await queryOne<EmailRow>(
      `SELECT * FROM package_emails WHERE id = ?`,
      [body.emailId]
    );

    return NextResponse.json({ data: updated });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
