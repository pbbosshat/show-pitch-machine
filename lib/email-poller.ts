// Pipeline email poller — fetches new buyer emails, runs Groq classification,
// stores the result, and optionally moves the pipeline card.
// Only auto-moves on high-confidence signals to prevent false stage transitions.
//
// Phase 1B: made all DB calls async (query → await query, run → await run).
// Rewrote INSERT OR IGNORE → INSERT … ON CONFLICT DO NOTHING (Postgres syntax).

import { v4 as uuidv4 } from 'uuid';
import { getPipelineMessages, getMYEPipelineMessages } from './gmail';
import { classifyEmail } from './groq';
import { query, run } from './db';
import type { Package, GrokSignal, GmailMessage } from '../types';

// Signals that warrant an automatic stage move when confidence is high
const AUTO_MOVE_MAP: Partial<Record<GrokSignal, string>> = {
  'meeting-request': 'meeting',
  'in-review': 'in-review',
  'deal-discussion': 'negotiating',
  'pass': 'pass',
};

/**
 * Load active pitches so the Groq classifier knows what packages to match against.
 * Only non-archived packages are included — archived ones are irrelevant for new signals.
 *
 * Called by: pollPipelineEmails
 */
async function getActivePitches(): Promise<Array<{ id: string; name: string; buyerName: string }>> {
  return query<{ id: string; name: string; buyerName: string }>(
    `SELECT p.id, p.name,
            COALESCE(bc.name, '') AS buyerName
     FROM packages p
     LEFT JOIN buyer_contacts bc ON bc.id = p.target_contact_id
     WHERE p.status != 'archived'`
  );
}

/**
 * Move a package to a new pipeline stage and record the transition timestamp.
 * stage_entered_at and days_in_stage are reset so the staleness counter restarts.
 *
 * Called by: pollPipelineEmails (only on high-confidence signals)
 */
async function movePipelineStage(packageId: string, newStage: string): Promise<void> {
  await run(
    `UPDATE packages
        SET pipeline_stage   = ?,
            stage_entered_at = ?,
            days_in_stage    = 0,
            updated_at       = ?
      WHERE id = ?`,
    [newStage, Date.now(), Date.now(), packageId]
  );
}

/**
 * Poll buyer emails from all configured inboxes, classify each one with Groq,
 * persist the classification, and auto-move the pipeline card when confidence is high.
 *
 * Called by: lib/scheduler.ts (hourly during business hours)
 * Returns: { processed, moved } — counts for the scheduler log
 */
export async function pollPipelineEmails(): Promise<{ processed: number; moved: number }> {
  let processed = 0;
  let moved = 0;

  // Find the most recent message we processed so we only fetch newer ones.
  // MAX() returns null on an empty table — the poller handles that gracefully below.
  const lastRow = (await query<{ received_at: number }>(
    'SELECT MAX(received_at) AS received_at FROM package_emails'
  ))[0];
  const since = lastRow?.received_at ? new Date(lastRow.received_at) : undefined;

  // Gather buyer emails from all sources — sm@gototeam.com + all myentprod.com mailboxes.
  // Each source is isolated in its own try/catch so one auth failure doesn't block the rest.
  const messages: GmailMessage[] = [];

  try {
    messages.push(...await getPipelineMessages(since));
  } catch (err) {
    console.error('[email-poller] getPipelineMessages (sm) failed:', err instanceof Error ? err.message : err);
  }

  try {
    messages.push(...await getMYEPipelineMessages(since));
  } catch (err) {
    console.error('[email-poller] getMYEPipelineMessages failed:', err instanceof Error ? err.message : err);
  }

  if (messages.length === 0) return { processed: 0, moved: 0 };

  const activePitches = await getActivePitches();

  for (const msg of messages) {
    const classification = await classifyEmail({
      subject: msg.subject,
      sender: msg.sender,
      recipient: msg.recipient,
      body: msg.body,
      date: new Date(msg.receivedAt).toISOString(),
      activePitches,
    });

    // Store the email record regardless of whether it's pitch-related — useful audit trail.
    // ON CONFLICT DO NOTHING: gmail_thread_id + processed_at has no unique constraint but
    // we store to keep a record even if a concurrent poller run fetched the same thread.
    await run(
      `INSERT INTO package_emails
         (id, package_id, gmail_thread_id, subject, sender, received_at,
          grok_signal, grok_raw, stage_moved_to, processed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT DO NOTHING`,
      [
        uuidv4(),
        classification.pitch_related ? (classification.package_id ?? null) : null,
        msg.threadId,
        msg.subject,
        msg.sender,
        msg.receivedAt,
        classification.signal,
        JSON.stringify(classification),
        null, // filled in below if we move
        Date.now(),
      ]
    );

    processed++;

    // Only auto-move on high confidence — medium/low get stored for human review
    if (
      classification.pitch_related &&
      classification.confidence === 'high' &&
      classification.package_id
    ) {
      const targetStage = AUTO_MOVE_MAP[classification.signal];
      if (targetStage) {
        // Verify the package exists before moving to prevent orphan updates
        const pkg = (await query<Package>(
          'SELECT id, pipeline_stage FROM packages WHERE id = ?',
          [classification.package_id]
        ))[0];

        if (pkg && pkg.pipeline_stage !== targetStage) {
          await movePipelineStage(classification.package_id, targetStage);
          // Backfill the stage_moved_to column on the email record we just inserted.
          // ORDER BY processed_at DESC picks the most recent row for this thread.
          await run(
            `UPDATE package_emails SET stage_moved_to = ? WHERE gmail_thread_id = ? AND processed_at IS NOT NULL ORDER BY processed_at DESC LIMIT 1`,
            [targetStage, msg.threadId]
          );
          moved++;
          console.log(
            `[email-poller] Moved package ${classification.package_id} → ${targetStage} (signal: ${classification.signal})`
          );
        }
      }
    }
  }

  return { processed, moved };
}
