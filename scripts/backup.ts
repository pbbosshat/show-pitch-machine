import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || './data/db.sqlite';
const VECTORS_PATH = process.env.VECTORS_PATH || './data/vectors';
const BACKUP_DIR = process.env.BACKUP_PATH || './data/backups';

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

async function backup() {
  const tag = timestamp();
  const dest = path.join(BACKUP_DIR, tag);
  fs.mkdirSync(dest, { recursive: true });

  // Copy SQLite database — using file copy rather than VACUUM INTO for Node compatibility
  const dbDest = path.join(dest, 'db.sqlite');
  fs.copyFileSync(DB_PATH, dbDest);
  console.log(`DB backed up → ${dbDest}`);

  // Copy LanceDB vector store directory
  if (fs.existsSync(VECTORS_PATH)) {
    const vecDest = path.join(dest, 'vectors');
    fs.cpSync(VECTORS_PATH, vecDest, { recursive: true });
    console.log(`Vectors backed up → ${vecDest}`);
  }

  // Prune backups older than 30 days
  const backups = fs.readdirSync(BACKUP_DIR).sort();
  const cutoff = Date.now() - 30 * 86400 * 1000;
  for (const b of backups) {
    const bPath = path.join(BACKUP_DIR, b);
    const stat = fs.statSync(bPath);
    if (stat.mtimeMs < cutoff) {
      fs.rmSync(bPath, { recursive: true });
      console.log(`Pruned old backup: ${b}`);
    }
  }

  console.log(`Backup complete: ${tag}`);
}

backup().catch((err) => {
  console.error('Backup failed:', err.message);
  process.exit(1);
});
