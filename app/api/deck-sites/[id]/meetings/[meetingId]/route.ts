/**
 * PATCH /api/deck-sites/[id]/meetings/[meetingId]
 *   Update any editable fields on a meeting record.
 *   Body: any subset of { meeting_date, meeting_type, notes, outcome, buyer_contact_id }
 *   Response: { data: DeckMeetingWithContact }
 *
 * DELETE /api/deck-sites/[id]/meetings/[meetingId]
 *   Permanently remove a meeting record.
 *   Response: { data: { success: true } }
 *
 * Called by: deck editor meeting history panel (edit outcome, delete old records)
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

interface DeckMeetingRow {
  id: string;
  deck_id: string;
  buyer_contact_id: string | null;
  meeting_date: number | null;
  meeting_type: string | null;
  notes: string | null;
  outcome: string | null;
  created_at: number | null;
}

interface ContactSummary {
  id: string;
  name: string;
  title: string | null;
}

interface DeckMeetingWithContact extends DeckMeetingRow {
  contact: ContactSummary | null;
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; meetingId: string }> }
) {
  try {
    const { id: deckId, meetingId } = await params;

    // Verify the parent deck exists
    const deck = await queryOne<{ id: string }>(
      `SELECT id FROM deck_sites WHERE id = ?`,
      [deckId]
    );

    if (!deck) {
      return NextResponse.json({ error: 'Deck site not found' }, { status: 404 });
    }

    // Verify the meeting belongs to this deck before allowing edits
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM deck_meetings WHERE id = ? AND deck_id = ?`,
      [meetingId, deckId]
    );

    if (!existing) {
      return NextResponse.json({ error: 'Meeting record not found' }, { status: 404 });
    }

    const body = await request.json();

    // Whitelist updatable columns — deck_id and id are immutable
    const allowed = ['meeting_date', 'meeting_type', 'notes', 'outcome', 'buyer_contact_id'] as const;
    const setClauses: string[] = [];
    const values: unknown[]    = [];

    for (const col of allowed) {
      if (col in body) {
        setClauses.push(`${col} = ?`);
        values.push(body[col] ?? null);
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
    }

    values.push(meetingId);
    values.push(deckId);

    await run(
      `UPDATE deck_meetings SET ${setClauses.join(', ')} WHERE id = ? AND deck_id = ?`,
      values
    );

    // Re-fetch with joined contact so the response shape matches the GET list endpoint
    const row = await queryOne<DeckMeetingRow & {
      contact_id: string | null;
      contact_name: string | null;
      contact_title: string | null;
    }>(
      `SELECT
         dm.id,
         dm.deck_id,
         dm.buyer_contact_id,
         dm.meeting_date,
         dm.meeting_type,
         dm.notes,
         dm.outcome,
         dm.created_at,
         bc.id    AS contact_id,
         bc.name  AS contact_name,
         bc.title AS contact_title
       FROM deck_meetings dm
       LEFT JOIN buyer_contacts bc ON bc.id = dm.buyer_contact_id
       WHERE dm.id = ?`,
      [meetingId]
    );

    const result: DeckMeetingWithContact = {
      id:               row!.id,
      deck_id:          row!.deck_id,
      buyer_contact_id: row!.buyer_contact_id,
      meeting_date:     row!.meeting_date,
      meeting_type:     row!.meeting_type,
      notes:            row!.notes,
      outcome:          row!.outcome,
      created_at:       row!.created_at,
      contact: row!.contact_id
        ? { id: row!.contact_id, name: row!.contact_name ?? '', title: row!.contact_title }
        : null,
    };

    return NextResponse.json({ data: result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; meetingId: string }> }
) {
  try {
    const { id: deckId, meetingId } = await params;

    // Verify the parent deck exists
    const deck = await queryOne<{ id: string }>(
      `SELECT id FROM deck_sites WHERE id = ?`,
      [deckId]
    );

    if (!deck) {
      return NextResponse.json({ error: 'Deck site not found' }, { status: 404 });
    }

    // Delete only if the meeting belongs to this deck (cross-deck safety guard)
    const result = await run(
      `DELETE FROM deck_meetings WHERE id = ? AND deck_id = ?`,
      [meetingId, deckId]
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Meeting record not found' }, { status: 404 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
