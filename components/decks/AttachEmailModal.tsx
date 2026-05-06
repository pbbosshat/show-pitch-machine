'use client';
/**
 * AttachEmailModal — full-screen overlay that lets the user search unlinked
 * emails and attach one or more to this deck (and optionally a buyer contact).
 *
 * Search queries GET /api/emails/search?q=...&limit=25
 * Attach calls POST /api/deck-sites/[deckId]/emails/attach for each selection.
 *
 * Props:
 *   deckId          — target deck
 *   buyerContactId  — optional; pre-fills buyer_contact_id on attach
 *   onAttached      — called after a successful attach (trigger parent refetch)
 *   onClose         — called to dismiss the modal (no attach happened)
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmailResult {
  id: string;
  gmail_thread_id: string | null;
  subject: string | null;
  sender: string | null;
  received_at: number | null;
  grok_signal: string | null;
}

interface AttachEmailModalProps {
  deckId: string;
  buyerContactId?: string;
  onAttached: () => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format unix-seconds or unix-ms timestamp as "May 3, 2026". */
function fmtDate(ts: number | null | undefined): string {
  if (!ts) return '—';
  const ms = ts > 1e10 ? ts : ts * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Maps a grok_signal to a pill color pair. */
function grokPillStyle(signal: string | null): React.CSSProperties {
  if (!signal) return { background: 'rgba(148,163,184,0.1)', color: 'var(--text-muted)' };
  const map: Record<string, { background: string; color: string }> = {
    'meeting-request':  { background: 'rgba(34,197,94,0.12)',  color: '#22C55E' },
    interested:         { background: 'rgba(34,197,94,0.12)',  color: '#22C55E' },
    'requesting-materials': { background: 'rgba(34,197,94,0.12)', color: '#22C55E' },
    'deal-discussion':  { background: 'rgba(34,197,94,0.12)',  color: '#22C55E' },
    'in-review':        { background: 'rgba(59,130,246,0.12)', color: '#60A5FA' },
    'info-request':     { background: 'rgba(59,130,246,0.12)', color: '#60A5FA' },
    pass:               { background: 'rgba(239,68,68,0.12)',  color: '#F87171' },
    declined:           { background: 'rgba(239,68,68,0.12)',  color: '#F87171' },
  };
  return {
    ...(map[signal] ?? { background: 'rgba(148,163,184,0.1)', color: 'var(--text-muted)' }),
    padding: '1px 8px',
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    display: 'inline-block',
  };
}

// ---------------------------------------------------------------------------
// AttachEmailModal
// ---------------------------------------------------------------------------

export default function AttachEmailModal({
  deckId,
  buyerContactId,
  onAttached,
  onClose,
}: AttachEmailModalProps) {
  const [query, setQuery]         = useState('');
  const [sender, setSender]       = useState('');
  const [results, setResults]     = useState<EmailResult[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(false);
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [attaching, setAttaching] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Debounce timer ref — cancelled when query/sender changes
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search emails — debounced 300ms, fires on query or sender change
  const runSearch = useCallback(async (q: string, s: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '25' });
      if (q.trim()) params.set('q', q.trim());
      if (s.trim()) params.set('sender', s.trim());
      const res = await fetch(`/api/emails/search?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setResults(json.data?.results ?? []);
      setTotal(json.data?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger search whenever query or sender input changes (with 300ms debounce)
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => runSearch(query, sender), 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, sender, runSearch]);

  // Initial load — show first 25 unlinked emails right away
  useEffect(() => { runSearch('', ''); }, [runSearch]);

  // Toggle a single row selection
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Attach all selected emails to this deck (sequentially to surface errors)
  const handleAttach = async () => {
    if (selected.size === 0) return;
    setAttaching(true);
    setError(null);
    const failed: string[] = [];

    for (const emailId of selected) {
      try {
        const res = await fetch(`/api/deck-sites/${deckId}/emails/attach`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailId, buyer_contact_id: buyerContactId ?? null }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          failed.push(body.error ?? `HTTP ${res.status}`);
        }
      } catch (err) {
        failed.push(err instanceof Error ? err.message : 'Network error');
      }
    }

    setAttaching(false);

    if (failed.length > 0) {
      // Show errors but do not close — user can retry or dismiss manually
      setError(`${failed.length} email(s) failed to attach: ${failed.join('; ')}`);
      return;
    }

    // All succeeded — notify parent, then close
    onAttached();
    onClose();
  };

  // Backdrop click closes the modal (click on the overlay itself, not the card)
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    /* Full-screen overlay */
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      {/* Modal card */}
      <div
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '85vh',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Modal header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', fontFamily: "'Barlow Condensed', sans-serif" }}>
            Attach Email to Deck
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 18,
              color: 'var(--text-muted)',
              lineHeight: 1,
              padding: '2px 6px',
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Search controls */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
          {/* Main search bar */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by subject or sender…"
            autoFocus
            style={{
              width: '100%',
              padding: '9px 13px',
              borderRadius: 7,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-app)',
              color: 'var(--text-primary)',
              fontSize: 14,
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: 8,
            }}
          />
          {/* Sender filter — narrower, labeled */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Filter sender:
            </label>
            <input
              type="text"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="e.g. @netflix.com"
              style={{
                flex: 1,
                padding: '5px 10px',
                borderRadius: 5,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-app)',
                color: 'var(--text-primary)',
                fontSize: 12,
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Results list — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              Searching…
            </div>
          )}

          {!loading && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>
                No unlinked emails found. Try a different search.
              </p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div>
              {/* Result count */}
              <div style={{ padding: '10px 0 4px', fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Roboto Condensed', sans-serif" }}>
                {results.length} of {total} unlinked emails
              </div>
              {results.map((email) => {
                const isSelected = selected.has(email.id);
                return (
                  <label
                    key={email.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 0',
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(email.id)}
                      style={{ width: 15, height: 15, flexShrink: 0, cursor: 'pointer', accentColor: 'var(--accent)' }}
                    />
                    {/* Subject + sender */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {email.subject ?? '(No subject)'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {email.sender ?? ''}
                      </div>
                    </div>
                    {/* Date */}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, fontFamily: "'Roboto Condensed', sans-serif" }}>
                      {fmtDate(email.received_at)}
                    </div>
                    {/* Grok signal badge */}
                    {email.grok_signal && (
                      <span style={grokPillStyle(email.grok_signal)}>
                        {email.grok_signal}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom action bar */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexShrink: 0,
          }}
        >
          {/* Error message (shown inline, does not close modal) */}
          {error && (
            <div style={{ flex: 1, fontSize: 12, color: '#F87171' }}>{error}</div>
          )}
          {!error && <div style={{ flex: 1 }} />}

          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={onClose}
              style={{
                padding: '7px 16px',
                borderRadius: 6,
                border: '1px solid var(--border-subtle)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAttach}
              disabled={selected.size === 0 || attaching}
              style={{
                padding: '7px 18px',
                borderRadius: 6,
                border: 'none',
                background: selected.size > 0 && !attaching ? 'var(--accent)' : 'rgba(148,163,184,0.2)',
                color: selected.size > 0 && !attaching ? '#fff' : 'var(--text-muted)',
                fontSize: 13,
                fontWeight: 700,
                cursor: selected.size === 0 || attaching ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background 150ms ease',
              }}
            >
              {attaching
                ? 'Attaching…'
                : selected.size > 0
                  ? `Attach ${selected.size} email${selected.size !== 1 ? 's' : ''}`
                  : 'Select emails to attach'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
