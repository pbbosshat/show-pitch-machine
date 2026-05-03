/**
 * GET /api/pitch/[slug]
 * Called by: pitch portal page (/pitch/[slug]/page.tsx), PDF export script
 * Auth: none (portals are public by design — slug acts as a token)
 * Response: { data: PortalPayload } — full denormalized pitch packet
 *
 * Assembles the complete portal data tree in one query chain:
 *   pitch_portals → packages → ip_catalog → buyer_contact + company + mandate
 *   → comp shows (from comp_show_ids JSON array) → talent → content partners
 *
 * All joins done in SQLite to avoid N+1. comp_show_ids is a JSON array stored
 * as a string so comp shows are fetched with a separate query using json_each.
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, query } from '@/lib/db';

interface PortalRow {
  // pitch_portals fields
  portal_id: string;
  slug: string;
  pdf_path: string | null;
  sent_at: number | null;
  sent_to: string | null;
  portal_created_at: number | null;
  // packages fields
  package_id: string;
  package_name: string;
  pipeline_stage: string;
  status: string;
  narrative: string | null;
  comp_show_ids: string | null;
  ask_format: string | null;
  ask_episode_count: number | null;
  ask_deal_structure: string | null;
  // ip_catalog fields
  ip_id: string | null;
  ip_title: string | null;
  ip_logline: string | null;
  ip_format: string | null;
  ip_genre: string | null;
  ip_subgenre: string | null;
  ip_episode_count: number | null;
  ip_seasons_count: number | null;
  ip_notes: string | null;
  // buyer_contacts fields
  buyer_id: string | null;
  buyer_name: string | null;
  buyer_title: string | null;
  buyer_email: string | null;
  buyer_mandate: string | null;
  buyer_mandate_date: number | null;
  // buyer_companies fields
  company_id: string | null;
  company_name: string | null;
  company_type: string | null;
  company_tier: string | null;
  company_hq: string | null;
}

interface TalentRow {
  talent_id: string;
  name: string;
  primary_role: string | null;
  role: string | null;
  mye_relationship: string | null;
}

interface PartnerRow {
  partner_id: string;
  name: string;
  type: string | null;
  access_description: string | null;
  genres_unlocked: string | null;
  notes: string | null;
}

interface ShowRow {
  id: string;
  title: string;
  network: string | null;
  genre: string | null;
  format: string | null;
  episode_count: number | null;
  greenlit_date: number | null;
  production_company: string | null;
  location_type: string | null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Single big join to get portal + package + ip + buyer + company in one roundtrip
    const row = queryOne<PortalRow>(
      `SELECT
        pp.id         AS portal_id,
        pp.slug,
        pp.pdf_path,
        pp.sent_at,
        pp.sent_to,
        pp.created_at AS portal_created_at,

        pkg.id        AS package_id,
        pkg.name      AS package_name,
        pkg.pipeline_stage,
        pkg.status,
        pkg.narrative,
        pkg.comp_show_ids,
        pkg.ask_format,
        pkg.ask_episode_count,
        pkg.ask_deal_structure,

        ip.id         AS ip_id,
        ip.title      AS ip_title,
        ip.logline    AS ip_logline,
        ip.format     AS ip_format,
        ip.genre      AS ip_genre,
        ip.subgenre   AS ip_subgenre,
        ip.episode_count AS ip_episode_count,
        ip.seasons_count AS ip_seasons_count,
        ip.notes      AS ip_notes,

        bc.id         AS buyer_id,
        bc.name       AS buyer_name,
        bc.title      AS buyer_title,
        bc.email      AS buyer_email,
        bc.mandate_statement AS buyer_mandate,
        bc.mandate_date      AS buyer_mandate_date,

        co.id         AS company_id,
        co.name       AS company_name,
        co.type       AS company_type,
        co.tier       AS company_tier,
        co.hq_city    AS company_hq
       FROM pitch_portals pp
       JOIN packages pkg       ON pkg.id = pp.package_id
       LEFT JOIN ip_catalog ip  ON ip.id  = pkg.ip_id
       LEFT JOIN buyer_contacts bc ON bc.id = pkg.target_contact_id
       LEFT JOIN buyer_companies co ON co.id = pkg.target_company_id
       WHERE pp.slug = ?`,
      [slug]
    );

    if (!row) {
      return NextResponse.json({ error: 'Portal not found' }, { status: 404 });
    }

    // Fetch talent attached to the package
    const talent = query<TalentRow>(
      `SELECT
        t.id   AS talent_id,
        t.name,
        t.primary_role,
        pt.role,
        t.mye_relationship
       FROM package_talent pt
       JOIN talent t ON t.id = pt.talent_id
       WHERE pt.package_id = ?`,
      [row.package_id]
    );

    // Fetch content partners attached to the package
    const partners = query<PartnerRow>(
      `SELECT
        cp.id   AS partner_id,
        cp.name,
        cp.type,
        cp.access_description,
        cp.genres_unlocked,
        pcp.notes
       FROM package_content_partners pcp
       JOIN content_partners cp ON cp.id = pcp.partner_id
       WHERE pcp.package_id = ?`,
      [row.package_id]
    );

    // Fetch comp shows from the JSON array stored in comp_show_ids
    let compShows: ShowRow[] = [];
    if (row.comp_show_ids) {
      try {
        const ids: string[] = JSON.parse(row.comp_show_ids);
        if (ids.length > 0) {
          // Use json_each for portability; alternatively we could do N individual queries
          // but SQLite json_each is more efficient for small arrays
          const placeholders = ids.map(() => '?').join(', ');
          compShows = query<ShowRow>(
            `SELECT id, title, network, genre, format, episode_count,
                    greenlit_date, production_company, location_type
             FROM shows
             WHERE id IN (${placeholders})`,
            ids
          );
        }
      } catch {
        // If comp_show_ids is malformed JSON, just skip comps rather than crashing the portal
        compShows = [];
      }
    }

    // Assemble the denormalized payload that the portal page renders directly
    const payload = {
      portal: {
        id: row.portal_id,
        slug: row.slug,
        pdf_path: row.pdf_path,
        sent_at: row.sent_at,
        sent_to: row.sent_to,
        created_at: row.portal_created_at,
      },
      package: {
        id: row.package_id,
        name: row.package_name,
        pipeline_stage: row.pipeline_stage,
        status: row.status,
        narrative: row.narrative,
        ask_format: row.ask_format,
        ask_episode_count: row.ask_episode_count,
        ask_deal_structure: row.ask_deal_structure,
      },
      ip: row.ip_id
        ? {
            id: row.ip_id,
            title: row.ip_title,
            logline: row.ip_logline,
            format: row.ip_format,
            genre: row.ip_genre,
            subgenre: row.ip_subgenre,
            episode_count: row.ip_episode_count,
            seasons_count: row.ip_seasons_count,
            notes: row.ip_notes,
          }
        : null,
      buyer: row.buyer_id
        ? {
            id: row.buyer_id,
            name: row.buyer_name,
            title: row.buyer_title,
            email: row.buyer_email,
            mandate: row.buyer_mandate,
            mandate_date: row.buyer_mandate_date,
          }
        : null,
      company: row.company_id
        ? {
            id: row.company_id,
            name: row.company_name,
            type: row.company_type,
            tier: row.company_tier,
            hq: row.company_hq,
          }
        : null,
      comp_shows: compShows,
      talent,
      partners,
    };

    return NextResponse.json({ data: payload });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
