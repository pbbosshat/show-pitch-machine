/**
 * fix-false-positive-matches.mjs
 * Removes the specific false-positive show_video links created by the auto-match run:
 *   1. Videos matched to "From:" (any video containing the word "from")
 *   2. "Deadly Possessions (WEB)" matched to "Sessions" (substring inside word)
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.join(__dirname, '..', 'data', 'db.sqlite');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Find ip_catalog IDs for the offending shows
const fromShow     = db.prepare(`SELECT id FROM ip_catalog WHERE title = 'From:' LIMIT 1`).get();
const sessionsShow = db.prepare(`SELECT id FROM ip_catalog WHERE title = 'Sessions' LIMIT 1`).get();

let removed = 0;

if (fromShow) {
  // Remove ALL videos linked to "From:" (every link is a false positive — the word "from" in the title)
  const result = db.prepare(`DELETE FROM show_videos WHERE ip_catalog_id = ?`).run(fromShow.id);
  console.log(`Removed ${result.changes} false-positive link(s) to "From:"`);
  removed += result.changes;
}

if (sessionsShow) {
  // Only remove the specific "Deadly Possessions" video — don't touch real Sessions links if any
  const dp = db.prepare(`SELECT id FROM vimeo_library WHERE title LIKE '%Deadly Possessions%' LIMIT 1`).get();
  if (dp) {
    const result = db.prepare(
      `DELETE FROM show_videos WHERE ip_catalog_id = ? AND vimeo_library_id = ?`
    ).run(sessionsShow.id, dp.id);
    console.log(`Removed ${result.changes} false-positive link(s): "Deadly Possessions" → "Sessions"`);
    removed += result.changes;
  }
}

console.log(`\nTotal removed: ${removed}`);
