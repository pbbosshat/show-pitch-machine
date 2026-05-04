import type { Metadata } from 'next';
import Link from 'next/link';

const OG_IMAGE = 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67c9c4bc80ecce7a341a501c_MYE%20Banner%20.png';

export const metadata: Metadata = {
  title: 'How to Get Found by Production Companies | Film Commission Crew Directories',
  description: 'State film commission crew directories are the first place production coordinators search for local talent. Here\'s why every freelance crew member should be listed — and where to sign up.',
  alternates: { canonical: 'https://www.myentertainment.tv/press-releases/film-commission-crew-directories' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'How to Get Found by Production Companies | MyEntertainment',
    description: 'State film commission crew directories are where productions actually look for local crew. A free listing can put your name in front of every shoot in your market.',
    url: 'https://www.myentertainment.tv/press-releases/film-commission-crew-directories',
    siteName: 'MyEntertainment',
    type: 'article',
    images: [{ url: OG_IMAGE, width: 1887, alt: 'Film Commission Crew Directories Guide' }],
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Get Found by Production Companies: The Film Commission Crew Directory Guide',
  description: 'State film commission crew directories are the first place production coordinators search for local talent. A free listing can put your name in front of every shoot in your market.',
  datePublished: '2026-05-03',
  publisher: {
    '@type': 'Organization',
    name: 'MyEntertainment',
    url: 'https://www.myentertainment.tv',
  },
};

// Shared styles
const body: React.CSSProperties = {
  fontFamily: "'Roboto', sans-serif",
  fontSize: 15,
  color: '#a5a7ad',
  lineHeight: 1.85,
  margin: '0 0 24px 0',
};

const h2: React.CSSProperties = {
  fontFamily: "'Roboto Condensed', sans-serif",
  fontSize: 22,
  fontWeight: 700,
  color: '#f2f4f7',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  margin: '48px 0 16px',
};

const linkStyle: React.CSSProperties = {
  color: '#e51d26',
  textDecoration: 'none',
};

export default function FilmCommissionBlogPost() {
  return (
    <div style={{ background: '#000' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />

      {/* ── Header ── */}
      <section
        style={{
          paddingTop: 100,
          paddingBottom: 60,
          paddingLeft: 20,
          paddingRight: 20,
          background: '#000',
          borderBottom: '1px solid #1a1a1a',
        }}
      >
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 11,
              color: '#e51d26',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              margin: '0 0 20px',
            }}
          >
            Industry Resources &nbsp;·&nbsp; May 2026
          </p>
          <h1
            style={{
              fontFamily: "'Roboto Condensed', sans-serif",
              fontSize: 38,
              fontWeight: 700,
              color: '#f2f4f7',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              lineHeight: 1.2,
              margin: '0 0 24px',
            }}
          >
            How to Get Found by Production Companies: The Film Commission Crew Directory Guide
          </h1>
          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 16,
              color: '#a5a7ad',
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            Every US state that produces significant film and television volume maintains a public
            crew database. These are the directories production coordinators actually use when they
            need local crew — not job boards, not social media. Getting listed is free and takes
            fifteen minutes. Here&apos;s why it matters and where to sign up.
          </p>
        </div>
      </section>

      {/* ── Article body ── */}
      <section style={{ background: '#000', padding: '60px 20px 80px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>

          <h2 style={h2}>What a Film Commission Actually Does</h2>
          <p style={body}>
            Every state has a film commission — usually housed inside the governor&apos;s office of
            economic development or a dedicated entertainment bureau. Their job is to attract
            productions to their state: they negotiate incentive packages, scout locations, handle
            permitting, and connect visiting productions with the local industry.
          </p>
          <p style={body}>
            The crew directory is a core piece of that pitch. When a production company is deciding
            whether to shoot in Georgia vs. Louisiana vs. New Mexico, one of the deciding factors is
            whether there&apos;s enough experienced local crew to staff the show. The commission
            maintains a searchable database of everyone available in the market — and hands that
            database to every production that pulls an incentive there.
          </p>

          <h2 style={h2}>Why Coordinators Search These First</h2>
          <p style={body}>
            When a production coordinator lands in a new market — especially for a show that
            qualifies for state incentives — the commission directory is the fastest path to
            pre-vetted, locally-based crew. The results are filtered by department, union
            affiliation, and region. There&apos;s no noise from out-of-state applicants who
            can&apos;t qualify under the incentive&apos;s local-hire rules.
          </p>
          <p style={body}>
            Contrast that with a job board like ProductionHUB or Staff Me Up, where a single posting
            in Atlanta might generate applications from crew in Los Angeles, New York, and London —
            most of whom the production can&apos;t use without blowing their local-hire percentage.
            The commission database filters that problem out entirely.
          </p>
          <p style={body}>
            That&apos;s why the directory gets checked first. It&apos;s not the only tool, but for
            local crew it&apos;s the most efficient one.
          </p>

          <h2 style={h2}>The Registration Logistics</h2>
          <p style={body}>
            Nearly every state directory is free to join and publicly searchable without a login.
            The dominant platform is{' '}
            <a href="https://www.reel-scout.com/" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              Reel-Scout
            </a>
            , which powers 19+ state commissions including Georgia, Texas, Louisiana, North
            Carolina, Virginia, Washington, Colorado, Michigan, and Utah. If you fill out one
            Reel-Scout profile, the fields are identical across every state — you can complete
            subsequent registrations in minutes.
          </p>
          <p style={body}>
            A newer platform called{' '}
            <a href="https://crewvie.com/" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              Crewvie
            </a>{' '}
            is gaining traction with commissions in New York, New Jersey, South Carolina, Montana,
            and Idaho. It takes a more community-profile approach — closer to a LinkedIn for crew
            than a government form.
          </p>
          <p style={body}>
            The remaining states run custom directories on their own platforms — Florida,
            Massachusetts, Minnesota, Arkansas, Alabama, Nevada, Oregon, and others. Each has its
            own registration flow but asks for the same core data: name, department, credits, union
            status, contact information, resume PDF, and a reel or IMDb link.
          </p>

          <h2 style={h2}>Which States Are Worth Your Time</h2>
          <p style={body}>
            If you&apos;re based in a major production state — Georgia, Texas, Louisiana, North
            Carolina, New Mexico — those registrations are non-negotiable. These states move the
            most production volume, have the most active directories, and are the first place any
            visiting production looks.
          </p>
          <p style={body}>
            Beyond your home state, consider neighboring states. New Hampshire&apos;s Reel-Scout
            directory, for instance, accepts residents of NH, VT, ME, and MA. Kansas City
            registrations automatically cross-list into the Missouri state directory. Virginia
            and DC share overlapping production networks through the Mid-Atlantic region.
          </p>
          <p style={body}>
            The Cherokee Nation Film Office runs a Reel-Scout directory that&apos;s open to crew
            nationwide — not just Oklahoma residents. It&apos;s one of the few directories with no
            geographic restriction on who can list. Worth ten minutes of anyone&apos;s time.
          </p>

          <h2 style={h2}>A Note on LA and New York</h2>
          <p style={body}>
            The two largest markets operate differently. Neither Los Angeles nor New York City
            maintains a government-run crew database. In LA, the industry standard is{' '}
            <a href="https://la411.com" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              LA 411
            </a>{' '}
            — a private, subscription-based directory. In New York, it&apos;s{' '}
            <a href="https://ny411.com" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              NY 411
            </a>{' '}
            and{' '}
            <a href="https://www.nypg.com" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              NYPG
            </a>
            . These carry a listing fee but are the directories that production companies in those
            markets actually use. If you work in either city regularly, a listing there is a
            business expense worth taking seriously.
          </p>

          <h2 style={h2}>The Other Half of the Equation: AssignmentDesk</h2>
          <p style={body}>
            Film commission directories solve one half of the crew-finding problem: they give
            productions a searchable database of everyone available in a given market. But they
            are passive by design. A coordinator has to know to look, has to search the right
            state, and has to find your profile in the results. That process can take days.
          </p>
          <p style={body}>
            <a href="https://www.assignmentdesk.com" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              AssignmentDesk
            </a>{' '}
            flips the model. Productions submit a crew request — role, shoot date, location,
            budget — and the platform surfaces matched crew immediately. Instead of waiting
            for your commission listing to be discovered, your AssignmentDesk profile is
            actively matched against incoming requests. Shoots come to you.
          </p>
          <p style={body}>
            The two tools serve different production contexts. Commission directories are
            strongest when a production is already committed to a specific state and needs
            to fill a local roster — particularly when local-hire requirements are tied to
            incentive eligibility. AssignmentDesk is strongest for fast-turnaround bookings,
            productions working across multiple markets, or any situation where a coordinator
            needs crew in 48 hours rather than two weeks.
          </p>
          <p style={body}>
            For crew, the distinction is equally clear. A commission listing is a long-term
            investment in your home market — it compounds over time as more productions pull
            incentives in your state. An AssignmentDesk profile is an active pipeline: you
            register once, and the platform works continuously to match you with shoots that
            fit your role and availability.
          </p>
          <p style={body}>
            Neither replaces the other. A DP in Atlanta who is listed on the Georgia Film
            Commission&apos;s Reel-Scout directory and has an AssignmentDesk profile is covered
            on both fronts — visible to the coordinator who searches the state database and
            to the one who submits a request directly to the platform. Both take under an
            hour to set up. There is no reason not to do both.
          </p>

          <h2 style={h2}>The Bottom Line</h2>
          <p style={body}>
            A state film commission listing is the closest thing to a passive job search that exists
            in this industry. You fill out the form once, and your name shows up every time a
            coordinator searches your department in your market — for every production that touches
            that state&apos;s incentive program.
          </p>
          <p style={body}>
            Given that registration is free and the form takes fifteen minutes, there&apos;s no
            rational reason not to be listed in every state where you work or are willing to work.
          </p>
          <p style={body}>
            We&apos;ve compiled every US state and major city film commission directory —
            70+ databases — with direct registration links in one place.
          </p>

          {/* Two CTAs */}
          <div style={{ margin: '40px 0 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div
              style={{
                padding: '32px',
                border: '1px solid #1c1c1c',
                background: '#0a0a0a',
              }}
            >
              <p
                style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 11,
                  color: '#e51d26',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  margin: '0 0 8px',
                }}
              >
                Method 01
              </p>
              <p
                style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#f2f4f7',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  margin: '0 0 12px',
                }}
              >
                US Film Commission Directory
              </p>
              <p style={{ ...body, margin: '0 0 20px' }}>
                Every state and city film commission crew database, organized by market tier —
                with direct links to register or search.
              </p>
              <Link
                href="/film-commissions"
                style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#e02027',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  letterSpacing: '0.05em',
                }}
              >
                VIEW ALL DIRECTORIES &#10095;
              </Link>
            </div>
            <div
              style={{
                padding: '32px',
                border: '1px solid #1c1c1c',
                background: '#0a0a0a',
              }}
            >
              <p
                style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 11,
                  color: '#e51d26',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  margin: '0 0 8px',
                }}
              >
                Method 02
              </p>
              <p
                style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#f2f4f7',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  margin: '0 0 12px',
                }}
              >
                AssignmentDesk
              </p>
              <p style={{ ...body, margin: '0 0 20px' }}>
                Active crew booking platform. Submit a request or register as crew — matched
                on role, location, and availability.
              </p>
              <a
                href="https://www.assignmentdesk.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#e02027',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  letterSpacing: '0.05em',
                }}
              >
                VISIT ASSIGNMENTDESK &#10095;
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Back link ── */}
      <section style={{ background: '#000', padding: '0 20px 60px', borderTop: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', paddingTop: 40 }}>
          <Link
            href="/press-releases"
            style={{
              fontFamily: "'Roboto Condensed', sans-serif",
              fontSize: 12,
              fontWeight: 500,
              color: '#636570',
              textTransform: 'uppercase',
              textDecoration: 'none',
              letterSpacing: '0.05em',
            }}
          >
            &#8592; &nbsp;All Press Releases
          </Link>
        </div>
      </section>

    </div>
  );
}
