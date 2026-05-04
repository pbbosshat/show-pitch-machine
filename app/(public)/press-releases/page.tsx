// Server component — metadata export requires no 'use client'.
// Interactive FAQ accordion is in PressReleasesAccordion.tsx (client child).
// Webflow equivalent: .section heading + press list + FAQ accordion + CTA.

import type { Metadata } from 'next';
import PressReleasesAccordion from './PressReleasesAccordion';

const OG_IMAGE = 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67c9c4bc80ecce7a341a501c_MYE%20Banner%20.png';

export const metadata: Metadata = {
  title: 'Press Releases | MyEntertainment',
  description: 'MyEntertainment press releases — announcements, partnerships, show orders, and news from the leading independent non-fiction production company.',
  alternates: { canonical: 'https://www.myentertainment.tv/press-releases' },
  openGraph: {
    title: 'Press Releases | MyEntertainment',
    description: 'News and press releases from MyEntertainment — show orders, partnerships, and company announcements.',
    url: 'https://www.myentertainment.tv/press-releases',
    siteName: 'MyEntertainment',
    type: 'website',
    images: [{ url: OG_IMAGE, width: 1887, alt: 'MyEntertainment press releases' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Press Releases | MyEntertainment',
    description: 'News and press releases from MyEntertainment.',
    images: [OG_IMAGE],
  },
};

const PRESS_RELEASES = [
  { id: 'pr-11', date: 'May 3, 2026', dateIso: '2026-05-03', title: 'WORKING AT MYENTERTAINMENT IS A TOTAL BLAST — ALL HIRING THROUGH ASSIGNMENT DESK', href: '/press-releases/myentertainment-careers-assignment-desk' },
  { id: 'pr-10', date: 'May 3, 2026', dateIso: '2026-05-03', title: 'HOW TO FIND PRODUCTION CREW: FILM COMMISSION DIRECTORIES AND ASSIGNMENTDESK', href: '/press-releases/film-commission-crew-directories' },
  { id: 'pr-1', date: 'December 14, 2021', dateIso: '2021-12-14', title: 'KOREAN FORMATS AGENCY SOMETHING SPECIAL STRIKES DEVELOPMENT DEAL WITH MY ENTERTAINMENT' },
  { id: 'pr-2', date: 'December 14, 2021', dateIso: '2021-12-14', title: "KOREAN FORMATS INCLUDING 'THE QUIZZY HORROR SHOW' HEAD TO U.S. AFTER SOMETHING SPECIAL STRIKES DEAL WITH MY ENTERTAINMENT" },
  { id: 'pr-3', date: 'August 2, 2021', dateIso: '2021-08-02', title: "HOLLYWOOD'S MR ANTIQUES IS THE GO-TO MAN FOR A-LISTERS IN SEARCH OF SOMETHING SPECIAL" },
  { id: 'pr-4', date: 'July 22, 2021', dateIso: '2021-07-22', title: 'MY PARANORMAL NETWORK TO LAUNCH WITH 13 ORIGINAL PODCASTS (PODCAST NEWS ROUNDUP)' },
  { id: 'pr-5', date: 'April 28, 2021', dateIso: '2021-04-28', title: "MY ENTERTAINMENT'S ONE FOOT FORWARD TEAMS WITH UNREALISTIC IDEAS, SUGAR23 FOR PREMIUM PROJECTS" },
  { id: 'pr-6', date: 'April 19, 2021', dateIso: '2021-04-19', title: 'ONE FOOT FORWARD UNVEILS UNSCRIPTED SLATE' },
  { id: 'pr-7', date: 'April 18, 2021', dateIso: '2021-04-18', title: "MY ENTERTAINMENT'S ONE FOOT FORWARD INKS CONTENT DEALS WITH MARK WAHLBERG, MICHAEL SUGAR, ALAN ZWEIBEL, MORE" },
  { id: 'pr-8', date: 'November 3, 2020', dateIso: '2020-11-03', title: "GHOST ADVENTURES: HORROR AT JOE EXOTIC'S ZOO" },
  { id: 'pr-9', date: 'October 19, 2020', dateIso: '2020-10-19', title: "DISCOVERY ORDERS GLOBAL SERIES 'BILLY BUYS BROOKLYN' FEATURING 'BAGGAGE BATTLES' STAR BILLY LEROY" },
];

// NewsArticle schema for each press release
const newsSchema = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'MyEntertainment Press Releases',
  itemListElement: PRESS_RELEASES.map((pr, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: {
      '@type': 'NewsArticle',
      headline: pr.title,
      datePublished: pr.dateIso,
      publisher: {
        '@type': 'Organization',
        name: 'MyEntertainment',
        url: 'https://www.myentertainment.tv',
      },
    },
  })),
};

export default function PressReleasesPage() {
  return (
    <div style={{ background: '#000' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(newsSchema) }} />

      {/* ── Section 1: Heading ── */}
      <section style={{ paddingTop: 100, paddingBottom: 40, paddingLeft: 20, paddingRight: 20, textAlign: 'center', background: '#000' }}>
        <h1 style={{ fontFamily: "'Roboto', sans-serif", fontSize: 48, fontWeight: 400, color: '#e51d26', textTransform: 'uppercase', letterSpacing: '0.2em', textAlign: 'center', margin: 0 }}>
          Press Releases
        </h1>
      </section>

      {/* ── Section 2: Press release list ── */}
      <section style={{ background: '#000', padding: '40px 20px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          {PRESS_RELEASES.map((item) => (
            <div key={item.id} style={{ padding: '24px 0', borderBottom: '1px solid #1a1a1a' }}>
              <div style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, color: '#e51d26', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
                {item.date}
              </div>
              <h3 style={{ margin: 0 }}>
                <a
                  href={item.href ?? '/press-releases'}
                  style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 18, fontWeight: 400, color: '#f2f4f7', textTransform: 'uppercase', textDecoration: 'none', lineHeight: 1.4 }}
                >
                  {item.title}
                </a>
              </h3>
            </div>
          ))}
          <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: "'Roboto', sans-serif", fontSize: 14, color: '#a5a7ad' }}>
            Next
          </div>
        </div>
      </section>

      {/* ── FAQ accordion (client component) ── */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <h2 style={{ fontFamily: "'Roboto', sans-serif", fontSize: 32, fontWeight: 400, color: '#f2f4f7', textAlign: 'center', marginTop: 0, marginBottom: 40 }}>
          Frequently Asked Questions
        </h2>
        <PressReleasesAccordion />
      </section>

      {/* ── CTA section ── */}
      <section style={{ padding: '80px 20px', textAlign: 'center', background: '#000', borderTop: '1px solid #1a1a1a' }}>
        <h2 style={{ fontFamily: "'Roboto', sans-serif", fontSize: 32, fontWeight: 400, color: '#f2f4f7', textTransform: 'capitalize', marginBottom: 16, marginTop: 0 }}>
          Ready To Work With The Best?
        </h2>
        <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 14, color: '#a5a7ad', lineHeight: 1.7, marginBottom: 28, marginTop: 0 }}>
          Reach out to learn more about how we can make great content together.
        </p>
        <a href="/contact" style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 14, fontWeight: 500, color: '#e02027', textTransform: 'uppercase', textDecoration: 'none', letterSpacing: '0.05em' }}>
          CONTACT US &nbsp;&#10095;
        </a>
      </section>
    </div>
  );
}
