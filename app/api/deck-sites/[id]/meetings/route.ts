/**
 * GET /api/deck-sites/[id]/meetings
 *   List all meeting/call records for a pitch deck, newest first.
 *   Joins buyer_contacts so callers get contact name and title without a second request.
 *
 *   Response: { data: DeckMeetingWithContact[] }
 *   Each item: { id, deck_id, buyer_contact_id, meeting_date, meeting_type, notes,
 *                outcome, created_at, contact: { id, name, title } | null }
 *
 * POST /api/deck-sites/[id]/meetings
 *   Log a new call or meeting against this deck.
 *   Body: { meeting_date: number (unix ms, required), buyer_contact_id?, meeting_type?, notes?, outcome? }
 *   Response: { data: DeckMeetingWithContact }
 *
 * Called by: deck editor meeting history panel, pitch timeline bots
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, run } from '@/lib/db';

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deckId } = await params;

    // Verify the parent deck exists
    const deck = await queryOne<{ id: string }>(
      `SELECT id FROM deck_sites WHERE id = ?`,
      [deckId]
    );

    if (!deck) {
      return NextResponse.json({ error: 'Deck site not found' }, { status: 404 });
    }

    // LEFT JOIN so meetings with no linked buyer contact are still returned
    const rows = await query<DeckMeetingRow & {
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
       WHERE dm.deck_id = ?
       ORDER BY dm.meeting_date DESC`,
      [deckId]
    );

    // Shape each row into the response contract — separate contact object or null
    const meetings: DeckMeetingWithContact[] = rows.map((row) => ({
      id:               row.id,
      deck_id:          row.deck_id,
      buyer_contact_id: row.buyer_contact_id,
      meeting_date:     row.meeting_date,
      meeting_type:     row.meeting_type,
      notes:            row.notes,
      outcome:          row.outcome,
      created_at:       row.created_at,
      contact: row.contact_id
        ? { id: row.contact_id, name: row.contact_name ?? '', title: row.contact_title }
        : null,
    }));

    return NextResponse.json({ data: meetings });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deckId } = await params;

    // Verify the parent deck exists
    const deck = await queryOne<{ id: string }>(
      `SELECT id FROM deck_sites WHERE id = ?`,
      [deckId]
    );

    if (!deck) {
      return NextResponse.json({ error: 'Deck site not found' }, { status: 404 });
    }

    const body = await request.json();

    // meeting_date is the only mandatory field — we can't log a meeting without a time
    if (!body.meeting_date) {
      return NextResponse.json({ error: 'meeting_date is required' }, { status: 400 });
    }

    const now = Date.now() / 1000 | 0;
    const id  = crypto.randomUUID();

    await run(
      `INSERT INTO deck_meetings
         (id, deck_id, buyer_contact_id, meeting_date, meeting_type, notes, outcome, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        deckId,
        body.buyer_contact_id ?? null,
        body.meeting_date,
        body.meeting_type     ?? 'call',
        body.notes            ?? null,
        body.outcome          ?? null,
        now,
      ]
    );

    // Re-fetch with joined contact so the response shape matches GET
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
      [id]
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

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
