export const dynamic = 'force-dynamic';

// Networks list page — server component.
// Queries the DB directly (avoids auth-middleware redirect that blocks server-side HTTP fetches).
// Delegates search + table rendering to NetworksClient (client component).
//
// Extended in migration 017 enrichment pass: includes last_touch_date (most recent
// buyer_contact_touches timestamp for any contact at this network) and active_pitches
// (packages targeting this network that aren't passed or archived).

import NetworksClient, { type NetworkListItem } from '@/components/networks/NetworksClient';
import { query } from '@/lib/db';

function fetchNetworks(): NetworkListItem[] {
  try {
    const rows = query<NetworkListItem>(
      `SELECT
        bc.id, bc.name, bc.type, bc.tier, bc.hq_city, bc.notes,
        bc.parent_id,
        (SELECT COUNT(*) FROM buyer_companies child WHERE child.parent_id = bc.id) AS child_count,
        (SELECT COUNT(*) FROM buyer_contacts bcon WHERE bcon.company_id = bc.id)   AS contact_count,
        (SELECT COUNT(DISTINCT d.id) FROM deals d WHERE d.network_id = bc.id)      AS deal_count,
        (SELECT COUNT(*) FROM market_orders mo WHERE mo.buyer_company_id = bc.id)  AS order_count,
        (SELECT MAX(bct.touch_date)
         FROM buyer_contact_touches bct
         JOIN buyer_contacts bc2 ON bc2.id = bct.contact_id
         WHERE bc2.company_id = bc.id)                                             AS last_touch_date,
        (SELECT COUNT(*)
         FROM packages p
         WHERE p.target_company_id = bc.id
           AND p.pipeline_stage NOT IN ('pass', 'archived'))                       AS active_pitches
       FROM buyer_companies bc
       ORDER BY bc.tier ASC NULLS LAST, bc.name ASC`
    );
    return JSON.parse(JSON.stringify(rows));
  } catch { return []; }
}

export default function NetworksPage() {
  const networks = fetchNetworks();

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
        >
          Networks &amp; Platforms
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {networks.length} network{networks.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* NetworksClient handles search and renders the sortable table */}
      <NetworksClient initialNetworks={networks} />
    </div>
  );
}
