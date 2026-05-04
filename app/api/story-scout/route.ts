/**
 * GET /api/story-scout
 * Called by: story scout library page
 * Auth: none
 * Query params:
 *   q       — LIKE match on story_scout.headline
 *   banner  — filter by story_scout.project_banner
 *   limit   — default 50
 *   offset  — default 0
 * Response: { data: Array<StoryScoutRow> }
 * Joins to ip_catalog if ip_catalog_id is set to fetch linked project title.
 * Sorted by created_at DESC (newest first).
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface StoryScoutRow {
  id: string;
  headline: string;
  summary: string | null;
  link: string | null;
  project_banner: string | null;
  article_rights: string | null;
  action_notes: string | null;
  linked_project_title: string | null;
  created_at: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const banner = searchParams.get('banner') || '';
    const limitStr = searchParams.get('limit') || '50';
    const offsetStr = searchParams.get('offset') || '0';

    // Enforce limit constraints
    let limit = Math.min(Math.max(1, parseInt(limitStr) || 50), 200);
    let offset = Math.max(0, parseInt(offsetStr) || 0);

    // Build WHERE clauses dynamically
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (q) {
      conditions.push('ss.headline LIKE ?');
      params.push(`%${q}%`);
    }

    if (banner) {
      conditions.push('ss.project_banner = ?');
      params.push(banner);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = query<StoryScoutRow>(
      `SELECT
        ss.id,
        ss.headline,
        ss.summary,
        ss.link,
        ss.project_banner,
        ss.article_rights,
        ss.action_notes,
        ip.title as linked_project_title,
        ss.created_at
       FROM story_scout ss
       LEFT JOIN ip_catalog ip ON ip.id = ss.ip_catalog_id
       ${whereClause}
       ORDER BY ss.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
