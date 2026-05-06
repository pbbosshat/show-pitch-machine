'use client';
// BuyerTabs — client component for the five-tab profile section on the buyer detail page.
// Also owns the "Copy Claude Code Prompt" button since clipboard API requires a client context.

import { useState, useEffect } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';
import useSWR from 'swr';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import type { MandateUpdate, MarketOrder, Pitch, TriangulationRow, ProdcoStrategicTag } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type TabId = 'mandate' | 'greenlits' | 'mye' | 'career' | 'prodcos' | 'email' | 'articles';

const TABS: { id: TabId; label: string }[] = [
  { id: 'mandate',   label: 'Mandate History' },
  { id: 'greenlits', label: 'Their Greenlits' },
  { id: 'mye',       label: 'MYE History' },
  { id: 'career',    label: 'Career' },
  { id: 'prodcos',   label: 'Prod Cos' },
  { id: 'email',     label: 'Email' },
  { id: 'articles',  label: 'Trade Press' },
];

interface EmployerHistoryEntry {
  id: string;
  company_name: string;
  company_type: string | null;
  title: string | null;
  is_buyer_seat: number;
  start_date: number | null;
  end_date: number | null;
}

// Gmail thread summary — returned by GET /api/buyers/[id] since Phase 2B
interface EmailThreadSummary {
  id: string;
  thread_id: string;
  subject: string | null;
  participants: string;
  first_message_date: string | null;
  last_message_date: string | null;
  message_count: number;
  snippet: string | null;
  direction: string | null;
}

// Full message returned by GET /api/gmail/thread/[thread_id]
interface EmailMessage {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  date: string;
  internalDate: string | null;
  body: string;
}

// Joined record from entity_article_links + trade_articles
interface ArticleLink {
  id: string;
  headline: string | null;
  url: string | null;
  source: string | null;
  item_type: string | null;
  scraped_at: number | null;
  signal_type: string | null;
  link_reason: string | null;
  auto_applied: number;
  applied_field: string | null;
  applied_value: string | null;
}

// Pitch extended with ip_title from the mye-history JOIN
type PitchWithTitle = Pitch & { ip_title?: string | null };

interface BuyerTabsProps {
  buyerId: string;
  buyerName: string;
  mandateHistory: MandateUpdate[];
  greenlits: MarketOrder[];
  myeHistory: PitchWithTitle[];
  companyHistory: string | null;
  // Structured employer history from buyer_employer_history table (migration 006+)
  employerHistory: EmployerHistoryEntry[];
  prodcoCount: number;
  // Gmail thread summaries — already fetched by the server component via GET /api/buyers/[id]
  emailThreads?: EmailThreadSummary[];
}

// Maps strategic tag to badge variant — same as ProdcosClient for visual consistency
function strategicTagVariant(tag: string | null): 'greenlit' | 'inreview' | 'pass' | 'muted' {
  if (!tag) return 'muted';
  if (tag === 'co_pro_partner')     return 'greenlit';
  if (tag === 'acquisition_target') return 'inreview';
  if (tag === 'competitor')         return 'pass';
  return 'muted';
}

// Maps entity_article_links.link_reason to a badge variant
function linkReasonVariant(reason: string | null): 'greenlit' | 'inreview' | 'pass' | 'muted' {
  if (reason === 'exec_move')  return 'inreview';
  if (reason === 'cancelled')  return 'pass';
  if (reason === 'mandate')    return 'greenlit';
  if (reason === 'greenlit')   return 'greenlit';
  return 'muted';
}

// Map pitch outcome strings to badge variants
function outcomeVariant(outcome: string | null): 'greenlit' | 'pass' | 'inreview' | 'muted' {
  if (!outcome) return 'muted';
  const o = outcome.toLowerCase();
  if (o.includes('green') || o.includes('order')) return 'greenlit';
  if (o.includes('pass') || o.includes('reject')) return 'pass';
  if (o.includes('review') || o.includes('consider')) return 'inreview';
  return 'muted';
}

export default function BuyerTabs({
  buyerId,
  buyerName,
  mandateHistory,
  greenlits,
  myeHistory,
  companyHistory,
  employerHistory,
  prodcoCount,
  emailThreads = [],
}: BuyerTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('mandate');
  const [copied, setCopied] = useState(false);
  const [selectedThread, setSelectedThread] = useState<EmailThreadSummary | null>(null);
  const [threadMessages, setThreadMessages] = useState<EmailMessage[] | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);

  const claudePrompt = `Using the Show Pitch Machine MCP, pull the full profile for ${buyerName} and give me a strategic briefing on what MYE should pitch them right now, given our current catalog and their recent activity.`;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(claudePrompt);
      setCopied(true);
      // Reset after 2 seconds so the button is re-usable
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Clipboard write failed:', err);
    }
  };

  function closeThreadModal() {
    setSelectedThread(null);
    setThreadMessages(null);
  }

  async function handleEmailClick(thread: EmailThreadSummary) {
    setSelectedThread(thread);
    setThreadMessages(null);
    setThreadLoading(true);
    try {
      const res = await fetch(`/api/gmail/thread/${thread.thread_id}`);
      const data = await res.json();
      setThreadMessages(data.messages ?? []);
    } catch (err) {
      console.error('[email modal] fetch failed:', err);
      setThreadMessages([]);
    } finally {
      setThreadLoading(false);
    }
  }

  // Close modal on Escape key
  useEffect(() => {
    if (!selectedThread) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeThreadModal(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectedThread]);

  // Always call — hooks must be unconditional, but we only render the result in the prodcos tab
  const { data: prodcosData } = useSWR(
    `/api/intelligence/triangulation?buyer_id=${buyerId}`,
    fetcher
  );
  const prodcoRows: (TriangulationRow & { strategic_tag?: ProdcoStrategicTag })[] =
    prodcosData?.data ?? prodcosData ?? [];

  // Always call — articles tab SWR, rendered only when activeTab === 'articles'
  const { data: articlesData } = useSWR(
    `/api/buyers/${buyerId}/articles`,
    fetcher
  );
  const articleRows: ArticleLink[] = articlesData?.data ?? [];

  // Parse company_history JSON — stored as a JSON string in the DB
  let careerTimeline: { company: string; title: string; from?: string; to?: string }[] = [];
  if (companyHistory) {
    try {
      careerTimeline = JSON.parse(companyHistory);
    } catch {
      // Malformed JSON — show raw string as a fallback
    }
  }

  return (
    <div className="space-y-4">
      {/* Tab bar + Copy Prompt button row */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)]">
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px"
              style={{
                borderBottomColor: activeTab === tab.id ? 'var(--accent)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
                transition: 'color var(--motion-base) var(--ease), border-color var(--motion-base) var(--ease)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Clipboard button — copies the exact MCP prompt */}
        <Button variant="ghost" size="sm" onClick={handleCopyPrompt}>
          {copied ? '✓ Copied' : 'Copy Claude Code Prompt'}
        </Button>
      </div>

      {/* ── Mandate History ── */}
      {activeTab === 'mandate' && (
        <div className="space-y-2">
          {mandateHistory.length === 0 ? (
            <EmptyState message="No mandate history on record" />
          ) : (
            mandateHistory.map((m) => (
              <Card key={m.id}>
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {m.statement}
                  </p>
                  {m.stated_date && (
                    <span
                      className="text-xs shrink-0"
                      style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }}
                    >
                      {format(new Date(m.stated_date), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
                {m.source && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Source: {m.source}
                    </span>
                    {m.source_url && (
                      <a
                        href={m.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs underline"
                        style={{ color: 'var(--accent)' }}
                      >
                        View
                      </a>
                    )}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── Their Greenlits ── */}
      {activeTab === 'greenlits' && (
        <div className="grid grid-cols-2 gap-3">
          {greenlits.length === 0 ? (
            <div className="col-span-2"><EmptyState message="No greenlit orders on record" /></div>
          ) : (
            greenlits.map((order) => (
              <Card key={order.id}>
                <p
                  className="text-base font-bold"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, color: 'var(--text-primary)' }}
                >
                  {order.show_title ?? 'Untitled'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {order.network ?? '—'}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {order.genre && <Badge label={order.genre} variant="muted" />}
                  {order.format && (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{order.format}</span>
                  )}
                  {order.episode_count != null && (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {order.episode_count} eps
                    </span>
                  )}
                </div>
                {order.order_date && (
                  <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                    {format(new Date(order.order_date), 'MMM d, yyyy')}
                  </p>
                )}
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── MYE History — timeline of pitches ── */}
      {activeTab === 'mye' && (
        <div className="space-y-0">
          {myeHistory.length === 0 ? (
            <EmptyState message="No MYE pitch history on record" />
          ) : (
            <div className="relative pl-4 border-l-2 border-[var(--border-subtle)] space-y-6 ml-2">
              {myeHistory.map((pitch) => (
                <div key={pitch.id} className="relative">
                  {/* Timeline dot */}
                  <span
                    className="absolute -left-[17px] top-1 w-3 h-3 rounded-full border-2 border-[var(--bg-surface)]"
                    style={{ background: 'var(--border-strong)' }}
                  />

                  <div className="space-y-1">
                    {/* Date */}
                    {pitch.pitch_date && (
                      <p
                        className="text-xs"
                        style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }}
                      >
                        {format(new Date(pitch.pitch_date), 'MMM d, yyyy')}
                      </p>
                    )}

                    {/* IP reference — prefer title from ip_catalog JOIN, fall back to raw ID */}
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {pitch.ip_title ?? pitch.ip_id ?? 'Unknown'}
                    </p>

                    {/* Format + outcome */}
                    <div className="flex items-center gap-2">
                      {pitch.format_pitched && (
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {pitch.format_pitched}
                        </span>
                      )}
                      {pitch.outcome && (
                        <Badge label={pitch.outcome} variant={outcomeVariant(pitch.outcome)} />
                      )}
                    </div>

                    {/* Pass reason if rejected */}
                    {pitch.pass_reason && (
                      <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>
                        {pitch.pass_reason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Career — prefers structured employer_history; falls back to legacy JSON ── */}
      {activeTab === 'career' && (
        <div className="space-y-2">
          {employerHistory.length > 0 ? (
            // Structured data from buyer_employer_history table — includes is_buyer_seat flag
            <div className="relative pl-4 border-l-2 border-[var(--border-subtle)] space-y-5 ml-2">
              {employerHistory.map((role) => (
                <div key={role.id} className="relative">
                  <span
                    className="absolute -left-[17px] top-1 w-3 h-3 rounded-full border-2 border-[var(--bg-surface)]"
                    style={{ background: 'var(--accent)' }}
                  />
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {role.title ?? 'Unknown Title'}
                    </p>
                    {/* Buyer badge only on roles that were actual buying seats */}
                    {role.is_buyer_seat === 1 && (
                      <Badge label="Buyer" variant="greenlit" />
                    )}
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {role.company_name}
                    {role.company_type && (
                      <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
                        ({role.company_type})
                      </span>
                    )}
                  </p>
                  {(role.start_date || role.end_date) && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {role.start_date ? format(new Date(role.start_date), 'yyyy') : '?'}
                      {' — '}
                      {role.end_date ? format(new Date(role.end_date), 'yyyy') : 'Present'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : careerTimeline.length > 0 ? (
            // Legacy JSON fallback — same visual style as structured data
            <div className="relative pl-4 border-l-2 border-[var(--border-subtle)] space-y-5 ml-2">
              {careerTimeline.map((role, i) => (
                <div key={i} className="relative">
                  <span
                    className="absolute -left-[17px] top-1 w-3 h-3 rounded-full border-2 border-[var(--bg-surface)]"
                    style={{ background: 'var(--accent)' }}
                  />
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {role.title}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {role.company}
                  </p>
                  {(role.from || role.to) && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {role.from ?? '?'} — {role.to ?? 'Present'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : companyHistory ? (
            // Unparseable legacy JSON — show raw so the user can still read it
            <Card>
              <pre
                className="text-xs whitespace-pre-wrap"
                style={{ color: 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}
              >
                {companyHistory}
              </pre>
            </Card>
          ) : (
            <EmptyState message="No career history on record" />
          )}
        </div>
      )}

      {/* ── Email Communication — Gmail threads linked to this buyer contact ── */}
      {activeTab === 'email' && (
        <div className="space-y-0">
          <h2
            className="text-base mb-4"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, color: 'var(--text-primary)' }}
          >
            Email Communication
          </h2>
          {emailThreads.length === 0 ? (
            <EmptyState message="No Gmail threads found for this contact." />
          ) : (
            <div className="space-y-0">
              {emailThreads.map((thread, idx) => (
                <div key={thread.id}>
                  <button
                    className="w-full text-left py-4 rounded transition-colors"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-alt)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    onClick={() => handleEmailClick(thread)}
                  >
                    {/* Subject + direction badge on the same row */}
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {thread.subject ?? '(No subject)'}
                      </p>
                      {/* Direction badge — inline styled, not the Badge component, per spec */}
                      {thread.direction === 'inbound' ? (
                        <span
                          className="px-2 py-0.5 text-xs rounded font-semibold"
                          style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}
                        >
                          Received
                        </span>
                      ) : thread.direction === 'outbound' ? (
                        <span
                          className="px-2 py-0.5 text-xs rounded font-semibold"
                          style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' }}
                        >
                          Sent
                        </span>
                      ) : null}
                    </div>

                    {/* Message count + date range */}
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                      {thread.message_count} message{thread.message_count !== 1 ? 's' : ''}
                      {(thread.first_message_date || thread.last_message_date) && (
                        <>
                          {' · '}
                          {thread.first_message_date ? thread.first_message_date.substring(0, 10) : '?'}
                          {thread.first_message_date !== thread.last_message_date && thread.last_message_date && (
                            <> → {thread.last_message_date.substring(0, 10)}</>
                          )}
                        </>
                      )}
                    </p>

                    {/* Snippet — muted text, hard-capped at 120 chars */}
                    {thread.snippet && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {thread.snippet.length > 120
                          ? thread.snippet.substring(0, 120) + '…'
                          : thread.snippet}
                      </p>
                    )}
                  </button>

                  {/* Divider between threads, but not after the last one */}
                  {idx < emailThreads.length - 1 && (
                    <div style={{ height: 1, background: 'var(--border-subtle)' }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Prod Cos — production companies this buyer has worked with via deals ── */}
      {activeTab === 'prodcos' && (
        <div className="space-y-2">
          {prodcoRows.length === 0 ? (
            <EmptyState message="No deal data on record for this buyer" />
          ) : (
            prodcoRows.map((row) => (
              <Link
                key={`${row.buyer_id}-${row.prodco_id}`}
                href={`/market/prodcos/${row.prodco_id}`}
                style={{ textDecoration: 'none' }}
              >
                <Card className="hover:bg-[var(--bg-surface-alt)] transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {row.prodco_name}
                        </p>
                        {row.strategic_tag && (
                          <Badge
                            label={row.strategic_tag.replace(/_/g, ' ')}
                            variant={strategicTagVariant(row.strategic_tag)}
                          />
                        )}
                      </div>
                      {/* Genres joined with middle dot */}
                      {row.genres?.length > 0 && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {row.genres.join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className="text-sm font-bold"
                        style={{ color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {row.deal_count} deal{row.deal_count !== 1 ? 's' : ''}
                      </span>
                      {row.last_deal_date && (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Last: {format(new Date(row.last_deal_date), 'MMM yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      )}

      {/* ── Trade Press — linked trade articles from entity_article_links ── */}
      {activeTab === 'articles' && (
        <div className="space-y-0">
          {articleRows.length === 0 ? (
            <EmptyState message="No trade press coverage linked yet" />
          ) : (
            <div className="space-y-0">
              {articleRows.map((article, idx) => (
                <div key={article.id}>
                  <div className="py-3">
                    {/* Headline row — clickable link to original article */}
                    <div className="flex items-start justify-between gap-3 mb-1.5 flex-wrap">
                      <a
                        href={article.url ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium leading-snug flex-1 min-w-0"
                        style={{ color: 'var(--accent)', textDecoration: 'none' }}
                      >
                        {article.headline ?? '(No headline)'}
                      </a>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Source chip */}
                        {article.source && (
                          <span
                            className="px-2 py-0.5 text-xs rounded"
                            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                          >
                            {article.source}
                          </span>
                        )}
                        {/* Scraped date */}
                        {article.scraped_at && (
                          <span
                            className="text-xs"
                            style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}
                          >
                            {new Date(article.scraped_at).toLocaleDateString('en-US', {
                              year: 'numeric', month: 'short', day: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Second row — link_reason badge + auto-applied note */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {article.link_reason && (
                        <Badge
                          label={article.link_reason.replace(/_/g, ' ')}
                          variant={linkReasonVariant(article.link_reason)}
                        />
                      )}
                      {article.auto_applied === 1 && article.applied_field && (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          ✏ updated {article.applied_field}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Divider between articles, not after the last one */}
                  {idx < articleRows.length - 1 && (
                    <div style={{ height: 1, background: 'var(--border-subtle)' }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Email thread modal ── */}
      {selectedThread && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={closeThreadModal}
        >
          <div
            className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-lg p-6"
            style={{ background: 'var(--bg-surface)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {selectedThread.subject ?? '(No subject)'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {selectedThread.message_count} message{selectedThread.message_count !== 1 ? 's' : ''}
                  {selectedThread.first_message_date && ` · ${selectedThread.first_message_date.substring(0, 10)}`}
                  {selectedThread.first_message_date !== selectedThread.last_message_date && selectedThread.last_message_date && (
                    <> → {selectedThread.last_message_date.substring(0, 10)}</>
                  )}
                </p>
              </div>
              <button
                onClick={closeThreadModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1, color: 'var(--text-muted)', padding: '0 4px' }}
              >
                ×
              </button>
            </div>

            {/* Messages */}
            {threadLoading ? (
              <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                Loading messages…
              </p>
            ) : threadMessages && threadMessages.length > 0 ? (
              <div className="space-y-4">
                {threadMessages.map((msg, i) => (
                  <div
                    key={msg.id || i}
                    className="rounded-md p-4"
                    style={{ background: 'var(--bg-surface-alt)', borderLeft: '3px solid var(--border-strong)' }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        {msg.sender || '—'}
                      </p>
                      <p className="text-xs shrink-0" style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {msg.internalDate
                          ? new Date(parseInt(msg.internalDate)).toLocaleString()
                          : msg.date}
                      </p>
                    </div>
                    <pre
                      className="text-xs leading-relaxed"
                      style={{ color: 'var(--text-primary)', fontFamily: 'inherit', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                    >
                      {msg.body || '(No body)'}
                    </pre>
                  </div>
                ))}
              </div>
            ) : threadMessages !== null ? (
              <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
                Could not load messages from Gmail.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable empty state inside the tab panel
function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
        {message}
      </p>
    </Card>
  );
}
