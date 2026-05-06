'use client';
/**
 * HistoryTab — chronological activity feed for a deck.
 *
 * Fetches both:
 *   GET /api/deck-sites/[deckId]/buyers   — to get all attached emails per buyer
 *   GET /api/deck-sites/[deckId]/meetings — all logged meetings
 *
 * Merges emails (extracted from all buyers' email arrays) and meetings into
 * one chronological feed sorted newest-first.
 *
 * Props: { deckId: string }
 */

import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  buyer_contact_id: string | null;
  contact: { id: string; name: string; title: string | null; company_name: string | null } | null;
  emails: EmailRow[];
}

interface Meeting {
  id: string;
  deck_id: string;
  buyer_contact_id: string | null;
  meeting_date: number | null;
  meeting_type: string | null;
  notes: string | null;
  outcome: string | null;
  created_at: number | null;
  contact: { id: string; name: string; title: string | null } | null;
}

// Unified feed item — discriminated union on `kind`
type FeedItem =
  | { kind: 'email'; sortKey: number; email: EmailRow; buyerName: string | null }
  | { kind: 'meeting'; sortKey: number; meeting: Meeting };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format unix-seconds or unix-ms as "May 3, 2026". */
function fmtDate(ts: number | null | undefined): string {
  if (!ts) return '—';
  const ms = ts > 1e10 ? ts : ts * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Meeting type label → display string */
function meetingTypeLabel(type: string | null): string {
  const map: Record<string, string> = {
    call:          'Phone Call',
    video:         'Video Call',
    'in-person':   'In Person',
    'email-thread':'Email Thread',
  };
  return type ? (map[type] ?? type) : 'Meeting';
}

/** Grok signal → pill background/color pair */
function grokPillStyle(signal: string | null): React.CSSProperties {
  const map: Record<string, { background: string; color: string }> = {
    'meeting-request':       { background: 'rgba(34,197,94,0.12)',  color: '#22C55E' },
    'deal-discussion':       { background: 'rgba(34,197,94,0.12)',  color: '#22C55E' },
    'requesting-materials':  { background: 'rgba(34,197,94,0.12)',  color: '#22C55E' },
    'in-review':             { background: 'rgba(59,130,246,0.12)', color: '#60A5FA' },
    'info-request':          { background: 'rgba(59,130,246,0.12)', color: '#60A5FA' },
    pass:                    { background: 'rgba(239,68,68,0.12)',  color: '#F87171' },
    declined:                { background: 'rgba(239,68,68,0.12)',  color: '#F87171' },
  };
  const def = { background: 'rgba(148,163,184,0.1)', color: 'var(--text-muted)' };
  return {
    ...(map[signal ?? ''] ?? def),
    padding: '1px 8px',
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    display: 'inline-block',
  };
}

/** Meeting type badge — teal-ish to distinguish from pipeline stages */
function meetingTypeBadge(type: string | null): React.CSSProperties {
  return {
    padding: '2px 9px',
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 700,
    background: 'rgba(99,102,241,0.12)',
    color: '#A5B4FC',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    display: 'inline-block',
  };
}

// ---------------------------------------------------------------------------
// Inline styles (shared tokens)
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

// ---------------------------------------------------------------------------
// Log Meeting form — appears at the top of the feed when triggered
// ---------------------------------------------------------------------------

function LogMeetingForm({
  deckId,
  buyers,
  onLogged,
  onCancel,
}: {
  deckId: string;
  buyers: DeckBuyer[];
  onLogged: () => void;
  onCancel: () => void;
}) {
  const [buyerContactId, setBuyerContactId] = useState('');
  const [meetingDate, setMeetingDate]       = useState('');
  const [meetingType, setMeetingType]       = useState('call');
  const [notes, setNotes]                   = useState('');
  const [outcome, setOutcome]               = useState('');
  const [submitting, setSubmitting]         = useState(false);
  const [error, setError]                   = useState<string | null>(null);

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
          buyer_contact_id: buyerContactId || null,
          meeting_type: meetingType,
          notes: notes || null,
          outcome: outcome || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      onLogged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log meeting');
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
        Log Meeting
      </span>

      {/* Buyer contact selector — populated from already-fetched buyers list */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={labelStyle}>Buyer Contact (optional)</span>
        <select
          value={buyerContactId}
          onChange={(e) => setBuyerContactId(e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="">— No specific contact —</option>
          {buyers.map((b) => (
            b.contact ? (
              <option key={b.id} value={b.contact.id}>
                {b.contact.name}{b.contact.title ? ` (${b.contact.title})` : ''}
              </option>
            ) : null
          ))}
        </select>
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={labelStyle}>Date</span>
          <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={labelStyle}>Type</span>
          <select value={meetingType} onChange={(e) => setMeetingType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="call">Phone Call</option>
            <option value="video">Video Call</option>
            <option value="in-person">In Person</option>
            <option value="email-thread">Email Thread</option>
          </select>
        </label>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={labelStyle}>Outcome</span>
        <input type="text" value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="e.g. Requested full pitch, Passed, Will circle back…" style={inputStyle} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={labelStyle}>Notes</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Meeting notes…" style={{ ...inputStyle, resize: 'vertical' }} />
      </label>

      {error && <div style={{ fontSize: 12, color: '#F87171' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{ padding: '7px 16px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: submitting ? 0.6 : 1 }}
        >
          {submitting ? 'Logging…' : 'Log Meeting'}
        </button>
        <button
          onClick={onCancel}
          style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Feed card components
// ---------------------------------------------------------------------------

/** Email feed item — envelope icon, subject, sender, date, grok signal, Gmail link */
function EmailFeedCard({ email, buyerName }: { email: EmailRow; buyerName: string | null }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 16px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 8,
        marginBottom: 10,
      }}
    >
      {/* Icon */}
      <div style={{ fontSize: 18, flexShrink: 0, marginTop: 1, lineHeight: 1 }}>✉</div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {email.subject ?? '(No subject)'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          {/* If we matched this email to a buyer, show their name; else show raw sender */}
          {buyerName
            ? <><span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{buyerName}</span>{email.sender ? ` · ${email.sender}` : ''}</>
            : (email.sender ?? '')
          }
        </div>
      </div>

      {/* Right-side metadata */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'Roboto Condensed', sans-serif" }}>
          {fmtDate(email.received_at)}
        </div>
        {email.grok_signal && (
          <span style={grokPillStyle(email.grok_signal)}>{email.grok_signal}</span>
        )}
        {email.gmail_thread_id && (
          <a
            href={`https://mail.google.com/mail/u/0/#all/${email.gmail_thread_id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}
          >
            Open in Gmail ↗
          </a>
        )}
      </div>
    </div>
  );
}

/** Meeting feed item — calendar icon, contact, type badge, date, outcome, collapsible notes */
function MeetingFeedCard({ meeting }: { meeting: Meeting }) {
  const [notesExpanded, setNotesExpanded] = useState(false);
  const contactName = meeting.contact?.name ?? 'Unknown buyer';
  const hasLongNotes = (meeting.notes?.length ?? 0) > 120;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 16px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 8,
        marginBottom: 10,
      }}
    >
      {/* Icon */}
      <div style={{ fontSize: 18, flexShrink: 0, marginTop: 1, lineHeight: 1 }}>📅</div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Contact name + meeting type */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            {contactName}
          </span>
          <span style={meetingTypeBadge(meeting.meeting_type)}>
            {meetingTypeLabel(meeting.meeting_type)}
          </span>
        </div>

        {/* Outcome */}
        {meeting.outcome && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
            Outcome: <span style={{ fontWeight: 600 }}>{meeting.outcome}</span>
          </div>
        )}

        {/* Notes — collapsed if long */}
        {meeting.notes && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {hasLongNotes && !notesExpanded
              ? <>{meeting.notes.slice(0, 120)}… <button onClick={() => setNotesExpanded(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, padding: 0, fontFamily: 'inherit' }}>show more</button></>
              : <>{meeting.notes}{hasLongNotes && <> <button onClick={() => setNotesExpanded(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, padding: 0, fontFamily: 'inherit' }}>show less</button></>}</>
            }
          </div>
        )}
      </div>

      {/* Date */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, fontFamily: "'Roboto Condensed', sans-serif", marginTop: 2 }}>
        {fmtDate(meeting.meeting_date)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export — HistoryTab
// ---------------------------------------------------------------------------

export default function HistoryTab({ deckId }: { deckId: string }) {
  const [buyers, setBuyers]           = useState<DeckBuyer[]>([]);
  const [meetings, setMeetings]       = useState<Meeting[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);

  // Fetch both buyers (for their emails) and meetings in parallel
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [buyersRes, meetingsRes] = await Promise.all([
        fetch(`/api/deck-sites/${deckId}/buyers`),
        fetch(`/api/deck-sites/${deckId}/meetings`),
      ]);
      if (!buyersRes.ok)  throw new Error(`Buyers fetch: HTTP ${buyersRes.status}`);
      if (!meetingsRes.ok) throw new Error(`Meetings fetch: HTTP ${meetingsRes.status}`);
      const [buyersJson, meetingsJson] = await Promise.all([
        buyersRes.json(),
        meetingsRes.json(),
      ]);
      setBuyers(buyersJson.data ?? []);
      setMeetings(meetingsJson.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Build a lookup map: buyer_contact_id → display name for resolving email senders
  const contactNameById = new Map<string, string>();
  for (const buyer of buyers) {
    if (buyer.buyer_contact_id && buyer.contact?.name) {
      contactNameById.set(buyer.buyer_contact_id, buyer.contact.name);
    }
  }

  // Merge emails (from all buyers) and meetings into one sorted feed
  const feed: FeedItem[] = [];

  for (const buyer of buyers) {
    for (const email of buyer.emails) {
      // Sort key: received_at is unix seconds or ms — normalize to ms
      const ts = email.received_at
        ? (email.received_at > 1e10 ? email.received_at : email.received_at * 1000)
        : 0;
      feed.push({
        kind: 'email',
        sortKey: ts,
        email,
        // Resolve the buyer name from the buyer_contact_id on this email's parent deck_buyer
        buyerName: buyer.contact?.name ?? null,
      });
    }
  }

  for (const meeting of meetings) {
    const ts = meeting.meeting_date
      ? (meeting.meeting_date > 1e10 ? meeting.meeting_date : meeting.meeting_date * 1000)
      : 0;
    feed.push({ kind: 'meeting', sortKey: ts, meeting });
  }

  // Newest first
  feed.sort((a, b) => b.sortKey - a.sortKey);

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0, fontFamily: "'Barlow Condensed', sans-serif" }}>
          Activity History
        </h2>
        <button
          onClick={() => setShowLogForm((v) => !v)}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: '1px solid var(--border-subtle)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {showLogForm ? '✕ Cancel' : '+ Log Meeting'}
        </button>
      </div>

      {/* Log Meeting form at the top of the feed */}
      {showLogForm && (
        <LogMeetingForm
          deckId={deckId}
          buyers={buyers}
          onLogged={() => { setShowLogForm(false); fetchAll(); }}
          onCancel={() => setShowLogForm(false)}
        />
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          Loading activity…
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ padding: 12, borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#F87171', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && feed.length === 0 && (
        <div style={{ textAlign: 'center', padding: '56px 0' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, fontStyle: 'italic' }}>
            No activity yet. Attach emails or log meetings in the Buyers tab.
          </p>
        </div>
      )}

      {/* Merged chronological feed */}
      {!loading && !error && feed.map((item) => {
        if (item.kind === 'email') {
          return (
            <EmailFeedCard
              key={`email-${item.email.id}`}
              email={item.email}
              buyerName={item.buyerName}
            />
          );
        }
        return (
          <MeetingFeedCard
            key={`meeting-${item.meeting.id}`}
            meeting={item.meeting}
          />
        );
      })}
    </div>
  );
}
