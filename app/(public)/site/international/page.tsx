export const metadata = { title: 'International' };
export default function InternationalPage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '64px 24px' }}>
      <h1 style={{ fontSize: 56, fontWeight: 800, color: '#F0F0F0', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8 }}>International</h1>
      <p style={{ fontSize: 16, color: '#8A9DC0', lineHeight: 1.7, marginBottom: 40 }}>MY Entertainment distributes and co-produces with partners in 15+ countries. Our library of thousands of hours is available for international licensing across all genres.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 48 }}>
        {['BBC (UK)', 'Discovery Europe', 'Really (UK)', 'The Story Lab', 'Factual Studios', 'Canal+ (France)', 'DMAX (Germany)', 'Foxtel (Australia)'].map(n => (
          <div key={n} style={{ background: '#0F1729', border: '1px solid #1A1A2E', borderRadius: 8, padding: 16, fontSize: 14, color: '#8A9DC0' }}>{n}</div>
        ))}
      </div>
      <div style={{ background: '#0F1729', border: '1px solid #CC1212', borderRadius: 12, padding: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#F0F0F0', marginBottom: 12, fontFamily: "'Barlow Condensed', sans-serif" }}>Inquire About International Rights</h2>
        <p style={{ fontSize: 14, color: '#8A9DC0', marginBottom: 16 }}>40+ production partners across 15 countries. Contact us to discuss co-production and licensing opportunities.</p>
        <a href="mailto:info@myentertainment.tv" style={{ padding: '12px 24px', background: '#CC1212', color: '#fff', borderRadius: 6, fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>Contact Us</a>
      </div>
    </div>
  );
}
