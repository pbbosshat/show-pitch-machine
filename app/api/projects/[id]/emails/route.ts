/**
 * GET /api/projects/[id]/emails
 * Called by: project email timeline page
 * Auth: none
 * Query params:
 *   limit  — default 100
 *   offset — default 0
 * Response: { project_id, project_title, threads, total, date_range }
 * Parses JSON participants field to array before returning.
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';

interface ProjectEmailRow {
  id: string;
  title: string;
}

interface EmailThreadRow {
  id: string;
  thread_id: string;
  subject: string | null;
  participants: string | null;
  first_message_date: string | null;
  last_message_date: string | null;
  message_count: number;
  snippet: string | null;
  direction: string | null;
  source: string | null;
  match_confidence: string | null;
}

interface EmailThread {
  id: string;
  thread_id: string;
  subject: string | null;
  participants: string[];
  first_message_date: string | null;
  last_message_date: string | null;
  message_count: number;
  snippet: string | null;
  direction: string | null;
  source: string | null;
  match_confidence: string | null;
}

interface EmailsResponse {
  project_id: string;
  project_title: string;
  threads: EmailThread[];
  total: number;
  date_range: {
    first: string | null;
    last: string | null;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limitStr = searchParams.get('limit') || '100';
    const offsetStr = searchParams.get('offset') || '0';

    const limit = Math.min(Math.max(1, parseInt(limitStr) || 100), 500);
    const offset = Math.max(0, parseInt(offsetStr) || 0);

    // Verify project exists
    const project = queryOne<ProjectEmailRow>(
      'SELECT id, title FROM ip_catalog WHERE id = ?',
      [id]
    );

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get total thread count for pagination
    const countRow = queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM project_email_threads WHERE ip_catalog_id = ?',
      [id]
    );
    const total = countRow?.count || 0;

    // Fetch email threads with limit/offset
    const rawThreads = query<EmailThreadRow>(
      `SELECT
        id,
        thread_id,
        subject,
        participants,
        first_message_date,
        last_message_date,
        message_count,
        snippet,
        direction,
        source,
        match_confidence
       FROM project_email_threads
       WHERE ip_catalog_id = ?
       ORDER BY first_message_date DESC
       LIMIT ? OFFSET ?`,
      [id, limit, offset]
    );

    // Parse participants JSON string to array
    const threads: EmailThread[] = rawThreads.map(t => ({
      ...t,
      participants: t.participants ? JSON.parse(t.participants) : []
    }));

    // Get date range across all threads for this project
    const dateRange = queryOne<{
      first_message_date: string | null;
      last_message_date: string | null;
    }>(
      `SELECT
        MIN(first_message_date) as first_message_date,
        MAX(last_message_date) as last_message_date
       FROM project_email_threads
       WHERE ip_catalog_id = ?`,
      [id]
    );

    const response: EmailsResponse = {
      project_id: id,
      project_title: project.title,
      threads,
      total,
      date_range: {
        first: dateRange?.first_message_date || null,
        last: dateRange?.last_message_date || null
      }
    };

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
