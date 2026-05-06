// Match unlinked email threads in package_emails to specific deck_sites using Claude Haiku.
// Emails live on Bang (10.0.0.208) — this script SSHes in, dumps both decks and emails,
// classifies locally, then SCPs results back and applies them on Bang.
//
// Usage:
//   npx tsx scripts/match-emails-to-decks.ts           — dry run, writes report only
//   npx tsx scripts/match-emails-to-decks.ts --apply   — commits high-confidence matches to Bang DB
//
// Resumable: kill and restart — progress is saved to data/email-deck-progress.json.
// Results saved to data/email-deck-matches.json for manual review.

import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import fs   from 'node:fs';
import path from 'node:path';
import { query } from '../lib/db';

const execAsync = promisify(exec);

const MODEL       = 'claude-haiku-4-5-20251001';
const CONCURRENCY = 4;    // parallel claude subprocesses
const BATCH_SIZE  = 20;   // emails per claude call — keeps prompts manageable

// Read fresh OAuth token from the Claude CLI credentials file.
// The Windows system env has an expired ANTHROPIC_API_KEY; this overrides it
// with the active session token so spawn calls work without re-login.
function readClaudeToken(): string {
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const credFile = path.join(home, '.claude', '.credentials.json');
  try {
    const creds = JSON.parse(fs.readFileSync(credFile, 'utf-8'));
    return creds?.claudeAiOauth?.accessToken ?? process.env.ANTHROPIC_API_KEY ?? '';
  } catch {
    return process.env.ANTHROPIC_API_KEY ?? '';
  }
}
const CLAUDE_TOKEN = readClaudeToken();

// On Windows, `claude` is a .ps1 — spawn it via node + full cli.js path instead.
// stdio: ['ignore', ...] closes stdin immediately, avoiding the 3s wait warning.
const CLAUDE_CLI = path.join(
  process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming'),
  'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js',
);
const BANG        = 'bang@10.0.0.208';
const BANG_DIR    = 'C:/Users/bang/show-pitch-machine';

const RESULTS_FILE  = path.join(process.cwd(), 'data', 'email-deck-matches.json');
const PROGRESS_FILE = path.join(process.cwd(), 'data', 'email-deck-progress.json');
const APPLY_FILE    = path.join(process.cwd(), 'data', 'deck-match-results.json');

// ── Types ─────────────────────────────────────────────────────────────────────

interface DeckSite {
  id: string;
  title: string;
  subtitle: string | null;
  genre: string | null;
  format: string | null;
}

interface EmailRow {
  id: string;
  gmail_thread_id: string;
  subject: string;
  sender: string;
  received_at: number;
}

interface MatchResult {
  email_id: string;
  gmail_thread_id: string;
  subject: string;
  sender: string;
  matched_deck_id: string | null;
  matched_deck_title: string | null;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

// ── Deck list formatter ───────────────────────────────────────────────────────

function buildDeckList(decks: DeckSite[]): string {
  return decks.map((d, i) => {
    const meta = [d.genre, d.format].filter(Boolean).join(', ');
    const sub  = d.subtitle ? ` — ${d.subtitle}` : '';
    // Short numeric index keeps prompts small and avoids UUID hallucination
    return `D${i + 1}: "${d.title}"${meta ? ` (${meta})` : ''}${sub}`;
  }).join('\n');
}

// ── Claude CLI batch matcher ──────────────────────────────────────────────────

// Calls the Claude CLI as a subprocess using the active session token.
// Uses `node cli.js` directly to avoid the .ps1 wrapper on Windows.
function claudeSpawn(prompt: string, systemPrompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, ANTHROPIC_API_KEY: CLAUDE_TOKEN };
    const proc = spawn(process.execPath, [
      CLAUDE_CLI,
      '--bare', '-p', prompt,
      '--model', MODEL,
      '--output-format', 'json',
      '--system-prompt', systemPrompt,
    ], { stdio: ['ignore', 'pipe', 'pipe'], env });
    let out = '';
    let err = '';
    proc.stdout.on('data', (d: Buffer) => { out += d; });
    proc.stderr.on('data', (d: Buffer) => { err += d; });
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`claude exited ${code}: ${err.slice(0, 300)}`));
      try {
        const json = JSON.parse(out) as { result: string };
        resolve(json.result ?? out);
      } catch {
        resolve(out);
      }
    });
    proc.on('error', reject);
  });
}

function mapBatchResults(emails: EmailRow[], decks: DeckSite[], parsed: Array<{ d: string | null; c: string }>): MatchResult[] {
  return emails.map((email, i) => {
    const match = parsed[i];
    let deck: DeckSite | null = null;
    if (match?.d && /^D\d+$/i.test(match.d)) {
      const idx = parseInt(match.d.slice(1), 10) - 1;
      deck = (idx >= 0 && idx < decks.length) ? decks[idx] : null;
    }
    const conf = (['high', 'medium', 'low'].includes(match?.c ?? '')
      ? match.c : 'low') as 'high' | 'medium' | 'low';
    return {
      email_id:           email.id,
      gmail_thread_id:    email.gmail_thread_id,
      subject:            email.subject,
      sender:             email.sender,
      matched_deck_id:    deck?.id    ?? null,
      matched_deck_title: deck?.title ?? null,
      confidence:         deck ? conf : 'low',
      reasoning:          deck ? `matched ${match?.d ?? ''}` : 'no match',
    };
  });
}

async function matchBatch(
  emails: EmailRow[],
  decks: DeckSite[],
  deckList: string,
): Promise<MatchResult[]> {
  const emailLines = emails.map((e, i) => {
    const date        = new Date(e.received_at).toISOString().slice(0, 10);
    const senderEmail = e.sender.replace(/^.*<(.+)>.*$/, '$1').trim();
    return `[${i + 1}] ${date} | ${senderEmail} | ${e.subject}`;
  }).join('\n');

  const systemPrompt = `You are a JSON API. Output ONLY a valid JSON array with no other text.`;
  const userContent  = `Match each email to a show deck (D1-D${decks.length}), or null.

DECKS:
${deckList}

EMAILS:
${emailLines}

Output ONLY this JSON array (${emails.length} items, one per email):
[{"d":"D1","c":"high"},{"d":null,"c":"low"},...]

Rules: d = deck index (D1-D${decks.length}) or null. c = high|medium|low.
high = subject names the show. medium = probable match. low/null = uncertain.
IMPORTANT: Output the JSON array ONLY. No explanations. No other text.`;

  try {
    const raw  = await claudeSpawn(userContent, systemPrompt);
    // Strip markdown fences and try full parse; fall back to regex extraction
    let text = raw.trim().replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
    let parsed: Array<{ d: string | null; c: string }>;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Haiku sometimes returns prose — extract the JSON array from within it
      const m = text.match(/\[[\s\S]*\]/);
      if (!m) throw new Error('no JSON array found in: ' + text.slice(0, 80));
      parsed = JSON.parse(m[0]);
    }
    return mapBatchResults(emails, decks, parsed);
  } catch (e) {
    console.error('\nBATCH ERROR:', e instanceof Error ? e.message : String(e));
    return emails.map(email => ({
      email_id:           email.id,
      gmail_thread_id:    email.gmail_thread_id,
      subject:            email.subject,
      sender:             email.sender,
      matched_deck_id:    null,
      matched_deck_title: null,
      confidence:         'low' as const,
      reasoning:          'batch error: ' + (e instanceof Error ? e.message.slice(0, 80) : String(e).slice(0, 80)),
    }));
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const applyMode = process.argv.includes('--apply');
  const scriptDir = path.join(process.cwd(), 'scripts');

  // ── Step 1: SCP helper scripts to Bang ────────────────────────────────────
  console.log('Sending helper scripts to Bang...');
  await execAsync(
    `scp "${scriptDir}/bang-dump-emails-for-matching.js" "${scriptDir}/bang-apply-deck-matches.js" ${BANG}:"${BANG_DIR}/scripts/"`
  );

  // ── Step 2a: Load decks from LOCAL DB ─────────────────────────────────────
  // Decks were created in the local dev environment; emails live on Bang.
  const decks = query<DeckSite>(
    'SELECT id, title, subtitle, genre, format FROM deck_sites ORDER BY title'
  );

  if (decks.length === 0) {
    console.log('No decks found in local DB — add decks first, then run this script.');
    process.exit(0);
  }

  console.log(`\n${decks.length} decks (local DB):`);
  decks.forEach(d => console.log(`  • ${d.title}${d.genre ? ` (${d.genre})` : ''}`));

  // ── Step 2b: Dump unlinked emails from Bang ────────────────────────────────
  console.log('\nFetching unlinked emails from Bang...');
  const { stdout: rawDump } = await execAsync(
    `ssh -o ConnectTimeout=15 ${BANG} "cd ${BANG_DIR.replace(/\//g, '\\\\')} && node scripts/bang-dump-emails-for-matching.js"`,
    { maxBuffer: 128 * 1024 * 1024 },
  );

  // The dump script writes one JSON object — find it past any node warnings
  const jsonLine = rawDump.split('\n').find(l => l.trim().startsWith('{'));
  if (!jsonLine) {
    console.error('Could not parse dump output:', rawDump.slice(0, 500));
    process.exit(1);
  }

  // Dump script returns { decks, emails } but we only use the emails from Bang
  const { emails } = JSON.parse(jsonLine) as { decks: DeckSite[]; emails: EmailRow[] };
  console.log(`\n${emails.length} unlinked email threads to match\n`);

  if (emails.length === 0) {
    console.log('All emails already linked — nothing to do.');
    process.exit(0);
  }

  const deckList = buildDeckList(decks);

  // ── Step 3: Resume support ────────────────────────────────────────────────
  const done = new Set<string>(
    fs.existsSync(PROGRESS_FILE)
      ? (JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8')) as string[])
      : [],
  );

  const savedResults: MatchResult[] = fs.existsSync(RESULTS_FILE)
    ? (JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8')) as MatchResult[])
    : [];

  const resultMap = new Map(savedResults.map(r => [r.email_id, r]));
  const pending   = emails.filter(e => !done.has(e.id));

  console.log(`${done.size} already processed — ${pending.length} remaining\n`);

  // ── Step 4: Match batches (parallel, CONCURRENCY at a time) ─────────────
  const startTime = Date.now();
  let processed   = 0;

  // Build array of all batches upfront, then process CONCURRENCY at a time
  const allBatches: EmailRow[][] = [];
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    allBatches.push(pending.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < allBatches.length; i += CONCURRENCY) {
    const chunk   = allBatches.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(chunk.map(b => matchBatch(b, decks, deckList)));

    for (const outcome of settled) {
      const results = outcome.status === 'fulfilled' ? outcome.value : [];
      for (const r of results) {
        resultMap.set(r.email_id, r);
        done.add(r.email_id);
      }
      processed += results.length || BATCH_SIZE; // count even on reject
    }

    // Checkpoint after every chunk
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify([...done]));
    fs.writeFileSync(RESULTS_FILE, JSON.stringify([...resultMap.values()], null, 2));
    const elapsed = (Date.now() - startTime) / 1000;
    const rate    = processed / elapsed;
    const eta     = Math.round((pending.length - processed) / Math.max(rate, 0.1));
    process.stdout.write(`\r  ${processed}/${pending.length} — ${rate.toFixed(1)}/sec — ~${eta}s remaining   `);
  }

  console.log('\n');

  // ── Step 5: Summary ───────────────────────────────────────────────────────
  const allResults = [...resultMap.values()];
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(allResults, null, 2));

  const matched   = allResults.filter(r => r.matched_deck_id);
  const unmatched = allResults.length - matched.length;
  const byConf    = { high: 0, medium: 0, low: 0 };
  matched.forEach(r => byConf[r.confidence]++);

  console.log('=== MATCH REPORT ===');
  console.log(`Total threads:  ${allResults.length}`);
  console.log(`Matched:        ${matched.length} (${Math.round(matched.length / allResults.length * 100)}%)`);
  console.log(`  High conf:    ${byConf.high}   ← applied automatically with --apply`);
  console.log(`  Medium conf:  ${byConf.medium}  ← review in data/email-deck-matches.json`);
  console.log(`  Low conf:     ${byConf.low}   ← likely wrong, skip`);
  console.log(`Unmatched:      ${unmatched}`);

  // Per-deck breakdown sorted by match count
  const byDeck = new Map<string, { title: string; high: number; medium: number; low: number }>();
  for (const r of matched) {
    const k = r.matched_deck_id!;
    if (!byDeck.has(k)) byDeck.set(k, { title: r.matched_deck_title!, high: 0, medium: 0, low: 0 });
    byDeck.get(k)![r.confidence]++;
  }

  if (byDeck.size > 0) {
    console.log('\n=== BY DECK ===');
    for (const [, s] of [...byDeck.entries()].sort((a, b) => (b[1].high + b[1].medium) - (a[1].high + a[1].medium))) {
      console.log(`  ${s.title}: ${s.high} high / ${s.medium} med / ${s.low} low`);
    }
  }

  // Sample of high-confidence matches for quick spot-checking
  const highSamples = matched.filter(r => r.confidence === 'high').slice(0, 10);
  if (highSamples.length > 0) {
    console.log('\n=== HIGH-CONFIDENCE SAMPLE (first 10) ===');
    highSamples.forEach(r =>
      console.log(`  [${r.matched_deck_title}] "${r.subject.slice(0, 65)}" — ${r.reasoning}`)
    );
  }

  // ── Step 6: Apply or report ───────────────────────────────────────────────
  if (applyMode) {
    console.log(`\nApplying ${byConf.high} high-confidence matches to Bang DB...`);

    // Write the results file that bang-apply-deck-matches.js reads
    fs.writeFileSync(APPLY_FILE, JSON.stringify(allResults, null, 2));

    await execAsync(`scp "${APPLY_FILE}" ${BANG}:"${BANG_DIR}/data/deck-match-results.json"`);

    const { stdout: applyOut } = await execAsync(
      `ssh -o ConnectTimeout=15 ${BANG} "cd ${BANG_DIR.replace(/\//g, '\\\\')} && node scripts/bang-apply-deck-matches.js"`,
    );

    console.log('\n=== APPLIED ===');
    const countLine = applyOut.split('\n').find(l => l.trim().startsWith('['));
    if (countLine) {
      (JSON.parse(countLine) as Array<{ title: string; c: number }>)
        .forEach(r => console.log(`  ${r.title}: ${r.c} emails linked`));
    } else {
      console.log(applyOut);
    }
    console.log(`\nMedium-confidence results: data/email-deck-matches.json`);
    console.log(`Use the Buyers tab in /decks/[id] to manually attach the rest.`);
  } else {
    console.log(`\nDry run — no changes made to Bang DB.`);
    console.log(`Full results: data/email-deck-matches.json`);
    console.log(`Run with --apply to commit the ${byConf.high} high-confidence matches.`);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
