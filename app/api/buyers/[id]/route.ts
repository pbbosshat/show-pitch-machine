/**
 * GET /api/buyers/[id]
 *   Returns full buyer_contact record with company details, employer history, prodco_count,
 *   and email_threads — project_email_threads rows where the buyer's email appears in participants.
 *   Response: { data: BuyerContact & { company_name, company_type, company_tier,
 *               company_hq_city, employer_history: EmployerHistoryEntry[],
 *               prodco_count: number, email_threads: EmailThreadSummary[] } }
 *
 * PUT /api/buyers/[id]
 *   Updates editable contact fields. Scraped/computed fields are read-only via this endpoint.
 *   Body: { title?, mandate_statement?, notes?, activity_status?, role_type?,
 *           is_buyer_seat?, production_type_focus?, company_id? }
 *   Response: { data: { changes: number } }
 *
 * PATCH /api/buyers/[id]/verify — handled in app/api/buyers/[id]/verify/route.ts
 *   Sets is_verified=1, verified_at, verified_by on the buyer_contacts row.
 *   Body: { verified_by?: string }   (default: 'manual')
 *   Response: { data: { changes: number } }
 *
 * Called by: buyer detail page, inline edit components
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run, query } from '@/lib/db';

// Shape returned in email_threads — stripped down for the buyer detail view
interface EmailThreadSummary {
  id: string;
  ip_catalog_id: string | null;
  thread_id: string;
  subject: string | null;
  participants: string;   // raw JSON string — deserialized before response
  first_message_date: string | null;
  last_message_date: string | null;
  message_count: number;
  snippet: string | null;
  direction: string | null;
  source: string | null;
  match_confidence: string | null;
}

// Shape of one entry in the employer_history array after JSON.parse
interface EmployerHistoryEntry {
  id: string;
  company_name: string;
  company_type: string | null;
  title: string | null;
  is_buyer_seat: number;
  start_date: number | null;
  end_date: number | null;
}

interface BuyerRow {
  id: string;
  company_id: string | null;
  name: string;
  email: string | null;
  title: string | null;
  mandate_statement: string | null;
  mandate_source: string | null;
  mandate_source_url: string | null;
  mandate_date: number | null;
  last_greenlit_date: number | null;
  orders_last_90_days: number;
  orders_last_365_days: number;
  activity_status: string;
  last_mye_contact_date: number | null;
  last_mye_contact_outcome: string | null;
  mye_pitch_count: number;
  company_history: string | null;
  notes: string | null;
  created_at: number | null;
  updated_at: number | null;
  role_type: string | null;
  is_buyer_seat: number;
  production_type_focus: string | null;
  company_name: string | null;
  company_type: string | null;
  company_tier: string | null;
  company_hq_city: string | null;
  // Raw JSON string from DB subquery — replaced with parsed array before response
  employer_history_json: string | null;
  prodco_count: number;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const row = queryOne<BuyerRow>(
      `SELECT
        bc.*,
        co.name    AS company_name,
        co.type    AS company_type,
        co.tier    AS company_tier,
        co.hq_city AS company_hq_city,
        (SELECT COUNT(DISTINCT d.prodco_id) FROM deals d WHERE d.buyer_id = bc.id) AS prodco_count,
        (SELECT json_group_array(json_object(
          'id', beh.id,
          'company_name', beh.company_name,
          'company_type', beh.company_type,
          'title', beh.title,
          'is_buyer_seat', beh.is_buyer_seat,
          'start_date', beh.start_date,
          'end_date', beh.end_date
        ) ORDER BY beh.start_date DESC)
        FROM buyer_employer_history beh
        WHERE beh.contact_id = bc.id
        ) AS employer_history_json
       FROM buyer_contacts bc
       LEFT JOIN buyer_companies co ON co.id = bc.company_id
       WHERE bc.id = ?`,
      [id]
    );

    if (!row) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 });
    }

    // Deserialize the employer history JSON string into a proper array
    const employerHistory: EmployerHistoryEntry[] = row.employer_history_json
      ? JSON.parse(row.employer_history_json)
      : [];

    // Fetch email threads where this buyer's email appears in the participants JSON column.
    // Only possible when the buyer has an email address on record.
    const emailThreads: EmailThreadSummary[] = row.email
      ? query<EmailThreadSummary>(
          `SELECT
            id, ip_catalog_id, thread_id, subject, participants,
            first_message_date, last_message_date, message_count,
            snippet, direction, source, match_confidence
           FROM project_email_threads
           WHERE participants LIKE ?
           ORDER BY last_message_date DESC
           LIMIT 20`,
          [`%${row.email}%`]
        )
      : [];

    // Strip the raw JSON field and add parsed arrays before sending
    const { employer_history_json: _raw, ...rest } = row;
    return NextResponse.json({
      data: { ...rest, employer_history: employerHistory, email_threads: emailThreads },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Only allow updating human-editable fields — scraped fields are never written via API
    const allowed = [
      'title',
      'mandate_statement',
      'notes',
      'activity_status',
      'role_type',          // buyer classification added in migration 005
      'is_buyer_seat',      // 1 = active buying seat, 0 = other role
      'production_type_focus',
      'company_id',         // reassign buyer to a different network/company
    ];
    const fields: string[] = [];
    const values: unknown[] = [];

    for (const key of allowed) {
      if (key in body) {
        fields.push(`${key} = ?`);
        values.push(body[key]);
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
    }

    // Always update updated_at so we can track when human edits last happened
    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    const result = run(
      `UPDATE buyer_contacts SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Buyer not found' }, { status: 404 });
    }

    return NextResponse.json({ data: { changes: result.changes } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
