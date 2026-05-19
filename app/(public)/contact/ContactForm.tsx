'use client';

import { useState } from 'react';
import { trackShowPitchSubmit, trackContactFormSubmit } from '@/lib/analytics';

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

export default function ContactForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [message,   setMessage]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]    = useState<string | null>(null);
  const [submitted,  setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, email, message }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error || `Error ${res.status}`);
      }

      /* Fire both conversion events on confirmed API success (not on click)
         so bot submissions and network failures don't inflate conversion counts.

         submit_pitch — primary pitch/lead intent signal; mark as Key Event in
           GA4 Admin for properties/486537975. The contact page doubles as the
           pitch submission page per the site's CTA structure, so sourceSection
           is 'contact-pitch' to distinguish it from any future dedicated pitch
           form. show_genre and hasSizzleReel are not collected on this form —
           they are (not set) here and can be enriched from a future pitch form.

         contact_form_submit — secondary general-inquiry signal; also a Key
           Event. Fires alongside submit_pitch so GA4 can report either event
           as the conversion depending on the analysis goal. has_phone is false
           because this form has no phone field. */
      trackShowPitchSubmit({ sourceSection: 'contact-pitch' });
      trackContactFormSubmit({ hasPhone: false, sourceSection: 'contact-pitch' });

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
          Message Sent!
        </p>
        <p style={{ fontSize: 15, color: '#a5a7ad', margin: 0 }}>
          Thanks for reaching out — someone will be in touch soon.
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

      <div style={{ marginBottom: 24 }}>
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

      {error && (
        <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 13, color: '#ef4444', marginBottom: 16 }}>
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
        {submitting ? 'Sending…' : 'Send Email'}
      </button>
    </form>
  );
}
