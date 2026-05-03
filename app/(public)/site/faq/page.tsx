export const metadata = { title: 'FAQ' };

const FAQS = [
  { q: 'What types of content does MY Entertainment produce?', a: 'We specialize in best-in-class non-fiction and documentary series spanning paranormal, sports & competition, home & lifestyle, crime, comedy, and food & travel.' },
  { q: 'How can I pitch a show to MYE?', a: 'Contact us at info@myentertainment.tv with a brief concept summary. We review all pitches submitted through our office.' },
  { q: 'Does MYE handle international distribution?', a: 'Yes. We distribute and co-produce with partners in 15+ countries. Contact us to discuss international rights and co-production opportunities.' },
  { q: 'How many seasons has Ghost Adventures run?', a: 'Ghost Adventures is currently in its 28th season on Discovery, making it the #1 paranormal franchise in television history.' },
  { q: 'Where are your offices?', a: 'We have offices in Manhattan (235 E 45th St., Floor 14 West, New York, NY 10017), Toronto, and London.' },
  { q: 'When was MYE founded?', a: 'MY Entertainment was founded in 2000 and was acquired by Media Content Services in 2022.' },
];

export default function FAQPage() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '64px 24px' }}>
      <h1 style={{ fontSize: 56, fontWeight: 800, color: '#F0F0F0', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 48 }}>FAQ</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {FAQS.map(({ q, a }) => (
          <details key={q} style={{ background: '#0F1729', border: '1px solid #1A1A2E', borderRadius: 10, padding: '20px 24px' }}>
            <summary style={{ fontSize: 16, fontWeight: 600, color: '#F0F0F0', cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {q} <span style={{ color: '#CC1212', fontSize: 18 }}>+</span>
            </summary>
            <p style={{ fontSize: 14, color: '#8A9DC0', lineHeight: 1.7, marginTop: 16 }}>{a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
