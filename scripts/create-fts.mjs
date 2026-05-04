import { DatabaseSync } from 'node:sqlite';
process.removeAllListeners('warning');
const db = new DatabaseSync('data/db.sqlite');
db.exec('CREATE VIRTUAL TABLE IF NOT EXISTS shows_fts USING fts5(title, genre, production_company, network, host, showrunner, location_notes)');
console.log('shows_fts created (or already existed)');
