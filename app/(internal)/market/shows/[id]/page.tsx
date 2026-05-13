// Show detail page — every known data point for a single show in the market intelligence DB.
// Data flows: shows table → joined buyer_companies + production_companies + deals + buyer_contacts.
// Cards on /market/shows navigate here via router.push(`/market/shows/${id}`).
// Uses direct DB queries (not the API) to avoid auth middleware blocking server-side fetches.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import { query, queryOne } from '@/lib/db';
import type { Show } from '@/types';

// ─── Extended DB row shape ────────────────────────────────────────────────────

interface ShowDetail extends Show {
  network_company_name: string | null;
  network_company_type: string | null;
  network_company_tier: string | null;
  prodco_name: string | null;
  prodco_2_name: string | null;
  tvmaze_type: string | null;
  tvmaze_genres: string | null;
  confidence: string | null;
}

interface ShowBuyer {
  id: string;
  name: string;
  title: string | null;
  activity_status: string;
  orders_last_365_days: number;
}

interface ShowDeal {
  id: string;
  deal_type: string | null;
  deal_date: number | null;
  buyer_name: string | null;
  prodco_name: string | null;
  source: string | null;
  source_url: string | null;
}

// ─── Data fetching — direct DB queries ───────────────────────────────────────

// Async because queryOne() returns a Promise in Postgres mode
async function fetchShow(id: string): Promise<ShowDetail | null> {
  return await queryOne<ShowDetail>(
    `SELECT s.*,
            bc.name  AS network_company_name,
            bc.type  AS network_company_type,
            bc.tier  AS network_company_tier,
            pc.name  AS prodco_name,
            pc2.name AS prodco_2_name
     FROM shows s
     LEFT JOIN buyer_companies    bc  ON bc.id  = s.network_id
     LEFT JOIN production_companies pc  ON pc.id  = s.prodco_id
     LEFT JOIN production_companies pc2 ON pc2.id = s.prodco_2_id
     WHERE s.id = ?`,
    [id]
  ) ?? null;
}

async function fetchBuyers(networkId: string | null): Promise<ShowBuyer[]> {
  if (!networkId) return [];
  return query<ShowBuyer>(
    `SELECT id, name, title, activity_status, orders_last_365_days
     FROM buyer_contacts
     WHERE company_id = ? AND is_buyer_seat = 1
     ORDER BY orders_last_365_days DESC, activity_status ASC
     LIMIT 5`,
    [networkId]
  );
}

async function fetchDeals(showId: string): Promise<ShowDeal[]> {
  return query<ShowDeal>(
    `SELECT d.id, d.deal_type, d.deal_date, d.buyer_name, d.prodco_name, d.source, d.source_url
     FROM deals d
     WHERE d.show_id = ?
     ORDER BY d.deal_date DESC NULLS LAST
     LIMIT 10`,
    [showId]
  );
}

// Shape returned from the entity_article_links + trade_articles JOIN
interface ArticleLink {
  id: string;
  headline: string | null;
  url: string | null;
  source: string | null;
  item_type: string | null;
  scraped_at: number | null;
  auto_applied: number;
  applied_field: string | null;
}

// Fetches trade articles linked to this show via entity_article_links.
// entity_type = 'show' scopes to the show dimension.
// Capped at 20 most-recent articles.
async function fetchArticles(showId: string): Promise<ArticleLink[]> {
  return query<ArticleLink>(
    `SELECT ta.id, ta.headline, ta.url, ta.source, ta.item_type, ta.scraped_at,
            eal.auto_applied, eal.applied_field
     FROM entity_article_links eal
     JOIN trade_articles ta ON ta.id = eal.article_id
     WHERE eal.entity_type = 'show' AND eal.entity_id = ?
     ORDER BY ta.scraped_at DESC
     LIMIT 20`,
    [showId]
  );
}

async function fetchSimilar(showId: string, networkId: string | null, genre: string | null): Promise<Show[]> {
  return query<Show>(
    `SELECT id, title, network, air_status, total_seasons, genre
     FROM shows
     WHERE id != ?
       AND (network_id = ? OR genre = ?)
       AND confidence = 'confirmed'
     ORDER BY air_status ASC, updated_at DESC
     LIMIT 6`,
    [showId, networkId, genre]
  );
}

// ─── Small display helpers ────────────────────────────────────────────────────

function fmt(ts: number | null | undefined): string | null {
  if (!ts) return null;
  return new Date(ts).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function year(ts: number | null | undefined): string | null {
  if (!ts) return null;
  return String(new Date(ts).getFullYear());
}

function Field({
  label, value, href, mono,
}: {
  label: string;
  value?: string | number | null;
  href?: string;
  mono?: boolean;
}) {
  if (value == null || value === '') return null;
  return (
    <div>
      <dt
        className="text-xs font-semibold uppercase tracking-wide mb-1"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </dt>
      <dd
        className="text-sm"
        style={{
          color: 'var(--text-primary)',
          fontFamily: mono ? "'JetBrains Mono', monospace" : undefined,
        }}
      >
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
            {value} →
          </a>
        ) : (
          String(value)
        )}
      </dd>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-xs font-semibold uppercase tracking-widest mb-3"
      style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6 }}
    >
      {children}
    </h2>
  );
}

// ─── Air status pill ──────────────────────────────────────────────────────────

function AirStatusPill({ status }: { status: string | null }) {
  if (!status) return null;
  const cfg: Record<string, { label: string; color: string; dot: string }> = {
    on_air:    { label: 'ON AIR',    color: 'var(--status-greenlit)', dot: '#22c55e' },
    available: { label: 'AVAILABLE', color: 'var(--status-inreview)', dot: '#f59e0b' },
    off_air:   { label: 'OFF AIR',   color: 'var(--text-muted)',      dot: '#6b7280' },
  };
  const c = cfg[status] ?? { label: status.toUpperCase(), color: 'var(--text-muted)', dot: '#6b7280' };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold"
      style={{ color: c.color, background: 'var(--bg-elevated)', border: `1px solid ${c.color}33` }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, display: 'inline-block' }} />
      {c.label}
    </span>
  );
}

// ─── Key stat block ───────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === '') return null;
  return (
    <div className="text-center px-4">
      <div
        className="text-2xl font-bold"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", color: 'var(--text-primary)' }}
      >
        {value}
      </div>
      <div className="text-xs uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ShowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const show = await fetchShow(id);
  if (!show) notFound();

  const s = show;
  // Run remaining queries in parallel now that show is available
  const [buyers, deals, similar, articles] = await Promise.all([
    fetchBuyers(s.network_id ?? null),
    fetchDeals(id),
    fetchSimilar(id, s.network_id ?? null, s.genre ?? null),
    fetchArticles(id),
  ]);
  const premiereYear = year(s.premiere_date);
  const offAirYear   = year(s.off_air_date);

  // Parse TVMaze genres JSON if available
  let genreList: string[] = [];
  try {
    if (s.tvmaze_genres) genreList = JSON.parse(s.tvmaze_genres) as string[];
  } catch { /* ignore parse errors */ }

  // Display prodco name: prefer the joined name from production_companies table,
  // fall back to the free-text production_company column
  const prodcoDisplay = s.prodco_name ?? s.production_company;
  const prodco2Display = s.prodco_2_name ?? s.production_company_2;

  return (
    <div className="p-8 max-w-5xl">

      {/* ── Back link ── */}
      <Link
        href="/market/shows"
        className="text-xs font-medium mb-6 inline-flex items-center gap-1"
        style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
      >
        ← Show DB
      </Link>

      {/* ── Header ── */}
      <div className="mt-3 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            {/* MYE badge */}
            {s.is_our_show === 1 && (
              <div className="mb-2">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  MY ENTERTAINMENT
                </span>
              </div>
            )}

            <h1
              className="text-3xl font-black leading-tight mb-2"
              style={{ fontFamily: "'Barlow Condensed', sans-serif", color: 'var(--text-primary)' }}
            >
              {s.title}
            </h1>

            {/* Network + air status + genre chips */}
            <div className="flex items-center gap-2 flex-wrap">
              {s.network && (
                s.network_id ? (
                  <Link
                    href={`/market/networks/${s.network_id}`}
                    className="text-sm font-semibold"
                    style={{ color: 'var(--accent)', textDecoration: 'none' }}
                  >
                    {s.network}
                  </Link>
                ) : (
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    {s.network}
                  </span>
                )
              )}

              <AirStatusPill status={s.air_status} />

              {s.tvmaze_type && (
                <Badge variant="muted">{s.tvmaze_type}</Badge>
              )}

              {/* Genre chips — prefer full TVMaze list, fall back to single genre field */}
              {genreList.length > 0
                ? genreList.map(g => <Badge key={g} variant="muted">{g}</Badge>)
                : s.genre && <Badge variant="muted">{s.genre}</Badge>
              }

              {/* Pending confidence indicator */}
              {s.confidence === 'pending' && (
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
                >
                  ⚠ Pending verification
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Key stats row ── */}
      {(premiereYear || s.total_seasons || s.episode_count || s.schedule || s.runtime_mins) && (
        <Card className="mb-6">
          <div
            className="flex items-center justify-around py-4 divide-x"
            style={{ '--divide-color': 'var(--border-subtle)' } as React.CSSProperties}
          >
            {premiereYear && (
              <Stat
                label={s.air_status === 'off_air' && offAirYear ? `${premiereYear} – ${offAirYear}` : 'Premiered'}
                value={s.air_status === 'off_air' && offAirYear ? `${premiereYear}–${offAirYear}` : premiereYear}
              />
            )}
            {s.total_seasons != null && <Stat label="Seasons" value={s.total_seasons} />}
            {s.episode_count != null && <Stat label="Episodes" value={s.episode_count} />}
            {s.runtime_mins   != null && <Stat label="Runtime"  value={`${s.runtime_mins}m`} />}
            {s.schedule && (
              <div className="text-center px-4">
                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.schedule}</div>
                <div className="text-xs uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-muted)' }}>Schedule</div>
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-6">

        {/* ── Left column: show details ── */}
        <div className="col-span-2 space-y-6">

          {/* Production */}
          <Card>
            <div className="p-4">
              <SectionHeading>Production</SectionHeading>
              <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
                {/* Primary prodco */}
                {prodcoDisplay && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
                      Production Company
                    </dt>
                    <dd className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {s.prodco_id ? (
                        <Link href={`/market/prodcos/${s.prodco_id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                          {prodcoDisplay}
                        </Link>
                      ) : prodcoDisplay}
                    </dd>
                  </div>
                )}

                {/* Second prodco */}
                {prodco2Display && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
                      Co-Producer
                    </dt>
                    <dd className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {s.prodco_2_id ? (
                        <Link href={`/market/prodcos/${s.prodco_2_id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                          {prodco2Display}
                        </Link>
                      ) : prodco2Display}
                    </dd>
                  </div>
                )}

                <Field label="Showrunner"          value={s.showrunner} />
                <Field label="Host / Talent"        value={s.host} />
                <Field label="Executive Producers"  value={s.executive_producers} />
                <Field label="Talent"               value={s.talent} />
                <Field label="Production Type"      value={s.production_type} />
                <Field label="Order Type"           value={s.order_type} />
                <Field label="Format"               value={s.format} />
                <Field label="Season"               value={s.season_number ? `Season ${s.season_number}` : null} />

                {s.greenlit_date && (
                  <Field label="Greenlit"  value={fmt(s.greenlit_date)} />
                )}
                {s.premiere_date && (
                  <Field label="Premiere"  value={fmt(s.premiere_date)} />
                )}
                {s.off_air_date && (
                  <Field label="Off Air"   value={fmt(s.off_air_date)} />
                )}
                {s.production_start && (
                  <Field label="Production Start" value={fmt(s.production_start)} />
                )}
              </dl>
            </div>
          </Card>

          {/* Location */}
          {(s.location_type || s.primary_city || s.primary_state || s.primary_country || s.filming_states || s.location_notes) && (
            <Card>
              <div className="p-4">
                <SectionHeading>Location</SectionHeading>
                <dl className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <Field label="Location Type" value={s.location_type} />
                  <Field label="Primary Location"
                    value={[s.primary_city, s.primary_state, s.primary_country].filter(Boolean).join(', ')} />
                  <Field label="Filming States" value={s.filming_states} />
                  {s.location_notes && (
                    <div className="col-span-2">
                      <Field label="Location Notes" value={s.location_notes} />
                    </div>
                  )}
                </dl>
              </div>
            </Card>
          )}

          {/* Deals — from trade press scraping */}
          {deals.length > 0 && (
            <Card>
              <div className="p-4">
                <SectionHeading>Known Deals</SectionHeading>
                <div className="space-y-3">
                  {deals.map((deal) => (
                    <div
                      key={deal.id}
                      className="flex items-start justify-between gap-4 py-2"
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {deal.deal_type ?? 'Commission'}
                          {deal.buyer_name && <span style={{ color: 'var(--text-muted)' }}> · {deal.buyer_name}</span>}
                          {deal.prodco_name && <span style={{ color: 'var(--text-muted)' }}> · {deal.prodco_name}</span>}
                        </div>
                        {deal.deal_date && (
                          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {fmt(deal.deal_date)}
                          </div>
                        )}
                      </div>
                      {deal.source_url && (
                        <a
                          href={deal.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs shrink-0"
                          style={{ color: 'var(--accent)' }}
                        >
                          {deal.source ?? 'Source'} →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Similar shows */}
          {similar.length > 0 && (
            <div>
              <SectionHeading>Similar Shows</SectionHeading>
              <div className="grid grid-cols-2 gap-3">
                {similar.map((ss) => (
                  <Link
                    key={ss.id as string}
                    href={`/market/shows/${ss.id}`}
                    className="flex items-center justify-between p-3 rounded-md transition-all"
                    style={{ background: 'var(--bg-surface-alt)', textDecoration: 'none' }}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {ss.title}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {ss.network}
                        {ss.total_seasons ? ` · S${ss.total_seasons}` : ''}
                      </div>
                    </div>
                    {ss.air_status && <AirStatusPill status={ss.air_status as string} />}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column: network, buyers, sources ── */}
        <div className="space-y-5">

          {/* Network card */}
          {s.network && (
            <Card>
              <div className="p-4">
                <SectionHeading>Network</SectionHeading>
                <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {s.network_id ? (
                    <Link href={`/market/networks/${s.network_id}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                      {s.network}
                    </Link>
                  ) : s.network}
                </div>
                {s.network_company_type && (
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {s.network_company_type}
                    {s.network_company_tier ? ` · Tier ${s.network_company_tier}` : ''}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Buyers at this network */}
          {buyers.length > 0 && (
            <Card>
              <div className="p-4">
                <SectionHeading>Buyers at {s.network}</SectionHeading>
                <div className="space-y-3">
                  {buyers.map((buyer) => (
                    <Link
                      key={buyer.id}
                      href={`/buyers/${buyer.id}`}
                      className="flex items-start justify-between gap-2"
                      style={{ textDecoration: 'none' }}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: 'var(--accent)' }}>
                          {buyer.name}
                        </div>
                        {buyer.title && (
                          <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                            {buyer.title}
                          </div>
                        )}
                      </div>
                      <span
                        className="text-xs shrink-0 px-1.5 py-0.5 rounded"
                        style={{
                          background: buyer.activity_status === 'active' ? '#22c55e22' : 'var(--bg-elevated)',
                          color: buyer.activity_status === 'active' ? '#22c55e' : 'var(--text-muted)',
                        }}
                      >
                        {buyer.orders_last_365_days > 0 ? `${buyer.orders_last_365_days} orders` : buyer.activity_status}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Data sources — every external ID and trade article linked back to origin */}
          <Card>
            <div className="p-4">
              <SectionHeading>Data Sources</SectionHeading>

              {/* External database links — each verifies a different set of fields */}
              <div className="space-y-2 mb-4">

                {/* TVMaze — air status, schedule, genres, episode counts */}
                <div
                  className="flex items-center justify-between py-1.5 px-2 rounded"
                  style={{ background: s.tvmaze_id ? '#22c55e0d' : 'var(--bg-elevated)' }}
                >
                  <div>
                    <span className="text-xs font-semibold" style={{ color: s.tvmaze_id ? '#22c55e' : 'var(--text-muted)' }}>
                      {s.tvmaze_id ? '✓' : '○'} TVMaze
                    </span>
                    <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                      air status · schedule · genres · episodes
                    </span>
                  </div>
                  {s.tvmaze_id && (
                    <a
                      href={`https://www.tvmaze.com/shows/${s.tvmaze_id}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs shrink-0 ml-2"
                      style={{ color: 'var(--accent)' }}
                    >
                      #{s.tvmaze_id} →
                    </a>
                  )}
                </div>

                {/* IMDb — showrunner, crew, ratings, canonical episode count */}
                <div
                  className="flex items-center justify-between py-1.5 px-2 rounded"
                  style={{ background: s.imdb_id ? '#22c55e0d' : 'var(--bg-elevated)' }}
                >
                  <div>
                    <span className="text-xs font-semibold" style={{ color: s.imdb_id ? '#22c55e' : 'var(--text-muted)' }}>
                      {s.imdb_id ? '✓' : '○'} IMDb
                    </span>
                    <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                      showrunner · crew · ratings · episode count
                    </span>
                  </div>
                  {s.imdb_id && (
                    <a
                      href={`https://www.imdb.com/title/${s.imdb_id}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs shrink-0 ml-2"
                      style={{ color: 'var(--accent)' }}
                    >
                      {s.imdb_id} →
                    </a>
                  )}
                </div>

                {/* TMDB — production company linkage, streaming network verification */}
                <div
                  className="flex items-center justify-between py-1.5 px-2 rounded"
                  style={{ background: s.tmdb_id ? '#22c55e0d' : 'var(--bg-elevated)' }}
                >
                  <div>
                    <span className="text-xs font-semibold" style={{ color: s.tmdb_id ? '#22c55e' : 'var(--text-muted)' }}>
                      {s.tmdb_id ? '✓' : '○'} TMDB
                    </span>
                    <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                      production company · streaming network
                    </span>
                  </div>
                  {s.tmdb_id && (
                    <a
                      href={`https://www.themoviedb.org/tv/${s.tmdb_id}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs shrink-0 ml-2"
                      style={{ color: 'var(--accent)' }}
                    >
                      #{s.tmdb_id} →
                    </a>
                  )}
                </div>

                {/* Trade press — greenlit orders, deals, cancellations */}
                <div
                  className="flex items-center justify-between py-1.5 px-2 rounded"
                  style={{ background: s.source_url ? '#22c55e0d' : 'var(--bg-elevated)' }}
                >
                  <div>
                    <span className="text-xs font-semibold" style={{ color: s.source_url ? '#22c55e' : 'var(--text-muted)' }}>
                      {s.source_url ? '✓' : '○'} {s.source ? s.source.charAt(0).toUpperCase() + s.source.slice(1) : 'Trade Press'}
                    </span>
                    <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                      greenlit date · deals · cancellations
                    </span>
                  </div>
                  {s.source_url && (
                    <a
                      href={s.source_url}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs shrink-0 ml-2"
                      style={{ color: 'var(--accent)' }}
                    >
                      article →
                    </a>
                  )}
                </div>

              </div>

              {/* Confidence + last updated */}
              <div
                className="flex items-center justify-between pt-2"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <span
                  className="text-xs px-2 py-0.5 rounded font-medium"
                  style={{
                    background: s.confidence === 'confirmed' ? '#22c55e22' : 'var(--bg-elevated)',
                    color: s.confidence === 'confirmed' ? '#22c55e' : 'var(--text-muted)',
                  }}
                >
                  {s.confidence === 'confirmed' ? '✓ Confirmed' : '⚠ Pending verification'}
                </span>
                {s.updated_at && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Updated {fmt(s.updated_at)}
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Notes */}
          {s.notes && (
            <Card>
              <div className="p-4">
                <SectionHeading>Notes</SectionHeading>
                <p className="text-sm" style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                  {s.notes}
                </p>
              </div>
            </Card>
          )}

          {/* Trade Press — articles linked via entity_article_links, only rendered when there is data */}
          {articles.length > 0 && (
            <Card>
              <div className="p-4">
                <SectionHeading>Trade Press</SectionHeading>
                <div className="space-y-0">
                  {articles.map((article, idx) => (
                    <div key={article.id}>
                      <div className="py-2.5">
                        {/* Headline — truncated to 2 lines, links to original article */}
                        <a
                          href={article.url ?? '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium leading-snug"
                          style={{
                            color: 'var(--accent)',
                            textDecoration: 'none',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {article.headline ?? '(No headline)'}
                        </a>

                        {/* Source + type + date row */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {article.source && (
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {article.source}
                            </span>
                          )}
                          {article.item_type && (
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              · {article.item_type}
                            </span>
                          )}
                          {article.scraped_at && (
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              · {fmt(article.scraped_at)}
                            </span>
                          )}
                          {/* Auto-applied indicator — surfaced when the article triggered a field update */}
                          {article.auto_applied === 1 && article.applied_field && (
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              · ✏ auto-updated
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Divider between articles, not after the last one */}
                      {idx < articles.length - 1 && (
                        <div style={{ height: 1, background: 'var(--border-subtle)' }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
