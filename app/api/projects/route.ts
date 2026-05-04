/**
 * GET /api/projects
 * Called by: project list page, project search modal
 * Auth: none
 * Query params:
 *   q           — LIKE match on ip_catalog.title
 *   sheet_source — filter by 'priorities' | 'backburner' | 'archived' | 'passes' | 'brainstorm' | 'full-dev' | 'bc-mye'
 *   status      — filter by ip_catalog.status
 *   limit       — default 50, max 200
 *   offset      — default 0
 * Response: { data: Array<ProjectSummary> }
 * Sorted by email activity DESC (most recent first), fallback to extracted_date, fallback to epoch.
 * Includes sizzle_count and has_sizzle per project — sizzle reels are first-class brand assets.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface ProjectSummary {
  id: string;
  title: string;
  status: string | null;
  sheet_source: string | null;
  sheet_status: string | null;
  sheet_point_person: string | null;
  sheet_target_nets: string | null;
  sheet_pitched_to: string | null;
  sheet_passed: string | null;
  extracted_date: string | null;
  date_confidence: string | null;
  brainstorm_rank: number | null;
  email_thread_count: number;
  last_email_date: string | null;
  first_email_date: string | null;
  sizzle_count: number;
  has_sizzle: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const sheetSource = searchParams.get('sheet_source') || '';
    const status = searchParams.get('status') || '';
    const limitStr = searchParams.get('limit') || '50';
    const offsetStr = searchParams.get('offset') || '0';

    // Enforce limit constraints
    let limit = Math.min(Math.max(1, parseInt(limitStr) || 50), 200);
    let offset = Math.max(0, parseInt(offsetStr) || 0);

    // Build WHERE clauses dynamically — only add conditions for non-empty params
    const conditions: string[] = ['ip.sheet_row_key IS NOT NULL'];
    const params: unknown[] = [];

    if (q) {
      conditions.push('ip.title LIKE ?');
      params.push(`%${q}%`);
    }

    if (sheetSource) {
      conditions.push('ip.sheet_source = ?');
      params.push(sheetSource);
    }

    if (status) {
      conditions.push('ip.status = ?');
      params.push(status);
    }

    const whereClause = conditions.join(' AND ');

    // Raw rows from the DB — sizzle_count comes back as a number from SQLite COUNT()
    const rawRows = query<ProjectSummary & { sizzle_count: number }>(
      `SELECT
        ip.id,
        ip.title,
        ip.status,
        ip.sheet_source,
        ip.sheet_status,
        ip.sheet_point_person,
        ip.sheet_target_nets,
        ip.sheet_pitched_to,
        ip.sheet_passed,
        ip.extracted_date,
        ip.date_confidence,
        ip.brainstorm_rank,
        COUNT(DISTINCT pet.id) as email_thread_count,
        MAX(pet.last_message_date) as last_email_date,
        MIN(pet.first_message_date) as first_email_date,
        COUNT(DISTINCT sr.id) as sizzle_count
       FROM ip_catalog ip
       LEFT JOIN project_email_threads pet ON pet.ip_catalog_id = ip.id
       LEFT JOIN sizzle_reels sr ON sr.ip_catalog_id = ip.id
       WHERE ${whereClause}
       GROUP BY ip.id
       ORDER BY COALESCE(MAX(pet.last_message_date), ip.extracted_date, '1970-01-01') DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Coerce sizzle_count to a proper number and derive has_sizzle boolean
    // (node:sqlite returns aggregates as numbers, but we normalise defensively)
    const rows: ProjectSummary[] = rawRows.map((r) => ({
      ...r,
      sizzle_count: Number(r.sizzle_count) || 0,
      has_sizzle: Number(r.sizzle_count) > 0,
    }));

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
