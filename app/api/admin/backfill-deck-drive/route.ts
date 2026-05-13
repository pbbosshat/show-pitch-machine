// POST /api/admin/backfill-deck-drive
//
// One-shot backfill that mirrors scripts/backfill-deck-drive-video.mjs for the
// production DB. Reads vimeo_library (already kept in sync by the Bang daily
// ingest) and writes the matching drive_file_id onto every deck_sites row that
// doesn't have one yet.
//
// Caller: ops only (curl from the dev machine after a deploy that adds
//   migration 034).
// Auth:   Authorization: Bearer <ADMIN_RESTORE_SECRET> — same secret as
//   /api/admin/db-restore so we don't sprout new env vars for a one-off route.
//
// Response: { data: { updated, skipped, missing, missingList } }

import { NextRequest, NextResponse } from 'next/server';
import { query, run, initDb } from '@/lib/db';

// Slugs whose only sizzle reference was a hardcoded player.vimeo.com URL inside
// the matching one-sheet TSX file. Mirrored from scripts/backfill-deck-drive-video.mjs.
const HARDCODED_BY_SLUG: Record<string, string> = {
  'storm-warriors-deck':            '1058661997',
  'storm-warriors-us':              '1058661997',
  'art-of-murder-walshe':           '1116791591',
  'fright-before-christmas':         '905374739',
  'botched-by-a-tiktok-doc':        '1085697854',
  'dont-f-with-my-kids':            '1009030222',
  'happy-hour-hustlers':            '1077316521',
  'magic-showdown':                 '1152709330',
  'open-secrets':                   '1097039487',
  'project-skywatch':                '958547025',
  'susan-smith':                     '949340808',
  'up-for-parole':                   '993640958',
  'welcome-to-crunkville':          '1059770793',
  'we-hunt-serial-killers':         '1045104876',
  'what-happened-to-michelle-renee':'1020264275',
};

function clipIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

interface SizzleEntry { url?: string; active?: boolean }

function activeSizzleClipId(jsonStr: string | null): string | null {
  if (!jsonStr) return null;
  try {
    const entries = JSON.parse(jsonStr) as unknown;
    if (!Array.isArray(entries)) return null;
    const list = entries as SizzleEntry[];
    // Prefer active=true; otherwise take the newest entry (history is append-only).
    const pick = list.find((e) => e?.active === true) ?? list[list.length - 1];
    return clipIdFromUrl(pick?.url);
  } catch {
    return null;
  }
}

interface DeckRow {
  id: string;
  slug: string;
  vimeo_url: string | null;
  sizzle_history: string | null;
  drive_file_id: string | null;
}

interface LibRow { drive_file_id: string | null }

export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_RESTORE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'ADMIN_RESTORE_SECRET not configured' }, { status: 500 });
  }

  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  initDb();

  const decks = query<DeckRow>(
    `SELECT id, slug, vimeo_url, sizzle_history, drive_file_id FROM deck_sites`
  );

  let updated = 0, skipped = 0, missing = 0;
  const missingList: { slug: string; candidates: string[] }[] = [];

  for (const deck of decks) {
    if (deck.drive_file_id) { skipped++; continue; }

    const candidates = [
      clipIdFromUrl(deck.vimeo_url),
      activeSizzleClipId(deck.sizzle_history),
      HARDCODED_BY_SLUG[deck.slug] ?? null,
    ].filter((c): c is string => !!c);

    let driveId: string | null = null;
    for (const cid of candidates) {
      const row = query<LibRow>(
        `SELECT drive_file_id FROM vimeo_library WHERE clip_id = ? AND drive_file_id IS NOT NULL LIMIT 1`,
        [cid]
      )[0];
      if (row?.drive_file_id) { driveId = row.drive_file_id; break; }
    }

    if (driveId) {
      run(`UPDATE deck_sites SET drive_file_id = ? WHERE id = ?`, [driveId, deck.id]);
      updated++;
    } else {
      missing++;
      missingList.push({ slug: deck.slug, candidates });
    }
  }

  return NextResponse.json({ data: { updated, skipped, missing, missingList } });
}
