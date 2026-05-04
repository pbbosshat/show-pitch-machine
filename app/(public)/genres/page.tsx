// ============================================================
// Public genres page — frame-accurate clone of myentertainment.tv/genres
// Webflow equivalent: the "Genres" static page with 6 genre sections,
// each containing anchor IDs and a grid of show images.
// Server Component — no 'use client'. Inline styles only.
// ============================================================

import type { Metadata } from 'next';
import Link from 'next/link';

// --- SEO metadata ---
const OG_IMAGE = 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67c9c4bc80ecce7a341a501c_MYE%20Banner%20.png';

export const metadata: Metadata = {
  title: 'TV Show Genres | MY Entertainment',
  description:
    'Browse MY Entertainment shows by genre: Paranormal & Supernatural, Sports & Competition, Home & Lifestyle, Crime & Mystery, Comedy, and Food & Travel.',
  alternates: { canonical: 'https://www.myentertainment.tv/genres' },
  openGraph: {
    title: 'TV Show Genres | MY Entertainment',
    description: 'Browse MY Entertainment productions by genre — Paranormal, Sports, Crime, Comedy, Lifestyle, and more.',
    url: 'https://www.myentertainment.tv/genres',
    siteName: 'MY Entertainment',
    type: 'website',
    images: [{ url: OG_IMAGE, width: 1887, alt: 'MY Entertainment TV genres' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TV Show Genres | MY Entertainment',
    description: 'Browse MY Entertainment productions by genre — Paranormal, Sports, Crime, Comedy, and more.',
    images: [OG_IMAGE],
  },
};

// ---------------------------------------------------------------------------
// Design token constants (from live Webflow CSS)
// ---------------------------------------------------------------------------
// --mye-red: #e51d26
// body bg: #000
// section padding: 80px 0
// container max-width: 1180px

// ---------------------------------------------------------------------------
// Shared style helpers
// ---------------------------------------------------------------------------

// Webflow: .container
const container: React.CSSProperties = {
  maxWidth: 1180,
  margin: '0 auto',
  padding: '0 20px',
};

// Webflow: .subtitle-small — large red uppercase centered section label
const subtitleSmall: React.CSSProperties = {
  fontFamily: "'Roboto', sans-serif",
  fontSize: 48,
  fontWeight: 400,
  color: '#e51d26',
  textTransform: 'uppercase',
  letterSpacing: '0.2em',
  textAlign: 'center',
  marginBottom: 35,
};

// Webflow: h2 used as genre sub-heading (red, uppercase variant)
const genreHeading: React.CSSProperties = {
  fontFamily: "'Roboto', sans-serif",
  fontSize: 32,
  fontWeight: 400,
  color: '#e51d26', // genre section headings use mye-red, not the default h2 #f2f4f7
  textTransform: 'uppercase',
  marginTop: 0,
  marginBottom: 24,
};

// Webflow: h2 (default — used for CTA section)
const h2Style: React.CSSProperties = {
  fontFamily: "'Roboto', sans-serif",
  fontSize: 32,
  fontWeight: 400,
  color: '#f2f4f7',
  textTransform: 'capitalize',
  marginTop: 0,
  marginBottom: 12,
};

// Webflow: .get-started-link
const getStartedLink: React.CSSProperties = {
  color: '#e02027',
  textTransform: 'uppercase',
  fontWeight: 500,
  fontFamily: "'Roboto Condensed', sans-serif",
  textDecoration: 'none',
  display: 'inline-block',
  marginTop: 24,
};

// Body text
const bodyText: React.CSSProperties = {
  color: '#a5a7ad',
  fontFamily: "'Roboto', sans-serif",
  fontSize: 14,
  lineHeight: 1.7,
  margin: 0,
};

// ---------------------------------------------------------------------------
// Genre sections data
// Each genre has an anchor id, a heading, and an array of shows with
// 940×470 landscape images (different from the homepage square thumbs).
// ---------------------------------------------------------------------------

type GenreShow = {
  title: string;
  img: string;
  href: string;
  external?: boolean; // true = open in new tab (YouTube / Max links)
};

type Genre = {
  id: string;         // anchor id used by homepage genre cards
  heading: string;    // display heading for the section
  shows: GenreShow[];
};

const GENRE_SECTIONS: Genre[] = [
  {
    // Webflow: #paranormal — Paranormal genre section
    id: 'paranormal',
    heading: 'SUPERNATURAL',
    shows: [
      { title: 'Destination Fear', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457ba2ecca4391eb7c00_destination%20fear.png', href: '/shows/destination-fear' },
      { title: 'Deadly Possessions', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457b2c89f72f68b2b523_deadly%20possessions.png', href: '/shows/deadly-possessions' },
      { title: 'Ghost Adventures: Screaming Room', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457eb48c472415bde8da_ghost%20adventures%20screaming%20room.png', href: '/shows/ghost-adventures-screaming-room' },
      { title: 'Ghost Adventures: Serial Killer Spirits', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457e01967330bcc62b59_ghost%20adventures%20serial%20killer%20spirits.png', href: '/shows/ghost-adventures-serial-killer-spirits' },
      { title: 'Help! My House Is Haunted', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457f18cd9c2982a5e95c_help%20my%20house%20is%20haunted.png', href: '/shows/help-my-house-is-haunted' },
      { title: 'Ghost Adventures: Live', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457d0ce0bd90c7438a6c_ghost%20adventures%20live.png', href: '/shows/ghost-adventures-live' },
      { title: 'Ghost Adventures: Graveyard of the Pacific', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457e0ce0bdf930438a7e_ghost%20adventures%20graveyard%20of%20the%20pacific.png', href: '/shows/ghost-adventures-graveyard-of-the-pacific' },
      { title: 'Ghost Adventures: Aftershocks', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457df00394d1cb58d35f_ghost%20adventures%20aftershock.png', href: '/shows/ghost-adventures-aftershocks' },
      { title: 'Paranormal Challenge', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/637145812c89f76018b2b5db_paranormal%20challenge.png', href: '/shows/paranormal-challenge' },
      { title: 'Ghost Adventures: Haunted Museum Live', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457f0ce0bdad06438a95_haunted%20museum%20live.png', href: '/shows/ghost-adventures-haunted-museum-live' },
    ],
  },
  {
    // Webflow: #comedy
    id: 'comedy',
    heading: 'COMEDY',
    shows: [
      { title: "Comedy Central's Bar Mitzvah Bash", img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e80d4b54efc31843cf931_COMEDY%20CENTRAL%20BAR%20MITZVAH%20BASH.png', href: '/shows/comedy-centrals-bar-mitzvah-bash' },
      { title: 'Student Bodies', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/63714581c3c481fba9486faa_student%20bodies.png', href: '/shows/student-bodies' },
    ],
  },
  {
    // Webflow: #sports-competition
    id: 'sports-competition',
    heading: 'SPORTS + COMPETITION',
    shows: [
      // External: Uninterrupted links to YouTube, not an internal show page
      { title: 'Uninterrupted: Real Stories of Basketball', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6733858038041d899a10227b_Real%20Stories%20of%20Basketball.png', href: 'https://www.youtube.com/watch?v=g7LHsI0g7NA', external: true },
      { title: 'Pros vs Joes', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/637145810ce0bd1082438af9_pros%20vs%20joes.png', href: '/shows/pros-vs-joes' },
      { title: 'Baggage Battles', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457a63d6535cce882450_baggage%20battles.png', href: '/shows/baggage-battles' },
      { title: 'Game on America', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457c25366f5aa7e8ef09_game%20on%20america.png', href: '/shows/game-on-america' },
      { title: 'Biker Battles', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457ac3c4811e6f486f4b_biker%20battles.png', href: '/shows/biker-battles' },
      { title: 'Wreck Chasers', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/63714583913d0349ee55a4e5_wreck%20chasers.png', href: '/shows/wreck-chasers' },
      { title: 'King of Vegas', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457fc3c481f39c486f92_king%20of%20vegas.png', href: '/shows/king-of-vegas' },
      { title: "Sherman's Warriors", img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371458118cd9c2a2da5e967_sherman%27s%20warriors.png', href: '/shows/shermans-warriors' },
      { title: 'Wild & Crazy Kids', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8624ed580571aec541f0_WILD%20%26%20CRAZY%20KIDS.png', href: '/shows/wild-and-crazy-kids' },
      { title: 'What Would You Do?', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/63714583c3c481ce93486fac_what%20would%20you%20do.png', href: '/shows/what-would-you-do' },
    ],
  },
  {
    // Webflow: #home-lifestyle
    id: 'home-lifestyle',
    heading: 'HOME + LIFESTYLE',
    shows: [
      { title: 'Billy Buys Brooklyn', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/63deb3a111b873829a9d008c_billy%20buys%20brooklyn%20show%20page%20header.png', href: '/shows/billy-buys-brooklyn' },
      { title: 'Hidden Assets', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457ff2d5ec2f03437687_hidden%20assets.png', href: '/shows/hidden-assets' },
      { title: 'Legacy List', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371458139109b3e270dfbc6_legacy%20list.png', href: '/shows/legacy-list' },
      { title: 'Pregnant and Platonic', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/63714581f2d5ec5e7d437692_pregnant%20and%20platonic.png', href: '/shows/pregnant-and-platonic' },
      { title: 'Red Alaska', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/637145813958c9771e856794_red%20alaska.png', href: '/shows/red-alaska' },
      { title: 'Stolichnaya Presents: Be Real', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e850db54efceb63424f2f_STOLICHNAYA%20PRESENTS%20BE%20REAL.png', href: '/shows/stolichnaya-presents-be-real' },
      { title: 'Framed', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457c2c89f75f26b2b544_framed.png', href: '/shows/framed' },
      { title: 'Hall Pass', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457e3e9741b7cf01c89c_hall%20pass.png', href: '/shows/hall-pass' },
      { title: 'Pools with a View', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371458101967322adc62b64_pools%20with%20a%20view.png', href: '/shows/pools-with-a-view' },
    ],
  },
  {
    // Webflow: #crime
    id: 'crime',
    heading: 'CRIME',
    shows: [
      { title: 'Sin City Justice', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/637145829e4b676fb0c5654a_sin%20city%20justice.png', href: '/shows/sin-city-justice' },
      { title: 'The Jane Doe Murders', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/63deb3a46f6edd2f885ef826_the%20jane%20doe%20murders%20show%20page%20header.png', href: '/shows/the-jane-doe-murders' },
      { title: "Manson's Bloodline", img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/637145813e974127f301c8a7_manson%27s%20bloodline.png', href: '/shows/mansons-bloodline' },
      { title: 'Charles Manson: The Funeral', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457a25366f4204e8eeec_charles%20manson%20the%20funeral.png', href: '/shows/charles-manson-the-funeral' },
    ],
  },
  {
    // Webflow: #food-travel
    id: 'food-travel',
    heading: 'FOOD + TRAVEL',
    shows: [
      { title: 'Food Boats', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457b352e2842c03a7dd4_food%20boats.png', href: '/shows/food-boats' },
      { title: 'Breaking Borders', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457a131625ccef049677_breaking%20borders.png', href: '/shows/breaking-borders' },
      { title: 'Top of the World', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371458318cd9c441da5e97f_top%20of%20the%20world.png', href: '/shows/top-of-the-world' },
      { title: 'You Only Live Once', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/63714583a2ecca2bdbeb7ccd_you%20only%20live%20once.png', href: '/shows/you-only-live-once' },
      { title: "World's Edge", img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/63deb3a41693d1267df1314d_worlds%20edge%20show%20page%20header.png', href: '/shows/worlds-edge' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.myentertainment.tv/' },
    { '@type': 'ListItem', position: 2, name: 'Genres', item: 'https://www.myentertainment.tv/genres' },
  ],
};

export default function GenresPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {/* Responsive grid breakpoints — no Tailwind */}
      <style>{`
        /* Webflow: .genre-shows-grid — 2 cols on desktop, 1 col on mobile */
        /* These are landscape 940×470 images so 2 cols fills the container well */
        .mye-genre-shows-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 4px;
        }
        @media (max-width: 640px) {
          .mye-genre-shows-grid { grid-template-columns: 1fr; }
        }
        /* Hover state for genre show thumbnails */
        .mye-genre-show-thumb:hover { opacity: 0.85; }
      `}</style>

      {/* ================================================================== */}
      {/* PAGE HEADER                                                         */}
      {/* Webflow equivalent: .section.hero-inner — dark header with page    */}
      {/* title. paddingTop 100px clears the fixed ~64px nav.               */}
      {/* ================================================================== */}
      <section
        style={{
          background: '#000',
          paddingTop: 100,
          paddingBottom: 40,
          textAlign: 'center',
        }}
      >
        {/* Webflow: .subtitle-small used as the page h1 on interior pages */}
        <h1
          style={{
            ...subtitleSmall,
            marginBottom: 0,
          }}
        >
          GENRES
        </h1>
      </section>

      {/* ================================================================== */}
      {/* GENRE SECTIONS                                                      */}
      {/* Webflow equivalent: each genre is a separate .section with an      */}
      {/* anchor ID matching the homepage genre card hrefs (#paranormal etc) */}
      {/* ================================================================== */}
      {GENRE_SECTIONS.map((genre, i) => (
        <section
          // id matches href anchors from homepage genre cards (e.g. /genres#paranormal)
          id={genre.id}
          key={genre.id}
          style={{
            background: '#000',
            // Alternate sections could have slightly different top padding for
            // visual separation; here we match the Webflow 80px section rhythm.
            padding: i === 0 ? '20px 0 80px' : '80px 0',
          }}
        >
          <div style={container}>
            {/* Webflow: genre heading — h2 with --mye-red color, uppercase */}
            <h2 style={genreHeading}>{genre.heading}</h2>

            {/* 940×470 landscape thumbnails in a 2-column grid */}
            <div className="mye-genre-shows-grid">
              {genre.shows.map((show) =>
                show.external ? (
                  // External link (YouTube) — opens new tab
                  <a
                    key={show.title}
                    href={show.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mye-genre-show-thumb"
                    style={{ display: 'block', transition: 'opacity 200ms' }}
                    title={show.title}
                  >
                    <img
                      src={show.img}
                      alt={show.title}
                      loading="lazy"
                      style={{ width: '100%', display: 'block' }}
                    />
                  </a>
                ) : (
                  // Internal show page — Next.js Link for client-side nav
                  <Link
                    key={show.title}
                    href={show.href}
                    className="mye-genre-show-thumb"
                    style={{ display: 'block', transition: 'opacity 200ms' }}
                    title={show.title}
                  >
                    <img
                      src={show.img}
                      alt={show.title}
                      loading="lazy"
                      style={{ width: '100%', display: 'block' }}
                    />
                  </Link>
                )
              )}
            </div>
          </div>
        </section>
      ))}

      {/* ================================================================== */}
      {/* CTA SECTION — "READY TO WORK WITH THE BEST?"                       */}
      {/* Webflow class: .section.cta-section (bg #000)                      */}
      {/* Same CTA block used on the homepage and shows page.                */}
      {/* ================================================================== */}
      <section
        style={{
          background: '#000',
          padding: '80px 0',
          textAlign: 'center',
        }}
      >
        <div style={container}>
          <h2 style={{ ...h2Style, textAlign: 'center' }}>Ready To Work With The Best?</h2>
          <p style={{ ...bodyText, textAlign: 'center' }}>
            Reach out to learn more about how we can make great content together.
          </p>
          {/* Webflow: .get-started-link */}
          <a href="/contact" style={getStartedLink}>
            CONTACT US&nbsp; ❯
          </a>
        </div>
      </section>
    </>
  );
}
