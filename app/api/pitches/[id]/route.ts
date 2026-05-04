/**
 * GET /api/pitches/[id]
 *   [id] = packages.id (a package IS a pitch in progress)
 *
 *   Returns a fully assembled, denormalized PitchHub object — every data point
 *   the Pitch Hub UI needs in a single request. No N+1 follow-up calls required.
 *
 *   Data assembled:
 *     - Core package fields
 *     - IP / show details from ip_catalog
 *     - Target buyer (contact + company)
 *     - Talent (union of package_talent + ip_talent, deduped by talent.id)
 *     - Sizzle reels for this IP
 *     - Pitch decks and materials for this IP
 *     - Comp shows (parsed from comp_show_ids JSON array, joined to shows)
 *     - Project-level email threads (project_email_threads via ip_id)
 *     - Package-level email signals (package_emails, most recent 20)
 *     - Historical pitches of this IP to any network
 *     - Other active packages for the same IP
 *     - Networks this IP has been passed on
 *     - Dev tasks linked to this IP
 *     - Completeness score (0–100)
 *
 * Called by: Pitch Hub page (/pitches/[id]), bots reading full pitch context
 * Auth: none
 * Response: { data: PitchHub } | { error: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';
import type { PitchHub } from '@/types';

// ---------------------------------------------------------------------------
// Local row types — only the columns we actually SELECT
// ---------------------------------------------------------------------------

interface PackageIpBuyerRow {
  // packages
  pkg_id: string;
  pkg_name: string;
  pipeline_stage: string;
  stage_entered_at: number | null;
  days_in_stage: number;
  status: string;
  narrative: string | null;
  comp_show_ids: string | null;
  ask_format: string | null;
  ask_episode_count: number | null;
  ask_deal_structure: string | null;
  pkg_created_at: number | null;
  pkg_updated_at: number | null;
  ip_id: string | null;
  target_contact_id: string | null;
  target_company_id: string | null;

  // ip_catalog
  ip_title: string | null;
  ip_logline: string | null;
  ip_format: string | null;
  ip_genre: string | null;
  ip_subgenre: string | null;
  ip_episode_count: number | null;
  ip_status: string | null;
  ip_rights_status: string | null;
  ip_sheet_source: string | null;
  ip_sheet_point_person: string | null;
  ip_sheet_target_nets: string | null;
  ip_sheet_passed: string | null;
  ip_sheet_pitched_to: string | null;
  ip_sheet_next_steps: string | null;
  ip_sheet_signed: string | null;
  ip_notes: string | null;

  // buyer_contacts
  bc_name: string | null;
  bc_email: string | null;
  bc_title: string | null;
  bc_mandate: string | null;
  bc_activity_status: string | null;
  bc_last_greenlit_date: number | null;
  bc_orders_last_90_days: number | null;

  // buyer_companies
  co_name: string | null;
  co_type: string | null;
}

interface TalentRow {
  id: string;
  name: string;
  primary_role: string | null;
  mye_relationship: string | null;
  talent_tier: string | null;
  genre_fit: string | null;
}

interface SizzleRow {
  id: string;
  title: string | null;
  vimeo_url: string | null;
  vimeo_password: string | null;
  platform: string;
  raw_value: string | null;
  notes: string | null;
}

interface DeckRow {
  id: string;
  material_type: string;
  deck_url: string | null;
  raw_value: string | null;
  notes: string | null;
}

interface CompShowRow {
  id: string;
  title: string;
  network: string | null;
  genre: string | null;
  format: string | null;
  episode_count: number | null;
  premiere_date: number | null;
}

interface ProjectThreadRow {
  id: string;
  thread_id: string;
  subject: string | null;
  first_message_date: string | null;
  last_message_date: string | null;
  message_count: number;
  snippet: string | null;
  direction: string | null;
  participants: string | null; // raw JSON string from DB
}

interface PackageEmailRow {
  id: string;
  gmail_thread_id: string | null;
  subject: string | null;
  sender: string | null;
  received_at: number | null;
  grok_signal: string | null;
  stage_moved_to: string | null;
}

interface PitchHistoryRow {
  id: string;
  buyer_company_name: string | null;
  buyer_contact_name: string | null;
  pitch_date: number | null;
  format_pitched: string | null;
  outcome: string | null;
  pass_reason: string | null;
  pass_reason_cat: string | null;
  notes: string | null;
}

interface OtherPitchRow {
  id: string;
  name: string;
  pipeline_stage: string;
  company_name: string | null;
  contact_name: string | null;
  days_in_stage: number;
}

interface DevTaskRow {
  id: string;
  task_description: string;
  assigned_to: string | null;
  deadline: string | null;
  section: string | null;
  status: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a JSON string that should be string[]. Returns [] on any failure —
 * we never want a malformed column to crash the entire pitch hub response.
 */
function parseJsonStringArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String);
    return [];
  } catch {
    return [];
  }
}

/**
 * Compute a completeness score from 0-100.
 * Each boolean = 1 point; has_narrative and has_sizzle = 2 points each.
 * Total possible = 10. Score = (points / 10) * 100.
 */
function computeCompleteness(flags: {
  has_narrative: boolean;
  has_sizzle: boolean;
  has_deck: boolean;
  has_talent: boolean;
  has_target_networks: boolean;
  has_email_activity: boolean;
  has_buyer: boolean;
  has_comp_shows: boolean;
}): PitchHub['completeness'] {
  const points =
    (flags.has_narrative ? 2 : 0) +
    (flags.has_sizzle ? 2 : 0) +
    (flags.has_deck ? 1 : 0) +
    (flags.has_talent ? 1 : 0) +
    (flags.has_target_networks ? 1 : 0) +
    (flags.has_email_activity ? 1 : 0) +
    (flags.has_buyer ? 1 : 0) +
    (flags.has_comp_shows ? 1 : 0);

  return {
    score: Math.round((points / 10) * 100),
    ...flags,
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Step 1: Fetch the core package row joined to IP and buyer in one roundtrip
    const row = queryOne<PackageIpBuyerRow>(
      `SELECT
        pkg.id                    AS pkg_id,
        pkg.name                  AS pkg_name,
        pkg.pipeline_stage,
        pkg.stage_entered_at,
        pkg.days_in_stage,
        pkg.status,
        pkg.narrative,
        pkg.comp_show_ids,
        pkg.ask_format,
        pkg.ask_episode_count,
        pkg.ask_deal_structure,
        pkg.created_at            AS pkg_created_at,
        pkg.updated_at            AS pkg_updated_at,
        pkg.ip_id,
        pkg.target_contact_id,
        pkg.target_company_id,

        ip.title                  AS ip_title,
        ip.logline                AS ip_logline,
        ip.format                 AS ip_format,
        ip.genre                  AS ip_genre,
        ip.subgenre               AS ip_subgenre,
        ip.episode_count          AS ip_episode_count,
        ip.status                 AS ip_status,
        ip.rights_status          AS ip_rights_status,
        ip.sheet_source           AS ip_sheet_source,
        ip.sheet_point_person     AS ip_sheet_point_person,
        ip.sheet_target_nets      AS ip_sheet_target_nets,
        ip.sheet_passed           AS ip_sheet_passed,
        ip.sheet_pitched_to       AS ip_sheet_pitched_to,
        ip.sheet_next_steps       AS ip_sheet_next_steps,
        ip.sheet_signed           AS ip_sheet_signed,
        ip.notes                  AS ip_notes,

        bc.name                   AS bc_name,
        bc.email                  AS bc_email,
        bc.title                  AS bc_title,
        bc.mandate_statement      AS bc_mandate,
        bc.activity_status        AS bc_activity_status,
        bc.last_greenlit_date     AS bc_last_greenlit_date,
        bc.orders_last_90_days    AS bc_orders_last_90_days,

        co.name                   AS co_name,
        co.type                   AS co_type
       FROM packages pkg
       LEFT JOIN ip_catalog ip        ON ip.id  = pkg.ip_id
       LEFT JOIN buyer_contacts bc    ON bc.id  = pkg.target_contact_id
       LEFT JOIN buyer_companies co   ON co.id  = pkg.target_company_id
       WHERE pkg.id = ?`,
      [id]
    );

    if (!row) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    const ipId = row.ip_id;

    // Step 2: Talent — union of ip_talent + package_talent, deduped by talent.id.
    // We fetch both sets then merge in TypeScript. 'package' source wins on dupe.

    const ipTalent = ipId
      ? query<TalentRow & { source: 'ip' }>(
          `SELECT t.id, t.name, t.primary_role, t.mye_relationship,
                  t.talent_tier, t.genre_fit, 'ip' AS source
           FROM ip_talent it
           JOIN talent t ON t.id = it.talent_id
           WHERE it.ip_id = ?`,
          [ipId]
        )
      : [];

    const packageTalent = query<TalentRow & { source: 'package' }>(
      `SELECT t.id, t.name, t.primary_role, t.mye_relationship,
              t.talent_tier, t.genre_fit, 'package' AS source
       FROM package_talent pt
       JOIN talent t ON t.id = pt.talent_id
       WHERE pt.package_id = ?`,
      [id]
    );

    // Merge: build a map keyed by talent.id; package attachment overwrites ip attachment
    const talentMap = new Map<string, PitchHub['talent'][number]>();
    for (const t of ipTalent) {
      talentMap.set(t.id, { ...t, source: 'ip' });
    }
    for (const t of packageTalent) {
      // package source takes priority — overwrite any ip-sourced entry
      talentMap.set(t.id, { ...t, source: 'package' });
    }
    const talent = Array.from(talentMap.values());

    // Step 3: Sizzle reels for this IP
    const sizzles = ipId
      ? query<SizzleRow>(
          `SELECT id, title, vimeo_url, vimeo_password, platform,
                  raw_value, notes
           FROM sizzle_reels
           WHERE ip_catalog_id = ?`,
          [ipId]
        )
      : [];

    // Step 4: Pitch decks and materials for this IP
    const decks = ipId
      ? query<DeckRow>(
          `SELECT id, material_type, deck_url, raw_value, notes
           FROM pitch_decks
           WHERE ip_catalog_id = ?`,
          [ipId]
        )
      : [];

    // Step 5: Comp shows — parse JSON array, then do a single IN query
    let compShows: CompShowRow[] = [];
    if (row.comp_show_ids) {
      const compIds = parseJsonStringArray(row.comp_show_ids);
      if (compIds.length > 0) {
        const placeholders = compIds.map(() => '?').join(', ');
        compShows = query<CompShowRow>(
          `SELECT id, title, network, genre, format, episode_count, premiere_date
           FROM shows
           WHERE id IN (${placeholders})`,
          compIds
        );
      }
    }

    // Step 6: Project-level email threads (linked to the IP, not a specific package)
    const rawProjectThreads = ipId
      ? query<ProjectThreadRow>(
          `SELECT id, thread_id, subject, first_message_date, last_message_date,
                  message_count, snippet, direction, participants
           FROM project_email_threads
           WHERE ip_catalog_id = ?
           ORDER BY last_message_date DESC`,
          [ipId]
        )
      : [];

    // Parse participants JSON string to string[] for each thread
    const projectThreads = rawProjectThreads.map((t) => ({
      ...t,
      participants: parseJsonStringArray(t.participants),
    }));

    // Step 7: Package-level email signals (most recent 20)
    const packageEmails = query<PackageEmailRow>(
      `SELECT id, gmail_thread_id, subject, sender, received_at,
              grok_signal, stage_moved_to
       FROM package_emails
       WHERE package_id = ?
       ORDER BY received_at DESC
       LIMIT 20`,
      [id]
    );

    // Step 8: Historical pitches of this IP to any buyer (all time)
    const pitchHistory = ipId
      ? query<PitchHistoryRow>(
          `SELECT
            p.id,
            co.name  AS buyer_company_name,
            bc.name  AS buyer_contact_name,
            p.pitch_date,
            p.format_pitched,
            p.outcome,
            p.pass_reason,
            p.pass_reason_cat,
            p.notes
           FROM pitches p
           LEFT JOIN buyer_companies co ON co.id = p.buyer_company_id
           LEFT JOIN buyer_contacts  bc ON bc.id = p.buyer_contact_id
           WHERE p.ip_id = ?
           ORDER BY p.pitch_date DESC`,
          [ipId]
        )
      : [];

    // Step 9: Other active packages for the same IP (exclude this package)
    const otherPitches = ipId
      ? query<OtherPitchRow>(
          `SELECT
            pkg.id,
            pkg.name,
            pkg.pipeline_stage,
            co.name  AS company_name,
            bc.name  AS contact_name,
            pkg.days_in_stage
           FROM packages pkg
           LEFT JOIN buyer_companies co ON co.id = pkg.target_company_id
           LEFT JOIN buyer_contacts  bc ON bc.id = pkg.target_contact_id
           WHERE pkg.ip_id = ?
             AND pkg.id   != ?
             AND pkg.status = 'active'
           ORDER BY pkg.created_at DESC`,
          [ipId, id]
        )
      : [];

    // Step 10: Networks passed — two sources:
    //   a) pitches table WHERE outcome='pass'
    //   b) ip_catalog.sheet_passed comma-split
    const passedPitches = ipId
      ? query<{ company_name: string | null }>(
          `SELECT co.name AS company_name
           FROM pitches p
           LEFT JOIN buyer_companies co ON co.id = p.buyer_company_id
           WHERE p.ip_id   = ?
             AND p.outcome = 'pass'`,
          [ipId]
        )
      : [];

    const networksPassed: string[] = [];
    const seenNetworks = new Set<string>();

    // Collect networks from pitches table
    for (const p of passedPitches) {
      const name = p.company_name?.trim();
      if (name && !seenNetworks.has(name)) {
        seenNetworks.add(name);
        networksPassed.push(name);
      }
    }
    // Collect networks from sheet_passed field (comma-separated)
    if (row.ip_sheet_passed) {
      for (const entry of row.ip_sheet_passed.split(',')) {
        const name = entry.trim();
        if (name && !seenNetworks.has(name)) {
          seenNetworks.add(name);
          networksPassed.push(name);
        }
      }
    }

    // Step 11: Dev tasks linked to this IP
    const devTasks = ipId
      ? query<DevTaskRow>(
          `SELECT id, task_description, assigned_to, deadline, section, status
           FROM dev_tasks
           WHERE ip_catalog_id = ?
           ORDER BY deadline ASC NULLS LAST`,
          [ipId]
        )
      : [];

    // Step 12: Compute completeness score
    const completeness = computeCompleteness({
      has_narrative: Boolean(row.narrative?.trim()),
      has_sizzle: sizzles.length > 0,
      has_deck: decks.length > 0,
      has_talent: talent.length > 0,
      has_target_networks: Boolean(row.ip_sheet_target_nets?.trim()),
      has_email_activity: packageEmails.length > 0 || projectThreads.length > 0,
      has_buyer:
        Boolean(row.target_contact_id) || Boolean(row.target_company_id),
      has_comp_shows: compShows.length > 0,
    });

    // Step 13: Assemble the final PitchHub object
    const pitchHub: PitchHub = {
      // Core pitch (package)
      id: row.pkg_id,
      name: row.pkg_name,
      pipeline_stage: row.pipeline_stage,
      stage_entered_at: row.stage_entered_at,
      days_in_stage: row.days_in_stage,
      status: row.status,
      narrative: row.narrative,
      ask_format: row.ask_format,
      ask_episode_count: row.ask_episode_count,
      ask_deal_structure: row.ask_deal_structure,
      created_at: row.pkg_created_at,
      updated_at: row.pkg_updated_at,

      // The IP / Show
      ip: {
        id: ipId ?? '',
        title: row.ip_title ?? '',
        logline: row.ip_logline,
        format: row.ip_format,
        genre: row.ip_genre,
        subgenre: row.ip_subgenre,
        episode_count: row.ip_episode_count,
        status: row.ip_status,
        rights_status: row.ip_rights_status,
        sheet_source: row.ip_sheet_source,
        sheet_point_person: row.ip_sheet_point_person,
        sheet_target_nets: row.ip_sheet_target_nets,
        sheet_passed: row.ip_sheet_passed,
        sheet_pitched_to: row.ip_sheet_pitched_to,
        sheet_next_steps: row.ip_sheet_next_steps,
        sheet_signed: row.ip_sheet_signed,
        notes: row.ip_notes,
      },

      // Target buyer
      buyer: {
        contact_id: row.target_contact_id,
        contact_name: row.bc_name,
        contact_title: row.bc_title,
        contact_email: row.bc_email,
        contact_mandate: row.bc_mandate,
        company_id: row.target_company_id,
        company_name: row.co_name,
        company_type: row.co_type,
        activity_status: row.bc_activity_status,
        last_greenlit_date: row.bc_last_greenlit_date,
        orders_last_90_days: row.bc_orders_last_90_days ?? 0,
      },

      talent,
      sizzles,
      decks,
      comp_shows: compShows,
      project_threads: projectThreads,
      package_emails: packageEmails,
      pitch_history: pitchHistory,
      other_pitches: otherPitches,
      networks_passed: networksPassed,
      dev_tasks: devTasks,
      completeness,
    };

    return NextResponse.json({ data: pitchHub });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
