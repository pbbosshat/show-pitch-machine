// Public site layout — dark wrapper matching myentertainment.tv.
// Black background, muted body text, Roboto font — all matching Webflow design tokens.
// GA4 tracking and Organization JSON-LD schema included here so every public page is covered.

import type { Metadata } from 'next';
import Script from 'next/script';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

// GA4 Measurement ID for myentertainment.tv
const GA4_ID = 'G-5M15CDKBGQ';

export const metadata: Metadata = {
  // Title template: each page supplies the "%s" prefix; default used when no page title is set.
  // "MY Entertainment" (not "MyEntertainment") matches the official brand name.
  title: {
    template: '%s | MY Entertainment',
    default: 'MY Entertainment — Unscripted TV Production Company',
  },
  // GEO-optimized description: factual, specific, quotable by AI systems.
  // Named shows and network count give AI assistants precise facts to cite.
  description:
    'MY Entertainment is a New York unscripted TV production company founded in 2000, behind Ghost Adventures (28 seasons), Destination Fear, Pros vs Joes, and Paranormal Challenge. Offices in Manhattan, Toronto, and London.',
  metadataBase: new URL('https://www.myentertainment.tv'),
  alternates: {
    canonical: 'https://www.myentertainment.tv',
    // Geo signal: MYE serves en-US, en-CA (Toronto office), en-GB (London office)
    languages: {
      'en-US': 'https://www.myentertainment.tv',
      'en-CA': 'https://www.myentertainment.tv',
      'en-GB': 'https://www.myentertainment.tv',
      'x-default': 'https://www.myentertainment.tv',
    },
  },
  // OpenGraph defaults — individual pages override title/description/url.
  // type 'website' and locale 'en_US' are the correct OG values for a company site.
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'MY Entertainment',
    images: [{
      url: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67c9c4bc80ecce7a341a501c_MYE%20Banner%20.png',
      width: 1887,
      alt: 'MY Entertainment — New York unscripted TV production company',
    }],
  },
  // Twitter card defaults — pages with specific images will override these.
  twitter: {
    card: 'summary_large_image',
    site: '@myentertainment',
  },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  // Organization schema — enriched for Google Knowledge Panel and GEO (AI engine) citation.
  // foundingDate, genre, description, and numberOfEmployees give AI systems concrete facts
  // to surface when users ask "who makes Ghost Adventures?" or "what is MY Entertainment?".
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'MY Entertainment',
    alternateName: 'MyEntertainment',
    url: 'https://www.myentertainment.tv',
    logo: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8ebea7bb58375c4d58c7_My%20Entertainment%20Square%20(Dark%20Background%20-%20Gradient).png',
    foundingDate: '2000',
    // Factual description — written to be quotable verbatim by AI search systems
    description:
      'MY Entertainment is a New York-based unscripted television production company founded in 2000. The company develops, produces, and distributes non-fiction content for broadcasters and streaming services worldwide, including Ghost Adventures (28 seasons on Discovery/Travel Channel), Destination Fear, Pros vs Joes, Paranormal Challenge, and Legacy List. In 2022, MY Entertainment was acquired by Media Content Services.',
    genre: ['Paranormal', 'Sports + Competition', 'Home + Lifestyle', 'Crime', 'Comedy', 'Food + Travel', 'Reality TV', 'Unscripted'],
    address: {
      '@type': 'PostalAddress',
      streetAddress: '235 E 45th St., Floor 14 West',
      addressLocality: 'New York',
      addressRegion: 'NY',
      postalCode: '10017',
      addressCountry: 'US',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'info@myentertainment.tv',
      contactType: 'customer service',
    },
    parentOrganization: {
      '@type': 'Organization',
      name: 'Media Content Services',
    },
    // sameAs links help search engines and AI systems unambiguously identify the entity
    sameAs: [
      'https://www.myentertainment.tv',
      'https://www.imdb.com/search/title/?companies=co0233195',
    ],
  };

  // LocalBusiness entries for Toronto and London offices — geo signals for Canadian and UK search.
  // These help Google and AI search systems surface MY Entertainment in local searches from
  // those markets (e.g. "TV production companies in Toronto").
  const localBusinessSchemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: 'MY Entertainment — Toronto',
      description: 'MY Entertainment Toronto office — international TV co-production and Canadian programming. MY Entertainment is a New York unscripted TV production company founded in 2000.',
      url: 'https://www.myentertainment.tv/international',
      email: 'info@myentertainment.tv',
      address: { '@type': 'PostalAddress', addressLocality: 'Toronto', addressRegion: 'ON', addressCountry: 'CA' },
      sameAs: 'https://www.myentertainment.tv',
      parentOrganization: { '@type': 'Organization', name: 'MY Entertainment', url: 'https://www.myentertainment.tv' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: 'MY Entertainment — London',
      description: 'MY Entertainment London office — UK and international TV co-production partnerships. MY Entertainment is a New York unscripted TV production company founded in 2000.',
      url: 'https://www.myentertainment.tv/international',
      email: 'info@myentertainment.tv',
      address: { '@type': 'PostalAddress', addressLocality: 'London', addressCountry: 'GB' },
      sameAs: 'https://www.myentertainment.tv',
      parentOrganization: { '@type': 'Organization', name: 'MY Entertainment', url: 'https://www.myentertainment.tv' },
    },
  ];

  return (
    // Webflow equivalent: body { background: #000; color: #a5a7ad; font-family: 'Roboto', sans-serif; }
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#000', color: '#a5a7ad', fontFamily: "'Roboto', sans-serif" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
      {localBusinessSchemas.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      ))}

      <SiteHeader />

      {/* GA4 — load after interactive so it doesn't block page render */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GA4_ID}');
      `}</Script>

      <main style={{ flex: 1 }}>{children}</main>
      <SiteFooter />
    </div>
  );
}
