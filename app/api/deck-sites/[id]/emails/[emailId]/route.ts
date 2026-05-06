/**
 * DELETE /api/deck-sites/[id]/emails/[emailId]
 *   Detach an email from this deck — clears deck_id, buyer_contact_id, and
 *   resets attachment_source to 'auto' so the AI classifier can re-evaluate it.
 *   Does NOT delete the email record itself; it is returned to the unattached pool.
 *
 *   Response: { data: { success: true } }
 *
 * Called by: deck editor email list (user removes a previously attached email)
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; emailId: string }> }
) {
  try {
    const { id: deckId, emailId } = await params;

    // Verify the parent deck exists
    const deck = queryOne<{ id: string }>(
      `SELECT id FROM deck_sites WHERE id = ?`,
      [deckId]
    );

    if (!deck) {
      return NextResponse.json({ error: 'Deck site not found' }, { status: 404 });
    }

    // Detach only if the email is currently linked to THIS deck.
    // The WHERE deck_id = deckId guard prevents accidentally detaching an email
    // that belongs to a different deck (e.g. if the caller sends the wrong id).
    const result = run(
      `UPDATE package_emails
          SET deck_id           = NULL,
              buyer_contact_id  = NULL,
              attachment_source = 'auto'
        WHERE id = ? AND deck_id = ?`,
      [emailId, deckId]
    );

    if (result.changes === 0) {
      // Either the email doesn't exist or it's not linked to this deck
      return NextResponse.json(
        { error: 'Email not found or not attached to this deck' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
