import type { Metadata } from 'next';

const OG_IMAGE = 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67c9c4bc80ecce7a341a501c_MYE%20Banner%20.png';

export const metadata: Metadata = {
  title: 'How to Find Production Crew | MyEntertainment',
  description: 'Two proven ways to find qualified film and TV crew: state film commission directories and AssignmentDesk. A complete guide to both — including every US commission database with direct links.',
  alternates: { canonical: 'https://www.myentertainment.tv/film-commissions' },
  openGraph: {
    title: 'How to Find Production Crew | MyEntertainment',
    description: 'State film commission directories and AssignmentDesk are the two most reliable ways to find qualified local crew. Here is how both work — and every US commission database in one place.',
    url: 'https://www.myentertainment.tv/film-commissions',
    siteName: 'MyEntertainment',
    type: 'website',
    images: [{ url: OG_IMAGE, width: 1887, alt: 'How to Find Production Crew — MyEntertainment Guide' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Find Production Crew | MyEntertainment',
    description: 'Film commission directories + AssignmentDesk — the two main ways to find qualified crew for any production.',
    images: [OG_IMAGE],
  },
};

// ─── Typedefs ───────────────────────────────────────────────────────────────

interface Commission {
  name: string;
  label?: string;
  url: string;
}

// ─── Data ───────────────────────────────────────────────────────────────────

const tier1: Commission[] = [
  { name: 'Georgia', label: 'GA Film Office — Reel-Crew', url: 'https://ga.reel-scout.com/crew_directory.aspx' },
  { name: 'Texas', label: 'Texas Film Commission — TEXscout', url: 'https://tx.reel-scout.com/crew_directorylist.aspx' },
  { name: 'Louisiana', label: 'Louisiana Entertainment', url: 'https://la.reel-scout.com/crew_directorylist.aspx' },
  { name: 'New York State', label: 'NY Film Office — Crewvie', url: 'https://crewvie.com/community/newyorkfc' },
  { name: 'California', label: 'CA Film Commission — Directory Hub', url: 'https://film.ca.gov/production/production-a-z/production-directories/' },
  { name: 'North Carolina', label: 'NC Film Office — Reel-Scout', url: 'https://nc.reel-scout.com/crew_directorylist.aspx' },
  { name: 'New Mexico', label: 'NM Film Office — location.pro', url: 'https://nmfilm.com/filmmaker-resources/industry-directory' },
];

const tier2: Commission[] = [
  { name: 'Colorado', label: 'CO Film Office — Reel-Scout', url: 'https://co.reel-scout.com/crew_directorylist.aspx' },
  { name: 'Virginia', label: 'Virginia Film Office — Reel-Crew', url: 'https://www.film.virginia.org/virginians/get-listed/' },
  { name: 'Washington State', label: 'Washington Filmworks — Reel-Crew', url: 'https://wa.reel-scout.com/crew_directory.aspx' },
  { name: 'Maryland', label: 'Maryland Film Office', url: 'https://business.maryland.gov/key-industries/maryland-film-office/film-crew-resource-directory/' },
  { name: 'Oklahoma', label: 'OK Film — Reel-Scout', url: 'https://oklahoma.reel-scout.com/crew_login.aspx' },
  { name: 'Oklahoma (Crewvie)', label: 'OK Film + Music — Crewvie', url: 'https://crewvie.com/community/okfilmmusic' },
  { name: 'Michigan', label: 'Michigan Film Office — Reel-Scout', url: 'https://mi.reel-scout.com/' },
  { name: 'Tennessee', label: 'TN Entertainment Commission', url: 'https://www.tnentertainment.com/production-directory/' },
  { name: 'Pennsylvania — Pittsburgh', label: 'Greater Pittsburgh Film Office', url: 'https://pghfilm.org/for-crew-and-talent/crew-registration/' },
  { name: 'Pennsylvania — Philadelphia', label: 'Philadelphia Film Office — Reel-Scout', url: 'https://philly.reel-scout.com/' },
  { name: 'Pennsylvania — Central', label: 'Central PA Film Commission — Crewvie', url: 'https://crewvie.com/community/cpfc' },
  { name: 'Pennsylvania — State', label: 'Film in PA', url: 'https://filminpa.com/resources/cast-crew-listings/' },
  { name: 'Oregon', label: 'Oregon Film Office / OMPA', url: 'https://oregonfilm.org/article/crew-directory/' },
  { name: 'Utah', label: 'Utah Film Commission — Reel-Scout', url: 'https://ut.reel-scout.com/' },
  { name: 'Mississippi', label: 'Film Mississippi — Reel-Scout', url: 'https://filmmississippi.org/reel-scout/' },
  { name: 'Arizona', label: 'AZ Commerce Film Office — Reel-Scout', url: 'https://www.azcommerce.com/film-media/arizona-production-directory/' },
  { name: 'Florida', label: 'Film in Florida', url: 'https://filminflorida.com/production-2/' },
  { name: 'Massachusetts', label: 'Massachusetts Film Office', url: 'https://mafilm.org/guide-open-registration/' },
  { name: 'Minnesota', label: 'MN Film & TV Board', url: 'https://mnfilmtv.org/minnesota-production-directory' },
  { name: 'Arkansas', label: 'Arkansas Film Commission', url: 'https://www.arkansasproduction.com/ar/crew-support/' },
  { name: 'Alabama', label: 'Alabama Film Office', url: 'http://film.alabama.gov/crew_search.html' },
  { name: 'Nebraska', label: 'Nebraska Film Office', url: 'https://film.nebraska.gov/search-crews-and-supports/' },
  { name: 'West Virginia', label: 'WV Film Office — Reel-Scout', url: 'https://wv.reel-scout.com/crew_directorylist.aspx' },
  { name: 'Connecticut', label: 'CT Film Office', url: 'https://portal.ct.gov/choosect/film-office' },
  { name: 'Montana', label: 'Montana Film Office — Crewvie', url: 'https://crewvie.com/community/montanafc' },
  { name: 'Rhode Island', label: 'RI Film Office', url: 'https://film.ri.gov/ProdGuideNew.php' },
  { name: 'Nevada', label: 'Nevada Film Office', url: 'https://directory.film.nv.gov' },
  { name: 'Hawaii', label: 'Hawaii Film Office', url: 'https://filmoffice.hawaii.gov/crew-talent/' },
  { name: 'New Jersey', label: 'NJ Film Commission — Crewvie', url: 'https://crewvie.com/community/newjerseyfc' },
  { name: 'South Carolina', label: 'SC Film Commission — Crewvie', url: 'https://crewvie.com/community/southcarolinafc' },
  { name: 'New Hampshire', label: 'NH Film Office — Reel-Scout', url: 'https://nh.reel-scout.com/crew_login.aspx' },
  { name: 'Iowa', label: 'Produce Iowa Film Office', url: 'https://opportunityiowa.gov/community/arts-culture/produce-iowa' },
  { name: 'Idaho', label: 'Idaho Film Commission — Crewvie', url: 'https://crewvie.com/community/idaho-film-commission' },
  { name: 'Maine', label: 'Film in Maine', url: 'https://filminmaine.com/crew-services/' },
  { name: 'Vermont', label: 'Vermont Production Collective', url: 'https://vtproductioncollective.org/crew-directory/' },
  { name: 'Wisconsin', label: 'Badger Guide (Industry Directory)', url: 'https://www.badgerguide.com/' },
  { name: 'Missouri', label: 'Missouri Film Office', url: 'https://mofilm.org/' },
  { name: 'District of Columbia', label: 'DC Reel-Crew — Reel-Scout', url: 'https://entertainment.dc.gov/page/dc-reel-crew' },
  { name: 'Ohio', label: 'Cleveland Film Commission', url: 'https://www.clevelandfilm.com/crews-plus-vendors/' },
];

const cityRegional: Commission[] = [
  { name: 'New York City — NY 411', label: 'Industry standard for NYC crew (subscription)', url: 'https://ny411.com' },
  { name: 'New York City — NYPG', label: 'New York Production Guide', url: 'https://www.nypg.com' },
  { name: 'Los Angeles — LA 411', label: 'Industry standard for LA crew (listing fee)', url: 'https://la411.com' },
  { name: 'Dallas', label: 'Film Dallas', url: 'https://filmdallas.org/directory/' },
  { name: 'Houston', label: 'Houston Film Commission — Reel-Scout', url: 'https://houston.reel-scout.com/' },
  { name: 'San Antonio', label: 'Film San Antonio', url: 'https://www.filmsanantonio.com/Production-Directory' },
  { name: 'Austin', label: 'Austin Film Commission', url: 'https://www.austintexas.org/film-commission/' },
  { name: 'Fort Worth', label: 'Fort Worth Film Commission — Reel-Scout', url: 'https://fortworth.reel-scout.com/' },
  { name: 'Savannah, GA', label: 'Film Savannah — Reel-Scout', url: 'https://www.filmsavannah.org/crew-vendors/' },
  { name: 'New Orleans', label: 'Film New Orleans', url: 'https://filmneworleans.org/resource-directory/' },
  { name: 'Wilmington, NC', label: 'Wilmington Regional Film Commission', url: 'https://www.wilmingtonfilm.com/crew/' },
  { name: 'Charlotte, NC', label: 'Charlotte Regional Film Commission', url: 'https://www.charlottefilm.com/film-guide' },
  { name: 'Kansas City', label: 'KC Film Office (auto cross-lists to MO)', url: 'https://www.kcfilmoffice.com/crew-services/' },
  { name: 'Memphis, TN', label: 'Film Memphis', url: 'https://www.filmmemphis.org/' },
  { name: 'Greater Cleveland', label: 'Cleveland Film Commission', url: 'https://www.clevelandfilm.com/crews-plus-vendors/' },
  { name: 'Miami-Dade', label: 'Reel Film Miami', url: 'https://www.filmiami.org/production_guide.asp' },
  { name: 'Palm Beach, FL', label: 'Palm Beach Film Office', url: 'https://www.pbfilm.com/productionguide' },
  { name: 'Florida Keys', label: 'Film the Keys', url: 'https://filmkeys.com/production-guide/' },
  { name: 'Atlantic City', label: 'LocationsHub — Atlantic City', url: 'http://ac.locationshub.com/' },
  { name: 'Cherokee Nation', label: 'Cherokee Nation Film Office — Reel-Scout (nationwide scope)', url: 'https://cherokeenation.reel-scout.com/' },
  { name: 'Hudson Valley, NY', label: 'Hudson Valley Film Commission', url: 'https://www.hudsonvalleyfilmcommission.org/production' },
  { name: 'Rochester, NY', label: 'Film Rochester', url: 'https://www.filmrochester.org/guide/category/crew/' },
];

const whyPoints = [
  'Production companies searching for local crew check these databases first — before job boards, before social media, before personal networks.',
  'Registration is free in almost every state. A fifteen-minute form can put your name in front of every production company scouting that market.',
  'Listings are searchable by department, union status, and region. You show up exactly when a coordinator is looking for your specific skill set.',
  'Many commissions actively promote their directories to out-of-state productions through incentive packages. One meeting between a commissioner and a studio can send dozens of inquiries to your profile.',
  'Getting listed in multiple states — especially neighboring ones — multiplies your exposure across every production that qualifies for local incentives there.',
  'States like Georgia, Texas, and Louisiana handle billions in annual production spend. A free listing in those databases is access to that entire market.',
];

// ─── Styles (reused inline tokens from the site design system) ──────────────

const S = {
  pageWrap: { background: '#000' } as React.CSSProperties,
  section: (pt = 60, pb = 60): React.CSSProperties => ({
    background: '#000',
    padding: `${pt}px 20px ${pb}px`,
  }),
  container: { maxWidth: 1180, margin: '0 auto' } as React.CSSProperties,
  h1: {
    fontFamily: "'Roboto', sans-serif",
    fontSize: 48,
    fontWeight: 400,
    color: '#e51d26',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.2em',
    textAlign: 'center' as const,
    margin: 0,
  } as React.CSSProperties,
  h2: {
    fontFamily: "'Roboto', sans-serif",
    fontSize: 28,
    fontWeight: 400,
    color: '#f2f4f7',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    marginTop: 0,
    marginBottom: 32,
  } as React.CSSProperties,
  h3: {
    fontFamily: "'Roboto Condensed', sans-serif",
    fontSize: 13,
    fontWeight: 700,
    color: '#e51d26',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    margin: '0 0 4px 0',
  } as React.CSSProperties,
  body: {
    fontFamily: "'Roboto', sans-serif",
    fontSize: 14,
    color: '#a5a7ad',
    lineHeight: 1.7,
    margin: 0,
  } as React.CSSProperties,
  label: {
    fontFamily: "'Roboto', sans-serif",
    fontSize: 11,
    color: '#636570',
    lineHeight: 1.5,
    margin: '0 0 6px 0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } as React.CSSProperties,
  link: {
    fontFamily: "'Roboto Condensed', sans-serif",
    fontSize: 12,
    fontWeight: 500,
    color: '#e02027',
    textDecoration: 'none',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  } as React.CSSProperties,
  divider: {
    border: 'none',
    borderTop: '1px solid #1a1a1a',
    margin: '0 0 60px 0',
  } as React.CSSProperties,
};

// ─── Commission Card ─────────────────────────────────────────────────────────

function CommissionCard({ c }: { c: Commission }) {
  return (
    <div
      style={{
        background: '#0a0a0a',
        border: '1px solid #1c1c1c',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <p style={S.h3}>{c.name}</p>
      {c.label && <p style={S.label}>{c.label}</p>}
      <a
        href={c.url}
        target="_blank"
        rel="noopener noreferrer"
        style={S.link}
      >
        Register / Search &#10095;
      </a>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function FilmCommissionsPage() {
  return (
    <div style={S.pageWrap}>

      {/* ── Hero ── */}
      <section
        style={{
          paddingTop: 100,
          paddingBottom: 40,
          paddingLeft: 20,
          paddingRight: 20,
          textAlign: 'center',
          background: '#000',
        }}
      >
        <h1 style={S.h1}>How to Find Production Crew</h1>
        <p
          style={{
            ...S.body,
            maxWidth: 720,
            margin: '28px auto 0',
            textAlign: 'center',
          }}
        >
          There are two reliable ways to find qualified film and TV crew. The first is state and
          city film commission directories — free, government-maintained databases that productions
          search when they pull local incentives. The second is{' '}
          <a href="https://www.assignmentdesk.com" target="_blank" rel="noopener noreferrer" style={{ color: '#e51d26', textDecoration: 'none' }}>
            AssignmentDesk
          </a>
          {' '}— an active booking platform where productions submit crew requests and get matched
          with vetted talent on demand. Together they cover the full spectrum: passive local search
          and active on-demand booking.
        </p>
      </section>

      {/* ── Two Methods Overview ── */}
      <section style={S.section(40, 40)}>
        <div style={S.container}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 2,
            }}
          >
            {/* Method 1 */}
            <div
              style={{
                background: '#0a0a0a',
                border: '1px solid #1c1c1c',
                padding: '32px',
              }}
            >
              <p
                style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 11,
                  color: '#e51d26',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.1em',
                  margin: '0 0 10px',
                }}
              >
                Method 01
              </p>
              <p
                style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#f2f4f7',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.08em',
                  margin: '0 0 12px',
                }}
              >
                Film Commission Directories
              </p>
              <p style={{ ...S.body, margin: '0 0 16px' }}>
                Every state and major city maintains a free, publicly searchable crew database.
                Productions searching for local crew — especially those tied to state incentive
                programs — check these first. Getting listed costs nothing and puts your name
                in front of every shoot in your market.
              </p>
              <p style={{ ...S.body, margin: 0, color: '#636570' }}>
                Best for: local/regional crew searches, incentive-tied productions, building a
                passive presence in multiple markets.
              </p>
            </div>

            {/* Method 2 */}
            <div
              style={{
                background: '#0a0a0a',
                border: '1px solid #1c1c1c',
                padding: '32px',
              }}
            >
              <p
                style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 11,
                  color: '#e51d26',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.1em',
                  margin: '0 0 10px',
                }}
              >
                Method 02
              </p>
              <p
                style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#f2f4f7',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.08em',
                  margin: '0 0 12px',
                }}
              >
                AssignmentDesk
              </p>
              <p style={{ ...S.body, margin: '0 0 16px' }}>
                AssignmentDesk is an active crew booking platform. Productions submit a request —
                role, date, location, budget — and get matched with vetted crew immediately.
                Crew registers once and receives shoot opportunities directly. No cold outreach,
                no waiting for a coordinator to search.
              </p>
              <p style={{ ...S.body, margin: '0 0 20px', color: '#636570' }}>
                Best for: fast turnaround bookings, productions without existing local relationships,
                crew looking for a steady pipeline of work.
              </p>
              <a
                href="https://www.assignmentdesk.com"
                target="_blank"
                rel="noopener noreferrer"
                style={S.link}
              >
                Visit AssignmentDesk &#10095;
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why Get Listed ── */}
      <section style={S.section(40, 60)}>
        <div style={S.container}>
          <hr style={S.divider} />
          <h2 style={S.h2}>Method 01 — Film Commission Directories</h2>
          <ul
            style={{
              padding: '0 0 0 20px',
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {whyPoints.map((point, i) => (
              <li
                key={i}
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 14,
                  color: '#a5a7ad',
                  lineHeight: 1.7,
                }}
              >
                {point}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={S.section(0, 60)}>
        <div style={S.container}>
          <hr style={S.divider} />
          <h2 style={S.h2}>How It Works</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 32,
            }}
          >
            {[
              {
                step: '01',
                heading: 'Pick Your States',
                body: 'Register in every state where you live, frequently work, or are willing to travel. Many commissions also accept neighboring-state residents — New Hampshire, for example, covers NH, VT, ME, and MA in a single directory.',
              },
              {
                step: '02',
                heading: 'Fill Out Your Profile',
                body: 'Most directories ask for your name, department, union affiliation, credits, a resume PDF, and a reel or IMDb link. The more complete your profile, the higher you appear in filtered searches.',
              },
              {
                step: '03',
                heading: 'Stay Current',
                body: 'Update your credits and contact info at least annually. Stale profiles get flagged or deprioritized. Active profiles with recent credits get booked.',
              },
            ].map(({ step, heading, body }) => (
              <div key={step} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span
                  style={{
                    fontFamily: "'Roboto Condensed', sans-serif",
                    fontSize: 36,
                    fontWeight: 700,
                    color: '#1c1c1c',
                    lineHeight: 1,
                  }}
                >
                  {step}
                </span>
                <p
                  style={{
                    fontFamily: "'Roboto Condensed', sans-serif",
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#f2f4f7',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    margin: 0,
                  }}
                >
                  {heading}
                </p>
                <p style={S.body}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tier 1: Major Film States ── */}
      <section style={S.section(0, 60)}>
        <div style={S.container}>
          <hr style={S.divider} />
          <h2 style={S.h2}>Tier 1 — Major Film States</h2>
          <p style={{ ...S.body, marginBottom: 32 }}>
            The states below handle the largest share of US production volume and offer the richest
            incentive packages. Productions headquartered anywhere in the country scout these
            databases when shooting on location.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {tier1.map((c) => (
              <CommissionCard key={c.name} c={c} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Tier 2: Active Film States ── */}
      <section style={S.section(0, 60)}>
        <div style={S.container}>
          <hr style={S.divider} />
          <h2 style={S.h2}>Tier 2 — Active Film States</h2>
          <p style={{ ...S.body, marginBottom: 32 }}>
            Every state below maintains a real, searchable crew directory. Many offer competitive
            incentives that draw productions away from the major markets. Being listed here means
            being found when a show shoots closer to home.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {tier2.map((c) => (
              <CommissionCard key={c.name} c={c} />
            ))}
          </div>
        </div>
      </section>

      {/* ── City & Regional Directories ── */}
      <section style={S.section(0, 60)}>
        <div style={S.container}>
          <hr style={S.divider} />
          <h2 style={S.h2}>Major City &amp; Regional Directories</h2>
          <p style={{ ...S.body, marginBottom: 32 }}>
            Beyond state-level offices, many cities and regions run their own directories — and in
            some markets, the city database is the primary resource. New York and Los Angeles rely
            almost entirely on private industry directories (NY 411, LA 411) rather than
            government-run databases.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
            }}
          >
            {cityRegional.map((c) => (
              <CommissionCard key={c.name} c={c} />
            ))}
          </div>
        </div>
      </section>

      {/* ── AssignmentDesk (Method 2) ── */}
      <section style={S.section(0, 60)}>
        <div style={S.container}>
          <hr style={S.divider} />
          <h2 style={S.h2}>Method 02 — AssignmentDesk</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 48,
              alignItems: 'start',
            }}
          >
            <div>
              <p style={{ ...S.body, marginBottom: 20 }}>
                Where film commission directories are passive — crew registers and waits to be
                found — <a href="https://www.assignmentdesk.com" target="_blank" rel="noopener noreferrer" style={{ color: '#e51d26', textDecoration: 'none' }}>AssignmentDesk</a> is
                active. Productions submit a crew request with role, shoot date, location, and
                budget. The platform matches that request against its crew database and surfaces
                the right candidates. Crew receives shoot opportunities directly rather than
                waiting for a coordinator to discover their commission listing.
              </p>
              <p style={{ ...S.body, marginBottom: 20 }}>
                The two approaches complement each other without overlap. Commission directories
                are strongest for productions that are already committed to shooting in a specific
                state and need to fill out a local roster — especially when local-hire rules are
                tied to incentive eligibility. AssignmentDesk is strongest for productions that
                need crew fast, are working in multiple markets, or don&apos;t have existing
                relationships in a given city.
              </p>
              <p style={{ ...S.body, marginBottom: 0 }}>
                For crew, the difference is similar: a commission listing builds a passive presence
                in your home market over time. An AssignmentDesk profile gets you into an active
                booking pipeline — shoots come to you rather than you waiting for a search to
                surface your name.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'For Productions', body: 'Submit a crew request and get matched with vetted, available crew for your shoot dates and location. No cold outreach required.' },
                { label: 'For Crew', body: 'Register once. Receive shoot opportunities that match your role, market, and availability. One profile, ongoing work.' },
                { label: 'Speed', body: 'On-demand booking for fast-turnaround productions. Commission directories can take weeks to surface results; AssignmentDesk works in hours.' },
              ].map(({ label, body: b }) => (
                <div
                  key={label}
                  style={{
                    background: '#0a0a0a',
                    border: '1px solid #1c1c1c',
                    padding: '20px 24px',
                  }}
                >
                  <p style={{ ...S.h3, marginBottom: 8 }}>{label}</p>
                  <p style={{ ...S.body, margin: 0 }}>{b}</p>
                </div>
              ))}
              <a
                href="https://www.assignmentdesk.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...S.link,
                  display: 'inline-block',
                  marginTop: 8,
                }}
              >
                Get Started at AssignmentDesk &#10095;
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Platform Note ── */}
      <section style={S.section(0, 60)}>
        <div style={S.container}>
          <hr style={S.divider} />
          <h2 style={S.h2}>The Platforms Behind the Directories</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 32,
            }}
          >
            {[
              {
                name: 'Reel-Scout',
                note: 'The industry-standard platform used by 19+ state and city commissions. If you learn how to navigate one Reel-Scout directory, you know how to navigate all of them. States include Georgia, Texas, Louisiana, North Carolina, Virginia, Washington, Colorado, Michigan, Utah, Arizona, Mississippi, West Virginia, and more.',
                url: 'https://www.reel-scout.com/',
              },
              {
                name: 'Crewvie',
                note: 'A newer community-profile platform adopted by New York, New Jersey, South Carolina, Montana, Idaho, Oklahoma, and Central Pennsylvania. Free to join. Profile-driven rather than form-driven.',
                url: 'https://crewvie.com/',
              },
              {
                name: 'Custom / State-Run',
                note: 'Florida, Massachusetts, Minnesota, Arkansas, Alabama, Nebraska, Connecticut, Nevada, Oregon, and others run proprietary directories. Each has its own registration flow but the same basic data model: name, department, credits, contact.',
              },
            ].map(({ name, note, url }) => (
              <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p
                  style={{
                    fontFamily: "'Roboto Condensed', sans-serif",
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#f2f4f7',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    margin: 0,
                  }}
                >
                  {name}
                </p>
                <p style={S.body}>{note}</p>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={S.link}
                  >
                    Learn More &#10095;
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── States Without Formal Directories ── */}
      <section style={S.section(0, 80)}>
        <div style={S.container}>
          <hr style={S.divider} />
          <h2 style={S.h2}>States With No Formal Crew Directory</h2>
          <p style={{ ...S.body, maxWidth: 780 }}>
            Alaska, Delaware, South Dakota, Wyoming, North Dakota, Kentucky (statewide), Indiana,
            and Hawaii do not maintain searchable public crew databases at the state level. Hawaii
            and Wyoming handle crew requests through direct referrals via the film office. Kentucky
            has city-level resources in Louisville (502 Film) and Lexington (FilmLEX) but no
            central registry. For these markets, local industry associations, union hall rosters,
            and direct outreach to the film liaison office are the primary paths to finding work.
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        style={{
          padding: '80px 20px',
          background: '#000',
          borderTop: '1px solid #1a1a1a',
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 2,
          }}
        >
          {/* AssignmentDesk CTA */}
          <div
            style={{
              background: '#0a0a0a',
              border: '1px solid #1c1c1c',
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <p style={{ ...S.h3, margin: 0 }}>Find Crew Now</p>
            <h2
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: 22,
                fontWeight: 400,
                color: '#f2f4f7',
                margin: 0,
              }}
            >
              AssignmentDesk
            </h2>
            <p style={{ ...S.body, margin: 0 }}>
              Submit a crew request and get matched with vetted talent for your next shoot.
              On-demand booking for productions of any size.
            </p>
            <a
              href="https://www.assignmentdesk.com/hire-a-crew/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: "'Roboto Condensed', sans-serif",
                fontSize: 14,
                fontWeight: 500,
                color: '#e02027',
                textTransform: 'uppercase',
                textDecoration: 'none',
                letterSpacing: '0.05em',
                marginTop: 8,
              }}
            >
              GET CREW &nbsp;&#10095;
            </a>
          </div>

          {/* MYE contact CTA */}
          <div
            style={{
              background: '#0a0a0a',
              border: '1px solid #1c1c1c',
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <p style={{ ...S.h3, margin: 0 }}>Work With Us</p>
            <h2
              style={{
                fontFamily: "'Roboto', sans-serif",
                fontSize: 22,
                fontWeight: 400,
                color: '#f2f4f7',
                margin: 0,
              }}
            >
              MyEntertainment
            </h2>
            <p style={{ ...S.body, margin: 0 }}>
              My Entertainment produces thousands of hours of non-fiction and documentary television
              across the US. If you are looking to pitch a project or explore a production
              partnership, reach out.
            </p>
            <a
              href="/contact"
              style={{
                fontFamily: "'Roboto Condensed', sans-serif",
                fontSize: 14,
                fontWeight: 500,
                color: '#e02027',
                textTransform: 'uppercase',
                textDecoration: 'none',
                letterSpacing: '0.05em',
                marginTop: 8,
              }}
            >
              CONTACT US &nbsp;&#10095;
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
