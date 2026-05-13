export const dynamic = 'force-dynamic';

// Buyers Directory — server component queries the DB directly and passes the dataset
// to BuyersClient which handles search, filter, and sort interactivity.
// Direct DB query avoids the auth-middleware redirect that blocks server-side HTTP fetches.
//
// Extended in migration 017 enrichment pass: includes phone, email, mye_pitch_count,
// and a last_contacted_by subquery that pulls the mye_user_email of the most recent touch.

import BuyersClient from '@/components/buyers/BuyersClient';
import { query } from '@/lib/db';
import type { BuyerContact } from '@/types';

interface BuyerRow extends BuyerContact {
  company_name: string | null;
  company_type: string | null;
  company_tier: string | null;
}

// Async because query() returns a Promise in Postgres mode
async function fetchBuyers(): Promise<BuyerRow[]> {
  try {
    const rows = await query<BuyerRow>(
      `SELECT
        bc.*,
        co.name  AS company_name,
        co.type  AS company_type,
        co.tier  AS company_tier,
        -- Most recent MYE team member who touched this contact (from buyer_contact_touches)
        (SELECT bct.mye_user_email
         FROM buyer_contact_touches bct
         WHERE bct.contact_id = bc.id
         ORDER BY bct.touch_date DESC
         LIMIT 1) AS last_contacted_by
       FROM buyer_contacts bc
       LEFT JOIN buyer_companies co ON co.id = bc.company_id
       ORDER BY bc.last_greenlit_date DESC NULLS LAST`
    );
    // node:sqlite rows have null prototypes — JSON roundtrip for client boundary serialization
    return JSON.parse(JSON.stringify(rows));
  } catch { return []; }
}

export default async function BuyersPage() {
  const buyers = await fetchBuyers();
  return (
    <div className="p-6 space-y-5">
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
        >
          Buyers Directory
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {buyers.length} contacts
        </p>
      </div>
      {/* BuyersClient handles search, filter, and row click navigation */}
      <BuyersClient initialBuyers={buyers} />
    </div>
  );
}
