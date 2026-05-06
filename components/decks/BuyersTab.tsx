'use client';
/**
 * BuyersTab — shows all buyer contacts this deck has been sent to.
 *
 * Fetches GET /api/deck-sites/[deckId]/buyers on mount and after any mutation.
 * Supports:
 *   - Add Buyer (contact search → POST /api/deck-sites/[id]/buyers)
 *   - Per-buyer pipeline stage PATCH (dropdown)
 *   - Delete buyer (DELETE /api/deck-sites/[id]/buyers/[buyerId])
 *   - Collapsible email threads with Gmail deep-link
 *   - "Attach Email" → opens AttachEmailModal
 *   - "Log Meeting" inline form → POST /api/deck-sites/[id]/meetings
 *
 * Props: { deckId: string }
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import AttachEmailModal from './AttachEmailModal';

// ---------------------------------------------------------------------------
// Types (mirrors API response shapes)
// ---------------------------------------------------------------------------

interface ContactRow {
  id: string;
  name: string;
  email: string | null;
  title: string | null;
  company_id: string | null;
  company_name: string | null;
}

interface EmailRow {
  id: string;
  gmail_thread_id: string | null;
  subject: string | null;
  sender: string | null;
  received_at: number | null;
  grok_signal: string | null;
}

interface DeckBuyer {
  id: string;
  deck_id: string;
  buyer_contact_id: string | null;
  sent_at: number | null;
  pipeline_stage: string | null;
  notes: string | null;
  created_at: number | null;
  contact: ContactRow | null;
  emails: EmailRow[];
}

// Buyer search result — subset of BuyerContact + company fields
interface BuyerSearchResult {
  id: string;
  name: string;
  title: string | null;
  company_name: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PIPELINE_STAGES = [
  { value: 'sent',      label: 'Sent' },
  { value: 'in-review', label: 'In Review' },
  { value: 'meeting',   label: 'Meeting' },
  { value: 'pass',      label: 'Pass' },
  { value: 'greenlit',  label: 'Greenlit' },
];

// Maps pipeline stage to a pill color — matches the design system's status palette
function stagePillStyle(stage: string | null): React.CSSProperties {
  const map: Record<string, { background: string; color: string }> = {
    sent:      { background: 'rgba(148,163,184,0.15)', color: 'var(--text-secondary)' },
    'in-review':{ background: 'rgba(59,130,246,0.15)', color: '#60A5FA' },
    meeting:   { background: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
    pass:      { background: 'rgba(239,68,68,0.12)',  color: '#F87171' },
    greenlit:  { background: 'rgba(34,197,94,0.12)',  color: '#22C55E' },
  };
  const def = { background: 'rgba(148,163,184,0.1)', color: 'var(--text-muted)' };
  return {
    ...(map[stage ?? ''] ?? def),
    padding: '2px 9px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    fontFamily: "'Roboto Condensed', sans-serif",
    display: 'inline-block',
  };
}

/** Format unix-seconds or unix-ms timestamp as "May 3, 2026". Returns "—" for nulls. */
function fmtDate(ts: number | null | undefined): string {
  if (!ts) return '—';
  // Heuristic: if the number is > 1e10 it's ms, else seconds
  const ms = ts > 1e10 ? ts : ts * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Shared inline styles (match DeckDetailClient conventions)
// ---------------------------------------------------------------------------

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-muted)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 11px',
  borderRadius: 6,
  border: '1px solid var(--border-subtle)',
  background: 'var(--bg-app)',
  color: 'var(--text-primary)',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

const btnGhost: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 6,
  border: '1px solid var(--border-subtle)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const btnPrimary: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 6,
  border: 'none',
  background: 'var(--accent)',
  color: '#fff',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const btnDanger: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 5,
  border: '1px solid rgba(248,113,113,0.3)',
  background: 'transparent',
  color: '#F87171',
  fontSize: 11,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

// ---------------------------------------------------------------------------
// Add Buyer form — inline form below the header row
// ---------------------------------------------------------------------------

function AddBuyerForm({
  deckId,
  onAdded,
  onCancel,
}: {
  deckId: string;
  onAdded: () => void;
  onCancel: () => void;
}) {
  // Buyer contact search state
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<BuyerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<BuyerSearchResult | null>(null);

  // Form fields
  const [sentAt, setSentAt]           = useState('');
  const [stage, setStage]             = useState('sent');
  const [notes, setNotes]             = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced buyer contact search — calls GET /api/buyers?search=...
  const handleQueryChange = (val: string) => {
    setQuery(val);
    setSelected(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!val.trim()) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/buyers?search=${encodeURIComponent(val)}&limit=10`);
        const json = await res.json();
        // API returns { data: BuyerRow[] } — map to our lean type
        setResults((json.data ?? []).slice(0, 10));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const handleSubmit = async () => {
    if (!selected) { setError('Select a buyer contact first.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/deck-sites/${deckId}/buyers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_contact_id: selected.id,
          // sent_at: convert date string to unix ms if provided
          sent_at: sentAt ? new Date(sentAt).getTime() : null,
          pipeline_stage: stage,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add buyer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        padding: 16,
        border: '1px solid var(--border-subtle)',
        borderRadius: 8,
        background: 'var(--bg-surface)',
        marginBottom: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Add Buyer
      </span>

      {/* Contact search with dropdown */}
      <div style={{ position: 'relative' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={labelStyle}>Buyer Contact</span>
          <input
            type="text"
            value={selected ? selected.name : query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search by name…"
            style={inputStyle}
            autoFocus
          />
        </label>
        {/* Dropdown results */}
        {results.length > 0 && !selected && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 50,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 6,
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}>
            {searching && (
              <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}>Searching…</div>
            )}
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => { setSelected(r); setResults([]); }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</div>
                {(r.title || r.company_name) && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                    {[r.title, r.company_name].filter(Boolean).join(' · ')}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Date + stage row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={labelStyle}>Sent Date (optional)</span>
          <input type="date" value={sentAt} onChange={(e) => setSentAt(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={labelStyle}>Stage</span>
          <select value={stage} onChange={(e) => setStage(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            {PIPELINE_STAGES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Notes */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={labelStyle}>Notes (optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any context about this send…"
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </label>

      {/* Error */}
      {error && <div style={{ fontSize: 12, color: '#F87171' }}>{error}</div>}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSubmit} disabled={submitting} style={btnPrimary}>
          {submitting ? 'Adding…' : 'Add Buyer'}
        </button>
        <button onClick={onCancel} style={btnGhost}>Cancel</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Log Meeting inline form — appears below a buyer card when toggled
// ---------------------------------------------------------------------------

function LogMeetingForm({
  deckId,
  buyerContactId,
  onLogged,
  onCancel,
}: {
  deckId: string;
  buyerContactId: string | null;
  onLogged: () => void;
  onCancel: () => void;
}) {
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingType, setMeetingType] = useState('call');
  const [meetingNotes, setMeetingNotes] = useState('');
  const [outcome, setOutcome]         = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState(false);

  const handleSubmit = async () => {
    if (!meetingDate) { setError('Meeting date is required.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/deck-sites/${deckId}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_date: new Date(meetingDate).getTime(),
          buyer_contact_id: buyerContactId ?? null,
          meeting_type: meetingType,
          notes: meetingNotes || null,
          outcome: outcome || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setSuccess(true);
      setTimeout(() => { onLogged(); }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log meeting');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={{ padding: '10px 12px', fontSize: 13, color: '#22C55E', fontWeight: 600 }}>
        Meeting logged successfully ✓
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 14,
        marginTop: 8,
        background: 'var(--bg-app)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 7,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Log Meeting
      </span>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={labelStyle}>Date</span>
          <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={labelStyle}>Type</span>
          <select value={meetingType} onChange={(e) => setMeetingType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="call">Phone Call</option>
            <option value="video">Video Call</option>
            <option value="in-person">In Person</option>
            <option value="email-thread">Email Thread</option>
          </select>
        </label>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={labelStyle}>Outcome</span>
        <input type="text" value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="e.g. Requested full pitch, Will circle back…" style={inputStyle} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={labelStyle}>Notes</span>
        <textarea value={meetingNotes} onChange={(e) => setMeetingNotes(e.target.value)} rows={2} placeholder="Meeting notes…" style={{ ...inputStyle, resize: 'vertical' }} />
      </label>

      {error && <div style={{ fontSize: 12, color: '#F87171' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSubmit} disabled={submitting} style={{ ...btnPrimary, fontSize: 11 }}>
          {submitting ? 'Logging…' : 'Log Meeting'}
        </button>
        <button onClick={onCancel} style={{ ...btnGhost, fontSize: 11 }}>Cancel</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Buyer card — one row per deck_buyers entry
// ---------------------------------------------------------------------------

function BuyerCard({
  buyer,
  deckId,
  onRefetch,
}: {
  buyer: DeckBuyer;
  deckId: string;
  onRefetch: () => void;
}) {
  const [emailsExpanded, setEmailsExpanded]     = useState(false);
  const [meetingFormOpen, setMeetingFormOpen]   = useState(false);
  const [attachModalOpen, setAttachModalOpen]   = useState(false);
  const [stageUpdating, setStageUpdating]       = useState(false);
  const [deleteConfirm, setDeleteConfirm]       = useState(false);

  const contactName = buyer.contact?.name ?? 'Unknown Contact';
  const title       = buyer.contact?.title ?? null;
  const company     = buyer.contact?.company_name ?? null;

  // PATCH pipeline_stage
  const handleStageChange = async (newStage: string) => {
    setStageUpdating(true);
    try {
      await fetch(`/api/deck-sites/${deckId}/buyers/${buyer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_stage: newStage }),
      });
      onRefetch();
    } catch {
      // Stage update failed silently — refetch will show real state
    } finally {
      setStageUpdating(false);
    }
  };

  // DELETE buyer
  const handleDelete = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    try {
      await fetch(`/api/deck-sites/${deckId}/buyers/${buyer.id}`, { method: 'DELETE' });
      onRefetch();
    } catch {
      setDeleteConfirm(false);
    }
  };

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 14,
      }}
    >
      {/* Card header row */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Contact info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Barlow Condensed', sans-serif" }}>
              {contactName}
            </span>
            {title && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{title}</span>
            )}
            {company && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>@ {company}</span>
            )}
          </div>
          {buyer.sent_at && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, fontFamily: "'Roboto Condensed', sans-serif" }}>
              Sent {fmtDate(buyer.sent_at)}
            </div>
          )}
        </div>

        {/* Stage badge + dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={stagePillStyle(buyer.pipeline_stage)}>
            {buyer.pipeline_stage ?? 'sent'}
          </span>
          <select
            value={buyer.pipeline_stage ?? 'sent'}
            onChange={(e) => handleStageChange(e.target.value)}
            disabled={stageUpdating}
            style={{
              fontSize: 11,
              padding: '3px 6px',
              borderRadius: 5,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-app)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
            title="Change pipeline stage"
          >
            {PIPELINE_STAGES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes row (if set) */}
      {buyer.notes && (
        <div style={{ padding: '0 16px 10px', fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          {buyer.notes}
        </div>
      )}

      {/* Collapsible email threads */}
      {buyer.emails.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '10px 16px' }}>
          <button
            onClick={() => setEmailsExpanded((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontSize: 12,
              color: 'var(--text-secondary)',
              fontWeight: 600,
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span>{emailsExpanded ? '▾' : '▶'}</span>
            <span>{buyer.emails.length} email{buyer.emails.length !== 1 ? 's' : ''}</span>
          </button>

          {emailsExpanded && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {buyer.emails.map((email) => (
                <div
                  key={email.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 8px',
                    borderRadius: 5,
                    background: 'var(--bg-app)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: 12,
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)', fontWeight: 600 }}>
                    {email.subject ?? '(No subject)'}
                  </span>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                    {email.sender ?? ''}
                  </span>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0, fontFamily: "'Roboto Condensed', sans-serif", fontSize: 11 }}>
                    {fmtDate(email.received_at)}
                  </span>
                  {email.grok_signal && (
                    <span style={{
                      flexShrink: 0,
                      padding: '1px 7px',
                      borderRadius: 10,
                      fontSize: 10,
                      fontWeight: 700,
                      background: 'rgba(59,130,246,0.12)',
                      color: '#60A5FA',
                      textTransform: 'uppercase',
                    }}>
                      {email.grok_signal}
                    </span>
                  )}
                  {email.gmail_thread_id && (
                    <a
                      href={`https://mail.google.com/mail/u/0/#all/${email.gmail_thread_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ flexShrink: 0, fontSize: 11, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
                    >
                      Gmail ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action bar */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '10px 16px',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => setAttachModalOpen(true)}
          style={{ ...btnGhost, fontSize: 11 }}
        >
          Attach Email
        </button>
        <button
          onClick={() => setMeetingFormOpen((v) => !v)}
          style={{ ...btnGhost, fontSize: 11 }}
        >
          {meetingFormOpen ? 'Cancel Meeting' : 'Log Meeting'}
        </button>
        <div style={{ marginLeft: 'auto' }}>
          {deleteConfirm ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#F87171' }}>Confirm remove?</span>
              <button onClick={handleDelete} style={btnDanger}>Yes, Remove</button>
              <button onClick={() => setDeleteConfirm(false)} style={{ ...btnGhost, fontSize: 11 }}>Cancel</button>
            </div>
          ) : (
            <button onClick={handleDelete} style={btnDanger} title="Remove buyer from this deck">
              ✕ Remove
            </button>
          )}
        </div>
      </div>

      {/* Log Meeting inline form */}
      {meetingFormOpen && (
        <div style={{ padding: '0 16px 14px' }}>
          <LogMeetingForm
            deckId={deckId}
            buyerContactId={buyer.buyer_contact_id}
            onLogged={() => { setMeetingFormOpen(false); onRefetch(); }}
            onCancel={() => setMeetingFormOpen(false)}
          />
        </div>
      )}

      {/* Attach Email modal */}
      {attachModalOpen && (
        <AttachEmailModal
          deckId={deckId}
          buyerContactId={buyer.buyer_contact_id ?? undefined}
          onAttached={onRefetch}
          onClose={() => setAttachModalOpen(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export — BuyersTab
// ---------------------------------------------------------------------------

export default function BuyersTab({ deckId }: { deckId: string }) {
  const [buyers, setBuyers]           = useState<DeckBuyer[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Fetch all buyers for this deck
  const fetchBuyers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/deck-sites/${deckId}/buyers`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setBuyers(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load buyers');
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    fetchBuyers();
  }, [fetchBuyers]);

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0, fontFamily: "'Barlow Condensed', sans-serif" }}>
          Buyers
        </h2>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          style={{ ...btnGhost, borderColor: 'var(--accent)', color: 'var(--accent)' }}
        >
          {showAddForm ? '✕ Cancel' : '+ Add Buyer'}
        </button>
      </div>

      {/* Add Buyer inline form */}
      {showAddForm && (
        <AddBuyerForm
          deckId={deckId}
          onAdded={() => { setShowAddForm(false); fetchBuyers(); }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Loading / error / empty / list states */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Loading buyers…
        </div>
      )}

      {!loading && error && (
        <div style={{ padding: 12, borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', fontSize: 13 }}>
          {error}
        </div>
      )}

      {!loading && !error && buyers.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, fontStyle: 'italic' }}>
            No buyers added yet. Click &ldquo;Add Buyer&rdquo; to record who received this deck.
          </p>
        </div>
      )}

      {!loading && !error && buyers.map((buyer) => (
        <BuyerCard
          key={buyer.id}
          buyer={buyer}
          deckId={deckId}
          onRefetch={fetchBuyers}
        />
      ))}
    </div>
  );
}
