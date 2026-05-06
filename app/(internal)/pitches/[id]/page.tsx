// Pitch Hub — master detail page for a single pitch/package.
// Server component: async, fetches from GET /api/pitches/[id], renders full pitch story.
// Tab navigation uses URL searchParams (?tab=materials|email|pass) — no client JS needed.
// All three tab panels are defined in this single file.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import SizzlePlayRow from '@/components/shows/SizzlePlayRow';
import type { PitchHub } from '@/types';
import { getBaseUrl } from '@/lib/baseUrl';

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

/**
 * Fetches the fully assembled PitchHub object from the internal API.
 * Returns null on 404 or any network failure — caller handles notFound().
 */
async function fetchPitchHub(id: string): Promise<PitchHub | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/pitches/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data ?? null) as PitchHub | null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a Unix-epoch timestamp (ms or s) as "Jan 15, 2025". Returns "—" when null. */
function fmtDate(ts: number | string | null | undefined): string {
  if (!ts) return '—';
  // API returns ms for numeric timestamps; string dates passed as-is
  const d = typeof ts === 'string' ? new Date(ts) : new Date(Number(ts));
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Maps a pipeline_stage string to a Badge variant.
 * Covers the standard progression and terminal states.
 */
function stageVariant(stage: string): 'greenlit' | 'inreview' | 'pass' | 'deal' | 'muted' {
  if (stage === 'greenlit') return 'greenlit';
  if (stage === 'pass') return 'pass';
  if (stage === 'negotiating') return 'deal';
  if (['sent', 'in-review', 'meeting'].includes(stage)) return 'inreview';
  return 'muted';
}

/**
 * Maps a pitch outcome string to a Badge variant.
 */
function outcomeVariant(outcome: string | null): 'greenlit' | 'pass' | 'inreview' {
  if (!outcome) return 'inreview';
  if (outcome === 'pass') return 'pass';
  if (outcome === 'greenlit') return 'greenlit';
  return 'inreview';
}

/**
 * Maps a talent_tier string to a Badge variant.
 * signed = greenlit (committed), relationship = inreview (in play), target = muted (aspirational)
 */
function talentTierVariant(tier: string | null): 'greenlit' | 'inreview' | 'muted' {
  if (tier === 'signed') return 'greenlit';
  if (tier === 'relationship') return 'inreview';
  return 'muted';
}

/**
 * Maps a grok_signal string to a Badge variant.
 * grok signals are things like "interested", "pass", "requesting-materials", etc.
 */
function grokVariant(signal: string | null): 'greenlit' | 'pass' | 'inreview' | 'muted' {
  if (!signal) return 'muted';
  if (['interested', 'greenlit', 'requesting-materials'].includes(signal)) return 'greenlit';
  if (['pass', 'declined', 'no'].includes(signal)) return 'pass';
  return 'inreview';
}

// ---------------------------------------------------------------------------
// Completeness donut SVG
// ---------------------------------------------------------------------------

/**
 * SVG donut chart showing pitch readiness score (0-100).
 * Color-coded: red < 41, amber 41-70, green 71+.
 * 56×56px outer; 14px bold JetBrains Mono score in center.
 */
function CompletenessDonut({ score }: { score: number }) {
  // Circle math: r=22 gives a nice ring thickness at 56px viewBox
  const r = 22;
  const circumference = 2 * Math.PI * r;
  const filled = (score / 100) * circumference;
  const gap = circumference - filled;

  // Color thresholds
  const ringColor =
    score <= 40
      ? 'var(--status-pass)'
      : score <= 70
        ? 'var(--status-inreview)'
        : 'var(--status-greenlit)';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={56} height={56} viewBox="0 0 56 56">
        {/* Track ring */}
        <circle
          cx={28}
          cy={28}
          r={r}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={6}
        />
        {/* Score arc — starts at 12 o'clock (-90deg rotation) */}
        <circle
          cx={28}
          cy={28}
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={6}
          strokeDasharray={`${filled} ${gap}`}
          strokeLinecap="round"
          transform="rotate(-90 28 28)"
          style={{ transition: 'stroke-dasharray 0.4s ease' }}
        />
        {/* Score number in center */}
        <text
          x={28}
          y={28}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={13}
          fontWeight={700}
          fontFamily="'JetBrains Mono', monospace"
          fill="var(--text-primary)"
        >
          {score}
        </text>
      </svg>
      <span
        className="text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: 'var(--text-muted)' }}
      >
        Readiness
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section label helper (reused across all cards)
// ---------------------------------------------------------------------------
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-[11px] font-bold uppercase tracking-wider mb-3"
      style={{ color: 'var(--text-muted)' }}
    >
      {children}
    </h2>
  );
}

// ---------------------------------------------------------------------------
// Hero Header
// ---------------------------------------------------------------------------

function HeroHeader({ hub }: { hub: PitchHub }) {
  const { ip, buyer, pipeline_stage, completeness, days_in_stage } = hub;

  // Build sub-header meta string: genre · format · source
  const metaParts = [ip.genre, ip.format, ip.sheet_source].filter(Boolean);

  return (
    <div
      className="rounded-xl border border-[var(--border-subtle)] p-6 mb-6"
      style={{ background: 'var(--bg-surface)' }}
    >
      {/* Three-column top row */}
      <div className="flex items-start gap-6">
        {/* Left: Show title + meta */}
        <div className="flex-1 min-w-0">
          <h1
            className="text-[32px] leading-tight font-extrabold tracking-tight truncate"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              color: 'var(--text-primary)',
            }}
          >
            {ip.title || hub.name}
          </h1>
          {metaParts.length > 0 && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {metaParts.map((part, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && (
                    <span style={{ color: 'var(--border-strong)' }}>·</span>
                  )}
                  {/* sheet_source gets a muted badge; genre/format are plain text */}
                  {part === ip.sheet_source && ip.sheet_source ? (
                    <Badge variant="muted">{part}</Badge>
                  ) : (
                    <span
                      className="text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {part}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Center: Buyer block */}
        <div className="text-center shrink-0 px-6 border-x border-[var(--border-subtle)]">
          {buyer.company_name ? (
            <>
              <div
                className="text-base font-bold"
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  color: 'var(--text-primary)',
                }}
              >
                → {buyer.company_name}
              </div>
              {(buyer.contact_name || buyer.contact_title) && (
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {[buyer.contact_name, buyer.contact_title].filter(Boolean).join(' · ')}
                </div>
              )}
              {buyer.activity_status && (
                <div className="mt-1.5">
                  <Badge
                    variant={
                      buyer.activity_status === 'active'
                        ? 'greenlit'
                        : buyer.activity_status === 'cooling'
                          ? 'inreview'
                          : 'muted'
                    }
                  >
                    {buyer.activity_status}
                  </Badge>
                </div>
              )}
            </>
          ) : (
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No buyer assigned
            </span>
          )}
        </div>

        {/* Right: Stage + completeness */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          <CompletenessDonut score={completeness.score} />
          <div className="flex flex-col items-center gap-1">
            <Badge variant={stageVariant(pipeline_stage)}>
              {pipeline_stage}
            </Badge>
            <span
              className="text-[11px]"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: 'var(--text-muted)',
              }}
            >
              {days_in_stage}d in stage
            </span>
          </div>
        </div>
      </div>

      {/* Full-width logline below */}
      {ip.logline && (
        <p
          className="mt-4 text-sm italic leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          {ip.logline}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Left column: The Pitch card
// ---------------------------------------------------------------------------

function ThePitchCard({ hub }: { hub: PitchHub }) {
  const { narrative, ask_format, ask_episode_count, ask_deal_structure, comp_shows, id } = hub;

  return (
    <Card className="mb-4">
      <SectionLabel>The Pitch</SectionLabel>

      {/* Narrative */}
      {narrative ? (
        <p
          className="text-sm whitespace-pre-wrap leading-relaxed mb-4"
          style={{ color: 'var(--text-secondary)' }}
        >
          {narrative}
        </p>
      ) : (
        <p className="text-sm mb-4 italic" style={{ color: 'var(--text-muted)' }}>
          No narrative written yet.
        </p>
      )}

      {/* The Ask — only render columns with values */}
      {(ask_format || ask_episode_count || ask_deal_structure) && (
        <div
          className="rounded-md p-3 mb-4"
          style={{ background: 'var(--bg-surface-alt)' }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-wider mb-2"
            style={{ color: 'var(--text-muted)' }}
          >
            The Ask
          </p>
          <dl className="flex gap-6 flex-wrap">
            {ask_format && (
              <div>
                <dt className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Format
                </dt>
                <dd
                  className="text-sm font-semibold mt-0.5"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-primary)' }}
                >
                  {ask_format}
                </dd>
              </div>
            )}
            {ask_episode_count && (
              <div>
                <dt className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Episodes
                </dt>
                <dd
                  className="text-sm font-semibold mt-0.5"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-primary)' }}
                >
                  {ask_episode_count}
                </dd>
              </div>
            )}
            {ask_deal_structure && (
              <div>
                <dt className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Deal Structure
                </dt>
                <dd
                  className="text-sm font-semibold mt-0.5"
                  style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-primary)' }}
                >
                  {ask_deal_structure}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Comp shows — horizontal scroll pill list */}
      {comp_shows.length > 0 && (
        <div className="mb-4">
          <p
            className="text-[10px] font-bold uppercase tracking-wider mb-2"
            style={{ color: 'var(--text-muted)' }}
          >
            Comp Shows
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {comp_shows.map((show) => (
              <div
                key={show.id}
                className="shrink-0 px-3 py-1.5 rounded-full border border-[var(--border-subtle)] text-xs whitespace-nowrap"
                style={{ background: 'var(--bg-surface-alt)', color: 'var(--text-secondary)' }}
              >
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {show.title}
                </span>
                {show.network && (
                  <span style={{ color: 'var(--text-muted)' }}> · {show.network}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Package link */}
      <div className="pt-3 border-t border-[var(--border-subtle)]">
        <Link
          href={`/build?edit=${id}`}
          className="text-xs font-semibold"
          style={{ color: 'var(--accent)' }}
        >
          Edit Package →
        </Link>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Left column: The IP card
// ---------------------------------------------------------------------------

function TheIPCard({ ip }: { ip: PitchHub['ip'] }) {
  const targetNets = ip.sheet_target_nets
    ? ip.sheet_target_nets.split(',').map((n) => n.trim()).filter(Boolean)
    : [];

  // 2-col metadata grid items
  const metaRows: Array<{ label: string; value: string | number | null | undefined }> = [
    { label: 'Genre', value: ip.genre },
    { label: 'Subgenre', value: ip.subgenre },
    { label: 'Format', value: ip.format },
    { label: 'Episode Count', value: ip.episode_count },
    { label: 'Rights Status', value: ip.rights_status },
    { label: 'Sheet Source', value: ip.sheet_source },
  ].filter((r) => r.value != null && r.value !== '');

  return (
    <Card className="mb-4">
      {/* Title + status */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3
          className="text-base font-bold leading-tight"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", color: 'var(--text-primary)' }}
        >
          {ip.title || 'Untitled IP'}
        </h3>
        {ip.status && (
          <Badge variant={ip.status === 'active' ? 'active' : ip.status === 'optioned' ? 'deal' : 'muted'}>
            {ip.status}
          </Badge>
        )}
      </div>

      {/* Logline — only if distinct from what's shown in hero (always show here for completeness) */}
      {ip.logline && (
        <p
          className="text-sm italic mb-3"
          style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}
        >
          {ip.logline}
        </p>
      )}

      {/* 2-col metadata grid */}
      {metaRows.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 mb-3">
          {metaRows.map((row) => (
            <div key={row.label}>
              <dt className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {row.label}
              </dt>
              <dd className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
                {String(row.value)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* Target networks */}
      {targetNets.length > 0 && (
        <div className="mb-3">
          <p
            className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
            style={{ color: 'var(--text-muted)' }}
          >
            Target Networks
          </p>
          <div className="flex flex-wrap gap-1.5">
            {targetNets.map((net) => (
              <Badge key={net} variant="inreview">
                {net}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Point Person / Next Steps / Signed */}
      {(ip.sheet_point_person || ip.sheet_next_steps || ip.sheet_signed) && (
        <div className="space-y-1.5 mb-3">
          {ip.sheet_point_person && (
            <div className="flex gap-2 text-xs">
              <span className="w-24 shrink-0" style={{ color: 'var(--text-muted)' }}>Point Person</span>
              <span style={{ color: 'var(--text-secondary)' }}>{ip.sheet_point_person}</span>
            </div>
          )}
          {ip.sheet_next_steps && (
            <div className="flex gap-2 text-xs">
              <span className="w-24 shrink-0" style={{ color: 'var(--text-muted)' }}>Next Steps</span>
              <span style={{ color: 'var(--text-secondary)' }}>{ip.sheet_next_steps}</span>
            </div>
          )}
          {ip.sheet_signed && (
            <div className="flex gap-2 text-xs">
              <span className="w-24 shrink-0" style={{ color: 'var(--text-muted)' }}>Signed</span>
              <span style={{ color: 'var(--text-secondary)' }}>{ip.sheet_signed}</span>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      {ip.notes && (
        <div
          className="rounded-md p-3 text-xs leading-relaxed"
          style={{ background: 'var(--bg-surface-alt)', color: 'var(--text-secondary)' }}
        >
          {ip.notes}
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Left column: Talent card
// ---------------------------------------------------------------------------

function TalentCard({ talent }: { talent: PitchHub['talent'] }) {
  return (
    <Card className="mb-4">
      <SectionLabel>Talent</SectionLabel>

      {talent.length === 0 ? (
        <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
          No talent attached to this pitch.
        </p>
      ) : (
        <div className="space-y-3">
          {talent.map((person) => (
            <div
              key={person.id}
              className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--border-subtle)] last:pb-0 last:border-0"
            >
              <div className="min-w-0">
                {/* Name + primary role */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-sm font-bold"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif", color: 'var(--text-primary)' }}
                  >
                    {person.name}
                  </span>
                  {person.primary_role && (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {person.primary_role}
                    </span>
                  )}
                </div>
                {/* Relationship + genre fit */}
                <div className="flex gap-3 mt-0.5 flex-wrap">
                  {person.mye_relationship && (
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {person.mye_relationship}
                    </span>
                  )}
                  {person.genre_fit && (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {person.genre_fit}
                    </span>
                  )}
                </div>
              </div>
              {/* Tier badge */}
              {person.talent_tier && (
                <div className="shrink-0">
                  <Badge variant={talentTierVariant(person.talent_tier)}>
                    {person.talent_tier}
                  </Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Right column: Completeness checklist
// ---------------------------------------------------------------------------

interface ChecklistItem {
  key: keyof PitchHub['completeness'];
  label: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { key: 'has_narrative',        label: 'Narrative written' },
  { key: 'has_sizzle',           label: 'Sizzle reel attached' },
  { key: 'has_deck',             label: 'Pitch deck uploaded' },
  { key: 'has_talent',           label: 'Talent attached' },
  { key: 'has_target_networks',  label: 'Target networks defined' },
  { key: 'has_email_activity',   label: 'Email activity' },
  { key: 'has_buyer',            label: 'Buyer assigned' },
  { key: 'has_comp_shows',       label: 'Comp shows added' },
];

function CompletenessCard({ completeness }: { completeness: PitchHub['completeness'] }) {
  const missing = CHECKLIST_ITEMS.filter((item) => !completeness[item.key]);

  return (
    <Card className="mb-4">
      {/* Title + score */}
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>Pitch Readiness</SectionLabel>
        <span
          className="text-sm font-bold"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-primary)' }}
        >
          {completeness.score}/100
        </span>
      </div>

      {/* Checklist rows */}
      <ul className="space-y-1.5 mb-4">
        {CHECKLIST_ITEMS.map((item) => {
          const checked = completeness[item.key] as boolean;
          return (
            <li key={item.key} className="flex items-center gap-2 text-xs">
              <span
                className="font-bold text-sm"
                style={{ color: checked ? 'var(--status-greenlit)' : 'var(--status-pass)' }}
              >
                {checked ? '✓' : '✗'}
              </span>
              <span style={{ color: checked ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {item.label}
              </span>
            </li>
          );
        })}
      </ul>

      {/* What's missing */}
      {missing.length > 0 && (
        <div
          className="rounded-md p-3"
          style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
            style={{ color: 'var(--status-pass)' }}
          >
            What&apos;s Missing
          </p>
          <ul className="space-y-0.5">
            {missing.map((item) => (
              <li key={item.key} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                · {item.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Right column: Other Active Pitches
// ---------------------------------------------------------------------------

function OtherPitchesCard({
  pitches,
  currentId,
}: {
  pitches: PitchHub['other_pitches'];
  currentId: string;
}) {
  if (pitches.length === 0) return null;

  return (
    <Card className="mb-4">
      <SectionLabel>Also in the Air ({pitches.length})</SectionLabel>

      <div className="space-y-2.5">
        {pitches.map((pitch) => (
          <Link
            key={pitch.id}
            href={`/pitches/${pitch.id}`}
            className="flex items-start justify-between gap-2 p-2.5 rounded-md border border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-alt)] transition-colors block"
          >
            <div className="min-w-0">
              <p
                className="text-xs font-semibold truncate"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", color: 'var(--text-primary)' }}
              >
                {pitch.name}
              </p>
              <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                {pitch.company_name ?? '—'}
                {pitch.contact_name ? ` · ${pitch.contact_name}` : ''}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge variant={stageVariant(pitch.pipeline_stage)}>
                {pitch.pipeline_stage}
              </Badge>
              <span
                className="text-[10px]"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: 'var(--text-muted)',
                }}
              >
                {pitch.days_in_stage}d
              </span>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Right column: Dev Tasks
// ---------------------------------------------------------------------------

function DevTasksCard({ tasks }: { tasks: PitchHub['dev_tasks'] }) {
  if (tasks.length === 0) return null;

  const openTasks = tasks.filter((t) => t.status !== 'done');

  return (
    <Card className="mb-4">
      <SectionLabel>Open Tasks ({openTasks.length})</SectionLabel>

      <div className="space-y-2.5">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="pb-2.5 border-b border-[var(--border-subtle)] last:pb-0 last:border-0"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs leading-relaxed flex-1" style={{ color: 'var(--text-primary)' }}>
                {task.task_description}
              </p>
              <Badge
                variant={
                  task.status === 'done'
                    ? 'greenlit'
                    : task.status === 'open'
                      ? 'inreview'
                      : 'muted'
                }
              >
                {task.status}
              </Badge>
            </div>
            {(task.assigned_to || task.deadline) && (
              <div className="flex gap-3 mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {task.assigned_to && <span>{task.assigned_to}</span>}
                {task.deadline && (
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    Due {task.deadline}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Tab bar (server-rendered anchor links using searchParams)
// ---------------------------------------------------------------------------

function TabBar({ pitchId, activeTab }: { pitchId: string; activeTab: string }) {
  const tabs: Array<{ id: string; label: string }> = [
    { id: 'materials', label: 'Materials' },
    { id: 'email', label: 'Email History' },
    { id: 'pass', label: 'Pass History' },
  ];

  return (
    <div
      className="flex gap-1 border-b border-[var(--border-subtle)] mb-6"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Link
            key={tab.id}
            href={`/pitches/${pitchId}?tab=${tab.id}`}
            className="px-4 py-2.5 text-sm font-semibold relative"
            style={{
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px', // overlap the container border
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Materials
// ---------------------------------------------------------------------------

function MaterialsTab({ sizzles, decks }: { sizzles: PitchHub['sizzles']; decks: PitchHub['decks'] }) {
  const hasSizzles = sizzles.length > 0;
  const hasDecks = decks.length > 0;

  if (!hasSizzles && !hasDecks) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
          No materials attached to this pitch yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sizzle Reels */}
      {hasSizzles && (
        <div>
          <SectionLabel>Sizzle Reels</SectionLabel>
          <div className="space-y-2">
            {sizzles.map((sizzle) => (
              <SizzlePlayRow key={sizzle.id} sizzle={sizzle} />
            ))}
          </div>
        </div>
      )}

      {/* Pitch Decks */}
      {hasDecks && (
        <div>
          <SectionLabel>Pitch Decks &amp; Materials</SectionLabel>
          <div className="space-y-2">
            {decks.map((deck) => (
              <div
                key={deck.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-subtle)]"
                style={{ background: 'var(--bg-surface)' }}
              >
                <Badge variant="muted">{deck.material_type}</Badge>
                <div className="flex-1 min-w-0">
                  {deck.notes && (
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {deck.notes}
                    </span>
                  )}
                </div>
                <div className="shrink-0">
                  {deck.deck_url ? (
                    <a
                      href={deck.deck_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold"
                      style={{ color: 'var(--accent)' }}
                    >
                      Open →
                    </a>
                  ) : deck.raw_value ? (
                    <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {deck.raw_value}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Email History
// ---------------------------------------------------------------------------

/**
 * Merged email item — union of project_threads and package_emails, normalized for display.
 * Used to render a unified chronological activity feed.
 */
interface MergedEmailItem {
  id: string;
  subject: string | null;
  sortKey: number; // epoch ms for sorting
  type: 'thread' | 'email';
  // thread-specific
  direction?: string | null;
  lastDate?: string | null;
  messageCount?: number;
  snippet?: string | null;
  // email-specific
  sender?: string | null;
  receivedAt?: number | null;
  grokSignal?: string | null;
}

function EmailHistoryTab({
  projectThreads,
  packageEmails,
}: {
  projectThreads: PitchHub['project_threads'];
  packageEmails: PitchHub['package_emails'];
}) {
  // Merge and sort: threads by last_message_date, emails by received_at
  const merged: MergedEmailItem[] = [
    ...projectThreads.map((t) => ({
      id: t.id,
      subject: t.subject,
      sortKey: t.last_message_date ? new Date(t.last_message_date).getTime() : 0,
      type: 'thread' as const,
      direction: t.direction,
      lastDate: t.last_message_date,
      messageCount: t.message_count,
      snippet: t.snippet,
    })),
    ...packageEmails.map((e) => ({
      id: e.id,
      subject: e.subject,
      sortKey: e.received_at ?? 0,
      type: 'email' as const,
      sender: e.sender,
      receivedAt: e.received_at,
      grokSignal: e.grok_signal,
    })),
  ].sort((a, b) => b.sortKey - a.sortKey); // newest first

  if (merged.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
          No email activity linked to this pitch.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {merged.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 p-3 rounded-lg border border-[var(--border-subtle)]"
          style={{ background: 'var(--bg-surface)' }}
        >
          {/* Type indicator + direction */}
          <div className="shrink-0 pt-0.5">
            {item.type === 'thread' ? (
              <Badge
                variant={
                  item.direction === 'inbound'
                    ? 'inreview'
                    : item.direction === 'outbound'
                      ? 'active'
                      : 'muted'
                }
              >
                {item.direction ?? 'thread'}
              </Badge>
            ) : (
              <Badge variant={grokVariant(item.grokSignal ?? null)}>
                {item.grokSignal ?? 'email'}
              </Badge>
            )}
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
              {item.subject || '(No subject)'}
            </p>
            {item.type === 'thread' && item.snippet && (
              <p
                className="text-xs mt-1 line-clamp-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                {item.snippet}
              </p>
            )}
            {item.type === 'email' && item.sender && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {item.sender}
              </p>
            )}
          </div>

          {/* Date + message count */}
          <div className="shrink-0 text-right">
            <p
              className="text-xs"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }}
            >
              {item.type === 'thread'
                ? fmtDate(item.lastDate)
                : fmtDate(item.receivedAt)}
            </p>
            {item.type === 'thread' && item.messageCount && item.messageCount > 1 && (
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {item.messageCount} messages
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab: Pass History
// ---------------------------------------------------------------------------

function PassHistoryTab({
  networksPassed,
  pitchHistory,
}: {
  networksPassed: PitchHub['networks_passed'];
  pitchHistory: PitchHub['pitch_history'];
}) {
  const hasHistory = pitchHistory.length > 0 || networksPassed.length > 0;

  if (!hasHistory) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
          No pitch history on record for this IP.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Networks passed — badge chips */}
      {networksPassed.length > 0 && (
        <div>
          <SectionLabel>Networks Passed</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {networksPassed.map((net) => (
              <Badge key={net} variant="pass">
                {net}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Full pitch history table */}
      {pitchHistory.length > 0 && (
        <div>
          <SectionLabel>Full Pitch History</SectionLabel>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr
                  className="border-b border-[var(--border-subtle)]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {['Date', 'Network', 'Contact', 'Format', 'Outcome', 'Pass Reason'].map(
                    (col) => (
                      <th
                        key={col}
                        className="text-left pb-2 pr-4 font-semibold uppercase tracking-wide text-[10px]"
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {pitchHistory.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--border-subtle)] last:border-0"
                    style={{ verticalAlign: 'top' }}
                  >
                    <td className="py-2.5 pr-4 whitespace-nowrap" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }}>
                      {fmtDate(row.pitch_date)}
                    </td>
                    <td className="py-2.5 pr-4 font-medium" style={{ color: 'var(--text-primary)' }}>
                      {row.buyer_company_name ?? '—'}
                    </td>
                    <td className="py-2.5 pr-4" style={{ color: 'var(--text-secondary)' }}>
                      {row.buyer_contact_name ?? '—'}
                    </td>
                    <td className="py-2.5 pr-4" style={{ color: 'var(--text-secondary)' }}>
                      {row.format_pitched ?? '—'}
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex flex-col gap-1">
                        <Badge variant={outcomeVariant(row.outcome)}>
                          {row.outcome ?? 'unknown'}
                        </Badge>
                        {row.pass_reason && (
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {row.pass_reason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5" style={{ color: 'var(--text-secondary)' }}>
                      {row.pass_reason_cat ? (
                        <div>
                          <span className="font-medium">{row.pass_reason_cat}</span>
                          {row.notes && (
                            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {row.notes}
                            </p>
                          )}
                        </div>
                      ) : (
                        row.notes ?? '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page entry point
// ---------------------------------------------------------------------------

export default async function PitchHubPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = 'materials' } = await searchParams;

  const hub = await fetchPitchHub(id);
  if (!hub) notFound();

  // Validate tab value — default to materials on unknown values
  const activeTab = ['materials', 'email', 'pass'].includes(tab) ? tab : 'materials';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Back navigation */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/pipeline"
          className="text-xs font-medium flex items-center gap-1"
          style={{ color: 'var(--text-muted)' }}
        >
          ← Pipeline
        </Link>
        <span style={{ color: 'var(--border-strong)' }}>·</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Pitch Hub
        </span>
      </div>

      {/* Hero header — full width */}
      <HeroHeader hub={hub} />

      {/* Main 2/3 + 1/3 grid */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Left column — 2/3 */}
        <div className="col-span-2 space-y-0">
          <ThePitchCard hub={hub} />
          <TheIPCard ip={hub.ip} />
          <TalentCard talent={hub.talent} />
        </div>

        {/* Right column — 1/3 */}
        <div className="col-span-1 space-y-0">
          <CompletenessCard completeness={hub.completeness} />
          <OtherPitchesCard pitches={hub.other_pitches} currentId={hub.id} />
          <DevTasksCard tasks={hub.dev_tasks} />
        </div>
      </div>

      {/* Three-panel tab section — full width */}
      <div
        className="rounded-xl border border-[var(--border-subtle)] p-6"
        style={{ background: 'var(--bg-surface)' }}
      >
        <TabBar pitchId={id} activeTab={activeTab} />

        {activeTab === 'materials' && (
          <MaterialsTab sizzles={hub.sizzles} decks={hub.decks} />
        )}
        {activeTab === 'email' && (
          <EmailHistoryTab
            projectThreads={hub.project_threads}
            packageEmails={hub.package_emails}
          />
        )}
        {activeTab === 'pass' && (
          <PassHistoryTab
            networksPassed={hub.networks_passed}
            pitchHistory={hub.pitch_history}
          />
        )}
      </div>

      {/* Footer metadata */}
      <div className="mt-4 flex gap-4 text-[11px]" style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
        {hub.created_at && <span>Created {fmtDate(hub.created_at)}</span>}
        {hub.updated_at && <span>Updated {fmtDate(hub.updated_at)}</span>}
        <span className="ml-auto opacity-50">{hub.id}</span>
      </div>
    </div>
  );
}
