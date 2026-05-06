/**
 * GET /api/deck-sites/[id]/buyers
 *   List all buyers attached to this pitch deck, with full contact and company
 *   details and any emails that have been linked to this deck + contact pair.
 *
 *   Response: { data: DeckBuyerWithDetails[] }
 *   Each item: { id, buyer_contact_id, sent_at, pipeline_stage, notes,
 *                contact: { id, name, email, title, company_id, company_name },
 *                emails: EmailRow[] }
 *
 * POST /api/deck-sites/[id]/buyers
 *   Add a buyer contact to this deck's recipient list.
 *   Body: { buyer_contact_id, sent_at?, pipeline_stage?, notes? }
 *   Response: { data: DeckBuyerWithDetails }
 *
 * Called by: deck editor buyer panel, pitch tracking dashboard
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, run } from '@/lib/db';

// ---------------------------------------------------------------------------
// Row types
// ---------------------------------------------------------------------------

interface DeckBuyerRow {
  id: string;
  deck_id: string;
  buyer_contact_id: string | null;
  sent_at: number | null;
  pipeline_stage: string | null;
  notes: string | null;
  created_at: number | null;
}

interface ContactRow {
  id: string;
  name: string;
  email: string | null;
  title: string | null;
  company_id: string | null;
  company_name: string | null;
}

interface EmailRow {
  id: string;
  gmail_thread_id: string | null;
  subject: string | null;
  sender: string | null;
  received_at: number | null;
  grok_signal: string | null;
}

interface DeckBuyerWithDetails extends DeckBuyerRow {
  contact: ContactRow | null;
  emails: EmailRow[];
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

    // Verify the parent deck exists before returning sub-resources
    const deck = queryOne<{ id: string }>(
      `SELECT id FROM deck_sites WHERE id = ?`,
      [deckId]
    );

    if (!deck) {
      return NextResponse.json({ error: 'Deck site not found' }, { status: 404 });
    }

    // Fetch all deck_buyers rows with their contact + company info joined in.
    // LEFT JOIN on buyer_contacts so we still return a row when contact_id is NULL.
    const rows = query<DeckBuyerRow & {
      contact_id: string | null;
      contact_name: string | null;
      contact_email: string | null;
      contact_title: string | null;
      contact_company_id: string | null;
      contact_company_name: string | null;
    }>(
      `SELECT
         db.id,
         db.deck_id,
         db.buyer_contact_id,
         db.sent_at,
         db.pipeline_stage,
         db.notes,
         db.created_at,
         bc.id         AS contact_id,
         bc.name       AS contact_name,
         bc.email      AS contact_email,
         bc.title      AS contact_title,
         bc.company_id AS contact_company_id,
         co.name       AS contact_company_name
       FROM deck_buyers db
       LEFT JOIN buyer_contacts bc ON bc.id = db.buyer_contact_id
       LEFT JOIN buyer_companies co ON co.id = bc.company_id
       WHERE db.deck_id = ?
       ORDER BY db.created_at DESC`,
      [deckId]
    );

    // For each buyer, fetch any emails linked to this deck + that contact
    const buyers: DeckBuyerWithDetails[] = rows.map((row) => {
      const contact: ContactRow | null = row.contact_id
        ? {
            id:           row.contact_id,
            name:         row.contact_name ?? '',
            email:        row.contact_email,
            title:        row.contact_title,
            company_id:   row.contact_company_id,
            company_name: row.contact_company_name,
          }
        : null;

      // Emails linked to this deck with this specific contact
      const emails = query<EmailRow>(
        `SELECT id, gmail_thread_id, subject, sender, received_at, grok_signal
           FROM package_emails
          WHERE deck_id = ? AND buyer_contact_id = ?`,
        [deckId, row.buyer_contact_id]
      );

      return {
        id:               row.id,
        deck_id:          row.deck_id,
        buyer_contact_id: row.buyer_contact_id,
        sent_at:          row.sent_at,
        pipeline_stage:   row.pipeline_stage,
        notes:            row.notes,
        created_at:       row.created_at,
        contact,
        emails,
      };
    });

    return NextResponse.json({ data: buyers });
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
    const deck = queryOne<{ id: string }>(
      `SELECT id FROM deck_sites WHERE id = ?`,
      [deckId]
    );

    if (!deck) {
      return NextResponse.json({ error: 'Deck site not found' }, { status: 404 });
    }

    const body = await request.json();

    if (!body.buyer_contact_id) {
      return NextResponse.json({ error: 'buyer_contact_id is required' }, { status: 400 });
    }

    // Verify the contact exists so we don't create orphan deck_buyers rows
    const contact = queryOne<ContactRow & { company_name: string | null }>(
      `SELECT bc.id, bc.name, bc.email, bc.title, bc.company_id, co.name AS company_name
         FROM buyer_contacts bc
         LEFT JOIN buyer_companies co ON co.id = bc.company_id
        WHERE bc.id = ?`,
      [body.buyer_contact_id]
    );

    if (!contact) {
      return NextResponse.json({ error: 'Buyer contact not found' }, { status: 404 });
    }

    const now = Date.now() / 1000 | 0;
    const id  = crypto.randomUUID();

    run(
      `INSERT INTO deck_buyers (id, deck_id, buyer_contact_id, sent_at, pipeline_stage, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        deckId,
        body.buyer_contact_id,
        body.sent_at       ?? null,
        body.pipeline_stage ?? 'sent',
        body.notes         ?? null,
        now,
      ]
    );

    const newRow = queryOne<DeckBuyerRow>(
      `SELECT * FROM deck_buyers WHERE id = ?`,
      [id]
    );

    // Compose the full response shape with contact details
    const result: DeckBuyerWithDetails = {
      ...(newRow as DeckBuyerRow),
      contact: {
        id:           contact.id,
        name:         contact.name,
        email:        contact.email,
        title:        contact.title,
        company_id:   contact.company_id,
        company_name: contact.company_name,
      },
      emails: [], // newly inserted — no emails attached yet
    };

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
