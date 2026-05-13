/**
 * POST /api/admin/db-restore
 * Called by: retired — was used for one-time ops from a dev machine to seed production DB
 * Auth: was Authorization: Bearer <ADMIN_RESTORE_SECRET>
 *
 * This endpoint was SQLite-specific: it validated the "SQLite format 3" magic header,
 * wrote to data/db.sqlite, and removed WAL/SHM sidecars. None of that applies to
 * the Postgres backend.
 *
 * For backup and restore on the current stack:
 *   - Railway dashboard → show-pitch-machine → Postgres → Backups
 *   - Or use pg_dump / pg_restore against DATABASE_URL from Railway → Postgres → Connect
 */

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'This endpoint has been retired. The app now uses Railway Postgres.',
      detail: 'For backup/restore, use the Railway dashboard → show-pitch-machine → Postgres → Backups, or pg_dump/pg_restore against DATABASE_URL.',
    },
    { status: 410 }
  );
}
