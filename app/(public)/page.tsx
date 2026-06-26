// ============================================================
// Public homepage — frame-accurate clone of myentertainment.tv
// Webflow equivalent: the "Home" page in the CMS with all sections.
// Server Component — no 'use client'. All styles are inline.
// ============================================================

import type { Metadata } from 'next';
import Link from 'next/link';

// --- SEO + GEO metadata for the homepage ---
// Descriptions are written as complete, factual sentences that AI systems (Perplexity,
// ChatGPT, Claude) can quote verbatim when answering questions about the company.
const OG_IMAGE = 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67c9c4bc80ecce7a341a501c_MYE%20Banner%20.png';

export const metadata: Metadata = {
  // Front-load the primary money term "TV distribution company" — buyers searching for
  // a company to distribute their unscripted show use this exact phrase.
  // "MY Entertainment" as brand anchor at the end matches the SERP pattern for known brands.
  title: 'TV Distribution Company | MY Entertainment',
  description:
    'MY Entertainment is a New York TV distribution company connecting unscripted reality shows and formats with broadcasters and streaming services worldwide. Ghost Adventures, Destination Fear, Pros vs Joes, and 40+ titles distributed across Discovery, A&E, PBS, and 28+ networks.',
  keywords: [
    'TV distribution company', 'television distribution', 'unscripted TV distribution',
    'reality TV distribution', 'show distribution', 'TV format distribution',
    'unscripted TV production company', 'New York production company',
    'Ghost Adventures producer', 'Discovery Channel shows', 'MY Entertainment',
  ],
  alternates: { canonical: 'https://www.myentertainment.tv/' },
  openGraph: {
    title: 'TV Distribution Company | MY Entertainment',
    description:
      'NY TV distribution company placing unscripted reality shows with broadcasters + streamers worldwide. 40+ titles across Discovery, A&E, PBS, Lifetime, and 28+ networks.',
    url: 'https://www.myentertainment.tv/',
    siteName: 'MY Entertainment',
    type: 'website',
    images: [{ url: OG_IMAGE, width: 1887, alt: 'MY Entertainment — New York TV distribution company' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TV Distribution Company | MY Entertainment',
    description:
      'NY TV distribution company placing unscripted reality shows with broadcasters + streamers. Ghost Adventures, Destination Fear, and 40+ titles distributed worldwide.',
    images: [OG_IMAGE],
  },
};

// WebSite schema — enables Google Sitelinks Searchbox and helps AI engines anchor
// the homepage as the canonical entity URL for MY Entertainment.
const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'MY Entertainment',
  url: 'https://www.myentertainment.tv',
  description:
    'Official website of MY Entertainment, a New York unscripted television production company founded in 2000. Known for Ghost Adventures, Destination Fear, Pros vs Joes, and Paranormal Challenge.',
  publisher: {
    '@type': 'Organization',
    name: 'MY Entertainment',
    url: 'https://www.myentertainment.tv',
  },
};

// ---------------------------------------------------------------------------
// Design token constants (from live Webflow CSS variables)
// ---------------------------------------------------------------------------
// --mye-red: #e51d26
// --black:   #1d1f21
// body bg:   #000
// body text: #a5a7ad
// container max-width: 1180px

// ---------------------------------------------------------------------------
// Network logos data — Webflow section "customer-logos" / "AS SEEN ON"
// Exactly 28 logos in the order they appear on the live site.
// ---------------------------------------------------------------------------
const NETWORK_LOGOS = [
  { name: 'Max', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67338f27b5955306e07fff21_Max.png', href: 'https://www.max.com/' },
  { name: 'Discovery+', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67338f160eee1494bfa27a75_Discovery%20%2B.png', href: 'https://www.discoveryplus.com/' },
  { name: 'PBS', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8aed58056074c5cde7_PBS.png', href: 'https://www.pbs.org/' },
  { name: 'Vice', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/636ec39bc3c481e421226453_vice.png', href: 'https://www.vice.com/' },
  { name: 'Animal Planet', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8860e2140ec34beaf1_ANIMAL%20PLANET.png', href: 'https://www.animalplanet.com/' },
  { name: 'CMT', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8875a7c1515a3393e6_CMT.png', href: 'https://www.cmt.com/' },
  { name: 'Comedy Central', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8834ed9efe05c943dc_COMEDY%20CENTRAL.png', href: 'https://www.cc.com/' },
  { name: 'Food Network', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8853eb6890cddcf2ae_FOOD%20NETWORK.png', href: 'https://www.foodnetwork.com/' },
  { name: 'Investigation Discovery', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e88d44a43a5c5a55109_investigation%20discovery.png', href: 'https://www.investigationdiscovery.com/' },
  { name: 'IFC', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8853eb6823b5dcf2ad_IFC.png', href: 'https://www.ifc.com/' },
  { name: 'Logo Network', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e89a7bb588d0c4d5549_LOGO.png', href: 'https://www.logotv.com/' },
  { name: 'MTV', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e89341fb571d69be6b6_MTV.png', href: 'https://www.mtv.com/' },
  { name: 'National Geographic', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8aa7bb587d184d554b_national%20geographic.png', href: 'https://www.nationalgeographic.com/' },
  { name: 'NBC Sports', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8abc22fc925f38e82a_NBC%20SPORTS.png', href: 'https://www.nbcsports.com/' },
  { name: 'Nickelodeon', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8a94d7ef1ce62aa6bc_NICKELODEON.png', href: 'https://www.nick.com/' },
  { name: 'Oxygen', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8a92aded6fa14432e3_OXYGEN.png', href: 'https://www.oxygen.com/' },
  { name: 'Spike', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b9e735045be28be64_SPIKE.png', href: 'https://www.paramountnetwork.com/' },
  { name: 'Reebok', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8aad7a061620c5f11a_REEBOK.png', href: 'https://www.reebok.com/us' },
  { name: 'Schick', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b11a5acf8d9c59e4a_SCHICK.png', href: 'https://www.schick.com/' },
  { name: 'Stoli', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b6e474e4d5c1c358d_STOLI.png', href: 'https://stoli-group.com/' },
  { name: 'TruTV', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e9e9511a5ac2201c693d1_TRU%20TV.png', href: 'https://www.trutv.com/' },
  { name: 'BBC', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e9e956e474e3f871d0ac4_bbc.png', href: 'https://www.bbcamerica.com/' },
  { name: '20th Television', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8860e2143cf74beaf2_20th%20Television.png', href: 'https://20thtv.com/' },
  { name: 'A&E', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e9e96fddd92982153a559_A%26E.png', href: 'https://www.aetv.com/' },
  { name: 'Reelz', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8a34ed9e90a1c943eb_REELZ.png', href: 'https://www.reelz.com/' },
  { name: 'Lifetime', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e9e96ad7a06737ac6c5a9_LIFETIME.png', href: 'https://www.mylifetime.com/' },
  { name: 'The Story Lab', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b53eb683710dcf2db_THE%20STORY%20LAB.png', href: 'https://www.storylab.com/' },
  { name: 'Really', src: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8a53eb68051adcf2da_REALLY.png', href: 'https://www.discoveryplus.com/gb/channel/really' },
];

// ---------------------------------------------------------------------------
// Genre cards — Webflow section "genres-section"
// Each card is a full-bleed background image with an h3 label overlay.
// ---------------------------------------------------------------------------
const GENRE_CARDS = [
  { name: 'SUPERNATURAL', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8032bc22fc0382380b83_PARANORMAL.jpg', href: '/genres#paranormal' },
  { name: 'SPORTS + COMPETITION', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8032a6a75c0b14ebbeed_SPORTS%20%2B%20COMPETITION.jpg', href: '/genres#sports-competition' },
  { name: 'HOME + LIFESTYLE', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e803175a7c17aa332bcd7_HOME%20%2B%20LIFESTYLE.jpg', href: '/genres#home-lifestyle' },
  { name: 'CRIME', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e80313bcb9c798e32d022_CRIME.jpg', href: '/genres#crime' },
  { name: 'COMEDY', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e803126ebf9807246ec9b_COMEDY.jpg', href: '/genres#comedy' },
  { name: 'FOOD + TRAVEL', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8031a6a75cc498ebbee7_FOOD%20%2B%20TRAVEL.jpg', href: '/genres#food-travel' },
];

// ---------------------------------------------------------------------------
// All shows — Webflow section "shows-section"
// Shows #2 (Uninterrupted) and #3 (Destinations of the Damned) link
// to external URLs; all others link to /shows/[slug].
// ---------------------------------------------------------------------------
const ALL_SHOWS = [
  { title: 'Ghost Adventures', href: '/shows/ghost-adventures', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/673388c81a9ea2c6f167a992_Untitled%20design%20%282%29.png' },
  { title: 'Uninterrupted: The Real Stories of Basketball', href: 'https://www.youtube.com/watch?v=g7LHsI0g7NA', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6733858038041d899a10227b_Real%20Stories%20of%20Basketball.png', external: true },
  { title: 'Destinations of the Damned (Zak Bagans)', href: 'https://www.max.com/shows/destinations-of-the-damned-with-zak-bagans/fbbff164-87f5-43e1-bf4d-cded5e1b4cca', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6733877d8707275f3cbc8261_Untitled%20design%20%281%29.png', external: true },
  { title: 'Destination Fear', href: '/shows/destination-fear', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e80fc230d2c47867c3658_DESTINATION%20FEAR.png' },
  { title: 'Billy Buys Brooklyn', href: '/shows/billy-buys-brooklyn', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/63deb3a111b873829a9d008c_billy%20buys%20brooklyn%20show%20page%20header.png' },
  { title: 'Legacy List', href: '/shows/legacy-list', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e826b2c6bbe4482950448_LEGACY%20LIST.png' },
  { title: 'Ghost Adventures: Screaming Room', href: '/shows/ghost-adventures-screaming-room', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e81f594d7efdad72a01e2_GHOST%20ADVENTURES%20SCREAMING%20ROOM.png' },
  { title: 'Pros vs Joes', href: '/shows/pros-vs-joes', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e844f230d2c84e97c6095_PROS%20VS%20JOES.png' },
  { title: 'Sin City Justice', href: '/shows/sin-city-justice', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e84f875a7c10d6b330adc_SIN%20CITY%20JUSTICE.png' },
  { title: 'Food Boats', href: '/shows/food-boats', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e813bad7a0602bec53558_FOOD%20BOATS.png' },
  { title: 'Paranormal Challenge', href: '/shows/paranormal-challenge', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e828992aded2cae4360ee_PARANORMAL%20CHALLENGE.png' },
  { title: "Manson's Bloodline", href: '/shows/mansons-bloodline', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e827975a7c10b5f32db73_MANSON%27S%20BLOODLINE.png' },
  { title: 'Ghost Adventures: Live', href: '/shows/ghost-adventures-live', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e81e63bcb9cb0b932dd52_GHOST%20ADVENTURES%20LIVE.png' },
  { title: 'The Jane Doe Murders', href: '/shows/the-jane-doe-murders', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/63deb3a46f6edd2f885ef826_the%20jane%20doe%20murders%20show%20page%20header.png' },
  { title: 'Biker Battles', href: '/shows/biker-battles', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8090728e64bda17163d8_BIKER%20BATTLES.png' },
  { title: 'Baggage Battles', href: '/shows/baggage-battles', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e807f230d2c0e667c2f14_BAGGAGE%20BATTLES.png' },
  { title: 'You Only Live Once', href: '/shows/you-only-live-once', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e869b60e214985f4b707e_YOU%20ONLY%20LIVE%20ONCE.png' },
  { title: 'Ghost Adventures: Serial Killer Spirits', href: '/shows/ghost-adventures-serial-killer-spirits', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e820734ed9e6f37c88ae7_GHOST%20ADVENTURES%20SERIAL%20KILLER%20SPIRITS.png' },
  { title: 'Pregnant and Platonic', href: '/shows/pregnant-and-platonic', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8440bc22fc95383840fa_PREGNANT%20AND%20PLATONIC.png' },
  { title: 'Hidden Assets', href: '/shows/hidden-assets', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e824a43d13c65a4cbc8a0_HIDDEN%20ASSETS.png' },
  { title: 'King of Vegas', href: '/shows/king-of-vegas', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e825d34ed9e6cb7c89039_KING%20OF%20VEGAS.png' },
  { title: 'Ghost Adventures: Haunted Museum Live', href: '/shows/ghost-adventures-haunted-museum-live', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8227fddd9214e551b423_HAUNTED%20MUSEUM%20LIVE.png' },
  { title: 'Wild & Crazy Kids', href: '/shows/wild-and-crazy-kids', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8624ed580571aec541f0_WILD%20%26%20CRAZY%20KIDS.png' },
  { title: 'Breaking Borders', href: '/shows/breaking-borders', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e809ea0b43203f02ad371_BREAKING%20BORDERS.png' },
  { title: 'Top of the World', href: '/shows/top-of-the-world', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e859943d13c47d0cbe4c6_TOP%20OF%20THE%20WORLD.png' },
  { title: 'Help! My House Is Haunted', href: '/shows/help-my-house-is-haunted', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e823df265cf538dd668e2_HELP!%20MY%20HOUSE%20IS%20HAUNTED.png' },
  { title: 'Wreck Chasers', href: '/shows/wreck-chasers', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e868492adedaed7439f57_WRECK%20CHASERS.png' },
  { title: 'Red Alaska', href: '/shows/red-alaska', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e846a92aded3ed4437969_RED%20ALASKA.png' },
  { title: "Sherman's Warriors", href: '/shows/shermans-warriors', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8478ad7a0642eec56986_SHERMAN%27S%20WARRIORS.png' },
  { title: 'Game on America', href: '/shows/game-on-america', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e815e9e7350807a27ef5b_GAME%20ON%20AMERICA.png' },
  { title: 'Ghost Adventures: Aftershocks', href: '/shows/ghost-adventures-aftershocks', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e81c385a9c000b09b2967_GHOST%20ADVENTURES%20AFTERSHOCKS.png' },
  { title: 'Framed', href: '/shows/framed', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e814bad7a0659a6c5363c_FRAMED.png' },
  { title: 'Hall Pass', href: '/shows/hall-pass', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e821a6e474eb83d1b93bb_HALL%20PASS.png' },
  { title: 'Charles Manson: The Funeral', href: '/shows/charles-manson-the-funeral', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e80ad60e214405f4b1f2d_CHARLES%20MANSON%20THE%20FUNERAL.png' },
  { title: 'Ghost Adventures: Graveyard of the Pacific', href: '/shows/ghost-adventures-graveyard-of-the-pacific', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e81d760e21461e14b27f5_GHOST%20ADVENTURES%20GRAVEYARD%20OF%20THE%20PACIFIC.png' },
  { title: 'Deadly Possessions', href: '/shows/deadly-possessions', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e80eaa6a75c3d09ebd083_DEADLY%20POSSESSIONS.png' },
  { title: 'What Would You Do?', href: '/shows/what-would-you-do', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e85abc664e83d2e6eb67b_WHAT%20WOULD%20YOU%20DO%3F.png' },
  { title: 'Stolichnaya Presents: Be Real', href: '/shows/stolichnaya-presents-be-real', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e850db54efceb63424f2f_STOLICHNAYA%20PRESENTS%20BE%20REAL.png' },
  { title: 'Student Bodies', href: '/shows/student-bodies', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e851e53eb681725dc4f51_STUDENT%20BODIES.png' },
  { title: "Comedy Central's Bar Mitzvah Bash", href: '/shows/comedy-centrals-bar-mitzvah-bash', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e80d4b54efc31843cf931_COMEDY%20CENTRAL%20BAR%20MITZVAH%20BASH.png' },
  { title: "World's Edge", href: '/shows/worlds-edge', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/63deb3a41693d1267df1314d_world%27s%20edge%20show%20page%20header.png' },
  { title: 'Pools with a View', href: '/shows/pools-with-a-view', img: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371458101967322adc62b64_pools%20with%20a%20view.png' },
];

// ---------------------------------------------------------------------------
// Shared style objects (reduces repetition; mirrors Webflow CSS classes)
// ---------------------------------------------------------------------------

// Webflow: .section — base section padding
const sectionBase: React.CSSProperties = {
  padding: '80px 0',
};

// Webflow: .container — 1180px max-width centered wrapper with side padding
const container: React.CSSProperties = {
  maxWidth: 1180,
  margin: '0 auto',
  padding: '0 20px',
};

// Webflow: h2 — Roboto 32px weight-400 capitalize #f2f4f7
const h2Style: React.CSSProperties = {
  fontFamily: "'Roboto', sans-serif",
  fontSize: 32,
  fontWeight: 400,
  color: '#f2f4f7',
  textTransform: 'capitalize',
  marginTop: 0,
  marginBottom: 12,
};

// Webflow: .subtitle-small — large centered red uppercase label used as section headings
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

// Webflow: .get-started-link — red uppercase bold CTA anchor
const getStartedLink: React.CSSProperties = {
  color: '#e02027',
  textTransform: 'uppercase',
  fontWeight: 500,
  fontFamily: "'Roboto Condensed', sans-serif",
  textDecoration: 'none',
  display: 'inline-block',
  marginTop: 18,
};

// Body paragraph text — Webflow: .body-text / default p inside .section
const bodyText: React.CSSProperties = {
  color: '#a5a7ad',
  fontFamily: "'Roboto', sans-serif",
  fontSize: 14,
  lineHeight: 1.7,
  margin: 0,
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function HomePage() {
  return (
    <>
      {/* WebSite JSON-LD — sitelinks searchbox signal + AI entity anchor */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />

      {/* ------------------------------------------------------------------ */}
      {/* Responsive grid styles injected as a <style> tag.                  */}
      {/* Tailwind is NOT used — breakpoints are plain CSS media queries.     */}
      {/* ------------------------------------------------------------------ */}
      <style>{`
        /* Webflow: .grid-3 — 2-col on desktop (genre cards), 1-col mobile */
        .mye-genre-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 4px;
        }
        @media (max-width: 540px) {
          .mye-genre-grid { grid-template-columns: 1fr; }
        }

        /* Webflow: .grid-4 — 3-col on desktop (show thumbnails), 2-col tablet, 1-col mobile */
        .mye-shows-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
        }
        @media (max-width: 767px) {
          .mye-shows-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .mye-shows-grid { grid-template-columns: 1fr; }
        }

        /* Webflow: .logos — 7 fixed 120px columns, wraps on smaller screens */
        .mye-logo-grid {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 24px 32px;
        }

        /* Genre card hover: slight scale to mimic Webflow hover transitions */
        .mye-genre-card:hover { opacity: 0.88; }

        /* Shows grid item hover */
        .mye-show-thumb:hover { opacity: 0.85; }

        /* Webflow: .about-columns — two-column text + empty right col */
        .mye-about-cols {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 40px;
        }
        @media (max-width: 700px) {
          .mye-about-cols { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ================================================================== */}
      {/* SECTION 1 — HERO (collapsed)                                        */}
      {/* Live site: the hero section has 0 height — no visible content.     */}
      {/* The "hero" appearance comes from the MYE Banner image below.        */}
      {/* ================================================================== */}
      <div aria-hidden="true" />

      {/* ================================================================== */}
      {/* SECTION 2 — "WE ARE MYENTERTAINMENT"                               */}
      {/* Webflow class: .section.darkgrey (bg #000)                         */}
      {/* Full-width banner image above a two-column text layout.            */}
      {/* ================================================================== */}
      <section style={{ ...sectionBase, background: '#000', padding: 0 }}>
        {/* Full-bleed banner — responsive, no fixed height */}
        <img
          src="https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67c9c4bc80ecce7a341a501c_MYE%20Banner%20.png"
          alt="MyEntertainment Banner"
          style={{ width: '100%', display: 'block' }}
          width={1887}
        />

        {/* Two-column text block inside the 1180px container */}
        <div style={{ ...container, paddingTop: 60, paddingBottom: 80 }}>
          <div className="mye-about-cols">
            {/* Left column — 66% width — company description */}
            <div>
              <h1 style={h2Style}>We are MyEntertainment.</h1>
              <p style={bodyText}>
                My Entertainment is an independent, New York based production company known for its
                best-in-class non-fiction and documentary series.&nbsp; Over the past two decades,
                MyE has produced thousands of hours of content spanning a variety of genres for
                Discovery, A&amp;E, National Geographic, BBC, Lifetime, MTV, Comedy Central, Travel
                Channel, ID: Investigation Discovery, Oxygen, Nickelodeon, Food Network, Animal
                Planet, TruTV, PBS, Reelz and CMT.&nbsp;&nbsp; Notable series include Uninterrupted:
                The Real Stories of Basketball for Vice and co-produced with LeBron James&rsquo; and
                Maverick Carter&rsquo;s Springhill Company, the two-time Emmy nominated series
                Legacy List on PBS, Sin City Justice for Discovery ID,&nbsp; Pros Vs Joes, the
                critically acclaimed Breaking Borders and the long running, hit series, Ghost
                Adventures now in its 28th season on Discovery.&nbsp; In 2022, My Entertainment was
                acquired by Media Content Services.
              </p>
              {/* Webflow: .get-started-link */}
              <a href="/about" style={getStartedLink}>
                learn more&nbsp; ❯{' '}
              </a>
            </div>
            {/* Right column — intentionally empty (matches Webflow layout) */}
            <div aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 3 — AS SEEN ON                                             */}
      {/* Webflow class: .customer-section-dark (bg #2a263f)                 */}
      {/* Network logo grid — 28 logos from CDN, each wrapped in <a>.        */}
      {/* ================================================================== */}
      <section style={{ background: '#2a263f', padding: '62px 0 80px' }}>
        <div style={container}>
          {/* Webflow: .subtitle-small used as section label */}
          <h2 style={subtitleSmall}>AS SEEN ON</h2>

          {/* Logo flex grid — Webflow: .logo-grid */}
          <div className="mye-logo-grid">
            {NETWORK_LOGOS.map((logo) => (
              <a
                key={logo.name}
                href={logo.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-block', opacity: 0.85, transition: 'opacity 200ms' }}
                title={logo.name}
              >
                <img
                  src={logo.src}
                  alt={logo.name}
                  width={120}
                  loading="lazy"
                  style={{ display: 'block', height: 'auto' }}
                />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 4 — TAGLINES                                               */}
      {/* Webflow class: .section (bg #000)                                  */}
      {/* Four stacked lines — the brand voice statement. 36px text block.  */}
      {/* ================================================================== */}
      <section style={{ ...sectionBase, background: '#000' }}>
        <div style={container}>
          {[
            'Compelling characters.',
            'Great storytelling.',
            'Innovative deals.',
            'High production value.',
          ].map((line) => (
            <p
              key={line}
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: 36,
                fontWeight: 400,
                color: '#f2f4f7',
                margin: '0 0 16px',
                textAlign: 'center',
                lineHeight: 1.3,
              }}
            >
              {line}
            </p>
          ))}
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 5 — SIZZLE REEL CTA                                        */}
      {/* Webflow class: .section (bg #000), centered text                   */}
      {/* .button-2: bg #e51d26, borderRadius 12px, fontSize 25px, white txt */}
      {/* ================================================================== */}
      <section style={{ background: '#000', padding: '40px 0 80px', textAlign: 'center' }}>
        <a
          href="https://www.youtube.com/watch?v=OjQMdG4ewxo"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: '#e51d26',
            color: '#fff',
            fontFamily: "'Roboto Condensed', sans-serif",
            fontSize: 25,
            fontWeight: 400,
            textDecoration: 'none',
            borderRadius: 12,
            padding: '12px 32px',
            display: 'inline-block',
          }}
        >
          MyEntertainment Sizzle Reel
        </a>
      </section>

      {/* ================================================================== */}
      {/* SECTION 5b — DARKESTGREY SPACER                                     */}
      {/* Webflow class: .section.darkestgrey — bg image with dark overlay.  */}
      {/* Sits between the Sizzle Reel CTA and the GENRES section.           */}
      {/* ================================================================== */}
      <section
        style={{
          backgroundImage: 'url("https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8091bc22fc40db381043_1.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: 300,
          padding: 0,
        }}
        aria-hidden="true"
      />

      {/* ================================================================== */}
      {/* SECTION 6 — GENRES                                                 */}
      {/* Webflow class: .section.genres-section (bg #000)                   */}
      {/* 6 full-bleed image cards in a 3×2 grid. Label overlaid at bottom. */}
      {/* ================================================================== */}
      <section style={{ ...sectionBase, background: '#000' }}>
        <div style={container}>
          <h2 style={subtitleSmall}>GENRES</h2>
        </div>

        {/* Genre grid — full container width, no extra side padding */}
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 20px' }}>
          <div className="mye-genre-grid">
            {GENRE_CARDS.map((card) => (
              <a
                key={card.name}
                href={card.href}
                className="mye-genre-card"
                style={{
                  display: 'flex',
                  alignItems: 'flex-end', // label sits at bottom of card
                  position: 'relative',
                  minHeight: 200,
                  backgroundImage: `url("${card.img}")`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  textDecoration: 'none',
                }}
              >
                {/* Webflow: .genre-label — h3 overlaid with dark scrim */}
                <h3
                  style={{
                    // Webflow: h3 — Roboto Condensed 24px uppercase weight-400
                    fontFamily: "'Roboto Condensed', sans-serif",
                    fontSize: 24,
                    fontWeight: 400,
                    textTransform: 'uppercase',
                    color: '#fff',
                    background: 'rgba(0,0,0,0.5)',
                    margin: 0,
                    padding: '10px 15px',
                    width: '100%',
                  }}
                >
                  {card.name}
                </h3>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 7 — SHOWS                                                  */}
      {/* Webflow class: .section.shows-section — live site bg is #fff       */}
      {/* (Webflow .section.black = white). Header color #000 on white bg.   */}
      {/* All 42 shows as clickable thumbnail images in a dense grid.        */}
      {/* ================================================================== */}
      <section style={{ ...sectionBase, background: '#fff' }}>
        <div style={container}>
          <h2 style={{ ...subtitleSmall, color: '#000' }}>SHOWS</h2>
        </div>

        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 20px' }}>
          <div className="mye-shows-grid">
            {ALL_SHOWS.map((show) =>
              show.external ? (
                // External shows (YouTube, Max) open in new tab
                <a
                  key={show.title}
                  href={show.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mye-show-thumb"
                  style={{ display: 'block', transition: 'opacity 200ms' }}
                  title={show.title}
                >
                  <img src={show.img} alt={show.title} loading="lazy" style={{ width: '100%', display: 'block' }} />
                </a>
              ) : (
                // Internal shows use Next.js Link for client-side navigation
                <Link
                  key={show.title}
                  href={show.href}
                  className="mye-show-thumb"
                  style={{ display: 'block', transition: 'opacity 200ms' }}
                  title={show.title}
                >
                  <img src={show.img} alt={show.title} loading="lazy" style={{ width: '100%', display: 'block' }} />
                </Link>
              )
            )}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SECTION 8 — CTA: "READY TO WORK WITH THE BEST?"                   */}
      {/* Webflow class: .section.cta-section (bg #000)                      */}
      {/* Final call-to-action before the footer.                            */}
      {/* ================================================================== */}
      <section style={{ ...sectionBase, background: '#000', textAlign: 'center' }}>
        <div style={container}>
          <h2 style={{ ...h2Style, textAlign: 'center' }}>Ready To Work With The Best?</h2>
          <p style={{ ...bodyText, textAlign: 'center' }}>
            Reach out to learn more about how we can make great content together.
          </p>
          {/* Webflow: .get-started-link */}
          <a href="/contact" style={{ ...getStartedLink, marginTop: 24 }}>
            CONTACT US&nbsp; ❯
          </a>
        </div>
      </section>
    </>
  );
}
