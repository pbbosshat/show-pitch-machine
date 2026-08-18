'use client';

import { useState } from 'react';
import { trackShowPitchSubmit, trackContactFormSubmit, trackGenerateLead } from '@/lib/analytics';
// readAttribution reads the first-touch UTM/gclid/fbclid/referrer/landing_page
// that AttributionCapture stored in localStorage when the visitor first landed.
// clearAttribution removes those records after a successful submission so a
// future visit from a different campaign gets a fresh first-touch.
import { readAttribution, clearAttribution } from '@/lib/attribution';
import {
  MATERIAL_NATURE_OPTIONS,
  SUBMISSION_RELEASE_CLAUSES,
  SUBMISSION_RELEASE_CONSENT_LABEL,
  SUBMISSION_RELEASE_ENTITY,
  SUBMISSION_RELEASE_PREAMBLE,
  SUBMISSION_RELEASE_TITLE,
  SUBMISSION_RELEASE_VERSION,
  isReleaseRequired,
  signatureMatchesName,
} from '@/lib/submission-release';

const INPUT_STYLE = {
  background: '#1d1f21',
  border: '1px solid #2a2a2a',
  color: '#f2f4f7',
  padding: '12px 16px',
  width: '100%',
  fontFamily: "'Roboto', sans-serif",
  fontSize: 14,
  borderRadius: 2,
  boxSizing: 'border-box' as const,
  outline: 'none',
};

const LABEL_STYLE = {
  display: 'block',
  fontFamily: "'Roboto', sans-serif",
  fontSize: 11,
  color: '#a5a7ad',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  marginBottom: 6,
};

const RELEASE_BODY_STYLE = {
  fontFamily: "'Roboto', sans-serif",
  fontSize: 12,
  lineHeight: 1.65,
  color: '#c4c6cc',
  margin: '0 0 10px',
};

/**
 * ContactForm — shared by /contact, /pitch and /work-with-us.
 *
 * `source` identifies WHICH entry point rendered the form. It does two things:
 *   1. decides whether the Submissions Release block is shown, via the shared
 *      isReleaseRequired() predicate — the same function the API enforces with,
 *      so the form and the server can never disagree about what is gated;
 *   2. is posted to the API and stored on the lead, so staff can tell a show
 *      submission apart from a general enquiry.
 *
 * Omitting `source` keeps the original ungated behaviour. That default is what
 * keeps /contact and the ten /available/[slug] one-sheet forms working unchanged.
 */
export default function ContactForm({ source }: { source?: string } = {}) {
  const requiresRelease = isReleaseRequired(source);

  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [message,   setMessage]   = useState('');

  // Release-only fields. Kept in state unconditionally (hooks cannot be
  // conditional) but only rendered, validated and sent when requiresRelease.
  const [phone,          setPhone]          = useState('');
  const [materialTitle,  setMaterialTitle]  = useState('');
  const [materialNature, setMaterialNature] = useState('');
  const [materialPages,  setMaterialPages]  = useState('');
  const [releaseAccepted, setReleaseAccepted] = useState(false);
  const [signature,       setSignature]       = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]    = useState<string | null>(null);
  const [submitted,  setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    /* Client-side release checks. These are a courtesy that gives an immediate,
       specific message instead of a round-trip; they are NOT the enforcement.
       /api/contact re-checks every one of these, because the endpoint is public
       and anything decided only in the browser can be skipped entirely. */
    if (requiresRelease) {
      if (!releaseAccepted) {
        setError('Please tick the box to agree to the Submissions Release before submitting.');
        return;
      }
      if (!signatureMatchesName(signature, firstName, lastName)) {
        setError(
          'Your typed signature must include the first and last name you entered above.'
        );
        return;
      }
      const pages = Number(materialPages);
      if (!Number.isInteger(pages) || pages < 1) {
        setError('Please enter the number of pages as a whole number (1 or more).');
        return;
      }
    }

    setSubmitting(true);
    try {
      // Read attribution BEFORE the fetch so we capture the correct first-touch
      // data even if the user clicked around after landing. readAttribution() is
      // synchronous and safe to call client-side — it returns an all-null object
      // during SSR or if localStorage was never written (direct visitors).
      const attribution = readAttribution();

      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Spread attribution fields alongside the form fields.
        // The server ignores any null values and maps them to SQL NULL.
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          message,
          source,
          ...(requiresRelease
            ? {
                phone,
                material_title:  materialTitle,
                material_nature: materialNature,
                material_pages:  Number(materialPages),
                release_accepted:  true,
                release_signature: signature,
                // Sent for transparency/debugging only — the server records its
                // OWN copy of the current version rather than trusting this, so a
                // crafted request cannot claim agreement to different wording.
                release_version: SUBMISSION_RELEASE_VERSION,
              }
            : {}),
          ...attribution,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error || `Error ${res.status}`);
      }

      /* Fire conversion events on confirmed API success (not on click)
         so bot submissions and network failures don't inflate conversion counts.

         submit_pitch — primary pitch/lead intent signal; mark as Key Event in
           GA4 Admin for properties/486537975. show_genre and hasSizzleReel are
           not collected on this form — they are (not set) here.

         contact_form_submit — secondary general-inquiry signal; also a Key
           Event. Fires alongside submit_pitch so GA4 can report either event
           as the conversion depending on the analysis goal.

         generate_lead — standard GA4 e-commerce conversion event. GA4 treats
           this as a built-in event with a standard meaning: a qualified lead
           has been captured. Including utm_source/medium/campaign as event
           parameters lets GA4 Explorations segment "leads by traffic source"
           without needing a custom funnel.

         sourceSection falls back to 'contact-pitch' when no source prop is
         given, preserving the exact label these events carried before the
         release work — so historical GA4 comparisons stay continuous. Pages
         that DO pass a source now report under that source instead, which is
         what finally lets GA4 separate pitch submissions from general enquiries. */
      const sourceSection = source ?? 'contact-pitch';
      trackShowPitchSubmit({ sourceSection });
      trackContactFormSubmit({ hasPhone: requiresRelease && phone.trim() !== '', sourceSection });
      trackGenerateLead({
        sourceSection,
        utmSource:   attribution.utm_source ?? undefined,
        utmMedium:   attribution.utm_medium ?? undefined,
        utmCampaign: attribution.utm_campaign ?? undefined,
      });

      // Clear first-touch after a successful conversion so a future visit from
      // a different campaign doesn't inherit this session's attribution.
      clearAttribution();

      setSubmitted(true);
    } catch (err) {
      /* Log the full error so it's visible in GA4 DebugView and the console —
         never swallow analytics errors silently. */
      console.error('[ContactForm] submission error:', err);
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '48px 20px',
          fontFamily: "'Roboto', sans-serif",
        }}
      >
        <p
          style={{
            fontSize: 32,
            color: '#e51d26',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 12,
            fontWeight: 400,
          }}
        >
          {requiresRelease ? 'Submission Received!' : 'Message Sent!'}
        </p>
        <p style={{ fontSize: 15, color: '#a5a7ad', margin: 0 }}>
          {requiresRelease
            ? 'Thanks — your submission and signed release have been recorded. Someone from our development team will be in touch.'
            : 'Thanks for reaching out — someone will be in touch soon.'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="contact-first-name" style={LABEL_STYLE}>First Name</label>
          <input
            id="contact-first-name"
            type="text"
            placeholder="First name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            style={INPUT_STYLE}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="contact-last-name" style={LABEL_STYLE}>Last Name</label>
          <input
            id="contact-last-name"
            type="text"
            placeholder="Last name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            style={INPUT_STYLE}
          />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label htmlFor="contact-email" style={LABEL_STYLE}>Email</label>
        <input
          id="contact-email"
          type="email"
          placeholder="your@email.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={INPUT_STYLE}
        />
      </div>

      {requiresRelease && (
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="contact-phone" style={LABEL_STYLE}>Phone</label>
          <input
            id="contact-phone"
            type="tel"
            placeholder="(555) 555-5555"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={INPUT_STYLE}
          />
        </div>
      )}

      <div style={{ marginBottom: requiresRelease ? 16 : 24 }}>
        <label htmlFor="contact-message" style={LABEL_STYLE}>Message</label>
        <textarea
          id="contact-message"
          rows={5}
          placeholder="Tell us about your project or inquiry..."
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ ...INPUT_STYLE, resize: 'vertical' }}
        />
      </div>

      {requiresRelease && (
        <>
          {/* ── The Material being submitted ──────────────────────────────────
              These three fields are not extra marketing questions: the release
              itself identifies the Material by title, nature and page count, so
              an agreement recorded without them would not say what it covers. */}
          <fieldset
            style={{
              border: '1px solid #2a2a2a',
              borderRadius: 2,
              padding: '20px 20px 4px',
              marginBottom: 20,
              minWidth: 0,
            }}
          >
            <legend
              style={{
                fontFamily: "'Roboto Condensed', sans-serif",
                fontSize: 13,
                color: '#e51d26',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                padding: '0 8px',
              }}
            >
              The Material You&rsquo;re Submitting
            </legend>

            <div style={{ marginBottom: 16 }}>
              <label htmlFor="material-title" style={LABEL_STYLE}>Title</label>
              <input
                id="material-title"
                type="text"
                placeholder="Working title of your show"
                required
                value={materialTitle}
                onChange={(e) => setMaterialTitle(e.target.value)}
                style={INPUT_STYLE}
              />
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <label htmlFor="material-nature" style={LABEL_STYLE}>Nature of the Material</label>
                <select
                  id="material-nature"
                  required
                  value={materialNature}
                  onChange={(e) => setMaterialNature(e.target.value)}
                  style={{ ...INPUT_STYLE, appearance: 'auto' }}
                >
                  <option value="" disabled>Select one…</option>
                  {MATERIAL_NATURE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: '1 1 140px', minWidth: 0 }}>
                <label htmlFor="material-pages" style={LABEL_STYLE}>Number of Pages</label>
                <input
                  id="material-pages"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="e.g. 12"
                  required
                  value={materialPages}
                  onChange={(e) => setMaterialPages(e.target.value)}
                  style={INPUT_STYLE}
                />
              </div>
            </div>
          </fieldset>

          {/* ── The release itself ───────────────────────────────────────────
              Shown in full and in a scrollable box rather than behind a link,
              so nobody can say the terms were not put in front of them. */}
          <div style={{ marginBottom: 16 }}>
            <span style={LABEL_STYLE}>{SUBMISSION_RELEASE_TITLE}</span>
            <div
              style={{
                background: '#131517',
                border: '1px solid #2a2a2a',
                borderRadius: 2,
                padding: 16,
                maxHeight: 260,
                overflowY: 'auto',
              }}
            >
              <p style={{ ...RELEASE_BODY_STYLE, color: '#f2f4f7' }}>
                {/* Explicit {' '} — a literal space between an expression and the
                    following text is not reliably preserved through JSX here, and
                    silently renders as "…My Entertainment(“you/your”)". */}
                I am currently submitting to {SUBMISSION_RELEASE_ENTITY}{' '}
                (&ldquo;you/your&rdquo;) with this agreement the Material identified
                above. I understand and agree that:
              </p>
              {SUBMISSION_RELEASE_PREAMBLE.map((para) => (
                <p key={para.slice(0, 40)} style={RELEASE_BODY_STYLE}>{para}</p>
              ))}
              <ol style={{ ...RELEASE_BODY_STYLE, paddingLeft: 18, margin: 0 }}>
                {SUBMISSION_RELEASE_CLAUSES.map((clause) => (
                  <li key={clause.slice(0, 40)} style={{ marginBottom: 10 }}>{clause}</li>
                ))}
              </ol>
            </div>
            <p
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: 12,
                color: '#8a8c92',
                margin: '8px 0 0',
              }}
            >
              Version {SUBMISSION_RELEASE_VERSION}.{' '}
              <a
                href="/submission-release-form.pdf"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#e02027', textDecoration: 'underline' }}
              >
                Download a PDF copy
              </a>{' '}
              for your records.
            </p>
          </div>

          {/* Acceptance + electronic signature */}
          <label
            htmlFor="release-accepted"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              marginBottom: 16,
              cursor: 'pointer',
              fontFamily: "'Roboto', sans-serif",
              fontSize: 13,
              lineHeight: 1.6,
              color: '#c4c6cc',
            }}
          >
            <input
              id="release-accepted"
              type="checkbox"
              required
              checked={releaseAccepted}
              onChange={(e) => setReleaseAccepted(e.target.checked)}
              style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0, accentColor: '#e51d26' }}
            />
            <span>{SUBMISSION_RELEASE_CONSENT_LABEL}</span>
          </label>

          <div style={{ marginBottom: 24 }}>
            <label htmlFor="release-signature" style={LABEL_STYLE}>
              Signature — type your full legal name
            </label>
            <input
              id="release-signature"
              type="text"
              placeholder="Your full legal name"
              required
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              autoComplete="off"
              style={{ ...INPUT_STYLE, fontStyle: 'italic', fontSize: 16 }}
            />
            <p
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: 12,
                color: '#8a8c92',
                margin: '6px 0 0',
              }}
            >
              Dated automatically on submission. We record the date, time and IP address
              of your acceptance.
            </p>
          </div>
        </>
      )}

      {error && (
        <p
          role="alert"
          style={{ fontFamily: "'Roboto', sans-serif", fontSize: 13, color: '#ef4444', marginBottom: 16 }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          fontFamily: "'Roboto Condensed', sans-serif",
          fontSize: 14,
          fontWeight: 400,
          color: '#fff',
          background: '#e51d26',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          padding: '12px 32px',
          border: 'none',
          borderRadius: 2,
          cursor: submitting ? 'not-allowed' : 'pointer',
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? 'Sending…' : requiresRelease ? 'Submit & Sign Release' : 'Send Email'}
      </button>
    </form>
  );
}
