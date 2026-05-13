/**
 * POST /api/packages/[id]/publish
 * Called by: package editor — "Send Pitch" button
 * Auth: none
 * Response: { data: { slug, portal_id, portal_url } }
 *
 * Creates a pitch_portals row with a unique URL-safe slug, then sets
 * the package status to 'sent' and pipeline_stage to 'sent'.
 *
 * Slug format: {ip-title-slug}-{buyer-name-slug}-{6-char uuid suffix}
 * e.g. ghost-adventures-jane-smith-a1b2c3
 *
 * The portal URL is: /pitch/{slug} — served by app/pitch/[slug]/page.tsx
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, run } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

interface PackageForPublish {
  id: string;
  status: string;
  pipeline_stage: string;
  ip_title: string | null;
  buyer_name: string | null;
}

// Convert arbitrary text to a lowercase URL-safe slug
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')  // remove non-alphanumeric except spaces/hyphens
    .replace(/\s+/g, '-')           // spaces to hyphens
    .replace(/-+/g, '-')            // collapse repeated hyphens
    .replace(/^-|-$/g, '')          // trim leading/trailing hyphens
    .slice(0, 40);                  // keep slugs short
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const pkg = await queryOne<PackageForPublish>(
      `SELECT
        pkg.id,
        pkg.status,
        pkg.pipeline_stage,
        ip.title  AS ip_title,
        bc.name   AS buyer_name
       FROM packages pkg
       LEFT JOIN ip_catalog ip    ON ip.id  = pkg.ip_id
       LEFT JOIN buyer_contacts bc ON bc.id = pkg.target_contact_id
       WHERE pkg.id = ?`,
      [id]
    );

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    // Build the slug from IP title + buyer name + short UUID fragment
    const ipSlug = slugify(pkg.ip_title || 'untitled');
    const buyerSlug = slugify(pkg.buyer_name || 'buyer');
    const suffix = uuidv4().slice(0, 6);
    const slug = `${ipSlug}-${buyerSlug}-${suffix}`;

    const portalId = uuidv4();
    const now = Date.now();

    await run(
      `INSERT INTO pitch_portals (id, package_id, slug, sent_at, sent_to, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [portalId, id, slug, now, pkg.buyer_name || null, now]
    );

    // Advance pipeline stage to 'sent' and record when we entered it
    await run(
      `UPDATE packages
       SET status = 'sent', pipeline_stage = 'sent', stage_entered_at = ?, days_in_stage = 0, updated_at = ?
       WHERE id = ?`,
      [now, now, id]
    );

    return NextResponse.json({
      data: {
        slug,
        portal_id: portalId,
        portal_url: `/pitch/${slug}`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
