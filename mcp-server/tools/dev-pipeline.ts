// tools/dev-pipeline.ts — MCP tool handlers for the MYE development pipeline.
//
// Ported from lib/mcp/tools/dev-pipeline.ts (SQLite/sync) to async Postgres.
// All query logic and output formatting is identical to the original —
// only the DB calls and parameter syntax changed.
//
// Data model notes (unchanged from original):
//   • ip_catalog rows with sheet_row_key IS NOT NULL came from the spreadsheet import.
//   • sheet_source values: priorities, bc-mye, full-dev, backburner, archived, passes, brainstorms.
//   • project_email_threads links Gmail threads to ip_catalog rows (many-to-many).
//   • story_scout rows link to projects via project_banner (free-text, ILIKE match).

import { query, queryOne } from '../db';

// ── Types ──────────────────────────────────────────────────────────────────────

interface PipelineRow {
  id: string;
  title: string;
  status: string | null;
  sheet_source: string | null;
  sheet_status: string | null;
  sheet_point_person: string | null;
  sheet_target_nets: string | null;
  sheet_pitched_to: string | null;
  sheet_passed: string | null;
  extracted_date: string | null;
  date_confidence: string | null;
  brainstorm_rank: number | null;
  email_thread_count: number;
  last_email_date: string | null;
  first_email_date: string | null;
  sizzle_count: number;
}

interface SizzleReelRow {
  id: string;
  ip_catalog_id: string;
  title: string | null;
  vimeo_url: string | null;
  vimeo_password: string | null;
  platform: string | null;
  raw_value: string | null;
  sheet_source: string | null;
  notes: string | null;
  created_at: string | null;
  email_thread_count: number;
  last_email_date: string | null;
}

interface IpCatalogFull {
  id: string;
  title: string;
  logline: string | null;
  format: string | null;
  genre: string | null;
  status: string | null;
  sheet_source: string | null;
  sheet_status: string | null;
  sheet_point_person: string | null;
  sheet_target_nets: string | null;
  sheet_pitched_to: string | null;
  sheet_passed: string | null;
  sheet_next_steps: string | null;
  extracted_date: string | null;
  date_confidence: string | null;
  brainstorm_rank: number | null;
  sheet_row_key: string | null;
  notes: string | null;
}

interface EmailThread {
  id: string;
  ip_catalog_id: string;
  thread_id: string;
  subject: string | null;
  participants: string | null;
  first_message_date: string | null;
  last_message_date: string | null;
  message_count: number;
  snippet: string | null;
  direction: string | null;
  source: string | null;
  match_confidence: string | null;
}

interface StoryScoutRow {
  id: string;
  headline: string;
  summary: string | null;
  link: string | null;
  project_banner: string | null;
  article_rights: string | null;
  action_notes: string | null;
  ip_catalog_id: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

// Canonical display order mirrors the spreadsheet tab order
const SOURCE_ORDER: string[] = [
  'priorities',
  'bc-mye',
  'full-dev',
  'backburner',
  'archived',
  'passes',
  'brainstorms',
];

const SOURCE_LABELS: Record<string, string> = {
  'priorities':  'ACTIVE PITCHES (Priorities)',
  'bc-mye':      'BC / MYE PROJECTS',
  'full-dev':    'FULL DEVELOPMENT',
  'backburner':  'BACKBURNER',
  'archived':    'ARCHIVED',
  'passes':      'PASSES',
  'brainstorms': 'BRAINSTORMS',
};

/**
 * Format a single pipeline row into the compact one-liner displayed in the list view.
 * Example: "• Pros vs Joes ▶ SIZZLE — Point: MY/JT | Targets: NBC, Hulu | 13 threads | Last: 2026-05-02"
 */
function formatPipelineRow(row: PipelineRow): string {
  const parts: string[] = [];

  const rank = row.brainstorm_rank != null ? ` [Rank ${row.brainstorm_rank}]` : '';
  const sizzleIndicator = row.sizzle_count > 0 ? ' ▶ SIZZLE' : '';
  parts.push(`• ${row.title}${sizzleIndicator}${rank}`);

  if (row.sheet_point_person) parts.push(`Point: ${row.sheet_point_person}`);

  const displayStatus = row.sheet_status || row.status;
  if (displayStatus) parts.push(`Status: ${displayStatus}`);

  // Cap target networks at 3 to keep lines readable
  if (row.sheet_target_nets) {
    const nets = row.sheet_target_nets
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(', ');
    if (nets) parts.push(`Targets: ${nets}`);
  }

  if (row.sheet_pitched_to) parts.push(`Pitched: ${row.sheet_pitched_to}`);

  const threadCount = row.email_thread_count ?? 0;
  parts.push(`${threadCount} email thread${threadCount === 1 ? '' : 's'}`);
  parts.push(`Last: ${row.last_email_date ?? 'no email activity found'}`);

  const [title, ...rest] = parts;
  return rest.length > 0 ? `${title} — ${rest.join(' | ')}` : title;
}

// ── get_development_pipeline ──────────────────────────────────────────────────

/**
 * Returns all ip_catalog rows from the spreadsheet import, grouped by sheet_source.
 *
 * Caller (MCP): Claude via the show-pitch-machine MCP server.
 * Auth: MCP_API_KEY Bearer token on /mcp endpoint.
 * Returns: formatted plain-text pipeline summary.
 *
 * Optional filters:
 *   sheet_source — restrict to one sheet tab (e.g. "priorities")
 *   status       — filter by ip_catalog.status
 */
export async function getDevelopmentPipeline(filters: {
  sheet_source?: string;
  status?: string;
} = {}): Promise<string> {
  const conditions: string[] = ['ip.sheet_row_key IS NOT NULL'];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters.sheet_source) {
    conditions.push(`ip.sheet_source = $${paramIdx++}`);
    params.push(filters.sheet_source);
  }
  if (filters.status) {
    conditions.push(`ip.status = $${paramIdx++}`);
    params.push(filters.status);
  }

  const whereClause = conditions.join(' AND ');

  const rows = await query<PipelineRow>(
    `SELECT
       ip.id, ip.title, ip.status, ip.sheet_source, ip.sheet_status,
       ip.sheet_point_person, ip.sheet_target_nets, ip.sheet_pitched_to,
       ip.sheet_passed, ip.extracted_date, ip.date_confidence, ip.brainstorm_rank,
       COUNT(DISTINCT pet.id)      AS email_thread_count,
       MAX(pet.last_message_date)  AS last_email_date,
       MIN(pet.first_message_date) AS first_email_date,
       COUNT(DISTINCT sr.id)       AS sizzle_count
     FROM ip_catalog ip
     LEFT JOIN project_email_threads pet ON pet.ip_catalog_id = ip.id
     LEFT JOIN sizzle_reels sr           ON sr.ip_catalog_id = ip.id
     WHERE ${whereClause}
     GROUP BY ip.id
     ORDER BY ip.sheet_source, ip.brainstorm_rank NULLS LAST, ip.title`,
    params
  );

  if (rows.length === 0) {
    return 'No projects found. Run the spreadsheet import script to populate data.';
  }

  // Group rows by sheet_source, preserving canonical display order
  const grouped = new Map<string, PipelineRow[]>();
  for (const row of rows) {
    const src = row.sheet_source ?? 'unknown';
    if (!grouped.has(src)) grouped.set(src, []);
    grouped.get(src)!.push(row);
  }

  const orderedKeys = [
    ...SOURCE_ORDER.filter((s) => grouped.has(s)),
    ...[...grouped.keys()].filter((s) => !SOURCE_ORDER.includes(s)),
  ];

  const sections: string[] = [];
  for (const src of orderedKeys) {
    const group = grouped.get(src)!;
    const label = SOURCE_LABELS[src] ?? src.toUpperCase();
    const lines = group.map(formatPipelineRow);
    sections.push(`${label}:\n${lines.join('\n')}`);
  }

  return sections.join('\n\n');
}

// ── get_project_timeline ───────────────────────────────────────────────────────

/**
 * Full detail view for a single project: ip_catalog record, email thread timeline,
 * sizzle assets, and story scout connections.
 *
 * Accepts a partial title — uses ILIKE so callers don't need the exact title.
 * Postgres ILIKE is case-insensitive by default, replacing SQLite's UPPER() trick.
 *
 * Caller (MCP): Claude via the show-pitch-machine MCP server.
 * Auth: MCP_API_KEY Bearer token on /mcp endpoint.
 */
export async function getProjectTimeline(projectName: string): Promise<string> {
  const likePattern = `%${projectName}%`;

  const project = await queryOne<IpCatalogFull>(
    `SELECT * FROM ip_catalog
     WHERE sheet_row_key IS NOT NULL
       AND title ILIKE $1
     LIMIT 1`,
    [likePattern]
  );

  if (!project) {
    return (
      `No project found matching '${projectName}'. ` +
      `Try get_development_pipeline() to see all projects.`
    );
  }

  // Sizzle reels for this project
  const sizzles = await query<SizzleReelRow>(
    `SELECT * FROM sizzle_reels WHERE ip_catalog_id = $1`,
    [project.id]
  );

  // Full email thread history sorted newest first
  const threads = await query<EmailThread>(
    `SELECT * FROM project_email_threads
     WHERE ip_catalog_id = $1
     ORDER BY first_message_date DESC`,
    [project.id]
  );

  // Story scout rows linked via project_banner (ILIKE on the project title)
  const scouts = await query<StoryScoutRow>(
    `SELECT * FROM story_scout WHERE project_banner ILIKE $1`,
    [likePattern]
  );

  // ── Build formatted output ──────────────────────────────────────────────────

  const lines: string[] = [];

  lines.push(`PROJECT: ${project.title}`);
  lines.push(`Status: ${project.sheet_status || project.status || '(unknown)'} (sheet: ${project.sheet_source || 'N/A'})`);
  if (project.sheet_point_person) lines.push(`Point Person: ${project.sheet_point_person}`);
  if (project.sheet_target_nets) lines.push(`Target Networks: ${project.sheet_target_nets}`);
  if (project.sheet_pitched_to) lines.push(`Pitched To: ${project.sheet_pitched_to}`);
  lines.push(`Passed: ${project.sheet_passed || '(none listed)'}`);
  if (project.sheet_next_steps) lines.push(`Next Steps: ${project.sheet_next_steps}`);
  if (project.extracted_date) {
    lines.push(`Best Date Estimate: ${project.extracted_date} (confidence: ${project.date_confidence ?? 'none'})`);
  }
  if (project.logline) lines.push(`Logline: ${project.logline}`);
  if (project.genre) lines.push(`Genre: ${project.genre}`);
  if (project.notes) lines.push(`Notes: ${project.notes}`);

  // Sizzle assets — only show section if sizzles exist
  if (sizzles.length > 0) {
    lines.push('');
    lines.push(`SIZZLE ASSETS (${sizzles.length}):`);
    for (const s of sizzles) {
      if (s.vimeo_url) {
        const pwPart = s.vimeo_password ? ` | Password: ${s.vimeo_password}` : '';
        const sourcePart = s.sheet_source ? ` | Source: ${s.sheet_source}` : '';
        lines.push(`  ▶ ${s.vimeo_url}${pwPart}${sourcePart}`);
      }
    }
  }

  // Email timeline
  lines.push('');
  if (threads.length === 0) {
    lines.push('EMAIL TIMELINE: No email threads linked to this project.');
  } else {
    const dates = threads
      .flatMap((t) => [t.first_message_date, t.last_message_date])
      .filter(Boolean) as string[];
    const dateRange = dates.length >= 2
      ? `${dates[dates.length - 1]} → ${dates[0]}`
      : (dates[0] ?? 'unknown');

    lines.push(`EMAIL TIMELINE (${threads.length} thread${threads.length === 1 ? '' : 's'} | ${dateRange}):`);
    lines.push('━'.repeat(40));

    for (const t of threads) {
      const dir = t.direction === 'outbound' ? '[sent]    ' : '[received]';
      const dateStr = t.first_message_date ?? 'unknown date';
      const subject = t.subject ?? '(no subject)';
      const msgCount = t.message_count ?? 1;

      let participantStr = '';
      if (t.participants) {
        try {
          const parsed: string[] = JSON.parse(t.participants);
          const external = parsed.find(
            (p) => !p.includes('@myentertainment') && !p.includes('@gototeam')
          );
          if (external) participantStr = ` — ${external}`;
        } catch {
          participantStr = ` — ${String(t.participants).slice(0, 60)}`;
        }
      }

      lines.push(
        `${dateStr}  ${dir} "${subject}" — ${msgCount} msg${msgCount === 1 ? '' : 's'}${participantStr}`
      );
    }
  }

  // Story scout connections
  lines.push('');
  if (scouts.length === 0) {
    lines.push('STORY SCOUT CONNECTIONS: None found.');
  } else {
    lines.push(`STORY SCOUT CONNECTIONS (${scouts.length}):`);
    for (const s of scouts) {
      const rights = s.article_rights ? ` [${s.article_rights}]` : '';
      const action = s.action_notes ? ` | Action: ${s.action_notes}` : '';
      lines.push(`• ${s.headline}${rights}${action}`);
      if (s.link) lines.push(`  Link: ${s.link}`);
    }
  }

  return lines.join('\n');
}

// ── get_sizzle_inventory ──────────────────────────────────────────────────────

/**
 * Complete sizzle reel inventory grouped into with-video-link and confirmed-exists.
 *
 * Caller (MCP): Claude via the show-pitch-machine MCP server.
 * Auth: MCP_API_KEY Bearer token on /mcp endpoint.
 */
export async function getSizzleInventory(): Promise<string> {
  const sizzles = await query<SizzleReelRow>(
    `SELECT
       sr.*,
       COUNT(pet.id)               AS email_thread_count,
       MAX(pet.last_message_date)  AS last_email_date
     FROM sizzle_reels sr
     LEFT JOIN project_email_threads pet ON pet.ip_catalog_id = sr.ip_catalog_id
     GROUP BY sr.id
     ORDER BY (sr.vimeo_url IS NOT NULL) DESC, sr.title`
  );

  if (sizzles.length === 0) {
    return 'SIZZLE REEL INVENTORY — 0 total\n\nNo sizzle reels recorded yet.';
  }

  const withVideo = sizzles.filter((s) => s.vimeo_url);
  const withoutVideo = sizzles.filter((s) => !s.vimeo_url);

  const lines: string[] = [];
  lines.push(`SIZZLE REEL INVENTORY — ${sizzles.length} total (${withVideo.length} with video links)`);
  lines.push('━'.repeat(50));
  lines.push('');

  if (withVideo.length > 0) {
    lines.push(`▶ WITH VIDEO LINK (${withVideo.length} sizzles):`);
    for (const s of withVideo) {
      const pwPart = s.vimeo_password ? ` | PW: ${s.vimeo_password}` : ' | No password';
      const lastActivity = s.last_email_date ?? '(no email activity)';
      lines.push(`• ${s.title} [${s.sheet_source || 'no-source'}] — ${s.vimeo_url}${pwPart} | Last activity: ${lastActivity}`);
    }
    lines.push('');
  }

  if (withoutVideo.length > 0) {
    lines.push(`CONFIRMED EXISTS — NO LINK YET (${withoutVideo.length} sizzles):`);
    for (const s of withoutVideo) {
      const rawValue = s.raw_value ? ` — raw: "${s.raw_value}"` : '';
      lines.push(`• ${s.title} [${s.sheet_source || 'no-source'}]${rawValue}`);
    }
  }

  return lines.join('\n');
}
