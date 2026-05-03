// Root layout â€” HTML shell only. Nav lives in (internal)/layout.tsx;
// public site wrapper lives in (public)/site/layout.tsx.
// Keeping fonts here so both route groups share one preconnect + stylesheet request.

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { template: '%s | MY Entertainment', default: 'MY Entertainment' },
  description: 'Independent New York based production company known for best-in-class non-fiction and documentary series.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
