'use client';
// EmailComposeModal — the "Email <Name>" window for Daily Connections.
//
// Ported from the Assignment Desk CRM client email modal so the two apps feel
// the same: Template picker → To → Subject → Body → Cancel / Save draft / Send.
//
// Deliberate differences from the adesk original:
//   • Plain-text body, no rich-text toolbar. Shawn's outreach is plain text by
//     design (see lib/connections/draft.ts and lib/connections/send.ts) — an
//     HTML body would change how these land and read as marketing.
//   • Email only. The LinkedIn note lives in LinkedInConnectModal, opened from
//     its own column, so each channel has one window and one obvious action.
//
// Sending is the ONE thing that leaves the app: it POSTs the edited copy to
// /api/connections/[id]/send-email. It never touches the LinkedIn queue.

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  CONNECTION_EMAIL_TEMPLATES,
  applyTemplate,
  type TemplateVars,
} from '@/lib/connections/templates';

export interface ComposeLead {
  id: string;
  person_name: string;
  person_title: string | null;
  company_name: string | null;
  email: string | null;
  email_status: string | null;
  reason: string | null;
  draft_email_subject: string | null;
  draft_email_body: string | null;
}

export default function EmailComposeModal({
  lead,
  onClose,
  onSaveDraft,
  onSent,
}: {
  lead: ComposeLead;
  onClose: () => void;
  /** Persists edits via the existing PATCH /api/connections/[id]. */
  onSaveDraft: (fields: Record<string, string | null>) => Promise<void>;
  /** Called after a confirmed send so the parent can refresh row status. */
  onSent: () => void;
}) {
  const aiDraft = {
    subject: lead.draft_email_subject ?? '',
    body: lead.draft_email_body ?? '',
  };

  const [templateId, setTemplateId] = useState('ai_draft');
  const [to, setTo] = useState(lead.email ?? '');
  const [subject, setSubject] = useState(aiDraft.subject);
  const [bodyText, setBodyText] = useState(aiDraft.body);

  const [sending, setSending] = useState(false);
  const [finding, setFinding] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape — but never mid-send, or the user loses the copy while the
  // request is still in flight and can't tell whether it went out.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !sending) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, sending]);

  const vars: TemplateVars = {
    firstName: lead.person_name,
    fullName: lead.person_name,
    company: lead.company_name,
    role: lead.person_title,
    reason: lead.reason,
    senderName: 'Shawn',
  };

  const pickTemplate = useCallback(
    (id: string) => {
      setTemplateId(id);
      const next = applyTemplate(id, vars, aiDraft);
      setSubject(next.subject);
      setBodyText(next.body);
      setNotice(null);
      setError(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lead.id]
  );

  async function handleSaveDraft() {
    setSavingDraft(true);
    setError(null);
    setNotice(null);
    try {
      await onSaveDraft({ draft_email_subject: subject, draft_email_body: bodyText, email: to.trim() || null });
      setNotice('Draft saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save draft');
    } finally {
      setSavingDraft(false);
    }
  }

  /** Re-run Apollo for this one lead (see the LinkedIn modal for the rationale). */
  async function handleFindContact() {
    setFinding(true); setError(null); setNotice(null);
    try {
      const res = await fetch(`/api/connections/${lead.id}/enrich`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      if (json.email) { setTo(json.email); setNotice(`Found ${json.email} (${json.email_status ?? 'unknown'}).`); }
      else setNotice('Apollo has no email for this person — type one in if you find it.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setFinding(false);
    }
  }

  async function handleSend() {
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/connections/${lead.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body: bodyText }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      // Persist whatever was actually sent, plus any LinkedIn note edit, so the
      // row reflects the real copy afterwards.
      await onSaveDraft({ draft_email_subject: subject, draft_email_body: bodyText, email: to.trim() || null }).catch(() => {});
      onSent();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  }

  const verified = lead.email_status === 'verified';
  const canSend = !sending && to.trim() !== '' && subject.trim() !== '' && bodyText.trim() !== '';
  const activeTpl = CONNECTION_EMAIL_TEMPLATES.find((t) => t.id === templateId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Email ${lead.person_name}`}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !sending) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 60, display: 'flex',
        alignItems: 'flex-start', justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)', padding: '40px 16px', overflowY: 'auto',
      }}
    >
      <div
        ref={dialogRef}
        style={{
          width: '100%', maxWidth: 680, borderRadius: 12,
          background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)' }}>
          <span aria-hidden style={{ color: 'var(--accent)', fontSize: 18, lineHeight: 1 }}>➤</span>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: '0.01em' }}>
            Email {lead.person_name}
          </h2>
        </div>

        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Template */}
          <Field label="Template">
            <select value={templateId} onChange={(e) => pickTemplate(e.target.value)} style={inputStyle}>
              {CONNECTION_EMAIL_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {activeTpl?.hint && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>{activeTpl.hint}</p>
            )}
          </Field>

          {/* To */}
          <Field label="To">
            <input type="email" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
            {/* email_status can carry a long upstream failure (e.g. an Apollo
                error). Say plainly that no address was found and keep the raw
                reason in the tooltip, rather than pasting a stack-ish string
                into the UI where an address status belongs. */}
            <p
              title={lead.email_status ?? undefined}
              style={{ fontSize: 11, marginTop: 5, color: verified ? 'var(--status-greenlit)' : 'var(--status-deal)' }}
            >
              {verified
                ? 'Verified address.'
                : !lead.email
                  ? 'No address found for this lead — paste one to send.'
                  : `Address is unverified (${(lead.email_status ?? 'unknown').split(':')[0]}) — it may bounce.`}
            </p>
            <button
              onClick={handleFindContact}
              disabled={finding || sending}
              style={{ background: 'none', border: 'none', padding: 0, marginTop: 4, fontSize: 11, fontWeight: 600, color: 'var(--accent)', cursor: finding ? 'wait' : 'pointer' }}
            >
              {finding ? 'Searching…' : 'Find contact'}
            </button>
          </Field>

          {/* Subject */}
          <Field label="Subject">
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} style={inputStyle} />
          </Field>

          {/* Body */}
          <Field label="Email body">
            <textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={9}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55, fontFamily: 'inherit' }}
            />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
              Sends as plain text from Shawn Moffatt &lt;sm@gototeam.com&gt;. Replies go to his inbox.
            </p>
          </Field>

          {error && (
            <div style={{ borderRadius: 6, border: '1px solid var(--status-pass)', background: 'rgba(220,38,38,0.10)', padding: '10px 12px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--status-pass)', marginBottom: 2 }}>Not sent</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-word' }}>{error}</p>
            </div>
          )}
          {notice && (
            <p style={{ fontSize: 12, color: 'var(--status-greenlit)' }}>{notice}</p>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '16px 22px', borderTop: '1px solid var(--border-subtle)' }}>
          <button onClick={onClose} disabled={sending} style={btnGhost}>Cancel</button>
          <button onClick={handleSaveDraft} disabled={savingDraft || sending} style={btnGhost}>
            {savingDraft ? 'Saving…' : 'Save draft'}
          </button>
          <button onClick={handleSend} disabled={!canSend} style={{ ...btnPrimary, opacity: canSend ? 1 : 0.55, cursor: canSend ? 'pointer' : 'not-allowed' }}>
            {sending ? 'Sending…' : '➤  Send email'}
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
  color: 'var(--text-primary)', fontSize: 13, outline: 'none',
};

const btnGhost: React.CSSProperties = {
  padding: '9px 18px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
  border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-secondary)',
};

const btnPrimary: React.CSSProperties = {
  padding: '9px 20px', borderRadius: 6, fontSize: 13, fontWeight: 700,
  border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff',
};
