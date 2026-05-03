// Public site layout — dark cinematic wrapper matching myentertainment.tv.
// data-theme="dark" makes CSS variables resolve to dark values for all descendants.

import type { Metadata } from 'next';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

export const metadata: Metadata = {
  title: { template: '%s | MY Entertainment', default: 'MY Entertainment' },
  description: 'Independent New York based production company. Compelling characters. Great storytelling. Innovative deals. High production value.',
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="dark" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0A0A0F', color: '#F0F0F0' }}>
      <SiteHeader />
      <main style={{ flex: 1 }}>{children}</main>
      <SiteFooter />
    </div>
  );
}
