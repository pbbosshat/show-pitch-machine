// Webflow equivalent: .section heading + form section + show pitch two-column section.
// The contact page IS the CTA destination — no separate CTA section at the bottom.
// paddingTop 100px on the heading section clears the fixed navbar.

import type { Metadata } from 'next';

const OG_IMAGE = 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67c9c4bc80ecce7a341a501c_MYE%20Banner%20.png';

export const metadata: Metadata = {
  title: 'Contact MyEntertainment | Pitch a Show',
  description: 'Contact MyEntertainment to pitch a show, explore co-production partnerships, or start a conversation. Based in New York with offices in Toronto and London.',
  alternates: { canonical: 'https://www.myentertainment.tv/contact' },
  openGraph: {
    title: 'Contact MyEntertainment | Pitch a Show',
    description: 'Pitch a show, explore co-production partnerships, or start a conversation with our New York, Toronto, or London offices.',
    url: 'https://www.myentertainment.tv/contact',
    siteName: 'MyEntertainment',
    type: 'website',
    images: [{ url: OG_IMAGE, width: 1887, alt: 'Contact MyEntertainment' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact MyEntertainment | Pitch a Show',
    description: 'Pitch a show or explore co-production partnerships with MyEntertainment.',
    images: [OG_IMAGE],
  },
};

export default function ContactPage() {
  return (
    // Webflow: body bg #000 — inherited from layout, explicit here for safety
    <div style={{ background: '#000' }}>

      {/* ── Section 1: Heading ── */}
      {/*
        Webflow: .section paddingTop 100px (fixed nav clearance), paddingBottom 40px, bg #000.
        h1 uses .subtitle-small: #e51d26, 48px, uppercase, centered, Roboto, letter-spacing 0.2em.
        Sub-copy paragraph in body style.
      */}
      <section
        style={{
          paddingTop: 100,
          paddingBottom: 40,
          paddingLeft: 20,
          paddingRight: 20,
          background: '#000',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            // Webflow .subtitle-small: color #e51d26, font-size 48px, uppercase,
            // letter-spacing 0.2em, Roboto, text-align center
            fontFamily: "'Roboto', sans-serif",
            fontSize: 48,
            fontWeight: 400,
            color: '#e51d26',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            textAlign: 'center',
            marginTop: 0,
            marginBottom: 16,
          }}
        >
          Ready To Work With The Best?
        </h1>

        {/* Sub-copy — Roboto 14px #a5a7ad, centered */}
        <p
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 14,
            color: '#a5a7ad',
            textAlign: 'center',
            margin: 0,
          }}
        >
          Have a general question? Fill out the form below and someone will be in touch!
        </p>
      </section>

      {/* ── Section 2: Contact form ── */}
      {/* Webflow: .section bg #000, padding 40px 20px */}
      <section
        style={{
          background: '#000',
          padding: '40px 20px',
        }}
      >
        {/*
          Form container — max-width 600px, narrower than standard 1180px container
          to keep form fields readable and not too wide.
        */}
        <div style={{ maxWidth: 600, margin: '0 auto' }}>

          {/*
            POST to /api/contact.
            The API route is not yet implemented — this is the UI contract only.
            Bot/automation callers can POST JSON to /api/contact directly.
            Accessible: every input has an associated <label>.
          */}
          <form method="POST" action="/api/contact">

            {/* ── First Name + Last Name — side by side, Webflow: two half-width fields ── */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label
                  htmlFor="contact-first-name"
                  style={{
                    display: 'block',
                    fontFamily: "'Roboto', sans-serif",
                    fontSize: 11,
                    color: '#a5a7ad',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginBottom: 6,
                  }}
                >
                  First Name
                </label>
                <input
                  id="contact-first-name"
                  name="first_name"
                  type="text"
                  placeholder="First name"
                  required
                  style={{
                    background: '#1d1f21',
                    border: '1px solid #2a2a2a',
                    color: '#f2f4f7',
                    padding: '12px 16px',
                    width: '100%',
                    fontFamily: "'Roboto', sans-serif",
                    fontSize: 14,
                    borderRadius: 2,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label
                  htmlFor="contact-last-name"
                  style={{
                    display: 'block',
                    fontFamily: "'Roboto', sans-serif",
                    fontSize: 11,
                    color: '#a5a7ad',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginBottom: 6,
                  }}
                >
                  Last Name
                </label>
                <input
                  id="contact-last-name"
                  name="last_name"
                  type="text"
                  placeholder="Last name"
                  required
                  style={{
                    background: '#1d1f21',
                    border: '1px solid #2a2a2a',
                    color: '#f2f4f7',
                    padding: '12px 16px',
                    width: '100%',
                    fontFamily: "'Roboto', sans-serif",
                    fontSize: 14,
                    borderRadius: 2,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* ── Email field ── */}
            <div style={{ marginBottom: 16 }}>
              <label
                htmlFor="contact-email"
                style={{
                  display: 'block',
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 11,
                  color: '#a5a7ad',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: 6,
                }}
              >
                Email
              </label>
              <input
                id="contact-email"
                name="email"
                type="email"
                placeholder="your@email.com"
                required
                style={{
                  background: '#1d1f21',
                  border: '1px solid #2a2a2a',
                  color: '#f2f4f7',
                  padding: '12px 16px',
                  width: '100%',
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 14,
                  borderRadius: 2,
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            {/* ── Message textarea ── */}
            <div style={{ marginBottom: 24 }}>
              <label
                htmlFor="contact-message"
                style={{
                  display: 'block',
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 11,
                  color: '#a5a7ad',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: 6,
                }}
              >
                Message
              </label>
              <textarea
                id="contact-message"
                name="message"
                rows={5}
                placeholder="Tell us about your project or inquiry..."
                required
                style={{
                  background: '#1d1f21',
                  border: '1px solid #2a2a2a',
                  color: '#f2f4f7',
                  padding: '12px 16px',
                  width: '100%',
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 14,
                  borderRadius: 2,
                  boxSizing: 'border-box',
                  outline: 'none',
                  // resize: vertical allows the user to resize vertically only
                  resize: 'vertical',
                }}
              />
            </div>

            {/*
              Submit button — Webflow: .button / .submit-button style.
              bg #e51d26, color #fff, Roboto Condensed, uppercase, padding 12px 32px.
            */}
            <button
              type="submit"
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
                cursor: 'pointer',
              }}
            >
              Send email
            </button>

          </form>
        </div>
      </section>

      {/* ── Section 3: Show pitch section ── */}
      {/*
        Webflow: .section bg #000, padding 60px 20px.
        Two-column layout: 60% left (text + download link), 40% right (empty — Webflow placeholder).
      */}
      <section
        style={{
          background: '#000',
          padding: '60px 20px',
          borderTop: '1px solid #1a1a1a',
        }}
      >
        {/* Webflow: .container max-width 1180px */}
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>

          {/*
            Two-column grid: 60/40 split.
            Webflow uses a .w-layout-grid with column fractions here.
            On mobile the columns stack vertically.
          */}
          <div
            className="pitch-cols"
            style={{
              display: 'grid',
              gridTemplateColumns: '3fr 2fr',
              gap: 48,
            }}
          >

            {/* ── Left column: show pitch copy ── */}
            <div>
              {/*
                Webflow: h2 equivalent — but uses Roboto Condensed at 24px uppercase.
                Matches the h3 style token (Roboto Condensed, 24px, uppercase) rather
                than the standard h2 (Roboto 32px) since this is a subsection header.
              */}
              <h2
                style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 24,
                  fontWeight: 400,
                  color: '#f2f4f7',
                  textTransform: 'uppercase',
                  marginTop: 0,
                  marginBottom: 20,
                }}
              >
                Want To Talk To Us About A Show Idea?
              </h2>

              {/* Body paragraph 1 */}
              <p
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 14,
                  color: '#a5a7ad',
                  lineHeight: 1.7,
                  marginBottom: 16,
                  marginTop: 0,
                }}
              >
                We are actively developing and selling shows for new television shows and documentaries.
              </p>

              {/* Body paragraph 2 */}
              <p
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 14,
                  color: '#a5a7ad',
                  lineHeight: 1.7,
                  marginBottom: 16,
                  marginTop: 0,
                }}
              >
                While we mostly develop our own internally generated ideas, we recognize that a great idea can come from anywhere, and people with great ideas may not have the kind of access we have to get those ideas sold and made.
              </p>

              {/* Body paragraph 3 — submission instructions */}
              <p
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 14,
                  color: '#a5a7ad',
                  lineHeight: 1.7,
                  marginBottom: 20,
                  marginTop: 0,
                }}
              >
                Have an idea you&#39;d like to submit? Please download and fill out the Submission Release Form and then email your contact information and a brief summary over to{' '}
                <a
                  href="mailto:info@myentertainment.tv"
                  style={{
                    color: '#e02027',
                    textDecoration: 'none',
                  }}
                >
                  info@myentertainment.tv
                </a>{' '}
                and someone will be in touch with you as soon as possible!
              </p>

              {/*
                Download link — Webflow: inline link styled with color #e02027 and underline.
                href points to /submission-release-form.pdf (placeholder — file not yet uploaded).
              */}
              <a
                href="/submission-release-form.pdf"
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 14,
                  color: '#e02027',
                  textDecoration: 'underline',
                }}
              >
                Download Submission Release Form
              </a>
            </div>

            {/*
              Right column: intentionally empty.
              Webflow has an empty right column div here — likely a placeholder
              for a future image or widget that was never added to the live site.
            */}
            <div />

          </div>{/* /pitch-cols */}
        </div>
      </section>

      {/* ── Responsive breakpoints ── */}
      {/*
        Webflow tablet/mobile: two-column pitch section stacks to single column.
        No CTA section — this page is the CTA destination.
      */}
      <style>{`
        @media (max-width: 767px) {
          .pitch-cols { grid-template-columns: 1fr !important; gap: 24px !important; }
        }
      `}</style>

    </div>
  );
}
