export const metadata = { title: 'About' };

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '64px 24px' }}>
      <h1 style={{ fontSize: 56, fontWeight: 800, color: '#F0F0F0', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8 }}>About MYE</h1>
      <p style={{ fontSize: 16, color: '#CC1212', fontWeight: 600, marginBottom: 40 }}>Compelling characters. Great storytelling. Innovative deals. High production value.</p>
      <div style={{ fontSize: 16, color: '#8A9DC0', lineHeight: 1.8, marginBottom: 40 }}>
        <p style={{ marginBottom: 20 }}>Independent, New York based production company known for its best-in-class non-fiction and documentary series. Over the past two decades, MyE has produced thousands of hours of content spanning a variety of genres for Discovery, A&E, National Geographic, BBC, Lifetime, MTV, Comedy Central, Travel Channel, Investigation Discovery, Oxygen, Nickelodeon, Food Network, Animal Planet, TruTV, PBS, Reelz and CMT.</p>
        <p>Founded in 2000. Acquired by Media Content Services in 2022.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 48 }}>
        {[
          { title: 'Ghost Adventures', detail: '28 seasons, Discovery — #1 paranormal franchise' },
          { title: 'Legacy List', detail: 'Two-time Emmy nomination, PBS' },
          { title: 'Uninterrupted', detail: 'Co-produced with LeBron James / SpringHill Company' },
          { title: 'Breaking Borders', detail: 'Critically acclaimed, Travel Channel' },
        ].map(({ title, detail }) => (
          <div key={title} style={{ background: '#0F1729', border: '1px solid #1A1A2E', borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#F0F0F0', marginBottom: 6 }}>{title}</div>
            <div style={{ fontSize: 13, color: '#4A5D80' }}>{detail}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#0F1729', border: '1px solid #1A1A2E', borderRadius: 10, padding: 24 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#F0F0F0', marginBottom: 16, fontFamily: "'Barlow Condensed', sans-serif" }}>Offices</h3>
        <p style={{ fontSize: 14, color: '#8A9DC0' }}>Manhattan · Toronto · London</p>
        <p style={{ fontSize: 14, color: '#4A5D80', marginTop: 8 }}>235 E 45th St., Floor 14 West, New York, NY 10017</p>
      </div>
    </div>
  );
}
