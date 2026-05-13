/**
 * GET /api/research/status
 *
 * Returns the status of recent buyer enrichment runs and aggregate touch/contact stats.
 * Use this to poll pipeline progress after triggering POST /api/research/run.
 *
 * Called by: dashboard "Enrichment" panel, automation scripts, curl
 * Auth: none (internal tool — not externally exposed)
 *
 * Query params: none
 *
 * Response (200):
 *   {
 *     data: {
 *       runs: BuyerResearchRun[],       // last 10 runs, newest first
 *       totalTouches: number,           // total rows in buyer_contact_touches
 *       totalBuyersEnriched: number,    // buyer_contacts with at least one touch
 *     }
 *   }
 *
 * Schema: buyer_research_runs from migrations/017_buyer_enrichment.sql
 */

import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

// ── Types ─────────────────────────────────────────────────────────────────────

// Mirrors buyer_research_runs columns from 017_buyer_enrichment.sql
interface BuyerResearchRun {
  id: string;
  source_user: string | null;
  source_file: string | null;
  started_at: number | null;
  completed_at: number | null;
  buyers_seen: number;
  buyers_created: number;
  buyers_updated: number;
  touches_created: number;
  pitches_created: number;
  status: string;   // 'running' | 'done' | 'failed'
  error_msg: string | null;
  created_at: number | null;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET() {
  // Last 10 runs, newest first — enough to see recent history without overwhelming the UI
  const runs = await query<BuyerResearchRun>(
    `SELECT * FROM buyer_research_runs ORDER BY created_at DESC LIMIT 10`
  );

  // Total touch rows — proxy for "how much email data have we processed"
  const touchRow = await queryOne<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM buyer_contact_touches`
  );
  const totalTouches = touchRow?.cnt ?? 0;

  // Buyers enriched = distinct buyer_contacts who appear in at least one touch row.
  // More meaningful than counting all buyer_contacts (many come from sheet imports).
  const enrichedRow = await queryOne<{ cnt: number }>(
    `SELECT COUNT(DISTINCT bc.id) AS cnt
     FROM buyer_contacts bc
     INNER JOIN buyer_contact_touches bct
       ON LOWER(bct.contact_email) = LOWER(bc.email)`
  );
  const totalBuyersEnriched = enrichedRow?.cnt ?? 0;

  return NextResponse.json({
    data: {
      runs,
      totalTouches,
      totalBuyersEnriched,
    },
  });
}
