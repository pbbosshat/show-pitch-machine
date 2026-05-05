export const dynamic = 'force-dynamic';

// Sizzle Asset Catalog — server component, queries SQLite directly (no HTTP round-trip).
// Sizzle reels are first-class brand assets (produced video reels that cost real money),
// so this page is the canonical inventory. Two sections:
//   1. "With Video Link" — sizzles that have an accessible vimeo_url
//   2. "Confirmed Exists" — sizzles whose cell noted a reel but no URL was captured
// SizzleCard (client component) handles thumbnail fetch + VimeoPlayerModal on click.

import SizzleCard, { type SizzleCardData } from '@/components/shows/SizzleCard';
import { query } from '@/lib/db';

// ── Data fetch ─────────────────────────────────────────────────────────────────

function fetchSizzles(): SizzleCardData[] {
  try {
    const rows = query<SizzleCardData>(
      `SELECT
        sr.id,
        sr.ip_catalog_id,
        ip.title        AS project_title,
        ip.sheet_source,
        sr.vimeo_url,
        sr.vimeo_password,
        sr.platform,
        sr.raw_value,
        sr.notes,
        sr.thumbnail_url,
        MAX(pet.last_message_date) AS last_email_date,
        COUNT(DISTINCT pet.id)     AS email_thread_count
       FROM sizzle_reels sr
       JOIN ip_catalog ip ON ip.id = sr.ip_catalog_id
       LEFT JOIN project_email_threads pet ON pet.ip_catalog_id = sr.ip_catalog_id
       GROUP BY sr.id
       ORDER BY
         CASE WHEN sr.vimeo_url IS NOT NULL AND sr.vimeo_url != '' THEN 0 ELSE 1 END ASC,
         ip.title ASC`
    );
    // node:sqlite rows have null prototypes — JSON round-trip makes them serializable
    return JSON.parse(JSON.stringify(rows));
  } catch {
    return [];
  }
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function SizzlesPage() {
  const sizzles = fetchSizzles();

  // Split into the two sections: accessible (has URL) vs. confirmed-exists (no URL)
  const withUrl = sizzles.filter((s) => s.vimeo_url);
  const withoutUrl = sizzles.filter((s) => !s.vimeo_url);

  return (
    <div className="p-6 space-y-8">

      {/* ── Page header ── */}
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
        >
          Sizzle Reels
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {sizzles.length} produced asset{sizzles.length !== 1 ? 's' : ''}
          {withUrl.length > 0 && (
            <span style={{ color: 'var(--text-muted)' }}>
              {' '}· {withUrl.length} with video link
            </span>
          )}
        </p>
      </div>

      {/* ── Section 1: Sizzles with a video URL ── */}
      {withUrl.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline gap-3">
            <h2
              className="text-lg font-bold"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
            >
              With Video Link
            </h2>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {withUrl.length} reel{withUrl.length !== 1 ? 's' : ''} — ready to share
            </span>
          </div>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {withUrl.map((sizzle) => (
              <SizzleCard key={sizzle.id} sizzle={sizzle} />
            ))}
          </div>
        </section>
      )}

      {/* ── Section 2: Confirmed exists but no URL captured yet ── */}
      {withoutUrl.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-baseline gap-3">
            <h2
              className="text-lg font-bold"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
            >
              Confirmed Exists
            </h2>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {withoutUrl.length} reel{withoutUrl.length !== 1 ? 's' : ''} — noted in sheet, URL not captured
            </span>
          </div>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {withoutUrl.map((sizzle) => (
              <SizzleCard key={sizzle.id} sizzle={sizzle} />
            ))}
          </div>
        </section>
      )}

      {/* ── Empty state — should rarely happen if sizzle sync has run ── */}
      {sizzles.length === 0 && (
        <div
          className="rounded-lg border p-12 text-center"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No sizzle reels found. Run the sheet sync to populate this catalog.
          </p>
        </div>
      )}

    </div>
  );
}
