// Classifies all pending package_emails using Claude Haiku via Anthropic SDK.
// Runs locally — dumps emails from Bang via SSH, classifies in parallel batches,
// SCPs results back, then applies DB updates on Bang.
// Resumable: kill and restart any time.

import Anthropic from '@anthropic-ai/sdk';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';

const execAsync = promisify(exec);

const MODEL = 'claude-haiku-4-5-20251001';
const CONCURRENCY = 10;
const BANG = 'bang@10.0.0.208';
const BANG_DIR = 'C:/Users/bang/show-pitch-machine';
const PROGRESS_FILE = path.join(process.cwd(), 'data', 'classify-progress.json');
const RESULTS_FILE = path.join(process.cwd(), 'data', 'classify-results.json');

const anthropic = new Anthropic();

// ── Classification ────────────────────────────────────────────────────────────

interface Classification {
  pitch_related: boolean;
  signal: 'pass' | 'meeting-request' | 'in-review' | 'deal-discussion' | 'info-request' | 'unrelated';
  confidence: 'high' | 'medium' | 'low';
}

const FALLBACK: Classification = { pitch_related: false, signal: 'unrelated', confidence: 'low' };

async function classifyOne(
  threadId: string,
  sender: string,
  subject: string,
  date: string
): Promise<{ threadId: string; result: Classification }> {
  try {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 128,
      temperature: 0,
      system: `You classify emails for a TV production company's pitch pipeline. Respond with ONLY valid JSON — no markdown, no explanation.`,
      messages: [{
        role: 'user',
        content: `Classify this email. You only have sender and subject — no body.

From: ${sender}
Date: ${date}
Subject: ${subject}

JSON schema:
{"pitch_related":boolean,"signal":"pass"|"meeting-request"|"in-review"|"deal-discussion"|"info-request"|"unrelated","confidence":"high"|"medium"|"low"}

- pitch_related true = development/pitch conversation (new show, project meeting, pitch feedback)
- pitch_related false = production logistics for in-production shows, invoices, legal agreements for existing shows, automated/marketing, generic catch-up
- signal = buyer intent based on subject alone
- confidence "high" only if unambiguous`
      }],
    });

    const text = (msg.content[0] as { text: string }).text.trim()
      .replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(text) as Classification;
    if (typeof parsed.pitch_related !== 'boolean' || !parsed.signal) throw new Error('bad shape');
    return { threadId, result: parsed };
  } catch {
    return { threadId, result: FALLBACK };
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const done: Set<string> = fs.existsSync(PROGRESS_FILE)
    ? new Set(JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8')) as string[])
    : new Set();

  const savedResults: Record<string, Classification> = fs.existsSync(RESULTS_FILE)
    ? JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'))
    : {};

  console.log(`Resuming — ${done.size} already classified`);

  // SCP helper scripts to Bang, then run them — avoids SSH quoting hell
  console.log('Fetching pending emails from Bang...');
  const scriptDir = path.join(process.cwd(), 'scripts');
  await execAsync(
    `scp "${scriptDir}/bang-dump-pending.js" "${scriptDir}/bang-apply-results.js" ${BANG}:"${BANG_DIR}/scripts/"`
  );

  const { stdout: rawDump } = await execAsync(
    `ssh -o ConnectTimeout=15 ${BANG} "cd ${BANG_DIR.replace(/\//g, '\\\\')} && node scripts/bang-dump-pending.js"`,
    { maxBuffer: 64 * 1024 * 1024 } // 64 MB — 6K emails as JSON is ~5 MB
  );

  const jsonLine = rawDump.split('\n').find(l => l.trim().startsWith('['));
  if (!jsonLine) {
    console.error('Could not parse DB dump:', rawDump.slice(0, 300));
    process.exit(1);
  }

  const allEmails = JSON.parse(jsonLine) as Array<{
    gmail_thread_id: string; subject: string; sender: string; received_at: number;
  }>;

  const pending = allEmails.filter(e => !done.has(e.gmail_thread_id));
  console.log(`${allEmails.length} pending in DB — ${pending.length} to classify\n`);

  if (pending.length === 0) {
    console.log('All classified — writing saved results to DB...');
  } else {
    const startTime = Date.now();
    let processed = 0;

    for (let i = 0; i < pending.length; i += CONCURRENCY) {
      const batch = pending.slice(i, i + CONCURRENCY);

      const batchResults = await Promise.all(
        batch.map(e => classifyOne(
          e.gmail_thread_id, e.sender, e.subject,
          new Date(e.received_at).toISOString().slice(0, 10)
        ))
      );

      for (const { threadId, result } of batchResults) {
        savedResults[threadId] = result;
        done.add(threadId);
      }
      processed += batch.length;

      if (processed % 100 === 0 || i + CONCURRENCY >= pending.length) {
        fs.writeFileSync(PROGRESS_FILE, JSON.stringify([...done]));
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(savedResults));
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = processed / elapsed;
        const eta = Math.round((pending.length - processed) / rate / 60);
        console.log(`  ${processed}/${pending.length} — ${rate.toFixed(1)}/sec — ~${eta}min remaining`);
      }
    }

    console.log(`\nDone classifying. Sending results to Bang...`);
  }

  // SCP results JSON to Bang
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(savedResults));
  await execAsync(`scp "${RESULTS_FILE}" ${BANG}:"${BANG_DIR}/data/classify-results.json"`);
  console.log('SCP done. Applying DB updates...');

  const { stdout: applyOut } = await execAsync(
    `ssh -o ConnectTimeout=15 ${BANG} "cd ${BANG_DIR.replace(/\//g, '\\\\')} && node scripts/bang-apply-results.js"`
  );

  console.log('\n=== BACKLOG CLASSIFICATION COMPLETE ===');
  const countLine = applyOut.split('\n').find(l => l.trim().startsWith('['));
  if (countLine) {
    console.log('Signal breakdown:');
    (JSON.parse(countLine) as Array<{ grok_signal: string; c: number }>)
      .forEach(r => console.log(`  ${r.grok_signal.padEnd(22)} ${r.c}`));
  } else {
    console.log(applyOut);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
