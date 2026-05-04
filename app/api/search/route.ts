/**
 * GET /api/search?q=
 * Called by: UniversalSearch sidebar component
 * Auth: none (internal tool only)
 * Query params:
 *   q — search string, min 2 chars
 * Response: { results: SearchResult[] }
 *   Each result has: type, id, title, subtitle, url
 *   Max 5 results per entity type, ordered by type priority.
 * Covers: buyer contacts, buyer companies, production companies, prodco contacts,
 *         shows (LIKE fallback), IP catalog, packages, talent, deck sites.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface SearchResult {
  type: string;
  id: string | number;
  title: string;
  subtitle: string;
  url: string;
}

// Wrap each entity query so one missing/malformed table never kills the whole response
function safeQuery<T>(sql: string, params: unknown[]): T[] {
  try {
    return query<T>(sql, params);
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return NextResponse.json({ results: [] });

  const like = `%${q}%`;
  const results: SearchResult[] = [];

  // ── Buyer contacts ──────────────────────────────────────────────────────────
  safeQuery<{ id: string; name: string; email: string | null; title: string | null; company_name: string | null }>(
    `SELECT bc.id, bc.name, bc.email, bc.title, co.name AS company_name
     FROM buyer_contacts bc
     LEFT JOIN buyer_companies co ON co.id = bc.company_id
     WHERE bc.name LIKE ? OR bc.email LIKE ? OR bc.title LIKE ?
     LIMIT 5`,
    [like, like, like]
  ).forEach(r => results.push({
    type: 'Buyer Contact',
    id: r.id,
    title: r.name,
    subtitle: [r.title, r.company_name].filter(Boolean).join(' · '),
    url: `/buyers?search=${encodeURIComponent(r.name)}`,
  }));

  // ── Buyer companies (networks / streamers) ──────────────────────────────────
  safeQuery<{ id: string; name: string; type: string | null; hq_city: string | null }>(
    `SELECT id, name, type, hq_city FROM buyer_companies WHERE name LIKE ? LIMIT 5`,
    [like]
  ).forEach(r => results.push({
    type: 'Network / Buyer',
    id: r.id,
    title: r.name,
    subtitle: [r.type, r.hq_city].filter(Boolean).join(' · '),
    url: `/buyers?company=${encodeURIComponent(r.name)}`,
  }));

  // ── Production companies ────────────────────────────────────────────────────
  safeQuery<{ id: string; name: string; ownership_type: string | null; hq_city: string | null }>(
    `SELECT id, name, ownership_type, hq_city
     FROM production_companies
     WHERE name LIKE ? OR name_normalized LIKE ?
     LIMIT 5`,
    [like, like]
  ).forEach(r => results.push({
    type: 'Prod Co',
    id: r.id,
    title: r.name,
    subtitle: [r.ownership_type, r.hq_city].filter(Boolean).join(' · '),
    url: `/market/prodcos?search=${encodeURIComponent(r.name)}`,
  }));

  // ── Prodco contacts ─────────────────────────────────────────────────────────
  safeQuery<{ id: string; name: string; title: string | null; email: string | null; company_name: string | null }>(
    `SELECT pc.id, pc.name, pc.title, pc.email, p.name AS company_name
     FROM prodco_contacts pc
     LEFT JOIN production_companies p ON p.id = pc.company_id
     WHERE pc.name LIKE ? OR pc.email LIKE ? OR pc.title LIKE ?
     LIMIT 5`,
    [like, like, like]
  ).forEach(r => results.push({
    type: 'Prod Co Contact',
    id: r.id,
    title: r.name,
    subtitle: [r.title, r.company_name].filter(Boolean).join(' · '),
    url: `/market/prodcos?search=${encodeURIComponent(r.company_name ?? r.name)}`,
  }));

  // ── Shows — try FTS5, fall back to LIKE ─────────────────────────────────────
  const ftsQuery = q.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const shows = ftsQuery.length >= 2
    ? safeQuery<{ id: string; title: string; network: string | null; genre: string | null }>(
        `SELECT s.id, s.title, s.network, s.genre
         FROM shows_fts fts
         JOIN shows s ON s.rowid = fts.rowid
         WHERE shows_fts MATCH ?
         LIMIT 5`,
        [`${ftsQuery}*`]
      )
    : [];

  // Fall back to LIKE if FTS returned nothing (table not populated / query too narrow)
  const showResults = shows.length > 0
    ? shows
    : safeQuery<{ id: string; title: string; network: string | null; genre: string | null }>(
        `SELECT id, title, network, genre FROM shows WHERE title LIKE ? LIMIT 5`,
        [like]
      );

  showResults.forEach(r => results.push({
    type: 'Show',
    id: r.id,
    title: r.title,
    subtitle: [r.network, r.genre].filter(Boolean).join(' · '),
    url: `/show-db?q=${encodeURIComponent(r.title)}`,
  }));

  // ── IP catalog ──────────────────────────────────────────────────────────────
  safeQuery<{ id: string; title: string; format: string | null; genre: string | null }>(
    `SELECT id, title, format, genre
     FROM ip_catalog
     WHERE title LIKE ? OR logline LIKE ?
     LIMIT 5`,
    [like, like]
  ).forEach(r => results.push({
    type: 'IP / Project',
    id: r.id,
    title: r.title,
    subtitle: [r.format, r.genre].filter(Boolean).join(' · '),
    url: `/projects?search=${encodeURIComponent(r.title)}`,
  }));

  // ── Packages ────────────────────────────────────────────────────────────────
  safeQuery<{ id: string; name: string; pipeline_stage: string | null; status: string | null }>(
    `SELECT id, name, pipeline_stage, status FROM packages WHERE name LIKE ? LIMIT 5`,
    [like]
  ).forEach(r => results.push({
    type: 'Package',
    id: r.id,
    title: r.name,
    subtitle: [r.pipeline_stage, r.status].filter(Boolean).join(' · '),
    url: `/pipeline`,
  }));

  // ── Talent ──────────────────────────────────────────────────────────────────
  safeQuery<{ id: string; name: string; primary_role: string | null; talent_tier: string | null }>(
    `SELECT id, name, primary_role, talent_tier FROM talent WHERE name LIKE ? LIMIT 5`,
    [like]
  ).forEach(r => results.push({
    type: 'Talent',
    id: r.id,
    title: r.name,
    subtitle: [r.primary_role, r.talent_tier].filter(Boolean).join(' · '),
    url: `/projects?search=${encodeURIComponent(r.name)}`,
  }));

  // ── Deck sites ──────────────────────────────────────────────────────────────
  safeQuery<{ id: string; title: string; genre: string | null; status: string | null }>(
    `SELECT id, title, genre, status FROM deck_sites WHERE title LIKE ? OR slug LIKE ? LIMIT 5`,
    [like, like]
  ).forEach(r => results.push({
    type: 'Deck',
    id: r.id,
    title: r.title,
    subtitle: [r.genre, r.status].filter(Boolean).join(' · '),
    url: `/decks`,
  }));

  return NextResponse.json({ results });
}
