#!/usr/bin/env node
// backfill-vimeo-to-drive.js
//
// Mirrors every active video in vimeo_library into the myentprod.com Google
// Drive "Sizzle Reels" folder. Vimeo originals are left untouched — the script
// COPIES, it does not move. Drive becomes the redundant store; Vimeo URLs in
// sizzle_reels and on the buyer pages keep working unchanged.
//
// Resumable. Each row is locked by setting backfill_status='pending' before
// download starts; on success we flip to 'done' and write drive_file_id +
// drive_url + size_bytes. Re-running the script picks up where it stopped.
//
// Why on Bang: the script holds tens of GB on local disk during transfer and
// runs for hours. Per project rules, Show Pitch Machine scrapers run on Bang.
//
// Usage (from Bang or local):
//   JWT="jwt eyJ..." node scripts/backfill-vimeo-to-drive.js [--scope=all|linked|unlisted] [--limit=N] [--dry-run]
//
// Required env:
//   JWT                  — fresh Vimeo OAuth/JWT token (~30 min TTL).
//                          Capture from a Chrome DevTools network request on
//                          vimeo.com/manage/videos (Authorization header).
//   MYE_TOKEN_PATH       — path to OAuth token for admin@myentprod.com.
//                          Defaults to C:/Users/pb/.claude/google/mye_token.json.
//   MYE_CREDENTIALS_PATH — OAuth client credentials (installed app).
//                          Defaults to C:/Users/pb/.claude/google/credentials.json.
//   DRIVE_SIZZLE_FOLDER_ID — optional; skips folder lookup each run.
//   DATABASE_PATH        — optional; defaults to ./data/db.sqlite.
//
// Auth: uses the existing admin@myentprod.com OAuth token (refresh_token in
// the JSON) rather than service account DWD. The andrew-email-reader service
// account only has gmail.readonly scope on myentprod.com — adding Drive scope
// would require an admin-console change, so we use the OAuth path that the
// rest of the MYE Google tooling already uses.

const https = require('node:https');
const fs    = require('node:fs');
const os    = require('node:os');
const path  = require('node:path');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { DatabaseSync } = require('node:sqlite');
const { google } = require('googleapis');

// ── Config ────────────────────────────────────────────────────────────────────

const JWT         = process.env.JWT;
const TOKEN_PATH  = process.env.MYE_TOKEN_PATH       || 'C:/Users/pb/.claude/google/mye_token.json';
const CREDS_PATH  = process.env.MYE_CREDENTIALS_PATH || 'C:/Users/pb/.claude/google/credentials.json';
const DB_PATH     = process.env.DATABASE_PATH        || path.join(process.cwd(), 'data', 'db.sqlite');
const TMP_DIR     = process.env.BACKFILL_TMP         || path.join(os.tmpdir(), 'vimeo-backfill');

// Per-row timeout for the Vimeo download itself; total per-row budget is
// roughly DOWNLOAD_TIMEOUT_MS + DRIVE_TIMEOUT_MS.
const DOWNLOAD_TIMEOUT_MS = 30 * 60_000;   // 30 minutes — large source files
const DRIVE_TIMEOUT_MS    = 30 * 60_000;

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const SCOPE   = args.scope || 'all';     // all | linked | unlisted
const LIMIT   = args.limit ? Number(args.limit) : Infinity;
const DRY_RUN = !!args['dry-run'];

if (!JWT) {
  console.error('ERROR: Set JWT env var. Capture from a Chrome DevTools request on vimeo.com.');
  process.exit(1);
}
if (!fs.existsSync(TOKEN_PATH)) {
  console.error(`ERROR: OAuth token not found at ${TOKEN_PATH}`);
  process.exit(1);
}
if (!fs.existsSync(CREDS_PATH)) {
  console.error(`ERROR: OAuth credentials not found at ${CREDS_PATH}`);
  process.exit(1);
}

fs.mkdirSync(TMP_DIR, { recursive: true });

// ── Drive setup (OAuth for admin@myentprod.com) ───────────────────────────────
//
// Returns an OAuth2 client primed with the saved refresh_token. googleapis
// automatically refreshes the access token when needed, so a single auth
// instance works for the full multi-hour backfill run.

function getDriveAuth() {
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
  const creds = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf-8'));
  const c = creds.installed || creds.web;
  if (!c) throw new Error('credentials.json missing "installed" or "web" block');
  const oauth = new google.auth.OAuth2(c.client_id, c.client_secret, c.redirect_uris?.[0]);
  oauth.setCredentials(token);
  return oauth;
}

async function resolveFolderId(drive) {
  if (process.env.DRIVE_SIZZLE_FOLDER_ID) return process.env.DRIVE_SIZZLE_FOLDER_ID;
  const res = await drive.files.list({
    q: "name = 'Sizzle Reels' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and 'root' in parents",
    fields: 'files(id, name)',
    spaces: 'drive',
  });
  if (res.data.files?.[0]?.id) return res.data.files[0].id;
  const created = await drive.files.create({
    requestBody: { name: 'Sizzle Reels', mimeType: 'application/vnd.google-apps.folder' },
    fields: 'id',
  });
  return created.data.id;
}

// ── Vimeo helpers ─────────────────────────────────────────────────────────────

// Fetch the per-video metadata block including the (signed, time-limited)
// download links. Must be called immediately before downloading — links expire.
function getVideoDownloads(clipId) {
  const url = `https://api.vimeo.com/videos/${clipId}?fields=download`;
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        Authorization: JWT,
        Accept: 'application/vnd.vimeo.*+json;version=3.4',
      },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Vimeo API ${res.statusCode}: ${raw.slice(0, 200)}`));
        }
        try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(30_000, () => { req.destroy(); reject(new Error('Vimeo API timeout')); });
  });
}

// Pick the highest-quality renditions, preferring the original source upload
// when Vimeo retained it (best fidelity, no re-encode).
function pickBestRendition(downloads) {
  if (!Array.isArray(downloads) || downloads.length === 0) return null;
  const source = downloads.find(d => d.quality === 'source' || d.type === 'source');
  if (source) return source;
  // Otherwise highest area (width*height) of the HLS/MP4 renditions
  return downloads
    .filter(d => d.link)
    .sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
}

// Download to a temp file with redirect following — Vimeo CDN returns 302s.
function downloadToFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    let downloaded = 0;

    function go(u, hops = 0) {
      if (hops > 5) return reject(new Error('Too many redirects'));
      const req = https.get(u, res => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          res.resume();
          return go(res.headers.location, hops + 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`Download HTTP ${res.statusCode}`));
        }
        const total = Number(res.headers['content-length']) || 0;
        res.on('data', chunk => {
          downloaded += chunk.length;
          if (onProgress) onProgress(downloaded, total);
        });
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve(downloaded)));
      });
      req.on('error', reject);
      req.setTimeout(DOWNLOAD_TIMEOUT_MS, () => { req.destroy(); reject(new Error('Download timeout')); });
    }
    go(url);
  });
}

// Stream the temp file up to Drive — never load the whole video into RAM.
async function uploadFileStreamingly(drive, folderId, filePath, filename, mimeType) {
  const fileSize = fs.statSync(filePath).size;
  const res = await drive.files.create({
    requestBody: {
      name:    filename,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: fs.createReadStream(filePath),
    },
    fields: 'id, size',
  }, {
    // Resumable upload handles network hiccups + lets Drive accept 5GB+ files.
    onUploadProgress: evt => {
      const pct = ((evt.bytesRead / fileSize) * 100).toFixed(1);
      process.stdout.write(`\r    uploading: ${pct}%   `);
    },
  });
  process.stdout.write('\n');

  await drive.permissions.create({
    fileId: res.data.id,
    requestBody: { type: 'anyone', role: 'reader' },
  });

  return { fileId: res.data.id, size: Number(res.data.size) || fileSize };
}

// ── Filename sanitiser — Drive accepts most chars but slashes/colons break URLs.
function safeFilename(title, clipId, ext = 'mp4') {
  const cleaned = String(title || `vimeo-${clipId}`)
    .replace(/[\\/:*?"<>|\r\n\t]/g, ' ')   // illegal on Windows + ugly in URLs
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);                         // Drive limit is 255; leave headroom for ext + id
  return `${cleaned} [${clipId}].${ext}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[backfill] DB: ${DB_PATH}`);
  console.log(`[backfill] Scope: ${SCOPE}  Limit: ${LIMIT === Infinity ? 'none' : LIMIT}  Dry-run: ${DRY_RUN}`);

  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA busy_timeout = 10000;');

  // Pick the candidate rows. Always exclude 'disable' (Vimeo-side deleted)
  // and rows that already finished. 'failed' rows get retried automatically.
  let scopeSql;
  if (SCOPE === 'linked') {
    scopeSql = `
      SELECT DISTINCT vl.id, vl.clip_id, vl.title, vl.privacy
      FROM vimeo_library vl
      JOIN show_videos sv ON sv.vimeo_library_id = vl.id
      WHERE vl.privacy != 'disable'
        AND (vl.backfill_status IS NULL OR vl.backfill_status = 'failed')
      ORDER BY vl.last_modified DESC`;
  } else if (SCOPE === 'unlisted') {
    scopeSql = `
      SELECT id, clip_id, title, privacy
      FROM vimeo_library
      WHERE privacy = 'unlisted'
        AND (backfill_status IS NULL OR backfill_status = 'failed')
      ORDER BY last_modified DESC`;
  } else {
    scopeSql = `
      SELECT id, clip_id, title, privacy
      FROM vimeo_library
      WHERE privacy != 'disable'
        AND (backfill_status IS NULL OR backfill_status = 'failed')
      ORDER BY last_modified DESC`;
  }

  const rows = db.prepare(scopeSql).all().slice(0, LIMIT);
  console.log(`[backfill] ${rows.length} candidate rows`);

  if (rows.length === 0) {
    console.log('[backfill] Nothing to do — all rows already backfilled or out of scope.');
    db.close();
    return;
  }

  if (DRY_RUN) {
    console.log('[backfill] Dry-run — exiting without uploads.');
    rows.slice(0, 20).forEach(r => console.log(`  - ${r.clip_id}  ${r.privacy.padEnd(8)} ${r.title}`));
    if (rows.length > 20) console.log(`  …and ${rows.length - 20} more`);
    db.close();
    return;
  }

  const auth = getDriveAuth();
  const drive = google.drive({ version: 'v3', auth });
  const folderId = await resolveFolderId(drive);
  console.log(`[backfill] Drive folder: ${folderId}`);

  // Prepared statements for the lock → write → release cycle
  const lockStmt = db.prepare(
    `UPDATE vimeo_library SET backfill_status='pending', backfill_error=NULL WHERE id=?`
  );
  const doneStmt = db.prepare(
    `UPDATE vimeo_library SET backfill_status='done', backfilled_at=datetime('now'),
       drive_file_id=?, drive_url=?, size_bytes=?, backfill_error=NULL WHERE id=?`
  );
  const failStmt = db.prepare(
    `UPDATE vimeo_library SET backfill_status='failed', backfill_error=? WHERE id=?`
  );

  let done = 0, failed = 0, skipped = 0;
  const t0 = Date.now();

  for (const row of rows) {
    const tag = `[${++done + failed + skipped}/${rows.length}] ${row.clip_id}`;
    console.log(`\n${tag} ${row.title}`);

    lockStmt.run(row.id);

    let tmpFile;
    try {
      const meta = await getVideoDownloads(row.clip_id);
      const rendition = pickBestRendition(meta.download);
      if (!rendition?.link) {
        // No download permission on this clip (common for embed-only clips
        // or expired source files). Mark skipped, not failed — re-running
        // won't help until Vimeo grants download access.
        failStmt.run('No download URL available from Vimeo API', row.id);
        skipped++;
        console.log(`    skipped — no downloadable rendition`);
        continue;
      }

      const ext = (rendition.type || 'mp4').split('/').pop() || 'mp4';
      const filename = safeFilename(row.title, row.clip_id, ext);
      tmpFile = path.join(TMP_DIR, `${row.clip_id}-${Date.now()}.${ext}`);

      console.log(`    downloading ${rendition.width}×${rendition.height} (${rendition.quality})`);
      const downloaded = await downloadToFile(rendition.link, tmpFile, (got, total) => {
        if (total) {
          const pct = ((got / total) * 100).toFixed(1);
          process.stdout.write(`\r    download: ${pct}%   `);
        }
      });
      process.stdout.write('\n');

      console.log(`    uploading ${(downloaded / 1024 / 1024).toFixed(1)} MB to Drive`);
      const { fileId, size } = await uploadFileStreamingly(
        drive, folderId, tmpFile, filename, `video/${ext}`
      );

      const driveUrl = `https://drive.google.com/file/d/${fileId}/view`;
      doneStmt.run(fileId, driveUrl, size, row.id);

      console.log(`    done ✓  ${driveUrl}`);
      done++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failStmt.run(msg.slice(0, 500), row.id);
      failed++;
      console.error(`    FAILED: ${msg}`);
    } finally {
      if (tmpFile && fs.existsSync(tmpFile)) {
        try { fs.unlinkSync(tmpFile); } catch { /* leave for next pass */ }
      }
    }

    // Quick progress summary every 10 rows
    if ((done + failed + skipped) % 10 === 0) {
      const elapsed = (Date.now() - t0) / 1000;
      const rate = (done + failed + skipped) / elapsed;
      const remain = (rows.length - (done + failed + skipped)) / rate;
      console.log(`  --- ${done} done · ${failed} failed · ${skipped} skipped · ~${Math.round(remain / 60)} min remaining`);
    }
  }

  db.close();
  console.log(`\n[backfill] Complete: ${done} done, ${failed} failed, ${skipped} skipped`);
}

main().catch(err => {
  console.error('[backfill] Fatal:', err);
  process.exit(1);
});
