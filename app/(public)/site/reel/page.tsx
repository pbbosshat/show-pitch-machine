export const metadata = { title: 'Reel' };
export default function ReelPage() {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '64px 24px', textAlign: 'center' }}>
      <h1 style={{ fontSize: 56, fontWeight: 800, color: '#F0F0F0', fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8 }}>Sizzle Reel</h1>
      <p style={{ fontSize: 15, color: '#8A9DC0', marginBottom: 40 }}>Twenty years of compelling characters and great storytelling.</p>
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 12, background: '#0F1729', border: '1px solid #1A1A2E' }}>
        <iframe
          src="https://www.youtube.com/embed/dQw4w9WgXcQ"
          title="MY Entertainment Sizzle Reel"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
        />
      </div>
      <p style={{ fontSize: 13, color: '#2A3D60', marginTop: 16 }}>Contact <a href="mailto:info@myentertainment.tv" style={{ color: '#CC1212' }}>info@myentertainment.tv</a> for screeners and press materials.</p>
    </div>
  );
}
