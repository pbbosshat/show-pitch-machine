// Pitch portal — buyer-facing microsite served at /pitch/[slug].
// This is the ONLY public-facing internal route. Light mode, no sidebar.
// Renders the pitch package as a clean, branded proposal page.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getBaseUrl } from '@/lib/baseUrl';

interface PitchPortal {
  id: string;
  slug: string;
  package_id: string;
  sent_to?: string;
  created_at?: number;
  package?: {
    name: string;
    narrative?: string;
    ask_format?: string;
    ask_episode_count?: number;
    ask_deal_structure?: string;
    ip?: { title: string; logline?: string; genre?: string; };
    target_company?: { name: string; };
    target_contact?: { name: string; title?: string; };
  };
}

async function fetchPortal(slug: string): Promise<PitchPortal | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/api/pitch/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const { data } = await res.json();
    return data ?? null;
  } catch { return null; }
}

export default async function PitchPortalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const portal = await fetchPortal(slug);

  if (!portal) notFound();

  const pkg = portal.package;
  const ip = pkg?.ip;
  const contact = pkg?.target_contact;
  const company = pkg?.target_company;

  return (
    // Light mode override for buyer-facing view — clean, professional
    <div style={{ minHeight: '100vh', background: '#FFFFFF', color: '#0F172A', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid #E2E8F0', padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#CC1212', fontFamily: 'Inter, sans-serif' }}>MY</span>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', color: '#0F172A', fontFamily: 'Inter, sans-serif' }}>ENTERTAINMENT</span>
        </div>
        {contact && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>For {contact.name}</div>
            {contact.title && company && <div style={{ fontSize: 12, color: '#64748B' }}>{contact.title} · {company.name}</div>}
          </div>
        )}
      </header>

      {/* Main content */}
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '56px 40px' }}>
        {/* Show title */}
        {ip && (
          <div style={{ marginBottom: 40 }}>
            {ip.genre && (
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#CC1212', textTransform: 'uppercase', marginBottom: 12 }}>{ip.genre}</div>
            )}
            <h1 style={{ fontSize: 48, fontWeight: 800, color: '#0F172A', fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1.05, marginBottom: 16 }}>
              {ip.title}
            </h1>
            {ip.logline && (
              <p style={{ fontSize: 18, color: '#475569', lineHeight: 1.6, fontStyle: 'italic' }}>{ip.logline}</p>
            )}
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: '#E2E8F0', marginBottom: 40 }} />

        {/* Narrative */}
        {pkg?.narrative && (
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.06em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 16 }}>The Concept</h2>
            <div style={{ fontSize: 16, color: '#334155', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{pkg.narrative}</div>
          </div>
        )}

        {/* The Ask */}
        {(pkg?.ask_format || pkg?.ask_episode_count || pkg?.ask_deal_structure) && (
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '28px 32px', marginBottom: 40 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.06em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 20 }}>The Ask</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
              {pkg.ask_format && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Format</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>{pkg.ask_format}</div>
                </div>
              )}
              {pkg.ask_episode_count && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Episodes</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>{pkg.ask_episode_count}</div>
                </div>
              )}
              {pkg.ask_deal_structure && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Deal</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>{pkg.ask_deal_structure}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MYE credentials */}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 32, marginTop: 40 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.06em', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 16 }}>About MY Entertainment</h2>
          <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.7 }}>
            Independent, New York based production company known for best-in-class non-fiction and documentary series. Ghost Adventures (28 seasons, Discovery), Legacy List (PBS, Emmy nominated), Uninterrupted with LeBron James / SpringHill Company. 40+ production partners across 15 countries.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #E2E8F0', padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 12, color: '#94A3B8' }}>© MY Entertainment · info@myentertainment.tv</p>
        <p style={{ fontSize: 12, color: '#94A3B8' }}>Confidential — prepared for {contact?.name ?? 'recipient'}</p>
      </footer>
    </div>
  );
}
