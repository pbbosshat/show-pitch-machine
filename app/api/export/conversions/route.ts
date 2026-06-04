/**
 * GET /api/export/conversions
 *
 * Exports contact_leads as a structured conversion feed for attribution analysis,
 * ad-platform reconciliation (Google Ads, Meta), and BI pipelines.
 *
 * WHY this endpoint exists: GA4 gives us aggregate stats but no row-level export
 * of which keyword or campaign drove which lead. By exporting contact_leads with
 * attribution fields we can do exact keyword→conversion ROI in a spreadsheet or
 * BI tool, and import conversions into Google Ads Enhanced Conversions.
 *
 * Auth: Bearer token — matches CONV_EXPORT_TOKEN env var.
 *   Missing env var → 401 (fail closed; don't expose data if unconfigured).
 *   Missing/mismatched header → 401.
 *   Uses constant-time comparison (timingSafeEqual) to prevent timing attacks.
 *
 * Params (query string):
 *   since  — ISO 8601 timestamp; default = 30 days ago. Filters created_at > since.
 *   limit  — integer 1–2000; default = 500. Maximum rows returned in one call.
 *
 * Response (JSON):
 *   { domain, events[], next_since }
 *   next_since is set to the last row's created_at (as ISO string) ONLY when
 *   len(events) === limit (meaning there are likely more rows). It is null when
 *   fewer than limit rows are returned — prevents infinite pagination loops.
 *
 * NO PII is included — first_name, last_name, email, message, company are
 * deliberately excluded. ga_client_id and page_path are null in V1 (not yet
 * captured; reserved for future enhancement).
 */

// force-dynamic: no caching — each request must hit the live database.
// runtime nodejs: uses node:crypto for timingSafeEqual.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { query } from '@/lib/db';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Row shape returned by the SELECT — matches the new attribution columns. */
interface LeadRow {
  id:           string;
  created_at:   number;   // BIGINT parsed as Number (see lib/db.ts pgTypes.setTypeParser)
  landing_page: string | null;
  channel:      string | null;
  utm_source:   string | null;
  utm_medium:   string | null;
  utm_campaign: string | null;
  utm_term:     string | null;
  utm_content:  string | null;
  gclid:        string | null;
  fbclid:       string | null;
  referrer:     string | null;
}

/** Shape of each event object in the response array. */
interface ConversionEvent {
  event_id:     string;
  occurred_at:  string;   // ISO 8601
  event_name:   'contact';
  value:        null;     // reserved for future revenue tracking
  landing_page: string | null;
  page_path:    null;     // not yet captured at submit time; reserved for V2
  channel:      string | null;
  utm_source:   string | null;
  utm_medium:   string | null;
  utm_campaign: string | null;
  utm_term:     string | null;
  utm_content:  string | null;
  gclid:        string | null;
  fbclid:       string | null;
  referrer:     string | null;
  ga_client_id: null;     // not yet captured; reserved for future GA4 Measurement Protocol
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DOMAIN            = 'myentertainment.tv';
const DEFAULT_LIMIT     = 500;
const MAX_LIMIT         = 2000;
const DEFAULT_LOOKBACK  = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

// ── Auth helper ───────────────────────────────────────────────────────────────

/**
 * authorise — constant-time Bearer token check.
 *
 * WHY timingSafeEqual: a naive `===` comparison allows an attacker to infer
 * the correct token byte-by-byte via timing differences. timingSafeEqual runs
 * in constant time regardless of where the strings diverge, making the check
 * safe against timing oracle attacks.
 *
 * Returns true when the request carries a valid token; false otherwise.
 * Returns false (not throws) when CONV_EXPORT_TOKEN is not set — callers
 * turn this into a 401 rather than a 500 so the endpoint fails closed.
 */
function authorise(request: NextRequest): boolean {
  const envToken = process.env.CONV_EXPORT_TOKEN;
  // Fail closed: if the env var isn't set, the endpoint is unconfigured and
  // should not return any data.
  if (!envToken) return false;

  const authHeader = request.headers.get('authorization') ?? '';
  const bearerPrefix = 'Bearer ';
  if (!authHeader.startsWith(bearerPrefix)) return false;

  const requestToken = authHeader.slice(bearerPrefix.length);

  // timingSafeEqual requires same-length Buffers — mismatched lengths would
  // throw. Compare lengths separately (not timing-sensitive for length).
  const envBuf = Buffer.from(envToken, 'utf-8');
  const reqBuf = Buffer.from(requestToken, 'utf-8');
  if (envBuf.length !== reqBuf.length) return false;

  return timingSafeEqual(envBuf, reqBuf);
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  if (!authorise(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // ── Parse query params ────────────────────────────────────────────────────
  const { searchParams } = new URL(request.url);

  // `since`: ISO timestamp cursor — default to 30 days ago.
  // WHY ms-epoch comparison: contact_leads.created_at is stored as BIGINT ms-epoch
  // (matching the Date.now() insert in route.ts). We convert the ISO param to ms.
  let sinceMs: number;
  const sinceParam = searchParams.get('since');
  if (sinceParam) {
    const parsed = Date.parse(sinceParam);
    if (isNaN(parsed)) {
      return NextResponse.json(
        { error: `invalid 'since' parameter: expected ISO 8601 date, got "${sinceParam}"` },
        { status: 400 }
      );
    }
    sinceMs = parsed;
  } else {
    sinceMs = Date.now() - DEFAULT_LOOKBACK;
  }

  // `limit`: clamp between 1 and MAX_LIMIT.
  let limit = DEFAULT_LIMIT;
  const limitParam = searchParams.get('limit');
  if (limitParam !== null) {
    const parsed = parseInt(limitParam, 10);
    if (isNaN(parsed) || parsed < 1) {
      return NextResponse.json(
        { error: `invalid 'limit' parameter: expected integer >= 1, got "${limitParam}"` },
        { status: 400 }
      );
    }
    limit = Math.min(parsed, MAX_LIMIT);
  }

  // ── Query ─────────────────────────────────────────────────────────────────
  // WHY ASC order: pagination cursors advance forward in time. The consumer
  // passes `next_since` as the `since` param on the next request, so oldest-first
  // ensures no rows are skipped when new leads arrive between requests.
  //
  // WHY > instead of >=: the cursor is set to the LAST row's created_at.
  // Using > skips that row on the next request (already included in previous
  // response). Using >= would re-include it (duplicate event_id in the feed).
  //
  // NO PII columns are selected — first_name, last_name, email, message, company
  // are deliberately absent from this query.
  let rows: LeadRow[];
  try {
    rows = await query<LeadRow>(
      `SELECT id, created_at, landing_page, channel,
              utm_source, utm_medium, utm_campaign, utm_term, utm_content,
              gclid, fbclid, referrer
       FROM contact_leads
       WHERE created_at > ?
       ORDER BY created_at ASC
       LIMIT ?`,
      [sinceMs, limit]
    );
  } catch (err) {
    // Surface the exact error message — operators need to know whether it's a
    // DB connection issue, a missing column (pre-migration), etc.
    const msg = (err as Error).message ?? 'unknown database error';
    console.error('[export/conversions] query failed:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // ── Build events array ────────────────────────────────────────────────────
  const events: ConversionEvent[] = rows.map((row) => ({
    event_id:     row.id,
    // created_at is ms-epoch (BIGINT parsed as Number) — convert to ISO 8601
    // so consumers don't need to know the internal epoch-ms convention.
    occurred_at:  new Date(row.created_at).toISOString(),
    event_name:   'contact',
    value:        null,
    landing_page: row.landing_page,
    page_path:    null,
    channel:      row.channel,
    utm_source:   row.utm_source,
    utm_medium:   row.utm_medium,
    utm_campaign: row.utm_campaign,
    utm_term:     row.utm_term,
    utm_content:  row.utm_content,
    gclid:        row.gclid,
    fbclid:       row.fbclid,
    referrer:     row.referrer,
    ga_client_id: null,
  }));

  // ── Pagination cursor ─────────────────────────────────────────────────────
  // next_since is null when fewer rows than limit were returned — that signals
  // "end of data" and prevents the consumer from making an infinite chain of
  // requests that all return 0 rows (the cursor loop bug).
  //
  // WHY set to last row's occurred_at instead of now(): if we set it to now()
  // and the consumer retries immediately, rows inserted between the last query
  // and the consumer's next request would land inside the new window. Using the
  // last row's timestamp is deterministic regardless of clock skew.
  const next_since: string | null =
    rows.length === limit
      ? new Date(rows[rows.length - 1].created_at).toISOString()
      : null;

  return NextResponse.json({
    domain: DOMAIN,
    events,
    next_since,
  });
}
