import { notFound } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import UnverifiedSection from '@/components/ui/UnverifiedSection';
import { query, queryOne } from '@/lib/db';
import type { ProductionCompany, Deal, ProdcoStrategicTag, ProdcoContact } from '@/types';

function strategicTagVariant(tag: ProdcoStrategicTag | null): 'greenlit' | 'inreview' | 'pass' | 'muted' {
  if (!tag) return 'muted';
  if (tag === 'co_pro_partner')     return 'greenlit';
  if (tag === 'acquisition_target') return 'inreview';
  if (tag === 'competitor')         return 'pass';
  return 'muted';
}

function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function countryBadgeStyle(country: string | null): React.CSSProperties {
  if (country === 'CA') return { background: '#1a4fa0', color: '#fff' };
  if (country === 'US') return { background: '#8a5a00', color: '#fff' };
  if (country === 'UK') return { background: '#5a1a8a', color: '#fff' };
  return { background: 'var(--bg-elevated)', color: 'var(--text-muted)' };
}

interface ProdcoBuyer {
  buyer_id: string;
  buyer_name: string;
  buyer_title: string | null;
  buyer_network: string | null;
  deal_count: number;
  last_deal_date: number | null;
}

// Joined shape from entity_article_links + trade_articles for the articles section
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

// Fetches trade articles linked to this production company via entity_article_links.
// entity_type = 'production_company' scopes to the prodco dimension.
// Capped at 20 most-recent articles.
// Async because query() returns a Promise in Postgres mode
async function fetchArticles(prodcoId: string): Promise<ArticleLink[]> {
  return query<ArticleLink>(
    `SELECT ta.id, ta.headline, ta.url, ta.source, ta.item_type, ta.scraped_at,
            eal.auto_applied, eal.applied_field
     FROM entity_article_links eal
     JOIN trade_articles ta ON ta.id = eal.article_id
     WHERE eal.entity_type = 'production_company' AND eal.entity_id = ?
     ORDER BY ta.scraped_at DESC
     LIMIT 20`,
    [prodcoId]
  );
}

interface ProdcoDetail extends ProductionCompany {
  deal_count: number;
  contact_count?: number;
  // Added in migration 015 — not yet in the shared ProductionCompany type
  is_verified: number;
}

export default async function ProdcoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Run the primary lookup first, then parallelize the dependent queries
  const prodco = await queryOne<ProdcoDetail>(
    `SELECT pc.*,
       (SELECT COUNT(*) FROM deals d WHERE d.prodco_id = pc.id) AS deal_count,
       (SELECT COUNT(*) FROM prodco_contacts pc2 WHERE pc2.prodco_id = pc.id) AS contact_count
     FROM production_companies pc WHERE pc.id = ?`,
    [id]
  );
  if (!prodco) notFound();

  const [contacts, buyers, deals, articles] = await Promise.all([
    query<ProdcoContact>(
      `SELECT * FROM prodco_contacts WHERE prodco_id = ? ORDER BY is_owner DESC, name ASC`,
      [id]
    ),
    query<ProdcoBuyer>(
      `SELECT bc.id AS buyer_id, bc.name AS buyer_name, bc.title AS buyer_title,
              bco.name AS buyer_network,
              COUNT(d.id) AS deal_count,
              MAX(d.deal_date) AS last_deal_date
       FROM deals d
       JOIN buyer_contacts bc ON bc.id = d.buyer_id
       LEFT JOIN buyer_companies bco ON bco.id = d.network_id
       WHERE d.prodco_id = ?
       GROUP BY bc.id ORDER BY deal_count DESC`,
      [id]
    ),
    query<Deal>(
      `SELECT * FROM deals WHERE prodco_id = ? ORDER BY deal_date DESC LIMIT 20`,
      [id]
    ),
    fetchArticles(id),
  ]);

  const contactList = contacts;
  const buyerList   = buyers;
  const dealList    = deals;
  const dealCount   = prodco!.deal_count ?? 0;
  const contactCount = prodco!.contact_count ?? contactList.length;

  const currentShows    = parseJsonArray(prodco.current_shows);
  const currentNetworks = parseJsonArray(prodco.current_networks);

  const hasSocials = !!(
    prodco.linkedin_url ||
    prodco.twitter_url ||
    prodco.youtube_url ||
    prodco.facebook_url ||
    prodco.email ||
    prodco.phone
  );

  const hasProgramming = currentShows.length > 0 || currentNetworks.length > 0;

  return (
    <div className="p-8 max-w-6xl">

      {/* ── Header ── */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-1">
          <div>
            <h1
              className="text-3xl"
              style={{ color: 'var(--text-primary)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, lineHeight: 1.1 }}
            >
              {prodco.name}
            </h1>

            <p className="text-sm mt-1 flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--text-secondary)' }}>
              {prodco.country && (
                <span
                  className="px-1.5 py-0.5 text-xs rounded font-bold"
                  style={countryBadgeStyle(prodco.country)}
                >
                  {prodco.country}
                </span>
              )}
              {(prodco.hq_city || prodco.region) && (
                <span>
                  {prodco.hq_city ?? prodco.region?.split(' - ')[0]}
                </span>
              )}
              {prodco.organization_type && (
                <>
                  <span style={{ color: 'var(--text-muted)' }}>·</span>
                  <span>{prodco.organization_type}</span>
                </>
              )}
              {prodco.employee_count && (
                <>
                  <span style={{ color: 'var(--text-muted)' }}>·</span>
                  <span>{prodco.employee_count} employees</span>
                </>
              )}
              {prodco.primary_platform && (
                <>
                  <span style={{ color: 'var(--text-muted)' }}>·</span>
                  <span>{prodco.primary_platform}</span>
                </>
              )}
              {prodco.production_model && (
                <>
                  <span style={{ color: 'var(--text-muted)' }}>·</span>
                  <span>{prodco.production_model}</span>
                </>
              )}
            </p>

            {prodco.website && (
              <a
                href={prodco.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs mt-1 inline-block"
                style={{ color: 'var(--accent)', textDecoration: 'none' }}
              >
                ↗ {prodco.website}
              </a>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {!!prodco.is_cmpa_member && (
              <span
                className="px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                style={{ background: '#0d6e6e', color: '#5eead4', letterSpacing: '0.05em' }}
              >
                ✓ CMPA Member
              </span>
            )}
            <Badge
              label={prodco.strategic_tag?.replace(/_/g, ' ') ?? 'untagged'}
              variant={strategicTagVariant(prodco.strategic_tag)}
            />
            {prodco.contact_status === 'Y' ? (
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
                style={{ background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}
              >
                <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }} />
                Contacted
              </span>
            ) : (
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: 'var(--bg-surface-alt)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
              >
                Not Yet
              </span>
            )}
            <span
              className="px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'var(--bg-surface-alt)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
            >
              {dealCount} deal{dealCount !== 1 ? 's' : ''}
            </span>
            <span
              className="px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'var(--bg-surface-alt)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
            >
              {contactCount} contact{contactCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Unverified data callout — shows when production company data has not been manually confirmed */}
      <UnverifiedSection
        entityId={prodco.id}
        entityType="prodco"
        verifyEndpoint={`/api/prodcos/${prodco.id}/verify`}
        isVerified={prodco.is_verified ?? 0}
        fields={[
          { label: 'Website', value: prodco.website ?? null, fieldName: 'website' },
          { label: 'HQ City', value: prodco.hq_city ?? null, fieldName: 'hq_city' },
        ]}
      />

      {/* ── Bio ── */}
      {prodco.bio && (
        <blockquote
          className="mb-6 px-4 py-3 rounded-md text-sm italic"
          style={{ borderLeft: '3px solid var(--accent)', background: 'var(--bg-surface-alt)', color: 'var(--text-secondary)' }}
        >
          {prodco.bio}
        </blockquote>
      )}

      {/* ── Social / contact info strip ── */}
      {hasSocials && (
        <div className="flex items-center gap-5 flex-wrap mb-6 px-4 py-3 rounded-lg" style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-subtle)' }}>

          {prodco.linkedin_url && (
            <a href={prodco.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="3" />
                <path d="M7 10v7M7 7v.01M12 10v7M12 13a3 3 0 0 1 6 0v4" />
              </svg>
              LinkedIn
            </a>
          )}

          {prodco.twitter_url && (
            <a href={prodco.twitter_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4l16 16M4 20L20 4" />
              </svg>
              Twitter / X
            </a>
          )}

          {prodco.youtube_url && (
            <a href={prodco.youtube_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="3" />
                <polygon points="10 9 15 12 10 15" fill="currentColor" stroke="none" />
              </svg>
              YouTube
            </a>
          )}

          {prodco.facebook_url && (
            <a href={prodco.facebook_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
              Facebook
            </a>
          )}

          {prodco.email && (
            <a href={`mailto:${prodco.email}`} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M2 7l10 7 10-7" />
              </svg>
              {prodco.email}
            </a>
          )}

          {prodco.phone && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12 19.79 19.79 0 0 1 1.08 3.45 2 2 0 0 1 3.05 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16.92z" />
              </svg>
              {prodco.phone}
            </span>
          )}
        </div>
      )}

      {/* ── Current Programming ── */}
      {hasProgramming && (
        <div className="mb-6">
          <h2
            className="text-base mb-3"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: 'var(--text-primary)' }}
          >
            Current Programming
          </h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Active Shows
              </p>
              {currentShows.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>—</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {currentShows.map((show, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-xs rounded-full border"
                      style={{
                        borderColor: 'var(--border-subtle)',
                        background: 'var(--bg-surface-alt)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {show}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Networks
              </p>
              {currentNetworks.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>—</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {currentNetworks.map((net, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 text-xs rounded-full border"
                      style={{
                        borderColor: 'var(--border-subtle)',
                        background: 'var(--bg-surface-alt)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {net}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Key Contacts ── */}
      <div className="mb-6">
        <h2
          className="text-base mb-3"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: 'var(--text-primary)' }}
        >
          Key Contacts
        </h2>
        {contactList.length === 0 ? (
          <Card>
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
              No contacts on record for this company
            </p>
          </Card>
        ) : (
          <Card>
            <div className="space-y-0">
              {contactList.map((contact, idx) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-4 py-2.5"
                  style={{
                    borderBottom: idx < contactList.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  }}
                >
                  <div style={{ flex: '0 0 220px', minWidth: 0 }}>
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {contact.name}
                    </span>
                    {contact.is_owner === 1 && (
                      <span
                        className="ml-2 px-1.5 py-0.5 text-xs rounded font-semibold"
                        style={{ background: 'rgba(234,179,8,0.15)', color: 'var(--status-inreview)', verticalAlign: 'middle' }}
                      >
                        Owner
                      </span>
                    )}
                  </div>

                  <div style={{ flex: '0 0 180px', minWidth: 0 }}>
                    <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                      {contact.title ?? '—'}
                    </span>
                  </div>

                  <div style={{ flex: '1 1 0', minWidth: 0 }}>
                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-xs"
                        style={{ color: 'var(--accent)', textDecoration: 'none' }}
                      >
                        {contact.email}
                      </a>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </div>

                  <div style={{ flex: '0 0 140px', minWidth: 0 }}>
                    {contact.phone ? (
                      <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {contact.phone}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </div>

                  <div style={{ flex: '0 0 120px' }}>
                    {contact.outreach_status === 'RESPONDED' && (
                      <span
                        className="px-2 py-0.5 text-xs rounded font-semibold"
                        style={{ background: '#14532d', color: '#4ade80' }}
                      >
                        Responded
                      </span>
                    )}
                    {contact.outreach_status === 'EMAIL_OPENED' && (
                      <span
                        className="px-2 py-0.5 text-xs rounded font-semibold"
                        style={{ background: '#451a03', color: '#fbbf24' }}
                      >
                        Opened
                      </span>
                    )}
                    {contact.outreach_status === 'EMAIL_SENT' && (
                      <span
                        className="px-2 py-0.5 text-xs rounded font-semibold"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                      >
                        Sent
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* ── Deals + Buyers grid ── */}
      <div className="grid gap-6" style={{ gridTemplateColumns: '2fr 1fr' }}>

        <div>
          <h2
            className="text-base font-semibold mb-3"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, color: 'var(--text-primary)' }}
          >
            Recent Deals
          </h2>
          {dealList.length === 0 ? (
            <Card>
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
                No deals on record for this production company
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {dealList.map((deal) => (
                <Card key={deal.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {deal.show_title ?? 'Untitled'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {[deal.network_name, deal.genre, deal.format].filter(Boolean).join(' · ')}
                      </p>
                      {deal.buyer_name && (
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                          Buyer: {deal.buyer_name}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {deal.deal_date && (
                        <span
                          className="text-xs"
                          style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }}
                        >
                          {format(new Date(deal.deal_date), 'MMM d, yyyy')}
                        </span>
                      )}
                      {deal.source_url && (
                        <a
                          href={deal.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs"
                          style={{ color: 'var(--accent)' }}
                        >
                          Source →
                        </a>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2
            className="text-base font-semibold mb-3"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, color: 'var(--text-primary)' }}
          >
            Buyers
          </h2>
          {buyerList.length === 0 ? (
            <Card>
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
                No buyer relationships on record
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {buyerList.map((b) => (
                <Link key={b.buyer_id} href={`/buyers/${b.buyer_id}`} style={{ textDecoration: 'none' }}>
                  <Card className="hover:bg-[var(--bg-surface-alt)] transition-colors cursor-pointer">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {b.buyer_name}
                    </p>
                    {b.buyer_title && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {b.buyer_title}
                        {b.buyer_network && ` · ${b.buyer_network}`}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {b.deal_count} deal{b.deal_count !== 1 ? 's' : ''} together
                      </span>
                      {b.last_deal_date && (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Last: {format(new Date(b.last_deal_date), 'MMM yyyy')}
                        </span>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Trade Press — articles linked via entity_article_links, only rendered when data exists ── */}
      {articles.length > 0 && (
        <div className="mt-8">
          <h2
            className="text-base font-semibold mb-3"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, color: 'var(--text-primary)' }}
          >
            Trade Press
          </h2>
          <Card>
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

                    {/* Source + item type + date row */}
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
                          · {format(new Date(article.scraped_at), 'MMM d, yyyy')}
                        </span>
                      )}
                      {/* Auto-applied indicator — surfaces when the article triggered a field update */}
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
          </Card>
        </div>
      )}

    </div>
  );
}
