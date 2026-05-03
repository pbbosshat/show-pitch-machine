'use client';
// BuyerTabs — client component for the four-tab profile section on the buyer detail page.
// Also owns the "Copy Claude Code Prompt" button since clipboard API requires a client context.

import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import type { MandateUpdate, MarketOrder, Pitch } from '@/types';

type TabId = 'mandate' | 'greenlits' | 'mye' | 'career';

const TABS: { id: TabId; label: string }[] = [
  { id: 'mandate',   label: 'Mandate History' },
  { id: 'greenlits', label: 'Their Greenlits' },
  { id: 'mye',       label: 'MYE History' },
  { id: 'career',    label: 'Career' },
];

interface BuyerTabsProps {
  buyerId: string;
  buyerName: string;
  mandateHistory: MandateUpdate[];
  greenlits: MarketOrder[];
  myeHistory: Pitch[];
  companyHistory: string | null;
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
  buyerName,
  mandateHistory,
  greenlits,
  myeHistory,
  companyHistory,
}: BuyerTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('mandate');
  const [copied, setCopied] = useState(false);

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

                    {/* IP reference */}
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      IP: {pitch.ip_id ?? 'Unknown'}
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

      {/* ── Career — company history JSON rendered as timeline ── */}
      {activeTab === 'career' && (
        <div className="space-y-2">
          {careerTimeline.length === 0 ? (
            companyHistory ? (
              // Unparseable JSON — show raw text so the user can still read it
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
            )
          ) : (
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
          )}
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
