export const dynamic = 'force-dynamic';

// /network-intel — Network buying intelligence dashboard.
// Pulls all buyer_companies from the DB. market_score and related intel
// columns are set via migration 018 and updated manually each quarter.
// Relationship score is computed live from deals, packages, and contacts.

import NetworkIntelClient, { type NetworkIntelRow } from '@/components/networks/NetworkIntelClient';
import { query } from '@/lib/db';

export const metadata = { title: 'Network Intel — Show Pitch Machine' };

// Normalization ceiling for relationship raw score.
// Raw = deal_count×3 + greenlit_pkgs×3 + warm_pkgs×2 + active_pkgs×1.
// A network with 5 greenlits = 15 raw → 10.0 relationship score.
const REL_SCORE_MAX = 15;

function fetchNetworkIntel(): NetworkIntelRow[] {
  try {
    const rows = query<{
      id: string;
      name: string;
      type: string | null;
      tier: string | null;
      hq_city: string | null;
      market_score: number | null;
      budget_signal: string | null;
      key_buyer: string | null;
      genre_mandate: string | null;
      intel_notes: string | null;
      intel_updated_at: number | null;
      contact_count: number;
      deal_count: number;
      active_pitches: number;
      pkgs_greenlit: number;
      pkgs_warm: number;
      last_touch_date: number | null;
    }>(
      `SELECT
        bc.id, bc.name, bc.type, bc.tier, bc.hq_city,
        bc.market_score, bc.budget_signal, bc.key_buyer,
        bc.genre_mandate, bc.intel_notes, bc.intel_updated_at,

        -- Relationship score components
        (SELECT COUNT(*)         FROM buyer_contacts bcon WHERE bcon.company_id = bc.id)              AS contact_count,
        (SELECT COUNT(DISTINCT d.id) FROM deals d       WHERE d.network_id     = bc.id)              AS deal_count,
        (SELECT COUNT(*)         FROM packages p
         WHERE p.target_company_id = bc.id
           AND p.pipeline_stage NOT IN ('pass','archived'))                                           AS active_pitches,
        (SELECT COUNT(*)         FROM packages p
         WHERE p.target_company_id = bc.id
           AND p.pipeline_stage = 'greenlit')                                                         AS pkgs_greenlit,
        (SELECT COUNT(*)         FROM packages p
         WHERE p.target_company_id = bc.id
           AND p.pipeline_stage IN ('meeting','negotiating','in-review'))                             AS pkgs_warm,

        -- Last MYE touch date for any contact at this network
        (SELECT MAX(bct.touch_date)
         FROM buyer_contact_touches bct
         JOIN buyer_contacts bc2 ON bc2.id = bct.contact_id
         WHERE bc2.company_id = bc.id)                                                               AS last_touch_date

       FROM buyer_companies bc
       ORDER BY bc.name ASC`
    );

    return rows.map((r) => {
      // Relationship raw = weighted sum of deal/package signals
      const rel_raw = r.deal_count * 3 + r.pkgs_greenlit * 3 + r.pkgs_warm * 2 + r.active_pitches * 1;
      const relationship_score = Math.min(10, Math.round((rel_raw / REL_SCORE_MAX) * 100) / 10);

      // Combined score only meaningful when market_score is set
      const combined_score =
        r.market_score != null
          ? Math.round((r.market_score * 0.6 + relationship_score * 0.4) * 10) / 10
          : null;

      // Parse genre_mandate from JSON text → string[]
      let genres: string[] = [];
      if (r.genre_mandate) {
        try { genres = JSON.parse(r.genre_mandate); } catch { genres = []; }
      }

      return {
        id: r.id,
        name: r.name,
        type: r.type,
        tier: r.tier,
        hq_city: r.hq_city,
        market_score: r.market_score,
        budget_signal: r.budget_signal as NetworkIntelRow['budget_signal'],
        key_buyer: r.key_buyer,
        genres,
        intel_notes: r.intel_notes,
        intel_updated_at: r.intel_updated_at,
        contact_count: r.contact_count,
        deal_count: r.deal_count,
        active_pitches: r.active_pitches,
        relationship_score,
        combined_score,
        last_touch_date: r.last_touch_date,
      };
    });
  } catch { return []; }
}

export default function NetworkIntelPage() {
  const networks = fetchNetworkIntel();

  const rated    = networks.filter(n => n.market_score != null);
  const hot      = rated.filter(n => (n.combined_score ?? 0) >= 7);
  const noRel    = rated.filter(n => n.relationship_score === 0);

  return (
    <div className="p-6 space-y-5">

      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
          >
            Network Buying Intelligence
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {networks.length} networks — ranked by external market activity + live relationship score
          </p>
        </div>

        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 6,
            background: 'color-mix(in srgb, #F5A623 15%, transparent)',
            color: '#F5A623',
            border: '1px solid color-mix(in srgb, #F5A623 30%, transparent)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            alignSelf: 'flex-start',
            marginTop: 4,
          }}
        >
          Intel updated May 2026
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Networks Tracked', value: String(networks.length) },
          { label: 'Market Intel Rated',  value: String(rated.length),  amber: true },
          { label: 'Hot Buyers (7.0+)',   value: String(hot.length),    accent: true },
          { label: 'Gap — No Relationship', value: String(noRel.length), muted: true },
        ].map(({ label, value, accent, amber, muted }) => (
          <div
            key={label}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 10,
              padding: '14px 16px',
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                fontFamily: "'Barlow Condensed', sans-serif",
                lineHeight: 1,
                color: accent ? 'var(--accent)' : amber ? '#F5A623' : muted ? 'var(--text-muted)' : 'var(--text-primary)',
              }}
            >
              {value}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      <NetworkIntelClient networks={networks} />
    </div>
  );
}
