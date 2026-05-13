/**
 * GET /api/sizzles
 * Called by: Sizzle Asset Catalog page (/sizzles), project detail page, pitch hub, any integration
 * Auth: none
 * Query params:
 *   q        — LIKE match on project title (ip_catalog.title)
 *   has_url  — 'true' to return only sizzles that have a vimeo_url
 *   ip_id    — filter to sizzles belonging to a specific ip_catalog_id (used by project detail page)
 * Response: Array<SizzleAsset> — ordered: sizzles with URLs first, then by project title
 *
 * Sizzle reels are first-class brand assets — produced videos that cost real money.
 * This endpoint is the canonical inventory of all known sizzle reels across the pipeline.
 * Email stats (last_email_date, email_thread_count) are joined from project_email_threads
 * to give context on which projects are actively being pitched alongside their sizzle.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Shape of each sizzle asset in the response — includes project context and email activity
interface SizzleAsset {
  id: string;
  ip_catalog_id: string;
  project_title: string;
  sheet_source: string | null;
  vimeo_url: string | null;
  vimeo_password: string | null;
  platform: string | null;
  raw_value: string | null;
  notes: string | null;
  last_email_date: string | null;
  email_thread_count: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const hasUrl = searchParams.get('has_url') === 'true';
    const ipId = searchParams.get('ip_id') || '';

    // Build WHERE conditions dynamically — always join to ip_catalog for project title
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (q) {
      // Search by project title (from ip_catalog) — LIKE match, case-insensitive via SQLite default
      conditions.push('ip.title LIKE ?');
      params.push(`%${q}%`);
    }

    if (hasUrl) {
      // Filter to sizzles that have an actual video URL vs. just "Sizzle" note in the cell
      conditions.push('sr.vimeo_url IS NOT NULL AND sr.vimeo_url != \'\'');
    }

    if (ipId) {
      // Scope to a single project — used by project detail page to show its own sizzles
      conditions.push('sr.ip_catalog_id = ?');
      params.push(ipId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // LEFT JOIN project_email_threads so we get email activity context per sizzle.
    // ORDER BY: sizzles with a URL float to the top (CASE gives 0 for has-url, 1 for no-url),
    // then alphabetically by project title so the inventory is easy to scan.
    const rows = await query<SizzleAsset>(
      `SELECT
        sr.id,
        sr.ip_catalog_id,
        ip.title AS project_title,
        ip.sheet_source,
        sr.vimeo_url,
        sr.vimeo_password,
        sr.platform,
        sr.raw_value,
        sr.notes,
        MAX(pet.last_message_date) AS last_email_date,
        COUNT(DISTINCT pet.id) AS email_thread_count
       FROM sizzle_reels sr
       JOIN ip_catalog ip ON ip.id = sr.ip_catalog_id
       LEFT JOIN project_email_threads pet ON pet.ip_catalog_id = sr.ip_catalog_id
       ${whereClause}
       GROUP BY sr.id
       ORDER BY
         CASE WHEN sr.vimeo_url IS NOT NULL AND sr.vimeo_url != '' THEN 0 ELSE 1 END ASC,
         ip.title ASC`,
      params
    );

    // Normalise email_thread_count to a proper number (SQLite COUNT returns integer,
    // but we coerce defensively in case of edge cases with the node:sqlite bindings)
    const data: SizzleAsset[] = rows.map((r) => ({
      ...r,
      email_thread_count: Number(r.email_thread_count) || 0,
    }));

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
