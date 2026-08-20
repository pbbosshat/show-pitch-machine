'use client';
/**
 * DailyConnections — the Daily Connections tab (person-centric layer on top
 * of the Intelligence briefing feed).
 *
 * Spec: docs/daily-connections-prd.html — §4 API contracts, §5 UI spec,
 * §7 voice. Pattern/idioms reused from components/intelligence/DailyBriefing.tsx
 * (pills, dropdown chrome, SWR fetch + exact-error display, design tokens).
 *
 * Flow:
 *  1. Build/Refresh -> POST /api/connections/build (extracts people from
 *     today's briefing articles, tiers them, dedups + enriches + drafts
 *     Tier 1/2 automatically).
 *  2. GET /api/connections?date= lists that day's leads. Tier 1/2 render in
 *     the main table (fully enriched); Tier 3 renders in a lightweight strip
 *     below with NO enrichment data (cost control — Apollo is never called
 *     for Tier 3 until a human promotes it).
 *  3. Tier 3 "Add to connect list" -> POST /api/connections/[id]/enrich
 *     promotes the lead to Tier 2 and runs dedup+Apollo+draft for it, then
 *     it moves up into the main table.
 *  4. Inline draft edits (email subject/body, LinkedIn note) persist via
 *     PATCH /api/connections/[id] on blur.
 *  5. Select rows -> CONNECT SELECTED -> confirm dialog -> POST
 *     /api/connections/connect. Email sends inline (Gmail API as
 *     sm@gototeam.com); LinkedIn invites go into a queue Bubba polls, so
 *     those rows read "queued for Bubba" until the poller resolves them.
 *
 * IMPORTANT: the backend routes under app/api/connections/ are being built
 * in parallel against this same PRD, so response shapes not explicitly
 * pinned down in §4 (e.g. the exact key names for the article join, the
 * exact wrapper for /connect results) are handled defensively below with a
 * comment at each spot. Every network call surfaces the server's exact
 * error string (err.message / data.error) per the house design rule —
 * never a generic "failed" message.
 */

import useSWR from 'swr';
import { useState, useMemo, useRef, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import EmailComposeModal from './EmailComposeModal';
import LinkedInConnectModal from './LinkedInConnectModal';

// ─── Types (self-contained — the parallel /api/connections/* routes don't ──
// exist yet in this checkout, so these mirror migration 044's schema from
// the PRD §3 rather than importing from a route file that isn't there yet) ─

/** One row from `connection_leads`, joined with its source article. */
interface ConnectionLead {
  id: string;
  article_id: string;
  lead_date: string;
  person_name: string;
  person_title: string | null;
  company: string | null;
  prior_company: string | null;
  reason: string | null;
  tier: number; // 1 | 2 = connect-worthy, 3 = note-only
  tier_reason: string | null;
  status: string; // 'new' | 'enriching' | 'ready' | 'queued' | 'sent' | 'skipped' | 'failed'
  dedup_status: string; // 'unchecked' | 'clear' | 'known_gmail' | 'known_calendar'
  dedup_evidence: string | null;
  email: string | null;
  email_status: string | null; // apollo email_status; send-gate = 'verified' only
  linkedin_url: string | null;
  apollo_checked_at: number | null;
  matched_contact_id: string | null;
  voice_variant: string | null; // 'stranger' | 'reconnect'
  draft_email_subject: string | null;
  draft_email_body: string | null;
  draft_li_note: string | null; // hard cap 200 chars
  created_at: number;
  updated_at: number;
  // Source article join — PRD §4 says the list is "joined with the source
  // article headline/url" but doesn't pin the exact key names, so both
  // common namings are accepted here and normalized via the helpers below.
  article_headline?: string | null;
  article_url?: string | null;
  headline?: string | null;
  url?: string | null;
}

interface ConnectionsListResponse {
  data: ConnectionLead[];
  // Shape not pinned by the PRD beyond "counts" — we recompute tier counts
  // client-side from `data` instead of trusting a specific key layout here.
  counts?: Record<string, number>;
}

interface BuildResponse {
  built?: number;
  skipped?: number;
  byTier?: Record<string, number>;
}

/** One row of the /connect response — one per (lead_id, channel) attempted. */
interface ConnectResult {
  lead_id: string;
  channel: 'email' | 'linkedin';
  status: string; // 'sent' | 'already_connected' | 'pending_invite' | 'failed' | 'skipped' | 'pending' | 'picked'
  detail?: string | null; // exact engine/gmail error or log line
}

type DraftField = 'draft_email_subject' | 'draft_email_body' | 'draft_li_note';
type ChannelResult = { status: string; detail: string | null };
type ConnectResultsMap = Map<string, Partial<Record<'email' | 'linkedin', ChannelResult>>>;

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Today's date as a local YYYY-MM-DD string (not UTC, to avoid off-by-one). */
function todayLocalISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function articleUrl(lead: ConnectionLead): string | null {
  return lead.article_url ?? lead.url ?? null;
}
function articleHeadline(lead: ConnectionLead): string | null {
  return lead.article_headline ?? lead.headline ?? null;
}

/**
 * fetcher — throws with the server's exact error string on a non-2xx so SWR's
 * `error` carries real content (design rule: always show exact errors, never
 * a generic "failed to load"). This repo's API convention is a flat
 * `{ error: string }` body (see the NextResponse.json calls in the connections routes).
 */
async function fetcher(url: string) {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error ?? `HTTP ${res.status} ${res.statusText}`);
  }
  return json;
}

/** POST/PATCH helper — same exact-error convention as fetcher(). */
async function postJson(url: string, body?: unknown, method: 'POST' | 'PATCH' = 'POST') {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error ?? `HTTP ${res.status} ${res.statusText}`);
  }
  return json;
}

// Fixed column widths shared between the header row and every lead row so
// everything lines up. Reason for connection is the only flexible column.
const COL = {
  checkbox: 28,
  name: 190,
  dedup: 200,
  // Both channel columns now carry data + their own action button, so they need
  // a little more room than when the action lived in a separate column.
  email: 190,
  linkedin: 150,
  status: 160,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 11px',
  borderRadius: 6,
  border: '1px solid var(--border-subtle)',
  background: 'var(--bg-app)',
  color: 'var(--text-primary)',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '7px 16px',
  borderRadius: 6,
  border: 'none',
  background: 'var(--accent)',
  color: '#fff',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '7px 16px',
  borderRadius: 6,
  border: '1px solid var(--border-subtle)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
};

// ─── Small display components ────────────────────────────────────────────

/** NEW (green) / KNOWN: <evidence> (amber) — dedup outcome chip. */
function DedupChip({ status, evidence }: { status: string; evidence: string | null }) {
  const known = status === 'known_gmail' || status === 'known_calendar';
  if (known) {
    // Say what the prior contact WAS, not the raw match. The old chip read
    // "KNOWN: Gmail 2026-08-14 \"Subject…\"" — a date and a truncated subject
    // line, which forced you to decode the evidence to learn the one thing that
    // matters: has Shawn dealt with this person before, and how.
    //
    // Gmail and Calendar mean different things and change how he opens, so they
    // get different labels. The raw evidence stays in the hover tooltip, since
    // it is still the proof behind the claim.
    const label =
      status === 'known_calendar' ? 'Known & Met Previously' : 'Known & Emailed Previously';
    return (
      <span
        title={evidence ?? 'Known contact'}
        className="inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wide"
        style={{
          background: 'rgba(217,119,6,0.16)',
          color: 'var(--status-deal)',
          maxWidth: COL.dedup - 8,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    );
  }
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase"
      style={{ background: 'rgba(22,163,74,0.16)', color: 'var(--status-greenlit)' }}
    >
      NEW
    </span>
  );
}

/** Verified-email badge or "none found". */
// The two channel columns each show their own data AND their own action, so a
// row reads left-to-right as "here is the address / here is the profile, and
// here is the button that acts on it". They replaced a third generic action
// column that sat apart from the data it acted on.

/** Action link shared by both channel cells. */
function CellAction({ label, onClick, disabled, title }: {
  label: string; onClick: () => void; disabled?: boolean; title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="text-xs font-semibold w-fit"
      style={{
        color: disabled ? 'var(--text-muted)' : 'var(--accent)',
        background: 'none', border: 'none', padding: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function EmailCell({ email, status, onOpenEmail, onRetry, retrying, exhausted }: {
  email: string | null;
  status: string | null;
  onOpenEmail: () => void;
  /** Re-runs Apollo for this lead, in place, without opening the modal. */
  onRetry: () => void;
  retrying: boolean;
  /** A lookup has already run and come back empty — pressing again is futile. */
  exhausted: boolean;
}) {
  // An address is usable if it came from a trusted source, not just Apollo's
  // 'verified'. Show WHERE it came from — "from Gmail" tells Shawn he has
  // already corresponded with them, which is more useful than a generic tick.
  const SOURCE_LABEL: Record<string, string> = {
    verified: 'Verified',
    manual: 'Entered by hand',
    gmail: 'From Gmail thread',
    calendar: 'From calendar',
    contact_book: 'Contact book',
  };
  const trusted = !!status && status in SOURCE_LABEL;
  // email_status can carry a long upstream error (e.g. an Apollo failure), which
  // would blow out the column — show a short chip and keep the full text in the
  // tooltip.
  const chip = trusted
    ? SOURCE_LABEL[status as string]
    : status
      ? status.split(':')[0].slice(0, 18)
      : 'unverified';
  const verified = trusted;

  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      {email ? (
        <>
          <span className="text-xs truncate" style={{ color: 'var(--text-primary)', maxWidth: COL.email - 8 }} title={email}>
            {email}
          </span>
          <span
            className="text-[9px] font-bold tracking-wide uppercase w-fit px-1.5 py-0.5 rounded"
            title={status ?? undefined}
            style={{
              background: verified ? 'rgba(22,163,74,0.16)' : 'rgba(148,163,184,0.16)',
              color: verified ? 'var(--status-greenlit)' : 'var(--text-muted)',
            }}
          >
            {chip}
          </span>
        </>
      ) : (
        <>
          {/* Says plainly that we looked and found nothing, rather than leaving
              a blank cell that could equally mean "never ran".
              NOT "1st/2nd pass": enrichment already walks every company-name
              variant on its first attempt (see companyCandidates), so there is
              no second strategy left to hold back — the button below simply runs
              that same full search again. */}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }} title={status ?? undefined}>
            No email found
          </span>
          {/* Once a lookup has run and found nothing, pressing again re-runs the
              IDENTICAL search over the same company-name variants and can only
              fail the same way. Leaving it live invites pointless clicking and
              implies something more might be tried. Disable it and say why —
              the way forward is a different input (fix the company, or paste an
              address in the Email window), not another press. */}
          <button
            onClick={onRetry}
            disabled={retrying || exhausted}
            title={
              exhausted
                ? 'Already searched every company-name variant and found nothing. Correct the company or paste an address in the Email window.'
                : 'Run the full contact lookup again — useful after correcting the company name'
            }
            className="text-[11px] font-semibold w-fit"
            style={{
              color: retrying || exhausted ? 'var(--text-muted)' : 'var(--accent)',
              background: 'none', border: 'none', padding: 0,
              cursor: retrying ? 'wait' : exhausted ? 'not-allowed' : 'pointer',
              textDecoration: exhausted ? 'none' : 'underline',
            }}
          >
            {retrying ? 'Looking up…' : exhausted ? 'Searched — nothing found' : 'Look up again'}
          </button>
        </>
      )}
      {/* Always clickable: the compose modal lets you paste an address by hand
          when Apollo found none. */}
      <CellAction label="Email →" onClick={onOpenEmail} />
    </div>
  );
}

function LinkedInCell({ url, hasNote, onOpenLinkedIn }: {
  url: string | null; hasNote: boolean; onOpenLinkedIn: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs hover:underline truncate"
          style={{ color: 'var(--accent)', maxWidth: COL.linkedin - 8 }}
        >
          View profile ↗
        </a>
      ) : (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>none</span>
      )}
      <CellAction
        label="LinkedIn →"
        onClick={onOpenLinkedIn}
        title={url ? 'Review the note and queue the invite' : 'No LinkedIn URL — invite cannot be queued'}
      />
      {!hasNote && url && (
        <span className="text-[9px]" style={{ color: 'var(--status-deal)' }}>no note drafted</span>
      )}
    </div>
  );
}

const STATUS_STYLES: Record<string, { label: string; bg: string; color: string }> = {
  new:       { label: 'NEW',       bg: 'rgba(148,163,184,0.16)', color: 'var(--text-muted)' },
  enriching: { label: 'ENRICHING', bg: 'rgba(96,165,250,0.16)',  color: '#60A5FA' },
  ready:     { label: 'READY',     bg: 'rgba(22,163,74,0.16)',   color: 'var(--status-greenlit)' },
  queued:    { label: 'QUEUED',    bg: 'rgba(217,119,6,0.16)',   color: 'var(--status-deal)' },
  sent:      { label: 'SENT',      bg: 'rgba(22,163,74,0.16)',   color: 'var(--status-greenlit)' },
  skipped:   { label: 'SKIPPED',   bg: 'rgba(148,163,184,0.16)', color: 'var(--text-muted)' },
  failed:    { label: 'FAILED',    bg: 'rgba(220,38,38,0.16)',   color: 'var(--status-pass)' },
};

function StatusPill({ status }: { status: string | null }) {
  const key = status ?? 'new';
  const s = STATUS_STYLES[key] ?? { label: key.toUpperCase(), bg: 'rgba(148,163,184,0.16)', color: 'var(--text-muted)' };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

// Human-readable label per connect_queue.status (PRD §3). 'pending'/'picked'
// are the two states before Bubba's poller has resolved a LinkedIn invite —
// both read as "queued for Bubba" per the UI spec.
const QUEUE_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:           { label: 'queued for Bubba',  color: 'var(--status-deal)' },
  picked:            { label: 'queued for Bubba',  color: 'var(--status-deal)' },
  pending_invite:    { label: 'invite pending',    color: 'var(--status-deal)' },
  sent:              { label: 'sent',              color: 'var(--status-greenlit)' },
  already_connected: { label: 'already connected', color: 'var(--status-greenlit)' },
  failed:            { label: 'failed',            color: 'var(--status-pass)' },
  skipped:           { label: 'skipped',            color: 'var(--text-muted)' },
};

function ConnectResultLine({ channel, result }: { channel: 'email' | 'linkedin'; result: ChannelResult }) {
  const meta = QUEUE_STATUS_LABEL[result.status] ?? { label: result.status, color: 'var(--text-muted)' };
  const isFailure = result.status === 'failed';
  return (
    <div className="text-[10px] leading-tight" style={{ color: meta.color }}>
      <span className="font-semibold">{channel === 'email' ? 'Email' : 'LinkedIn'}:</span> {meta.label}
      {/* Exact server error string on failure — never a generic message */}
      {isFailure && result.detail && (
        <div style={{ color: 'var(--status-pass)', fontWeight: 400, marginTop: 1 }}>{result.detail}</div>
      )}
    </div>
  );
}

function TierCountPill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold"
      style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
    >
      <span style={{ color, fontFamily: "'JetBrains Mono', monospace" }}>{count}</span> {label}
    </span>
  );
}

/**
 * Dismiss control on a lead row.
 *
 * Reads as a real (if quiet) button rather than a text link: it is a
 * destructive-ish action sitting next to a status pill, and as plain grey text
 * it was easy to miss and easy to hit by accident. Muted at rest so it never
 * competes with Email / LinkedIn, and turns red on hover/focus so its intent is
 * unmistakable at the moment of clicking.
 *
 * Hover/focus is state rather than CSS because these rows are styled inline —
 * there is no stylesheet class to hang :hover on.
 */
function DismissButton({ onClick }: { onClick: () => void }) {
  const [hot, setHot] = useState(false);
  return (
    <button
      onClick={onClick}
      title="Remove this lead from the pending list"
      aria-label="Dismiss lead"
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      onFocus={() => setHot(true)}
      onBlur={() => setHot(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        marginTop: 6,
        padding: '3px 9px',
        borderRadius: 5,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        fontFamily: 'inherit',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'color 120ms ease, border-color 120ms ease, background 120ms ease',
        border: `1px solid ${hot ? 'var(--status-pass)' : 'var(--border-subtle)'}`,
        background: hot ? 'rgba(220,38,38,0.10)' : 'transparent',
        color: hot ? 'var(--status-pass)' : 'var(--text-muted)',
      }}
    >
      <span aria-hidden style={{ fontSize: 11, lineHeight: 1 }}>×</span>
      Dismiss
    </button>
  );
}

// ─── Tier 1/2 lead row ────────────────────────────────────────────────────

function LeadRow({
  lead,
  selected,
  onToggleSelect,
  onOpenEmail,
  onOpenLinkedIn,
  onDismiss,
  onRetry,
  retrying,
  exhausted,
  connectResult,
  showDate,
}: {
  lead: ConnectionLead;
  selected: boolean;
  onToggleSelect: () => void;
  /** Opens the email compose modal for this lead. */
  onOpenEmail: () => void;
  /** Opens the LinkedIn invite modal for this lead. */
  onOpenLinkedIn: () => void;
  /** Clears the lead out of the pending stack (status -> 'skipped'). */
  onDismiss: () => void;
  /** Re-runs Apollo enrichment for this lead from the row. */
  onRetry: () => void;
  retrying: boolean;
  exhausted: boolean;
  connectResult: Partial<Record<'email' | 'linkedin', ChannelResult>> | undefined;
  /** When true (All Pending mode), shows the lead_date so Shawn knows which day each row was pulled. */
  showDate?: boolean;
}) {
  const url = articleUrl(lead);
  const headline = articleHeadline(lead);

  return (
    <div className="border-b last:border-0" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-start gap-3 py-3">
        {/* Row select checkbox */}
        <div className="shrink-0 pt-0.5" style={{ width: COL.checkbox }}>
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            style={{ accentColor: 'var(--accent)', cursor: 'pointer', width: 14, height: 14 }}
          />
        </div>

        {/* Name — new title + company beneath; date badge in All Pending mode */}
        <div className="shrink-0" style={{ width: COL.name }}>
          <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
            {lead.person_name}
          </p>
          {(lead.person_title || lead.company) && (
            <p className="text-[11px] mt-0.5 leading-snug" style={{ color: 'var(--text-muted)' }}>
              {[lead.person_title, lead.company].filter(Boolean).join(' at ')}
            </p>
          )}
          {/* Show the pull date when viewing the rolling uncleared stack so Shawn
              can see at a glance which leads are fresh vs. carried over from prior days. */}
          {showDate && (
            <p
              className="text-[9px] mt-0.5 font-mono"
              style={{ color: 'var(--text-muted)', opacity: 0.7 }}
            >
              {lead.lead_date}
            </p>
          )}
        </div>

        {/* Reason for connection — one line, links to source article */}
        <div className="flex-1 min-w-0 pt-0.5">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs hover:underline"
              style={{ color: 'var(--text-secondary)' }}
            >
              {lead.reason ?? headline ?? '—'}
            </a>
          ) : (
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{lead.reason ?? '—'}</span>
          )}
        </div>

        {/* Dedup chip */}
        <div className="shrink-0" style={{ width: COL.dedup }}>
          <DedupChip status={lead.dedup_status} evidence={lead.dedup_evidence} />
        </div>

        {/* Email */}
        {/* Email — address + the action that composes to it */}
        <div className="shrink-0" style={{ width: COL.email }}>
          <EmailCell
            email={lead.email}
            status={lead.email_status}
            onOpenEmail={onOpenEmail}
            onRetry={onRetry}
            retrying={retrying}
            exhausted={exhausted}
          />
        </div>

        {/* LinkedIn — profile + the action that reviews/queues the invite */}
        <div className="shrink-0" style={{ width: COL.linkedin }}>
          <LinkedInCell
            url={lead.linkedin_url}
            hasNote={!!lead.draft_li_note?.trim()}
            onOpenLinkedIn={onOpenLinkedIn}
          />
        </div>

        {/* Status — per-channel connect results (this session) take priority
            over the coarse lead.status pill, since connect_queue tracks
            email/linkedin outcomes independently but connection_leads.status
            is a single field. */}
        <div className="shrink-0" style={{ width: COL.status }}>
          {connectResult ? (
            <div className="space-y-1">
              {connectResult.email && <ConnectResultLine channel="email" result={connectResult.email} />}
              {connectResult.linkedin && <ConnectResultLine channel="linkedin" result={connectResult.linkedin} />}
            </div>
          ) : (
            <StatusPill status={lead.status} />
          )}
          {/* Not every lead is worth chasing (and some are uncontactable).
              Dismissing sets status='skipped' so it leaves the pending stack
              instead of sitting there forever. */}
          <DismissButton onClick={onDismiss} />
        </div>
      </div>

    </div>
  );
}

// ─── Tier 3 strip row ─────────────────────────────────────────────────────
// Deliberately renders ONLY name, tier reason, and a source link — no
// enrichment fields are fetched or displayed for Tier 3 until promoted
// (Apollo cost control, per PRD §2.4 / acceptance criteria §8).

function Tier3Row({
  lead,
  onPromote,
  promoting,
  error,
}: {
  lead: ConnectionLead;
  onPromote: () => void;
  promoting: boolean;
  error: string | null;
}) {
  const url = articleUrl(lead);
  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="shrink-0" style={{ width: COL.name }}>
        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{lead.person_name}</p>
      </div>
      <div className="flex-1 min-w-0 text-xs" style={{ color: 'var(--text-muted)' }}>
        {lead.tier_reason ?? lead.reason ?? '—'}
      </div>
      <div className="shrink-0">
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline" style={{ color: 'var(--text-muted)' }}>
            Source ↗
          </a>
        ) : (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
        )}
      </div>
      <div className="shrink-0 text-right">
        <button
          onClick={onPromote}
          disabled={promoting}
          className="text-[11px] font-semibold px-2.5 py-1 rounded"
          style={{
            border: '1px solid var(--border-subtle)',
            color: 'var(--accent)',
            background: 'transparent',
            cursor: promoting ? 'wait' : 'pointer',
            opacity: promoting ? 0.6 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {promoting ? 'Adding…' : 'Add to connect list'}
        </button>
        {error && (
          <p className="text-[10px] mt-1" style={{ color: 'var(--status-pass)', maxWidth: 220 }}>{error}</p>
        )}
      </div>
    </div>
  );
}

// ─── Confirm-connect dialog ───────────────────────────────────────────────
// Lists exactly what will fire per selected row before the request goes out.
// Eligibility preview mirrors the backend guard in PRD §4 (email requires
// email_status==='verified'; linkedin requires linkedin_url) so the user
// isn't surprised by a silent no-op — the backend still enforces the same
// guard server-side, this is a preview only.

function ConnectConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  leads,
  channelEmail,
  channelLinkedin,
  connecting,
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  leads: ConnectionLead[];
  channelEmail: boolean;
  channelLinkedin: boolean;
  connecting: boolean;
  error: string | null;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm connect">
      <div className="space-y-3">
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          This will fire the following for {leads.length} lead{leads.length !== 1 ? 's' : ''}:
        </p>

        <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
          {leads.map((lead) => {
            const emailOk = channelEmail && lead.email_status === 'verified' && !!lead.email;
            const liOk = channelLinkedin && !!lead.linkedin_url;
            return (
              <div key={lead.id} className="rounded border p-2" style={{ borderColor: 'var(--border-subtle)' }}>
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{lead.person_name}</p>
                {channelEmail && (
                  <p className="text-[11px] mt-0.5" style={{ color: emailOk ? 'var(--status-greenlit)' : 'var(--text-muted)' }}>
                    {emailOk ? `Email → ${lead.email}` : 'Email → not eligible (no verified email)'}
                  </p>
                )}
                {channelLinkedin && (
                  <p className="text-[11px] mt-0.5" style={{ color: liOk ? 'var(--status-greenlit)' : 'var(--text-muted)' }}>
                    {liOk ? 'LinkedIn → invite queued for Bubba' : 'LinkedIn → not eligible (no LinkedIn URL)'}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {error && <p className="text-xs" style={{ color: 'var(--status-pass)' }}>{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} disabled={connecting} style={{ ...secondaryButtonStyle, opacity: connecting ? 0.6 : 1 }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={connecting} style={{ ...primaryButtonStyle, opacity: connecting ? 0.6 : 1 }}>
            {connecting ? 'Connecting…' : 'Confirm & Connect'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main component ───────────────────────────────────────────────────────

export default function DailyConnections() {
  // viewMode — 'pending' (default) shows the rolling 7-day uncleared stack so Shawn
  // sees everything not yet sent without having to flip the date picker manually.
  // 'date' falls back to the original single-day view for drilling into a specific day.
  const [viewMode, setViewMode] = useState<'pending' | 'date'>('pending');

  // Date selector — only active in 'date' mode. Defaults to today; Build/Refresh
  // always builds "today" per the pipeline (lead_date bucket keys off days=1),
  // so a successful build snaps this back to today when already in date mode.
  const [date, setDate] = useState<string>(todayLocalISO());

  // SWR key changes automatically whenever viewMode or date changes, triggering
  // a fresh fetch from the correct endpoint branch in /api/connections route.ts.
  const apiUrl = viewMode === 'pending'
    ? '/api/connections?mode=pending'
    : `/api/connections?date=${date}`;
  const { data, error, isLoading, mutate } = useSWR<ConnectionsListResponse>(apiUrl, fetcher, {
    refreshInterval: 60_000, // picks up Bubba's LinkedIn queue resolutions without manual polling
  });

  const leads = useMemo(() => data?.data ?? [], [data]);

  const tier1And2 = useMemo(
    () =>
      leads
        .filter((l) => l.tier === 1 || l.tier === 2)
        .slice()
        .sort((a, b) => (a.tier !== b.tier ? a.tier - b.tier : (b.created_at ?? 0) - (a.created_at ?? 0))),
    [leads]
  );
  const tier3 = useMemo(
    () => leads.filter((l) => l.tier === 3).slice().sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0)),
    [leads]
  );

  const counts = useMemo(
    () => ({
      tier1: leads.filter((l) => l.tier === 1).length,
      tier2: leads.filter((l) => l.tier === 2).length,
      tier3: leads.filter((l) => l.tier === 3).length,
    }),
    [leads]
  );

  // ── Row selection ────────────────────────────────────────────────────
  // Default: NEW (clear/unchecked dedup) rows start CHECKED so a one-click
  // select-all+CONNECT covers the common case; KNOWN rows start UNCHECKED
  // (PRD §5: "Known leads render selectable but default-unchecked") since
  // those need Shawn's judgment call on the reconnect variant. Seeded once
  // per lead id so a later refetch (build/enrich/connect) doesn't stomp on
  // the user's manual toggles.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const seededIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (leads.length === 0) return;
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const lead of leads) {
        if (lead.tier === 3) continue; // Tier 3 rows aren't selectable
        if (seededIds.current.has(lead.id)) continue;
        seededIds.current.add(lead.id);
        const known = lead.dedup_status === 'known_gmail' || lead.dedup_status === 'known_calendar';
        if (!known) {
          next.add(lead.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [leads]);

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const allChecked = tier1And2.length > 0 && tier1And2.every((l) => prev.has(l.id));
      return allChecked ? new Set() : new Set(tier1And2.map((l) => l.id));
    });
  }

  const allSelected = tier1And2.length > 0 && tier1And2.every((l) => selectedIds.has(l.id));

  // ── Compose-modal state ──────────────────────────────────────────────
  // The old inline "Draft ▾" expander was replaced by EmailComposeModal. Only
  // one row composes at a time, so a single id is all the state needed.
  const [composeLeadId, setComposeLeadId] = useState<string | null>(null);
  const composeLead = tier1And2.find((l) => l.id === composeLeadId) ?? null;

  // LinkedIn invite modal — separate id so opening one never closes the other
  // by accident, and so each column owns its own state.
  const [linkedInLeadId, setLinkedInLeadId] = useState<string | null>(null);
  const linkedInLead = tier1And2.find((l) => l.id === linkedInLeadId) ?? null;

  /**
   * Persist edited draft fields. Same PATCH contract the inline panel used
   * (PRD §4 — "body is a partial lead"), just several fields at once instead of
   * one-per-blur. Used for both "Save draft" and the write-back after a send.
   */
  async function saveDraftFields(
    leadId: string,
    // Widened past DraftField: the compose windows also persist manually-entered
    // contact details (email, linkedin_url), which the PATCH route validates.
    fields: Record<string, string | null>
  ): Promise<void> {
    await postJson(`/api/connections/${leadId}`, fields, 'PATCH');
    await mutate(); // pull the persisted row back so server-side normalization shows
  }

  /**
   * Drop a lead out of the pending stack. Uses status='skipped', which the
   * pending query already excludes, so this needs no schema change and the row
   * stays retrievable via By Date rather than being destroyed.
   */
  // Which rows have a contact lookup in flight (drives the button's busy state).
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  // Rows where a lookup completed and still produced no address. Pressing again
  // would repeat the same search, so the button is disabled for these.
  const [exhaustedIds, setExhaustedIds] = useState<Set<string>>(new Set());

  /**
   * Re-run enrichment for one lead straight from the row. Same endpoint the
   * compose windows use; having it on the row means a miss can be retried
   * without opening anything.
   */
  async function retryEnrich(leadId: string) {
    setRetryingIds((prev) => new Set(prev).add(leadId));
    setConnectError(null);
    try {
      const updated = await postJson(`/api/connections/${leadId}/enrich`);
      // The route returns the refreshed lead — if it still has no address, the
      // search is spent and the button should stop inviting clicks.
      if (!updated?.email) {
        setExhaustedIds((prev) => new Set(prev).add(leadId));
      }
      await mutate();
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setRetryingIds((prev) => { const n = new Set(prev); n.delete(leadId); return n; });
    }
  }

  async function dismissLead(leadId: string, name: string) {
    if (!window.confirm(`Dismiss ${name}? It leaves the pending list but is not deleted.`)) return;
    try {
      await postJson(`/api/connections/${leadId}`, { status: 'skipped' }, 'PATCH');
      await mutate();
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Could not dismiss lead');
    }
  }

  // ── Build / Refresh ──────────────────────────────────────────────────
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [buildSummary, setBuildSummary] = useState<string | null>(null);

  async function handleBuild() {
    setBuilding(true);
    setBuildError(null);
    setBuildSummary(null);
    try {
      const json: BuildResponse = await postJson('/api/connections/build', { days: 1 });
      const built = json.built ?? 0;
      const skipped = json.skipped ?? 0;
      setBuildSummary(`Built ${built} new lead${built !== 1 ? 's' : ''}, skipped ${skipped} already-built.`);
      const wasAlreadyToday = date === todayLocalISO();
      setDate(todayLocalISO());
      // If we were already viewing today, the SWR key won't change on its
      // own when setDate is a no-op re-set, so force a refetch explicitly.
      // Otherwise the date change itself triggers SWR to fetch the new key.
      if (wasAlreadyToday) await mutate();
    } catch (err) {
      setBuildError(err instanceof Error ? err.message : String(err));
    } finally {
      setBuilding(false);
    }
  }

  // ── Tier 3 promotion ─────────────────────────────────────────────────
  const [promoting, setPromoting] = useState<Set<string>>(new Set());
  const [promoteErrors, setPromoteErrors] = useState<Map<string, string>>(new Map());

  async function handlePromote(id: string) {
    setPromoting((prev) => new Set(prev).add(id));
    setPromoteErrors((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    try {
      // Enrich endpoint doubles as the Tier 3 -> Tier 2 promotion path
      // (PRD §4: "also the 'Add to connect list' promotion path for Tier 3").
      await postJson(`/api/connections/${id}/enrich`);
      await mutate(); // refetch so the now-enriched lead moves into the main table
    } catch (err) {
      setPromoteErrors((prev) => new Map(prev).set(id, err instanceof Error ? err.message : String(err)));
    } finally {
      setPromoting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  // ── Connect flow ─────────────────────────────────────────────────────
  const [channelEmail, setChannelEmail] = useState(true);
  const [channelLinkedin, setChannelLinkedin] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectResults, setConnectResults] = useState<ConnectResultsMap>(new Map());

  const selectedLeads = tier1And2.filter((l) => selectedIds.has(l.id));

  async function handleConnect() {
    const channels: ('email' | 'linkedin')[] = [];
    if (channelEmail) channels.push('email');
    if (channelLinkedin) channels.push('linkedin');
    if (channels.length === 0 || selectedIds.size === 0) return;

    setConnecting(true);
    setConnectError(null);
    try {
      const json = await postJson('/api/connections/connect', {
        lead_ids: Array.from(selectedIds),
        channels,
      });
      // Defensive parsing: the exact wrapper key for /connect's response
      // isn't pinned in PRD §4 beyond "returns per-lead results including
      // exact failures", so accept a bare array or a { results } / { data }
      // wrapper — whichever the parallel backend build lands on.
      const results: ConnectResult[] = Array.isArray(json) ? json : (json.results ?? json.data ?? []);
      setConnectResults((prev) => {
        const next = new Map(prev);
        for (const r of results) {
          const forLead = { ...next.get(r.lead_id) };
          forLead[r.channel] = { status: r.status, detail: r.detail ?? null };
          next.set(r.lead_id, forLead);
        }
        return next;
      });
      setConfirmOpen(false);
      setSelectedIds(new Set());
      await mutate(); // pick up authoritative lead.status once the backend has written it
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : String(err));
    } finally {
      setConnecting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <section className="space-y-3">
      {/* Header row — date selector, Build/Refresh, tier counts, connect controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Mode toggle: All Pending (rolling 7-day uncleared stack) vs By Date (single-day picker).
              Defaults to All Pending so Shawn never has to hunt for backlogged leads. */}
          <div
            className="flex items-center gap-0.5 rounded-md border p-0.5"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <button
              onClick={() => setViewMode('pending')}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                background: viewMode === 'pending' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'pending' ? '#fff' : 'var(--text-secondary)',
              }}
            >
              All Pending
            </button>
            <button
              onClick={() => setViewMode('date')}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                background: viewMode === 'date' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'date' ? '#fff' : 'var(--text-secondary)',
              }}
            >
              By Date
            </button>
          </div>

          {/* Date picker — only visible in By Date mode */}
          {viewMode === 'date' && (
            <label className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Date
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ ...inputStyle, width: 'auto', padding: '5px 9px', fontSize: 12 }}
              />
            </label>
          )}

          <button onClick={handleBuild} disabled={building} style={{ ...primaryButtonStyle, opacity: building ? 0.6 : 1 }}>
            {building ? 'Building…' : 'Build / Refresh'}
          </button>

          <div className="flex items-center gap-2">
            <TierCountPill label="Tier 1" count={counts.tier1} color="var(--status-greenlit)" />
            <TierCountPill label="Tier 2" count={counts.tier2} color="#60A5FA" />
            <TierCountPill label="Tier 3" count={counts.tier3} color="var(--text-muted)" />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={channelEmail}
              onChange={(e) => setChannelEmail(e.target.checked)}
              style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            Email
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            <input
              type="checkbox"
              checked={channelLinkedin}
              onChange={(e) => setChannelLinkedin(e.target.checked)}
              style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            LinkedIn
          </label>
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={selectedIds.size === 0 || (!channelEmail && !channelLinkedin)}
            style={{
              ...primaryButtonStyle,
              opacity: selectedIds.size === 0 || (!channelEmail && !channelLinkedin) ? 0.5 : 1,
              cursor: selectedIds.size === 0 || (!channelEmail && !channelLinkedin) ? 'not-allowed' : 'pointer',
            }}
          >
            CONNECT SELECTED{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </button>
        </div>
      </div>

      {buildSummary && <p className="text-xs" style={{ color: 'var(--status-greenlit)' }}>{buildSummary}</p>}
      {buildError && <p className="text-xs" style={{ color: 'var(--status-pass)' }}>{buildError}</p>}
      {connectError && <p className="text-xs" style={{ color: 'var(--status-pass)' }}>{connectError}</p>}

      {/* Tier 1/2 table */}
      <div
        className="rounded-lg border border-[var(--border-subtle)] px-4 overflow-x-auto"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div style={{ minWidth: 1080 }}>
          {error && (
            <p className="py-6 text-sm text-center" style={{ color: 'var(--status-pass)' }}>
              {error.message ?? 'Failed to load connections'}
            </p>
          )}

          {isLoading && (
            <div className="space-y-0">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 py-3 border-b border-[var(--border-subtle)] last:border-0 animate-pulse">
                  <div className="h-4 w-40 rounded shrink-0" style={{ background: 'var(--bg-elevated)' }} />
                  <div className="h-4 rounded flex-1" style={{ background: 'var(--bg-elevated)', maxWidth: '60%' }} />
                  <div className="h-4 w-24 rounded shrink-0" style={{ background: 'var(--bg-elevated)' }} />
                </div>
              ))}
            </div>
          )}

          {!isLoading && !error && (
            <>
              {/* Column header row */}
              <div
                className="flex items-center gap-3 py-2 border-b text-[10px] font-semibold uppercase tracking-wider"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
              >
                <div className="shrink-0" style={{ width: COL.checkbox }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    disabled={tier1And2.length === 0}
                    style={{ accentColor: 'var(--accent)', cursor: tier1And2.length ? 'pointer' : 'default', width: 14, height: 14 }}
                  />
                </div>
                <div className="shrink-0" style={{ width: COL.name }}>Name</div>
                <div className="flex-1 min-w-0">Reason for connection</div>
                <div className="shrink-0" style={{ width: COL.dedup }}>Dedup</div>
                <div className="shrink-0" style={{ width: COL.email }}>Email</div>
                <div className="shrink-0" style={{ width: COL.linkedin }}>LinkedIn</div>
                <div className="shrink-0" style={{ width: COL.status }}>Status</div>
              </div>

              {tier1And2.length === 0 ? (
                <p className="py-8 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                  {viewMode === 'pending'
                    ? 'No uncleared Tier 1/2 leads from the past 7 days. Click Build / Refresh to pull today’s trades.'
                    : `No Tier 1/2 leads for ${date} yet. Click Build / Refresh to pull today’s trades.`}
                </p>
              ) : (
                tier1And2.map((lead) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    selected={selectedIds.has(lead.id)}
                    onToggleSelect={() => toggleRow(lead.id)}
                    onOpenEmail={() => setComposeLeadId(lead.id)}
                    onOpenLinkedIn={() => setLinkedInLeadId(lead.id)}
                    onDismiss={() => dismissLead(lead.id, lead.person_name)}
                    onRetry={() => retryEnrich(lead.id)}
                    retrying={retryingIds.has(lead.id)}
                    exhausted={exhaustedIds.has(lead.id)}
                    connectResult={connectResults.get(lead.id)}
                    showDate={viewMode === 'pending'}
                  />
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* Tier 3 strip — note-only, no enrichment data until promoted */}
      {!isLoading && !error && tier3.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Tier 3 — note only ({tier3.length})
          </h3>
          <div
            className="rounded-lg border border-[var(--border-subtle)] px-4 overflow-x-auto"
            style={{ background: 'var(--bg-surface)' }}
          >
            <div style={{ minWidth: 700 }}>
              {tier3.map((lead) => (
                <Tier3Row
                  key={lead.id}
                  lead={lead}
                  onPromote={() => handlePromote(lead.id)}
                  promoting={promoting.has(lead.id)}
                  error={promoteErrors.get(lead.id) ?? null}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <ConnectConfirmDialog
        isOpen={confirmOpen}
        onClose={() => { if (!connecting) setConfirmOpen(false); }}
        onConfirm={handleConnect}
        leads={selectedLeads}
        channelEmail={channelEmail}
        channelLinkedin={channelLinkedin}
        connecting={connecting}
        error={connectError}
      />

      {/* Email compose — replaces the old inline draft panel. Only the email
          channel goes out from here; LinkedIn stays on the Connect Selected
          queue path and is untouched. */}
      {composeLead && (
        <EmailComposeModal
          lead={{
            id: composeLead.id,
            person_name: composeLead.person_name,
            person_title: composeLead.person_title,
            company_name: composeLead.company,
            email: composeLead.email,
            email_status: composeLead.email_status,
            reason: composeLead.reason,
            draft_email_subject: composeLead.draft_email_subject,
            draft_email_body: composeLead.draft_email_body,
          }}
          onClose={() => setComposeLeadId(null)}
          onSaveDraft={(fields) => saveDraftFields(composeLead.id, fields)}
          onSent={() => { void mutate(); }}
        />
      )}

      {/* LinkedIn invite — reviews the drafted note and queues it through the
          existing /connect route for the Bubba poller. No direct LinkedIn call. */}
      {linkedInLead && (
        <LinkedInConnectModal
          lead={{
            id: linkedInLead.id,
            person_name: linkedInLead.person_name,
            person_title: linkedInLead.person_title,
            company_name: linkedInLead.company,
            linkedin_url: linkedInLead.linkedin_url,
            reason: linkedInLead.reason,
            draft_li_note: linkedInLead.draft_li_note,
            status: linkedInLead.status,
          }}
          onClose={() => setLinkedInLeadId(null)}
          onSaveDraft={(fields) => saveDraftFields(linkedInLead.id, fields)}
          onQueued={() => { void mutate(); }}
        />
      )}
    </section>
  );
}
