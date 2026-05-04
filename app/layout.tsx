// Root layout — HTML shell only. Nav lives in (internal)/layout.tsx;
// public site wrapper lives in (public)/site/layout.tsx.
// Fonts loaded here so both route groups share one preconnect + stylesheet request.

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { template: '%s | MyEntertainment', default: 'MyEntertainment' },
  // Description matches the live myentertainment.tv site copy
  description: 'MyEntertainment is a production company owned by Media Content Services that produces digital and linear content for broadcasters and streaming services.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts — Webflow-matching typefaces used on myentertainment.tv */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@200;300;400;500;600;700&family=Roboto:wght@300;400;500&family=Roboto+Slab:wght@100;300;400&family=Roboto+Condensed:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
