export const metadata = { title: 'Work With MYE' };
export default function ContactPage() {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '64px 24px' }}>
      <h1 style={{ fontSize: 56, fontWeight: 800, color: '#F0F0F0', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8 }}>Work With MYE</h1>
      <p style={{ fontSize: 16, color: '#8A9DC0', lineHeight: 1.7, marginBottom: 40 }}>We partner with networks, streaming platforms, and production companies to develop and produce best-in-class non-fiction content.</p>
      <div style={{ background: '#0F1729', border: '1px solid #1A1A2E', borderRadius: 12, padding: 32, marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F0F0F0', marginBottom: 20, fontFamily: "'Barlow Condensed', sans-serif" }}>Get in Touch</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div><div style={{ fontSize: 11, fontWeight: 600, color: '#4A5D80', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Email</div><a href="mailto:info@myentertainment.tv" style={{ fontSize: 16, color: '#CC1212', textDecoration: 'none' }}>info@myentertainment.tv</a></div>
          <div><div style={{ fontSize: 11, fontWeight: 600, color: '#4A5D80', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Address</div><p style={{ fontSize: 14, color: '#8A9DC0', lineHeight: 1.6 }}>MY Entertainment<br />235 E 45th St., Floor 14 West<br />New York, NY 10017</p></div>
          <div><div style={{ fontSize: 11, fontWeight: 600, color: '#4A5D80', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Offices</div><p style={{ fontSize: 14, color: '#8A9DC0' }}>Manhattan · Toronto · London</p></div>
        </div>
      </div>
    </div>
  );
}
