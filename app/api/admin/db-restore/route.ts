// POST /api/admin/db-restore — replace the live SQLite database with an uploaded file.
//
// Caller: one-time ops (curl from dev machine to seed production DB).
// Auth:   Authorization: Bearer <ADMIN_RESTORE_SECRET> (env var).
// Body:   raw binary SQLite file (application/octet-stream).
// Response: { data: { bytes: number } } on success.
//
// The endpoint streams the body to a temp file, verifies the SQLite magic header,
// then atomically replaces the live DB path. The DB singleton is NOT reset here —
// the caller should restart the service after uploading (Railway redeploy or
// /api/admin/restart if one exists).

import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

const SQLITE_MAGIC = Buffer.from([0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74, 0x20, 0x33, 0x00]);

export async function POST(request: NextRequest) {
  const secret = process.env.ADMIN_RESTORE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'ADMIN_RESTORE_SECRET not configured' }, { status: 500 });
  }

  const auth = request.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.arrayBuffer();
  const bytes = Buffer.from(body);

  if (bytes.length < 16 || !bytes.slice(0, 16).equals(SQLITE_MAGIC)) {
    return NextResponse.json({ error: 'Not a valid SQLite file' }, { status: 400 });
  }

  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'db.sqlite');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write to temp file then rename — atomic on same filesystem
  const tmpPath = `${dbPath}.upload.tmp`;
  fs.writeFileSync(tmpPath, bytes);
  fs.renameSync(tmpPath, dbPath);

  // Remove stale WAL/SHM sidecars so SQLite opens cleanly
  for (const sidecar of [`${dbPath}-wal`, `${dbPath}-shm`]) {
    if (fs.existsSync(sidecar)) fs.unlinkSync(sidecar);
  }

  console.log(`[db-restore] replaced DB with uploaded file (${bytes.length} bytes)`);

  return NextResponse.json({ data: { bytes: bytes.length } });
}
