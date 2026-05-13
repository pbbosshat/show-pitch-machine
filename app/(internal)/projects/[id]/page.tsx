// Project detail — server component fetches project header + full email thread list.
// Two sections: Pitch Status Panel (metadata) + Email Activity Timeline (table).
// Email threads are fetched from /api/projects/[id]/emails for full participant data.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import EmailTimeline from '@/components/projects/EmailTimeline';
import SizzleCard, { type SizzleCardData } from '@/components/shows/SizzleCard';
import { query } from '@/lib/db';
import { getBaseUrl } from '@/lib/baseUrl';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ProjectDetail {
  id: string;
  title: string;
  logline: string | null;
  format: string | null;
  genre: string | null;
  notes: string | null;
  status: string | null;
  sheet_source: string | null;
  sheet_status: string | null;
  sheet_point_person: string | null;
  sheet_target_nets: string | null;
  sheet_pitched_to: string | null;
  sheet_passed: string | null;
  sheet_attachments: string | null;
  sheet_next_steps: string | null;
  sheet_raw_status: string | null;
  extracted_date: string | null;
  date_confidence: string | null;
  brainstorm_rank: number | null;
  email_thread_count: number;
  last_email_date: string | null;
  first_email_date: string | null;
}

interface EmailThread {
  id: string;
  thread_id: string;
  subject: string | null;
  participants: string[];
  first_message_date: string | null;
  last_message_date: string | null;
  message_count: number;
  direction: string | null;
  snippet: string | null;
  match_confidence: string | null;
}

interface EmailsResponse {
  project_id: string;
  project_title: string;
  threads: EmailThread[];
  total: number;
  date_range: {
    first: string | null;
    last: string | null;
  };
}

// ── Fetch helpers ──────────────────────────────────────────────────────────────

async function fetchProject(id: string): Promise<ProjectDetail | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/projects/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    // /api/projects/[id] returns the detail object directly (not wrapped in .data)
    const json = await res.json();
    return json ?? null;
  } catch {
    return null;
  }
}

async function fetchEmails(id: string): Promise<EmailsResponse | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/projects/${id}/emails?limit=100`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Async because query() returns a Promise in Postgres mode
async function fetchSizzles(id: string): Promise<SizzleCardData[]> {
  try {
    const rows = await query<SizzleCardData>(
      `SELECT
        sr.id,
        sr.ip_catalog_id,
        ip.title        AS project_title,
        ip.sheet_source,
        sr.vimeo_url,
        sr.vimeo_password,
        sr.platform,
        sr.raw_value,
        sr.notes,
        sr.thumbnail_url,
        MAX(pet.last_message_date) AS last_email_date,
        COUNT(DISTINCT pet.id)     AS email_thread_count
       FROM sizzle_reels sr
       JOIN ip_catalog ip ON ip.id = sr.ip_catalog_id
       LEFT JOIN project_email_threads pet ON pet.ip_catalog_id = sr.ip_catalog_id
       WHERE sr.ip_catalog_id = ?
       GROUP BY sr.id
       ORDER BY CASE WHEN sr.vimeo_url IS NOT NULL AND sr.vimeo_url != '' THEN 0 ELSE 1 END ASC`,
      [id]
    );
    return JSON.parse(JSON.stringify(rows));
  } catch {
    return [];
  }
}

// ── Utility helpers ────────────────────────────────────────────────────────────

// Human-readable date — e.g. "Mar 2023"
function formatMonthYear(dateStr: string | null): string {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// Verbose date for the metadata panel — e.g. "Nov 2, 2024"
function formatFullDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Map sheet_source to a Badge variant for the header
function sheetSourceVariant(source: string | null): 'greenlit' | 'inreview' | 'muted' | 'unknown' {
  if (!source) return 'unknown';
  const s = source.toLowerCase();
  if (s === 'priorities' || s === 'full-dev' || s === 'bc-mye') return 'greenlit';
  if (s === 'backburner') return 'inreview';
  if (s === 'brainstorm') return 'muted';
  return 'unknown';
}

// ── Metadata Row ───────────────────────────────────────────────────────────────
// Small reusable layout for label + value pairs in the two-column metadata grid

function MetaRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt
        className="text-[11px] font-semibold uppercase tracking-wider mb-0.5"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </dt>
      <dd className="text-sm" style={{ color: 'var(--text-primary)' }}>
        {value}
      </dd>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch all three in parallel — fetchSizzles is now async too
  const [project, emailsData, sizzles] = await Promise.all([
    fetchProject(id),
    fetchEmails(id),
    fetchSizzles(id),
  ]);

  if (!project) notFound();

  const threads: EmailThread[] = emailsData?.threads ?? [];
  const dateRange = emailsData?.date_range ?? { first: null, last: null };
  const totalThreads = emailsData?.total ?? 0;

  // Date range label for section header — e.g. "Mar 2023 – Nov 2024"
  const dateRangeLabel =
    dateRange.first && dateRange.last
      ? `${formatMonthYear(dateRange.first)} – ${formatMonthYear(dateRange.last)}`
      : null;

  // Best date estimate for metadata panel
  const bestDate = project.last_email_date ?? project.extracted_date ?? null;
  const bestDateLabel = bestDate
    ? formatFullDate(bestDate) +
      (project.date_confidence === 'extracted' ? ' (extracted)' : '') +
      (project.date_confidence === 'year-only' ? ' (year only)' : '')
    : '—';

  return (
    <div className="p-8 max-w-5xl space-y-8">

      {/* Back link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-sm"
        style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
      >
        ← Development Pipeline
      </Link>

      {/* ── Section 1: Pitch Status Panel ── */}
      <section className="space-y-4">

        {/* Title + badges */}
        <div>
          <div className="flex items-start gap-3 flex-wrap mb-1">
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800,
                color: 'var(--text-primary)',
                lineHeight: 1.1,
              }}
            >
              {project.title}
            </h1>
          </div>

          {/* Source + status badges inline below title */}
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {project.sheet_source && (
              <Badge variant={sheetSourceVariant(project.sheet_source)}>
                {project.sheet_source.toUpperCase()}
              </Badge>
            )}
            {project.sheet_status && (
              <Badge variant="muted">{project.sheet_status}</Badge>
            )}
            {project.format && (
              <Badge variant="unknown">{project.format}</Badge>
            )}
          </div>

          {/* Logline — italic, muted, below badges */}
          {project.logline && (
            <p
              className="mt-3 text-sm italic leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {project.logline}
            </p>
          )}
        </div>

        {/* Two-column metadata grid */}
        <dl
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4"
          style={{
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '1rem',
          }}
        >
          <MetaRow label="Point Person"   value={project.sheet_point_person} />
          <MetaRow label="Attachments / Partners" value={project.sheet_attachments} />
          <MetaRow label="Target Networks" value={project.sheet_target_nets} />
          <MetaRow label="Pitched To"      value={project.sheet_pitched_to} />
          <MetaRow label="Passed"          value={project.sheet_passed} />
          <MetaRow label="Next Steps"      value={project.sheet_next_steps} />
          <MetaRow label="Best Date Estimate" value={bestDateLabel} />
          {project.genre && <MetaRow label="Genre" value={project.genre} />}
          {project.brainstorm_rank != null && (
            <MetaRow label="Brainstorm Rank" value={String(project.brainstorm_rank)} />
          )}
        </dl>

        {/* ── Sizzle Reels — only rendered when sizzles exist for this project ── */}
        {sizzles.length > 0 && (
          <div className="space-y-3 pt-4">
            <div className="flex items-baseline gap-3">
              <h2
                className="text-lg font-bold"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
              >
                Sizzle Reels
              </h2>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {sizzles.length} reel{sizzles.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {sizzles.map((sizzle) => (
                <SizzleCard key={sizzle.id} sizzle={sizzle} />
              ))}
            </div>
          </div>
        )}

      </section>

      {/* ── Section 2: Email Activity Timeline ── */}
      <section className="space-y-3">

        {/* Section header with thread count + date range */}
        <div className="flex items-baseline gap-3">
          <h2
            className="text-lg font-bold"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
          >
            Email Activity
          </h2>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {totalThreads > 0
              ? `${totalThreads} thread${totalThreads !== 1 ? 's' : ''}${dateRangeLabel ? ` · ${dateRangeLabel}` : ''}`
              : 'No threads'}
          </span>
        </div>

        {/* Table component — handles its own empty state */}
        <EmailTimeline threads={threads} projectTitle={project.title} />

        {/* Pagination note if we truncated results (API returns up to 100) */}
        {totalThreads > threads.length && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Showing {threads.length} of {totalThreads} threads
          </p>
        )}

      </section>

    </div>
  );
}
