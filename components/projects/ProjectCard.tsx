'use client';
// ProjectCard — displays a single project from the IP development pipeline.
// Converted to a client component to support the onEdit callback (pencil button)
// and useRouter for programmatic navigation (replaces the <Link> wrapper).
// Clicking anywhere on the card navigates; the pencil button calls onEdit without navigating.

import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

export interface ProjectCardProps {
  id: string;
  title: string;
  sheet_source: string | null;
  sheet_status: string | null;
  sheet_point_person: string | null;
  sheet_target_nets: string | null;
  email_thread_count: number;
  last_email_date: string | null;
  first_email_date: string | null;
  extracted_date: string | null;
  date_confidence: string | null;
  // sizzle_count: number of produced sizzle reels for this project.
  // When > 0 the card renders a prominent crimson SIZZLE badge — these are expensive assets.
  sizzle_count: number;
  // onEdit: optional callback invoked when the pencil button is clicked.
  // The parent (ProjectsClient) manages edit state and opens the modal.
  onEdit?: (e: React.MouseEvent) => void;
}

// Classify email recency into three staleness buckets.
// active  = last email < 90 days ago
// quiet   = 90–365 days ago
// stale   = > 365 days or no email data at all
function getStaleness(lastEmailDate: string | null): 'active' | 'quiet' | 'stale' {
  if (!lastEmailDate) return 'stale';
  const days = (Date.now() - new Date(lastEmailDate).getTime()) / (1000 * 60 * 60 * 24);
  if (days < 90) return 'active';
  if (days < 365) return 'quiet';
  return 'stale';
}

// Human-readable date — e.g. "Nov 2, 2024". Returns "Unknown" for null/invalid.
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Map staleness bucket to a CSS color value from the design system
const stalenessColor: Record<'active' | 'quiet' | 'stale', string> = {
  active: 'var(--status-greenlit)',
  quiet:  'var(--status-inreview)',
  stale:  'var(--status-pass)',
};

// Map sheet_source string to a Badge variant.
// Priorities/full-dev are treated as active (greenlit), brainstorm as muted.
function sheetSourceVariant(source: string | null): 'greenlit' | 'inreview' | 'muted' | 'unknown' {
  if (!source) return 'unknown';
  const s = source.toLowerCase();
  if (s === 'priorities' || s === 'full-dev' || s === 'bc-mye') return 'greenlit';
  if (s === 'backburner') return 'inreview';
  if (s === 'brainstorm') return 'muted';
  if (s === 'archived' || s === 'passes') return 'unknown';
  return 'muted';
}

export default function ProjectCard({
  id,
  title,
  sheet_source,
  sheet_status,
  sheet_point_person,
  sheet_target_nets,
  email_thread_count,
  last_email_date,
  extracted_date,
  date_confidence,
  sizzle_count,
  onEdit,
}: ProjectCardProps) {
  const router = useRouter();
  const staleness = getStaleness(last_email_date);
  const staleDotColor = stalenessColor[staleness];

  // Show last email date if we have it; fall back to extracted_date with a confidence note
  const displayDate = last_email_date
    ? formatDate(last_email_date)
    : extracted_date
    ? `${formatDate(extracted_date)}${date_confidence === 'year-only' ? ' (year only)' : ''}`
    : 'Unknown';

  // Target networks — show first 3, comma-separated, trimmed
  const networks = sheet_target_nets
    ? sheet_target_nets.split(',').map((n) => n.trim()).filter(Boolean).slice(0, 3).join(', ')
    : null;

  return (
    // Outer div replaces the <Link> wrapper. Clicking navigates programmatically
    // so the pencil button (which calls e.stopPropagation) can sit inside without navigating.
    <div
      onClick={() => router.push(`/projects/${id}`)}
      style={{ cursor: 'pointer', display: 'block', textDecoration: 'none' }}
    >
      <Card hoverable className="h-full flex flex-col gap-2.5">

        {/* ── Row 0: Sizzle badge — only rendered when the project has a produced reel.
              Positioned above the title row so it's the first thing the eye lands on.
              Solid crimson fill (MYE accent color) makes it impossible to miss. ── */}
        {sizzle_count > 0 && (
          <div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: 4,
                background: 'var(--accent)',      // MYE crimson #CC1212
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                lineHeight: 1.4,
              }}
            >
              ▶ SIZZLE
              {/* Show count if there are multiple reels for this project */}
              {sizzle_count > 1 && (
                <span style={{ opacity: 0.8, fontWeight: 500 }}>×{sizzle_count}</span>
              )}
            </span>
          </div>
        )}

        {/* ── Row 1: Title + staleness dot + pencil edit button ── */}
        <div className="flex items-start justify-between gap-2">
          <h3
            className="text-sm font-bold leading-tight line-clamp-2 flex-1"
            style={{ color: 'var(--text-primary)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: '15px' }}
          >
            {title}
          </h3>
          {/* Colored dot indicating email staleness */}
          <span
            title={staleness === 'active' ? 'Active (< 90 days)' : staleness === 'quiet' ? 'Quiet (90–365 days)' : 'Stale (> 1 year)'}
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: staleDotColor,
              flexShrink: 0,
              marginTop: 4,
            }}
          />
          {/* Pencil edit button — always visible; stopPropagation prevents card navigation */}
          <button
            onClick={(e) => { e.stopPropagation(); onEdit?.(e); }}
            style={{ padding: '4px 6px', borderRadius: 4, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            title="Edit"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>

        {/* ── Row 2: Sheet source badge + status ── */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {sheet_source && (
            <Badge variant={sheetSourceVariant(sheet_source)}>
              {sheet_source.toUpperCase()}
            </Badge>
          )}
          {sheet_status && (
            <Badge variant="muted">
              {sheet_status}
            </Badge>
          )}
        </div>

        {/* ── Row 3: Point person ── */}
        {sheet_point_person && (
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Point:</span>{' '}
            {sheet_point_person}
          </p>
        )}

        {/* ── Row 4: Target networks ── */}
        {networks && (
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Nets:</span>{' '}
            {networks}
          </p>
        )}

        {/* ── Spacer pushes footer to bottom ── */}
        <div className="flex-1" />

        {/* ── Footer: email thread count + last activity ── */}
        <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {/* Envelope icon (unicode) + thread count */}
          <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <span style={{ fontSize: 12 }}>✉</span>
            {email_thread_count === 0
              ? <span style={{ color: 'var(--status-pass)' }}>No email activity</span>
              : `${email_thread_count} thread${email_thread_count !== 1 ? 's' : ''}`
            }
          </span>
          {/* Last activity date */}
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {displayDate}
          </span>
        </div>

      </Card>
    </div>
  );
}
