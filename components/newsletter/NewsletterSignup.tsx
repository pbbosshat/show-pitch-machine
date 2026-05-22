'use client';

// NewsletterSignup — email capture component for show pages.
//
// Placement: between the show description and the network logo on each show page.
// Sends { email, showSlug } to POST /api/newsletter which writes to newsletter_signups
// table in Postgres. No external provider in V1 — rows are stored for future export.
//
// Props:
//   showSlug  — used as the showSlug parameter in the API body so we can track
//               which show page drove each signup. Also fills the personalized
//               lead-in copy that names the show.
//   showTitle — human-readable show name used in the lead-in copy paragraph.

import { useState } from 'react';

interface NewsletterSignupProps {
  showSlug: string;
  showTitle: string;
}

// Input style matches the ContactForm INPUT_STYLE pattern for visual consistency
const INPUT_STYLE: React.CSSProperties = {
  background: '#f5f5f5',
  border: '1px solid #ddd',
  color: '#222',
  padding: '12px 16px',
  fontFamily: "'Roboto', sans-serif",
  fontSize: 14,
  borderRadius: 2,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

export default function NewsletterSignup({ showSlug, showTitle }: NewsletterSignupProps) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, showSlug }),
      });

      if (!res.ok) {
        // Surface the exact server error per design principles — never show a generic message
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `Error ${res.status}`);
      }

      setSubmitted(true);
    } catch (err) {
      // Log for debugging while showing the exact message to the user
      console.error('[NewsletterSignup] submission error:', err);
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        style={{
          background: '#f9f9f9',
          borderRadius: 4,
          padding: '20px 24px',
          textAlign: 'center',
          margin: '40px 0',
          fontFamily: "'Roboto', sans-serif",
        }}
      >
        <p style={{ fontSize: 18, color: '#222', fontWeight: 500, margin: '0 0 8px' }}>
          You&rsquo;re on the list!
        </p>
        <p style={{ fontSize: 14, color: '#666', margin: 0 }}>
          Thanks for signing up. We&rsquo;ll send updates on {showTitle} and other MyEntertainment series once a month.
        </p>
      </div>
    );
  }

  return (
    // Wrapper section — light grey card to visually separate from the white page
    <div
      style={{
        background: '#f3f3f3',
        borderRadius: 4,
        padding: '28px 24px',
        margin: '40px 0',
      }}
    >
      {/* Lead-in paragraph — personalized with the show name, 100-150 words */}
      <p
        style={{
          fontFamily: "'Roboto Slab', sans-serif",
          fontSize: 15,
          fontWeight: 300,
          color: '#333',
          lineHeight: '24px',
          marginTop: 0,
          marginBottom: 20,
          textAlign: 'center',
        }}
      >
        Get behind-the-scenes updates on <strong style={{ fontWeight: 600 }}>{showTitle}</strong> and other
        MyEntertainment series &mdash; sent monthly, never sold. We share production news, new shows in
        development, and the occasional behind-the-scenes look at what it takes to bring unscripted stories
        to life. No spam. Unsubscribe any time.
      </p>

      {/* Inline email form — single field + submit */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <input
          type="email"
          placeholder="your@email.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ ...INPUT_STYLE, maxWidth: 320 }}
          aria-label="Email address for MyEntertainment newsletter"
        />
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
            padding: '12px 28px',
            border: 'none',
            borderRadius: 2,
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {submitting ? 'Subscribing…' : 'Subscribe'}
        </button>
      </form>

      {/* Error display — show exact server message per design principles */}
      {error && (
        <p
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 13,
            color: '#c0392b',
            textAlign: 'center',
            marginTop: 12,
            marginBottom: 0,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
