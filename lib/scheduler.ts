// node-cron scheduler — one place to register all recurring background jobs.
// Separated from individual job implementations so job code can be tested without cron.
// Guard flag prevents double-registration if initScheduler() is called multiple times
// (e.g. due to Next.js hot-reload in dev).

import cron from 'node-cron';
import { run } from './db';

// Prevent double-registration on hot reload
let initialized = false;

function timestamp(): string {
  return new Date().toISOString();
}

export function initScheduler(): void {
  if (initialized) return;
  initialized = true;

  // ── Job 1: Daily scraper run ────────────────────────────────────────────────
  // Fires at 6 AM daily; hits the internal API so the route handles its own error boundary
  const scraperCron = process.env.SCRAPER_CRON || '0 6 * * *';
  cron.schedule(scraperCron, async () => {
    console.log(`[scheduler] ${timestamp()} — starting daily scraper run`);
    try {
      const res = await fetch('http://localhost:3000/api/scraper/run', { method: 'POST' });
      const json = await res.json() as { items?: number };
      console.log(`[scheduler] ${timestamp()} — scraper complete, items: ${json?.items ?? 'unknown'}`);
    } catch (err) {
      console.error(`[scheduler] ${timestamp()} — scraper run failed:`, err instanceof Error ? err.message : err);
    }
  });

  // ── Job 2: Gmail pipeline poller ────────────────────────────────────────────
  // Hourly during business hours (7 AM–7 PM EST), no overnight polling
  const pollCron = process.env.PIPELINE_POLL_CRON || '0 7-19 * * *';

  cron.schedule(pollCron, async () => {
    console.log(`[scheduler] ${timestamp()} — polling pipeline emails`);
    try {
      // Dynamic import so the poller's Gmail auth setup doesn't block app startup
      const { pollPipelineEmails } = await import('./email-poller');
      const { processed, moved } = await pollPipelineEmails();
      console.log(`[scheduler] ${timestamp()} — poll done: ${processed} processed, ${moved} moved`);
    } catch (err) {
      console.error(`[scheduler] ${timestamp()} — email poll failed:`, err instanceof Error ? err.message : err);
    }
  }, { timezone: 'America/New_York' });

  // ── Job 3: days_in_stage incrementer ────────────────────────────────────────
  // Runs every hour and bumps the counter for all packages that have a stage_entered_at.
  // The counter is denormalized for fast dashboard sorting without date arithmetic in SQL.
  cron.schedule('0 * * * *', async () => {
    console.log(`[scheduler] ${timestamp()} — updating days_in_stage`);
    try {
      // Only increment packages where stage_entered_at is in the past.
      // CAST(… AS INTEGER) works in both SQLite and Postgres, so no translation needed here.
      await run(
        `UPDATE packages
            SET days_in_stage = CAST((? - stage_entered_at) / 86400000 AS INTEGER)
          WHERE stage_entered_at IS NOT NULL
            AND status != 'archived'`,
        [Date.now()]
      );
      console.log(`[scheduler] ${timestamp()} — days_in_stage updated`);
    } catch (err) {
      console.error(`[scheduler] ${timestamp()} — days_in_stage update failed:`, err instanceof Error ? err.message : err);
    }
  });

  console.log(`[scheduler] ${timestamp()} — initialized (scraper: ${scraperCron}, poll: ${pollCron} America/New_York)`);
}
