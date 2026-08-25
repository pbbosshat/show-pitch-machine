'use client';
// LinkedInConnectModal — the "Connect with <Name>" window for Daily Connections.
//
// Sibling of EmailComposeModal: same shape, same buttons, different channel. It
// shows the profile link, lets the note be edited against LinkedIn's 200-char
// invite cap, and queues the invite.
//
// ── What "Send invite" actually does (important) ─────────────────────────────
// It does NOT send anything from this app. It POSTs to the existing
// /api/connections/connect with channels:['linkedin'], which writes a row into
// connect_queue and flips the lead to 'queued'. A separate poller ("Bubba",
// running off-box) picks that row up, sends the real LinkedIn invite, and
// reports the outcome back via /api/connections/queue/result.
//
// That queue-and-poll design is deliberate and is the valuable part of this
// feature, so this modal reuses it verbatim rather than inventing a second
// path. Nothing here talks to LinkedIn directly.

import { useState, useEffect } from 'react';

export interface LinkedInLead {
  id: string;
  person_name: string;
  person_title: string | null;
  company_name: string | null;
  linkedin_url: string | null;
  reason: string | null;
  draft_li_note: string | null;
  status: string;
}

const LI_NOTE_CAP = 200;

export default function LinkedInConnectModal({
  lead,
  onClose,
  onSaveDraft,
  onQueued,
}: {
  lead: LinkedInLead;
  onClose: () => void;
  onSaveDraft: (fields: Record<string, string | null>) => Promise<void>;
  onQueued: () => void;
}) {
  const [note, setNote] = useState(lead.draft_li_note ?? '');
  const [url, setUrl] = useState(lead.linkedin_url ?? '');
  const [finding, setFinding] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [redrafting, setRedrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /**
   * Ask the server to regenerate the note from the lead's stored data.
   * POST /redraft is draft-only — it does NOT re-run Apollo or dedup, so it is
   * safe and cheap to press repeatedly. Exists because notes come back null
   * whenever the drafting step was skipped upstream.
   */
  async function handleRedraft() {
    setRedrafting(true); setError(null); setNotice(null);
    try {
      const res = await fetch(`/api/connections/${lead.id}/redraft`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      const fresh = json.draft_li_note ?? json.data?.draft_li_note ?? json.li_note ?? null;
      if (typeof fresh === 'string' && fresh.trim()) {
        setNote(fresh);
        setNotice('Note redrafted.');
      } else {
        setNotice('Redraft returned no note — the drafting service may be unavailable.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not redraft');
    } finally {
      setRedrafting(false);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !queueing) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, queueing]);

  const noteLen = note.length;
  const overCap = noteLen > LI_NOTE_CAP;
  const hasUrl = !!url.trim();
  const alreadyQueued = lead.status === 'queued';
  // /connect gained a draft gate (PR #30): it now SKIPS a lead with no
  // draft_li_note rather than queueing a blank invite. Mirror that here so the
  // button is disabled up front instead of firing a request that comes back
  // "no LinkedIn note yet". Redraft note is the fix, and it is right there.
  const canQueue = hasUrl && !overCap && !queueing && note.trim() !== '';

  async function handleSaveDraft() {
    setSavingDraft(true); setError(null); setNotice(null);
    try {
      await onSaveDraft({ draft_li_note: note, linkedin_url: url.trim() || null });
      setNotice('Saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save note');
    } finally {
      setSavingDraft(false);
    }
  }

  /**
   * Re-run enrichment for this single lead. Useful after correcting a company
   * name: Apollo is anchored on organization_name, so a lead that arrived with
   * a wrong or missing company is unenrichable until it is fixed and retried —
   * previously that meant rebuilding everything.
   */
  async function handleFindContact() {
    setFinding(true); setError(null); setNotice(null);
    try {
      const res = await fetch(`/api/connections/${lead.id}/enrich`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      const found = json.linkedin_url ?? null;
      if (found) { setUrl(found); setNotice('Found a LinkedIn profile.'); }
      else setNotice('Apollo has no LinkedIn profile for this person — paste one manually.');
      if (json.draft_li_note && !note.trim()) setNote(json.draft_li_note);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setFinding(false);
    }
  }

  async function handleQueue() {
    setQueueing(true); setError(null); setNotice(null);
    try {
      // Persist note AND profile URL FIRST — /connect reads both straight from
      // the row, so queueing without saving would use stale values (or skip the
      // lead entirely for a URL that only exists in this input).
      await onSaveDraft({ draft_li_note: note, linkedin_url: url.trim() || null });

      const res = await fetch('/api/connections/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids: [lead.id], channels: ['linkedin'] }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);

      // /connect answers per (lead, channel). Surface a skip verbatim instead of
      // reporting a success that never happened.
      const results: { channel: string; status: string; detail: string | null }[] =
        Array.isArray(json) ? json : (json.results ?? json.data ?? []);
      const li = results.find((r) => r.channel === 'linkedin');
      if (li && li.status !== 'pending' && li.status !== 'picked' && li.status !== 'sent') {
        throw new Error(li.detail ?? `LinkedIn ${li.status}`);
      }

      onQueued();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send invite');
    } finally {
      setQueueing(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Connect with ${lead.person_name} on LinkedIn`}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !queueing) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 60, display: 'flex',
        alignItems: 'flex-start', justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)', padding: '40px 16px', overflowY: 'auto',
      }}
    >
      <div style={{ width: '100%', maxWidth: 620, borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span aria-hidden style={{ color: '#0A66C2', fontWeight: 900, fontSize: 17, lineHeight: 1 }}>in</span>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: '0.01em' }}>
            Connect with {lead.person_name}
          </h2>
        </div>

        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Profile URL — editable. Apollo resolves ~60% of exec-tier leads, and
              before this a miss was a dead end: no way to record a profile found
              by hand, so the lead sat in the list uncontactable forever. */}
          <Field label="Profile URL">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.linkedin.com/in/…"
              style={inputStyle}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
              {url.trim() ? (
                <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: 'var(--accent)' }}>
                  Open profile ↗
                </a>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--status-deal)' }}>
                  No profile found — search LinkedIn and paste the URL, or try Find contact.
                </span>
              )}
              <button
                onClick={handleFindContact}
                disabled={finding || queueing}
                style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, fontWeight: 600, color: 'var(--accent)', cursor: finding ? 'wait' : 'pointer' }}
              >
                {finding ? 'Searching…' : 'Find contact'}
              </button>
              <a
                href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
                  [lead.person_name, lead.company_name].filter(Boolean).join(' ')
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 11, color: 'var(--text-muted)' }}
              >
                Search LinkedIn ↗
              </a>
            </div>
            {(lead.person_title || lead.company_name) && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
                {[lead.person_title, lead.company_name].filter(Boolean).join(' · ')}
              </p>
            )}
          </Field>

          {lead.reason && (
            <Field label="Why this person">
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{lead.reason}</p>
            </Field>
          )}

          {/* The drafted invite note */}
          <Field label="Invite note">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              maxLength={LI_NOTE_CAP}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, borderColor: overCap ? 'var(--status-pass)' : 'var(--border-subtle)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, gap: 12 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                LinkedIn caps invite notes at {LI_NOTE_CAP} characters.{' '}
                <button
                  onClick={handleRedraft}
                  disabled={redrafting || queueing}
                  style={{ background: 'none', border: 'none', padding: 0, fontSize: 11, fontWeight: 600, color: 'var(--accent)', cursor: redrafting ? 'wait' : 'pointer' }}
                >
                  {redrafting ? 'Redrafting…' : 'Redraft note'}
                </button>
              </span>
              <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: overCap ? 'var(--status-pass)' : 'var(--text-muted)' }}>
                {noteLen}/{LI_NOTE_CAP}
              </span>
            </div>
          </Field>

          {/* Be explicit that this is a queue, not a direct send. */}
          <div style={{ borderRadius: 6, border: '1px solid var(--border-subtle)', background: 'var(--bg-surface-alt)', padding: '10px 12px' }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <strong>Send invite</strong> hands this to the LinkedIn queue. The Shawn LinkedIn
              engine picks it up and sends the real invite, then reports back — the row shows
              “queued for Bubba” until it does.
            </p>
          </div>

          {hasUrl && !note.trim() && (
            <p style={{ fontSize: 12, color: 'var(--status-deal)' }}>
              No note drafted — an invite cannot be queued without one. Use “Redraft note” above, or write it yourself.
            </p>
          )}
          {alreadyQueued && (
            <p style={{ fontSize: 12, color: 'var(--status-deal)' }}>
              This lead is already queued. Sending again will add a second invite.
            </p>
          )}
          {error && (
            <div style={{ borderRadius: 6, border: '1px solid var(--status-pass)', background: 'rgba(220,38,38,0.10)', padding: '10px 12px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--status-pass)', marginBottom: 2 }}>Not queued</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-word' }}>{error}</p>
            </div>
          )}
          {notice && <p style={{ fontSize: 12, color: 'var(--status-greenlit)' }}>{notice}</p>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 22px', borderTop: '1px solid var(--border-subtle)' }}>
          <button onClick={onClose} disabled={queueing} style={btnGhost}>Cancel</button>
          <button onClick={handleSaveDraft} disabled={savingDraft || queueing} style={btnGhost}>
            {savingDraft ? 'Saving…' : 'Save note'}
          </button>
          <button
            onClick={handleQueue}
            disabled={!canQueue}
            title={!hasUrl ? 'No LinkedIn URL on this lead' : overCap ? 'Note is over the 200-character cap' : undefined}
            style={{ ...btnPrimary, opacity: canQueue ? 1 : 0.55, cursor: canQueue ? 'pointer' : 'not-allowed' }}
          >
            {queueing ? 'Sending…' : 'Send invite'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 11px', borderRadius: 6,
  border: '1px solid var(--border-subtle)', background: 'var(--bg-app)',
  color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', outline: 'none',
};

const btnGhost: React.CSSProperties = {
  padding: '9px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)',
};

const btnPrimary: React.CSSProperties = {
  padding: '9px 20px', borderRadius: 6, fontSize: 13, fontWeight: 700,
  border: '1px solid #0A66C2', background: '#0A66C2', color: '#fff',
};
