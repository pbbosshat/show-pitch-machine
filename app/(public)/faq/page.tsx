// Server component — metadata export requires no 'use client'.
// Interactive accordion is in FAQAccordion.tsx (client child).
// Webflow equivalent: .section heading + accordion .faq-list rows.

import type { Metadata } from 'next';
import FAQAccordion from './FAQAccordion';

const OG_IMAGE = 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67c9c4bc80ecce7a341a501c_MYE%20Banner%20.png';

export const metadata: Metadata = {
  title: 'FAQ | MyEntertainment',
  description: 'Frequently asked questions about MyEntertainment — who we are, our shows, networks, offices in New York, Toronto, and London, and how to pitch a show.',
  alternates: { canonical: 'https://www.myentertainment.tv/faq' },
  openGraph: {
    title: 'FAQ | MyEntertainment',
    description: 'Frequently asked questions about MyEntertainment — Ghost Adventures, our shows, networks, and how to pitch.',
    url: 'https://www.myentertainment.tv/faq',
    siteName: 'MyEntertainment',
    type: 'website',
    images: [{ url: OG_IMAGE, width: 1887, alt: 'MyEntertainment FAQ' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FAQ | MyEntertainment',
    description: 'Frequently asked questions about MyEntertainment.',
    images: [OG_IMAGE],
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'What is MyEntertainment?', acceptedAnswer: { '@type': 'Answer', text: 'My Entertainment is an independent production company founded in 2000 owned and operated by Media Content Services.' } },
    { '@type': 'Question', name: 'What series has MyEntertainment produced?', acceptedAnswer: { '@type': 'Answer', text: 'The My Entertainment team has produced several popular, award-winning series, including Ghost Adventures, Pros vs. Joes, Destination Fear, Sin City Justice, Baggage Battles, the critically acclaimed Breaking Borders, and much more.' } },
    { '@type': 'Question', name: 'What networks can I see MyEntertainment programming on?', acceptedAnswer: { '@type': 'Answer', text: 'We currently have shows running on Discovery, Discovery UK, A+E, PBS, Travel Channel and MAX.' } },
    { '@type': 'Question', name: 'Where is MyEntertainment based?', acceptedAnswer: { '@type': 'Answer', text: 'The MyEntertainment production team is based out of New York, NY with offices in Canada and the UK. Our parent company, Media Content Services, is located in Charleston, SC.' } },
    { '@type': 'Question', name: 'What is MyEntertainment best known for?', acceptedAnswer: { '@type': 'Answer', text: 'MyEntertainment is best known for great storytelling, compelling characters, high production value and innovative formats.' } },
    { '@type': 'Question', name: 'How can I reach MyEntertainment?', acceptedAnswer: { '@type': 'Answer', text: 'Have a show you\'d like to pitch or want to learn more about how we can partner with you? Email us at info@myentertainment.tv' } },
    { '@type': 'Question', name: 'Does MyEntertainment have international support?', acceptedAnswer: { '@type': 'Answer', text: 'Absolutely! My Entertainment has been at the forefront of the international format business, co-producing series across the globe, forging strong relationships with independent producers, co-developing original international formats, and importing ideas into the US market.' } },
  ],
};

export default function FAQPage() {
  return (
    <div style={{ background: '#000' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* ── Section 1: Heading ── */}
      <section style={{ paddingTop: 100, paddingBottom: 40, paddingLeft: 20, paddingRight: 20, textAlign: 'center', background: '#000' }}>
        <h1
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 32,
            fontWeight: 400,
            color: '#f2f4f7',
            textAlign: 'center',
            margin: 0,
          }}
        >
          Frequently Asked Questions
        </h1>
      </section>

      {/* ── Section 2: FAQ accordion (client component) ── */}
      <section style={{ background: '#000', padding: '40px 20px' }}>
        <FAQAccordion />
      </section>

      {/* ── CTA section ── */}
      <section style={{ padding: '80px 20px', textAlign: 'center', background: '#000', borderTop: '1px solid #1a1a1a' }}>
        <h2 style={{ fontFamily: "'Roboto', sans-serif", fontSize: 32, fontWeight: 400, color: '#f2f4f7', textTransform: 'capitalize', marginBottom: 16, marginTop: 0 }}>
          Ready To Work With The Best?
        </h2>
        <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 14, color: '#a5a7ad', lineHeight: 1.7, marginBottom: 28, marginTop: 0 }}>
          Reach out to learn more about how we can bring your idea to life.
        </p>
        <a href="/contact" style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 14, fontWeight: 500, color: '#e02027', textTransform: 'uppercase', textDecoration: 'none', letterSpacing: '0.05em' }}>
          CONTACT US &nbsp;&#10095;
        </a>
      </section>
    </div>
  );
}
