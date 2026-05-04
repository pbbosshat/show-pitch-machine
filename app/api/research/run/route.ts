/**
 * POST /api/research/run
 *
 * Triggers the buyer enrichment pipeline as a background job.
 * Returns 202 immediately with the new run ID — the pipeline runs async.
 * Poll GET /api/research/status to check progress.
 *
 * Called by: dashboard "Enrich Buyers" button, automation scripts, curl
 * Auth: none (internal tool — not externally exposed)
 *
 * Request body (all optional):
 *   { user?: string, threadsFile?: string, pitchDbFile?: string }
 *
 * Response (202):
 *   { data: { runId: string, status: 'started' } }
 *
 * The pipeline:
 *   1. Reads shawn_pitch_threads_full.json + mye_pitch_database.json
 *   2. Discovers non-MYE participants and upserts buyer_contacts
 *   3. Inserts buyer_contact_touches (one per message per participant)
 *   4. Creates pitches rows for threads with known outcomes
 *   5. Calls Claude Haiku to extract title/phone from email signatures
 *   6. Updates last_mye_contact_date and mye_pitch_count on each contact
 */

import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import { run } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RunRequestBody {
  user?: string;
  threadsFile?: string;
  pitchDbFile?: string;
}

// ── Background job launcher ───────────────────────────────────────────────────

/**
 * Fire the enrichment pipeline in the background by dynamically importing
 * and invoking the same logic used by scripts/enrich-buyers.ts.
 *
 * We can't use child_process.spawn in Next.js edge runtime, so instead we
 * dynamically import the pipeline module (which must export a runPipeline()
 * function) and call it without awaiting.
 *
 * Errors are caught inside the pipeline and written to buyer_research_runs.error_msg,
 * so the background promise never surfaces an unhandled rejection.
 */
async function launchEnrichmentBackground(
  runId: string,
  user: string,
  threadsFile: string,
  pitchDbFile: string
): Promise<void> {
  try {
    // Dynamically import the pipeline module to avoid loading Anthropic SDK
    // at Next.js startup (it's only needed when the enrichment actually runs).
    const { runEnrichmentPipeline } = await import('@/lib/enrichment/pipeline');
    await runEnrichmentPipeline({ runId, user, threadsFile, pitchDbFile });
  } catch (err) {
    // Mark the run as failed so the status endpoint reflects the failure
    const msg = (err as Error).message?.slice(0, 1000) ?? 'Unknown error';
    run(
      `UPDATE buyer_research_runs
       SET status = 'failed', error_msg = ?, completed_at = ?
       WHERE id = ?`,
      [msg, Date.now(), runId]
    );
    console.error('[POST /api/research/run] Background pipeline error:', err);
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: RunRequestBody = {};

  // Body is optional — all fields have defaults
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text) as RunRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const user = body.user ?? 'sm@gototeam.com';

  // Default paths resolve relative to the project root (one level above /scripts).
  // In production the JSON files live at the project root's parent directory.
  const projectRoot = process.cwd();
  const dataRoot = path.join(projectRoot, '..');

  const threadsFile = body.threadsFile ?? path.join(dataRoot, 'shawn_pitch_threads_full.json');
  const pitchDbFile = body.pitchDbFile ?? path.join(dataRoot, 'mye_pitch_database.json');

  // Create the run record up front so status can be polled immediately.
  // Column names match migrations/017_buyer_enrichment.sql (source_user, source_file).
  const runId = uuidv4();
  run(
    `INSERT INTO buyer_research_runs
       (id, source_user, source_file, status, started_at, created_at)
     VALUES (?, ?, ?, 'running', ?, ?)`,
    [runId, user, threadsFile, Date.now(), Date.now()]
  );

  // Fire-and-forget — don't await so we return 202 immediately
  // Errors are handled inside launchEnrichmentBackground; this promise won't reject
  void launchEnrichmentBackground(runId, user, threadsFile, pitchDbFile);

  return NextResponse.json(
    { data: { runId, status: 'started' } },
    { status: 202 }
  );
}
