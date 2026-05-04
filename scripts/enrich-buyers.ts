// scripts/enrich-buyers.ts
//
// CLI entry point for the buyer enrichment pipeline.
// Delegates all logic to lib/enrichment/pipeline.ts so that the same code
// can be invoked from both the command line and the Next.js API route.
//
// Run via:
//   npx tsx scripts/enrich-buyers.ts
//   npm run enrich-buyers
//
// Optional CLI args:
//   --user         MYE team member email being processed  (default: sm@gototeam.com)
//   --pitch-db     path to mye_pitch_database.json        (default: ../mye_pitch_database.json)
//   --threads      path to shawn_pitch_threads_full.json  (default: ../shawn_pitch_threads_full.json)
//
// Prerequisites:
//   ANTHROPIC_API_KEY set in environment or .env.local

// Suppress node:sqlite experimental warning before any imports
process.removeAllListeners('warning');
process.on('warning', (w) => {
  if (w.name === 'ExperimentalWarning' && w.message.includes('sqlite')) return;
  console.warn(w.name, w.message);
});

import { readFileSync, existsSync } from 'fs';
import path from 'node:path';
import { randomUUID } from 'crypto';
import { initDb, run } from '../lib/db';
import { runEnrichmentPipeline } from '../lib/enrichment/pipeline';

// ── Load .env.local if present ────────────────────────────────────────────────
// tsx doesn't auto-load .env.local — we do it manually so ANTHROPIC_API_KEY is available
const envLocalPath = path.join(process.cwd(), '.env.local');
if (existsSync(envLocalPath)) {
  const envContent = readFileSync(envLocalPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

// ── Parse CLI args ────────────────────────────────────────────────────────────

function parseArgs(): { user: string; pitchDbPath: string; threadsPath: string } {
  const args = process.argv.slice(2);
  let user        = 'sm@gototeam.com';
  // JSON files live one directory above the app root (My Entertainment/ not Show Pitch Machine/)
  // Use process.cwd() so this works whether run via `npm run enrich-buyers` or `npx tsx scripts/...`
  // from the Show Pitch Machine directory
  let pitchDbPath = path.resolve(process.cwd(), '../mye_pitch_database.json');
  let threadsPath = path.resolve(process.cwd(), '../shawn_pitch_threads_full.json');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--user'     && args[i + 1]) user        = args[++i];
    if (args[i] === '--pitch-db' && args[i + 1]) pitchDbPath = path.resolve(args[++i]);
    if (args[i] === '--threads'  && args[i + 1]) threadsPath = path.resolve(args[++i]);
  }

  return { user, pitchDbPath, threadsPath };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('=== Buyer Enrichment Pipeline ===\n');

  const { user, pitchDbPath, threadsPath } = parseArgs();
  console.log(`  MYE user:     ${user}`);
  console.log(`  Pitch DB:     ${pitchDbPath}`);
  console.log(`  Threads file: ${threadsPath}\n`);

  // Validate API key early so we fail fast before touching the DB
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[ERROR] ANTHROPIC_API_KEY is not set. Add it to .env.local or the environment.');
    process.exit(1);
  }

  // Run migrations so the 017_buyer_research tables exist before the pipeline runs
  console.log('Running migrations...');
  initDb();
  console.log('Migrations complete.\n');

  // Create the run record — the pipeline will update it on completion.
  // Column names match migrations/017_buyer_enrichment.sql schema.
  const runId = randomUUID();
  run(
    `INSERT INTO buyer_research_runs
       (id, source_user, source_file, status, started_at, created_at)
     VALUES (?, ?, ?, 'running', ?, ?)`,
    [runId, user, threadsPath, Date.now(), Date.now()]
  );
  console.log(`Research run started: ${runId}\n`);

  // Delegate all pipeline logic to the shared module
  await runEnrichmentPipeline({
    runId,
    user,
    threadsFile: threadsPath,
    pitchDbFile: pitchDbPath,
  });

  console.log('\n=== Done ===');
}

main().catch((err) => {
  console.error('\n[FATAL]', err);
  process.exit(1);
});
