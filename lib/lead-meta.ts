// lib/lead-meta.ts — single source of truth for Leads tab labels and the Lead shape.
//
// Used by both the API (app/api/contact/*) and the Leads page (client component),
// so this file MUST NOT import lib/db or anything server-only.
//
// Every user-facing source/status label lives here and only here. Screens read
// labels through LEAD_SOURCES / LEAD_STATUSES / leadSourceLabel rather than
// keeping their own copies.

// ─── Sources (which public form the lead came from) ──────────────────────────

export const LEAD_SOURCES = [
  { key: 'contact', label: 'Contact' },
  { key: 'pitch', label: 'Pitch a Show' },
  { key: 'work-with-us', label: 'Work With Us' },
  { key: 'available-request', label: 'Show Request' },
] as const;

export type LeadSourceKey = (typeof LEAD_SOURCES)[number]['key'];

const SOURCE_KEYS = new Set<string>(LEAD_SOURCES.map((s) => s.key));

export function isLeadSourceKey(value: unknown): value is LeadSourceKey {
  return typeof value === 'string' && SOURCE_KEYS.has(value);
}

/**
 * Derive the display source for a lead.
 * - a known stored `source` returns itself;
 * - NULL source with `available_title_id` set is a one-sheet show request
 *   (historical rows predate source stamping);
 * - anything else, including unknown stored values, is a general Contact lead.
 */
export function leadSourceKey(lead: {
  source?: string | null;
  available_title_id?: string | null;
}): LeadSourceKey {
  if (isLeadSourceKey(lead.source)) return lead.source;
  if (lead.source == null && lead.available_title_id) return 'available-request';
  return 'contact';
}

export function leadSourceLabel(key: LeadSourceKey): string {
  return LEAD_SOURCES.find((s) => s.key === key)?.label ?? LEAD_SOURCES[0].label;
}

// ─── Statuses (internal triage) ──────────────────────────────────────────────

export const LEAD_STATUSES = [
  { key: 'new', label: 'New' },
  { key: 'worth_pursuing', label: 'Worth Pursuing' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'in_talks', label: 'In Talks' },
  { key: 'passed', label: 'Passed' },
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number]['key'];

export const DEFAULT_LEAD_STATUS: LeadStatus = 'new';

const STATUS_KEYS = new Set<string>(LEAD_STATUSES.map((s) => s.key));

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === 'string' && STATUS_KEYS.has(value);
}

export function leadStatusLabel(key: LeadStatus): string {
  return LEAD_STATUSES.find((s) => s.key === key)?.label ?? LEAD_STATUSES[0].label;
}

/** Maximum length of the internal notes field (characters, after trimming). */
export const LEAD_NOTES_MAX = 5000;

// ─── Lead record ─────────────────────────────────────────────────────────────

export interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  message: string | null;
  company: string | null;             // buyer's company name
  available_title_id: string | null;  // set when the lead came from a package request
  show_title: string | null;          // joined from deck_sites by GET only
  created_at: number;                 // milliseconds timestamp

  // Submissions Release — populated only for gated sources ('pitch',
  // 'work-with-us'); historical rows and general enquiries carry nulls.
  source: string | null;
  phone: string | null;
  material_title: string | null;
  material_nature: string | null;
  material_pages: number | null;
  material_link: string | null;
  release_accepted: boolean;
  release_signature: string | null;
  release_version: string | null;
  release_accepted_at: number | null;

  // Follow-up tracking (migration 047).
  status: string;
  notes: string | null;
  status_changed_at: number | null;
  status_changed_by: string | null;

  // Derived at read time by GET /api/contact via leadSourceKey().
  source_key: LeadSourceKey;
}
