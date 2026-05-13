// GET    /api/marketing/available/[id]  — fetch single deck by id
// PUT    /api/marketing/available/[id]  — update deck (all available-title fields)
// DELETE /api/marketing/available/[id]  — hard-delete deck (204)
//
// Callers: internal admin UI (authenticated via layout), no public access.
// Auth: handled by the marketing layout — no per-route auth check needed here.

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';
import { toVimeoEmbedUrl } from '@/lib/vimeo';

// Shape of a single sizzle history entry stored in deck_sites.sizzle_history
interface SizzleEntry {
  url: string;
  added_at: number; // Unix timestamp seconds
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Parses the sizzle_history JSON column value into a typed array.
 * Returns an empty array if the value is null, empty, or malformed JSON.
 */
function parseSizzleHistory(raw: unknown): SizzleEntry[] {
  if (!raw || typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Validate each entry has the expected shape; filter out malformed entries
    return parsed.filter(
      (e): e is SizzleEntry =>
        typeof e === 'object' && e !== null &&
        typeof (e as Record<string, unknown>).url === 'string' &&
        typeof (e as Record<string, unknown>).added_at === 'number'
    );
  } catch {
    return [];
  }
}

/**
 * Merges a new Vimeo URL into the sizzle history array.
 * Deduplicates by URL (normalised embed form). Appends to end — most recent last.
 * Returns the updated array with the new entry guaranteed to be present.
 */
function addToSizzleHistory(history: SizzleEntry[], newUrl: string): SizzleEntry[] {
  const normalised = toVimeoEmbedUrl(newUrl);
  // Deduplicate: remove any existing entry that matches (raw or normalised form)
  const filtered = history.filter(
    (e) => e.url !== newUrl && e.url !== normalised
  );
  return [
    ...filtered,
    { url: normalised, added_at: Math.floor(Date.now() / 1000) },
  ];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const row = queryOne<Record<string, unknown>>(
    'SELECT *, gate_password AS password FROM deck_sites WHERE id = ?',
    [id]
  );
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Parse sizzle_history from JSON string → typed array so clients get a real array,
  // not a raw string. Return empty array if null / not yet set.
  const data = {
    ...row,
    sizzle_history: parseSizzleHistory(row.sizzle_history),
  };

  return NextResponse.json({ data });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = queryOne<{ id: string; title: string; vimeo_url: string | null; sizzle_history: string | null }>(
    'SELECT id, title, vimeo_url, sizzle_history FROM deck_sites WHERE id = ?',
    [id]
  );
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;

  const rawSlug = (body.slug as string | undefined) ?? (body.title as string | undefined) ?? existing.title;
  const slug = slugify(rawSlug);

  let markets: string | null = null;
  if (body.markets !== undefined && body.markets !== null) {
    markets = Array.isArray(body.markets)
      ? JSON.stringify(body.markets)
      : String(body.markets);
  }

  // ── Sizzle history logic ───────────────────────────────────────────────────
  // Start from either the body-supplied history or the existing DB history.
  // If the caller passes sizzle_history explicitly (e.g. the picker UI sending the
  // full updated array), use that as the base. Otherwise fall back to what's in DB.
  let sizzleHistory: SizzleEntry[];

  if (body.sizzle_history !== undefined && Array.isArray(body.sizzle_history)) {
    // Client is managing the history array directly (e.g. add-URL flow in the UI)
    sizzleHistory = parseSizzleHistory(JSON.stringify(body.sizzle_history));
  } else {
    // No explicit history from client — load from DB
    sizzleHistory = parseSizzleHistory(existing.sizzle_history);
  }

  // If vimeo_url is changing to a new non-empty value, auto-add it to history
  if (body.vimeo_url !== undefined && body.vimeo_url !== null && body.vimeo_url !== '') {
    const newVimeo = String(body.vimeo_url);
    const normalisedNew = toVimeoEmbedUrl(newVimeo);
    // Only auto-add if this URL isn't already in history (avoid double-adding
    // when the client already pre-added it via the explicit sizzle_history payload)
    const alreadyPresent = sizzleHistory.some(
      (e) => e.url === newVimeo || e.url === normalisedNew
    );
    if (!alreadyPresent) {
      sizzleHistory = addToSizzleHistory(sizzleHistory, newVimeo);
    }
  }

  const sizzleHistoryJson = sizzleHistory.length > 0
    ? JSON.stringify(sizzleHistory)
    : null;

  const now = Math.floor(Date.now() / 1000);

  try {
    run(
      `UPDATE deck_sites SET
        title            = COALESCE(?, title),
        slug             = ?,
        rights_type      = COALESCE(?, rights_type),
        genre            = COALESCE(?, genre),
        seasons          = COALESCE(?, seasons),
        episode_count    = COALESCE(?, episode_count),
        runtime_mins     = COALESCE(?, runtime_mins),
        markets          = COALESCE(?, markets),
        description      = COALESCE(?, description),
        contact_email    = COALESCE(?, contact_email),
        is_active        = COALESCE(?, is_active),
        sort_order       = COALESCE(?, sort_order),
        image_url        = COALESCE(?, image_url),
        vimeo_url        = COALESCE(?, vimeo_url),
        drive_file_id    = COALESCE(?, drive_file_id),
        gate_password    = COALESCE(?, gate_password),
        site_show_id     = COALESCE(?, site_show_id),
        status           = COALESCE(?, status),
        visibility       = COALESCE(?, visibility),
        sizzle_history   = ?,
        updated_at       = ?
      WHERE id = ?`,
      [
        body.title        !== undefined ? String(body.title)                        : null,
        slug,
        body.rights_type  !== undefined ? String(body.rights_type)                 : null,
        body.genre        !== undefined ? String(body.genre)                        : null,
        body.seasons      !== undefined ? Number(body.seasons)                      : null,
        body.episode_count !== undefined ? Number(body.episode_count)               : null,
        body.runtime_mins !== undefined ? Number(body.runtime_mins)                 : null,
        markets,
        body.description  !== undefined ? String(body.description)                 : null,
        body.contact_email !== undefined ? String(body.contact_email)               : null,
        body.is_active    !== undefined ? (body.is_active ? 1 : 0)                 : null,
        body.sort_order   !== undefined ? Number(body.sort_order)                   : null,
        body.image_url    !== undefined ? String(body.image_url)                    : null,
        body.vimeo_url    !== undefined ? String(body.vimeo_url)                    : null,
        body.drive_file_id !== undefined ? String(body.drive_file_id)               : null,
        body.password     !== undefined ? String(body.password)                     : null,
        body.site_show_id !== undefined ? String(body.site_show_id)                 : null,
        body.status       !== undefined ? String(body.status)                       : null,
        body.visibility   !== undefined ? String(body.visibility)                   : null,
        // sizzle_history always written (even if null) to keep it in sync
        sizzleHistoryJson,
        now,
        id,
      ]
    );
  } catch (err) {
    if ((err as Error).message?.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Slug already in use' }, { status: 409 });
    }
    throw err;
  }

  const updated = queryOne<Record<string, unknown>>(
    'SELECT *, gate_password AS password FROM deck_sites WHERE id = ?',
    [id]
  );

  // Parse sizzle_history for the response so the client always gets a typed array
  const responseData = updated
    ? { ...updated, sizzle_history: parseSizzleHistory(updated.sizzle_history) }
    : null;

  return NextResponse.json({ data: responseData });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = queryOne('SELECT id FROM deck_sites WHERE id = ?', [id]);
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  run('DELETE FROM deck_sites WHERE id = ?', [id]);
  return new NextResponse(null, { status: 204 });
}
