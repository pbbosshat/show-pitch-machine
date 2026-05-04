'use client';

import { useState } from 'react';
import Link from 'next/link';

interface FAQ {
  id: string;
  question: string;
  answer: React.ReactNode;
}

const FAQS: FAQ[] = [
  { id: 'faq-1', question: 'What is MyEntertainment?', answer: 'My Entertainment is an independent production company founded in 2000 owned and operated by Media Content Services.' },
  { id: 'faq-2', question: 'What series has MyEntertainment produced?', answer: 'The My Entertainment team has produced several popular, award-winning series, including Ghost Adventures, Pros vs. Joes, Destination Fear, Sin City Justice, Baggage Battles, the critically acclaimed Breaking Borders, and much more.' },
  { id: 'faq-3', question: 'What networks I can I see MyEntertainment programming?', answer: 'We currently have shows running on Discovery, Discovery UK, A+E, PBS, Travel Channel and MAX.' },
  { id: 'faq-4', question: 'Where is MyEntertainment based out of?', answer: 'The MyEntertainment production team is based out of New York, NY with offices in Canada and the UK. Our parent company, Media Content Services, is located in Charleston, SC.' },
  { id: 'faq-5', question: 'What is MyEntertainment best known for?', answer: 'MyEntertainment is best known for great storytelling, compelling characters, high production value and innovative formats' },
  { id: 'faq-6', question: 'How can I reach you?', answer: "Simple! Have a show you'd like to pitch or want to learn more about how we can partner with you? Email us at info@myentertainment.tv" },
  { id: 'faq-7', question: 'Do you have international support?', answer: 'Absolutely! My Entertainment has been at the forefront of the international format business, co-producing series across the globe, forging strong relationships with independent producers, co-developing original international formats, and importing ideas into the US market.' },
  { id: 'faq-8', question: 'How do production companies find local crew?', answer: <>Most productions scout crew through state and city film commission directories — publicly searchable databases maintained by each state&apos;s film office. When a show qualifies for local incentives, the production coordinator typically searches the commission&apos;s crew database first. We&apos;ve put together a <Link href="/film-commissions" style={{ color: '#e51d26', textDecoration: 'none' }}>complete guide to every US film commission directory</Link> — including how to get listed for free.</> },
];

export default function FAQAccordion() {
  const [openId, setOpenId] = useState<string | null>(null);

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {FAQS.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
            <button
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${item.id}`}
              style={{
                all: 'unset',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                cursor: 'pointer',
                padding: '20px 0',
                boxSizing: 'border-box',
                fontFamily: "'Roboto Condensed', sans-serif",
                fontSize: 16,
                fontWeight: 400,
                color: '#f2f4f7',
              }}
            >
              <span style={{ paddingRight: 16 }}>{item.question}</span>
              <span
                style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 20, color: '#e51d26', flexShrink: 0, lineHeight: 1 }}
                aria-hidden="true"
              >
                {isOpen ? '−' : '+'}
              </span>
            </button>
            {isOpen && (
              <div
                id={`faq-answer-${item.id}`}
                role="region"
                style={{ padding: '0 0 16px 0', fontFamily: "'Roboto', sans-serif", fontSize: 14, color: '#a5a7ad', lineHeight: 1.7 }}
              >
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
