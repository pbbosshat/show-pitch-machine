/**
 * GET /api/projects/[id]
 * Called by: project detail page
 * Auth: none
 * Response: full ProjectDetail with email threads joined + sizzle_reels array
 * Returns 404 with { error: 'Project not found' } if id doesn't exist
 * sizzle_reels is always an array (empty if no sizzles exist for this project)
 *
 * PUT /api/projects/[id]
 *   Updates human-editable fields on a project (ip_catalog record).
 *   Body: { title?, logline?, format?, genre?, status?, notes?, sheet_source?, sheet_status?, sheet_point_person?, sheet_target_nets? }
 *   Response: { data: { changes: number } }
 *
 * Called by: project edit modal in IP catalog / project detail page
 * Auth: none
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query, run } from '@/lib/db';

interface ProjectDetail {
  id: string;
  title: string;
  logline: string | null;
  format: string | null;
  genre: string | null;
  notes: string | null;
  status: string | null;
  sheet_source: string | null;
  sheet_status: string | null;
  sheet_point_person: string | null;
  sheet_target_nets: string | null;
  sheet_pitched_to: string | null;
  sheet_passed: string | null;
  sheet_attachments: string | null;
  sheet_next_steps: string | null;
  sheet_raw_status: string | null;
  extracted_date: string | null;
  date_confidence: string | null;
  brainstorm_rank: number | null;
  email_thread_count: number;
  last_email_date: string | null;
  first_email_date: string | null;
}

interface EmailThreadSummary {
  id: string;
  thread_id: string;
  subject: string | null;
  first_message_date: string | null;
  last_message_date: string | null;
  message_count: number;
  direction: string | null;
  snippet: string | null;
}

// Shape of each sizzle reel row returned for a project detail
interface SizzleReel {
  id: string;
  ip_catalog_id: string;
  title: string | null;
  vimeo_url: string | null;
  vimeo_password: string | null;
  platform: string | null;
  raw_value: string | null;
  sheet_source: string | null;
  notes: string | null;
  created_at: string | null;
}

interface ProjectDetailResponse {
  id: string;
  title: string;
  logline: string | null;
  format: string | null;
  genre: string | null;
  notes: string | null;
  status: string | null;
  sheet_source: string | null;
  sheet_status: string | null;
  sheet_point_person: string | null;
  sheet_target_nets: string | null;
  sheet_pitched_to: string | null;
  sheet_passed: string | null;
  sheet_attachments: string | null;
  sheet_next_steps: string | null;
  sheet_raw_status: string | null;
  extracted_date: string | null;
  date_confidence: string | null;
  brainstorm_rank: number | null;
  email_thread_count: number;
  last_email_date: string | null;
  first_email_date: string | null;
  email_threads: EmailThreadSummary[];
  sizzle_reels: SizzleReel[];
  sizzle_count: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch project header with email aggregates
    const project = queryOne<ProjectDetail>(
      `SELECT
        ip.id,
        ip.title,
        ip.logline,
        ip.format,
        ip.genre,
        ip.notes,
        ip.status,
        ip.sheet_source,
        ip.sheet_status,
        ip.sheet_point_person,
        ip.sheet_target_nets,
        ip.sheet_pitched_to,
        ip.sheet_passed,
        ip.sheet_attachments,
        ip.sheet_next_steps,
        ip.sheet_raw_status,
        ip.extracted_date,
        ip.date_confidence,
        ip.brainstorm_rank,
        COUNT(pet.id) as email_thread_count,
        MAX(pet.last_message_date) as last_email_date,
        MIN(pet.first_message_date) as first_email_date
       FROM ip_catalog ip
       LEFT JOIN project_email_threads pet ON pet.ip_catalog_id = ip.id
       WHERE ip.id = ?
       GROUP BY ip.id`,
      [id]
    );

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch email threads (first 5, newest first)
    const emailThreads = query<EmailThreadSummary>(
      `SELECT
        id,
        thread_id,
        subject,
        first_message_date,
        last_message_date,
        message_count,
        direction,
        snippet
       FROM project_email_threads
       WHERE ip_catalog_id = ?
       ORDER BY first_message_date DESC
       LIMIT 5`,
      [id]
    );

    // Fetch all sizzle reels for this project — ordered by created_at so newest is last
    // Sizzle reels are first-class brand assets; the detail page will render them prominently
    const sizzleReels = query<SizzleReel>(
      `SELECT
        id,
        ip_catalog_id,
        title,
        vimeo_url,
        vimeo_password,
        platform,
        raw_value,
        sheet_source,
        notes,
        created_at
       FROM sizzle_reels
       WHERE ip_catalog_id = ?
       ORDER BY created_at`,
      [id]
    );

    const response: ProjectDetailResponse = {
      ...project,
      email_threads: emailThreads,
      sizzle_reels: sizzleReels,
      sizzle_count: sizzleReels.length,
    };

    return NextResponse.json(response);
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

    // Only allow updating human-editable fields — scraped/sheet-imported fields are read-only via this endpoint
    const allowed = [
      'title',
      'logline',
      'format',
      'genre',
      'status',
      'notes',
      'sheet_source',
      'sheet_status',
      'sheet_point_person',
      'sheet_target_nets',
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

    // Always stamp updated_at so we can track when human edits last occurred
    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    const result = run(
      `UPDATE ip_catalog SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({ data: { changes: result.changes } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
