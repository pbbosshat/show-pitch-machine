// Careers page — MyEntertainment
// Highlights the culture/excitement of MYE and funnels all hiring through Assignment Desk.
// Inline styles only, Roboto font, dark cinematic theme — matches Webflow site exactly.

import type { Metadata } from 'next';

const OG_IMAGE = 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67c9c4bc80ecce7a341a501c_MYE%20Banner%20.png';

export const metadata: Metadata = {
  title: 'Careers | MyEntertainment — Join the Production Community',
  description: 'Work with MyEntertainment — the award-winning non-fiction production company behind Ghost Adventures, Legacy List, and more. All gigs and jobs are staffed through Assignment Desk.',
  alternates: { canonical: 'https://www.myentertainment.tv/careers' },
  openGraph: {
    title: 'Careers at MyEntertainment | Find Gigs & Jobs on Assignment Desk',
    description: 'MyEntertainment is one of the most exciting places to work in non-fiction TV. All staffing and hiring is powered by Assignment Desk — sign up for gigs or find your next full-time role.',
    url: 'https://www.myentertainment.tv/careers',
    siteName: 'MyEntertainment',
    type: 'website',
    images: [{ url: OG_IMAGE, width: 1887, alt: 'MyEntertainment — Non-Fiction Production Company' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Careers at MyEntertainment | Find Gigs & Jobs on Assignment Desk',
    description: 'All MYE staffing is through Assignment Desk. Sign up for gigs or find full-time production jobs.',
    images: [OG_IMAGE],
  },
};

const OPPORTUNITY_TYPES = [
  {
    icon: '🎬',
    title: 'Production Gigs',
    description:
      'Short-term freelance roles across all phases of production — from pre-pro to post. Camera operators, producers, APs, PAs, editors, sound mixers, story producers, loggers, and more.',
  },
  {
    icon: '📋',
    title: 'Development Roles',
    description:
      'Story researchers, development producers, sizzle creators, and pitch writers helping shape the next big non-fiction format from concept to greenlight.',
  },
  {
    icon: '🖥️',
    title: 'Post Production',
    description:
      'Editors, assistant editors, colorists, motion graphics artists, audio mixers, and post supervisors across episodic, documentary, and digital formats.',
  },
  {
    icon: '🌍',
    title: 'International Co-Production',
    description:
      'Series producers, fixers, local production coordinators, and international casting leads for our global co-production slate spanning 15+ countries.',
  },
  {
    icon: '💼',
    title: 'Full-Time Staff Positions',
    description:
      'Permanent roles in production, development, business affairs, finance, and operations. Join the MYE team full-time and build your career with one of TV\'s most dynamic production companies.',
  },
  {
    icon: '🎙️',
    title: 'Talent & Casting',
    description:
      'On-camera talent, voiceover artists, hosts, and casting researchers for series in development and active production across the MYE slate.',
  },
];

export default function CareersPage() {
  return (
    <div style={{ background: '#000' }}>

      {/* ── Hero: CAREERS heading ── */}
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
        <h1
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 48,
            fontWeight: 400,
            color: '#e51d26',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            textAlign: 'center',
            margin: 0,
          }}
        >
          Careers
        </h1>
        <p
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 16,
            color: '#a5a7ad',
            lineHeight: 1.7,
            marginTop: 20,
            marginBottom: 0,
            maxWidth: 640,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Working at MyEntertainment isn&apos;t a job — it&apos;s a front-row seat to the best non-fiction television being made today.
        </p>
      </section>

      {/* ── Why MYE section ── */}
      <section style={{ background: '#000', padding: '60px 20px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>

          <h2
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 32,
              fontWeight: 400,
              color: '#f2f4f7',
              textTransform: 'capitalize',
              marginTop: 0,
              marginBottom: 32,
            }}
          >
            Why MyEntertainment?
          </h2>

          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 14,
              color: '#a5a7ad',
              lineHeight: 1.8,
              marginBottom: 20,
              marginTop: 0,
            }}
          >
            MyEntertainment has been producing undeniable non-fiction content since 2000 — and we haven&apos;t slowed down for a second. We&apos;re the team behind <strong style={{ color: '#f2f4f7' }}>Ghost Adventures</strong>, <strong style={{ color: '#f2f4f7' }}>Legacy List</strong>, <strong style={{ color: '#f2f4f7' }}>Destination Fear</strong>, <strong style={{ color: '#f2f4f7' }}>Baggage Battles</strong>, <strong style={{ color: '#f2f4f7' }}>Breaking Borders</strong>, and thousands of hours of award-winning television delivered to virtually every major network on the planet.
          </p>

          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 14,
              color: '#a5a7ad',
              lineHeight: 1.8,
              marginBottom: 20,
              marginTop: 0,
            }}
          >
            Our offices in <strong style={{ color: '#f2f4f7' }}>New York, Toronto, and London</strong> hum with creative energy, ambitious pitches, and the kind of fast-paced collaboration that only happens when talented people chase great stories together. We work alongside the biggest names in entertainment — from LeBron James&apos;s SpringHill Company to Mark Wahlberg&apos;s Unrealistic Ideas — and we deliver for every major network: Discovery+, A&amp;E, Max, National Geographic, BBC, PBS, Lifetime, and more.
          </p>

          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 14,
              color: '#a5a7ad',
              lineHeight: 1.8,
              marginBottom: 0,
              marginTop: 0,
            }}
          >
            The culture at MYE is built on <strong style={{ color: '#f2f4f7' }}>compelling characters, great storytelling, and innovative deals</strong>. We move fast, we dream big, and we back every idea with the production infrastructure to actually pull it off. If you&apos;re serious about your craft and want to work on content that matters, you&apos;ll fit right in.
          </p>

        </div>
      </section>

      {/* ── Assignment Desk Partnership section ── */}
      <section
        style={{
          background: '#0d0d0d',
          padding: '80px 20px',
          borderTop: '1px solid #1a1a1a',
          borderBottom: '1px solid #1a1a1a',
        }}
      >
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 60,
              alignItems: 'center',
            }}
            className="adesk-grid"
          >
            {/* Left: copy */}
            <div>
              <p
                style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 11,
                  fontWeight: 400,
                  color: '#e51d26',
                  textTransform: 'uppercase',
                  letterSpacing: '3px',
                  marginTop: 0,
                  marginBottom: 16,
                }}
              >
                How We Hire
              </p>

              <h2
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 36,
                  fontWeight: 400,
                  color: '#f2f4f7',
                  lineHeight: 1.2,
                  marginTop: 0,
                  marginBottom: 24,
                }}
              >
                All of our staffing is powered by{' '}
                <span style={{ color: '#e51d26' }}>Assignment Desk</span>.
              </h2>

              <p
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 14,
                  color: '#a5a7ad',
                  lineHeight: 1.8,
                  marginBottom: 20,
                  marginTop: 0,
                }}
              >
                MyEntertainment partners exclusively with <strong style={{ color: '#f2f4f7' }}>Assignment Desk</strong> — the premier staffing and hiring platform built specifically for the production community. Whether you&apos;re looking for your next gig or a full-time seat on an award-winning team, Assignment Desk is where it all happens.
              </p>

              <p
                style={{
                  fontFamily: "'Roboto', sans-serif",
                  fontSize: 14,
                  color: '#a5a7ad',
                  lineHeight: 1.8,
                  marginBottom: 32,
                  marginTop: 0,
                }}
              >
                Signing up is free, fast, and puts you directly in front of productions like ours. Create your profile, list your credits and skills, and let the jobs come to you — or actively browse the MYE roster of open positions and freelance opportunities.
              </p>

              <a
                href="https://www.assignmentdesk.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  background: '#e51d26',
                  color: '#fff',
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  textDecoration: 'none',
                  padding: '14px 32px',
                  marginRight: 16,
                  marginBottom: 12,
                }}
              >
                Sign Up on Assignment Desk
              </a>

              <a
                href="https://www.assignmentdesk.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  border: '1px solid #e51d26',
                  color: '#e51d26',
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 14,
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  textDecoration: 'none',
                  padding: '13px 32px',
                  marginBottom: 12,
                }}
              >
                Browse Open Positions
              </a>
            </div>

            {/* Right: what Assignment Desk offers */}
            <div
              style={{
                background: '#141414',
                border: '1px solid #222',
                padding: '40px 36px',
              }}
            >
              <h3
                style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 13,
                  fontWeight: 400,
                  color: '#909499',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  marginTop: 0,
                  marginBottom: 28,
                }}
              >
                What you get on Assignment Desk
              </h3>

              {[
                { label: 'Gig Marketplace', detail: 'Short-term freelance roles posted directly by production companies like MYE' },
                { label: 'Full-Time Jobs', detail: 'Permanent staff positions across development, production, and post' },
                { label: 'Production Community Network', detail: 'Connect with crews, producers, and industry professionals across the country' },
                { label: 'Direct Outreach', detail: 'Productions can find and contact you directly — no middleman' },
                { label: 'Credit Portfolio', detail: 'Showcase your reel, credits, and skills in a profile built for the industry' },
                { label: 'Free to Join', detail: 'No fees for talent and crew — sign up in minutes and start finding work' },
              ].map(({ label, detail }) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      background: '#e51d26',
                      borderRadius: '50%',
                      flexShrink: 0,
                      marginTop: 6,
                    }}
                  />
                  <div>
                    <p
                      style={{
                        fontFamily: "'Roboto', sans-serif",
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#f2f4f7',
                        margin: '0 0 2px 0',
                      }}
                    >
                      {label}
                    </p>
                    <p
                      style={{
                        fontFamily: "'Roboto', sans-serif",
                        fontSize: 12,
                        color: '#a5a7ad',
                        margin: 0,
                        lineHeight: 1.5,
                      }}
                    >
                      {detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Opportunity Types grid ── */}
      <section style={{ background: '#000', padding: '80px 20px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>

          <h2
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 32,
              fontWeight: 400,
              color: '#f2f4f7',
              textTransform: 'capitalize',
              marginTop: 0,
              marginBottom: 12,
            }}
          >
            Types of Opportunities
          </h2>

          <p
            style={{
              fontFamily: "'Roboto', sans-serif",
              fontSize: 14,
              color: '#a5a7ad',
              lineHeight: 1.7,
              marginBottom: 48,
              marginTop: 0,
              maxWidth: 700,
            }}
          >
            MYE productions span every phase of TV-making. From one-week gigs to long-term staff positions, here&apos;s what you&apos;ll find when you browse our postings on Assignment Desk.
          </p>

          <div
            className="opp-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 24,
            }}
          >
            {OPPORTUNITY_TYPES.map(({ icon, title, description }) => (
              <div
                key={title}
                style={{
                  background: '#0a0a0a',
                  border: '1px solid #1e1e1e',
                  padding: '28px 24px',
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    marginBottom: 14,
                    lineHeight: 1,
                  }}
                >
                  {icon}
                </div>
                <h3
                  style={{
                    fontFamily: "'Roboto Condensed', sans-serif",
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#f2f4f7',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginTop: 0,
                    marginBottom: 10,
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    fontFamily: "'Roboto', sans-serif",
                    fontSize: 13,
                    color: '#a5a7ad',
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Responsive styles ── */}
      <style>{`
        @media (max-width: 767px) {
          .adesk-grid { grid-template-columns: 1fr !important; }
          .opp-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 768px) and (max-width: 991px) {
          .opp-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* ── Final CTA ── */}
      <section
        style={{
          padding: '80px 20px',
          textAlign: 'center',
          background: '#000',
          borderTop: '1px solid #1a1a1a',
        }}
      >
        <p
          style={{
            fontFamily: "'Roboto Condensed', sans-serif",
            fontSize: 11,
            color: '#e51d26',
            textTransform: 'uppercase',
            letterSpacing: '3px',
            marginTop: 0,
            marginBottom: 16,
          }}
        >
          Ready to join the team?
        </p>

        <h2
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 36,
            fontWeight: 400,
            color: '#f2f4f7',
            marginBottom: 16,
            marginTop: 0,
            lineHeight: 1.2,
          }}
        >
          Your Next Role in TV Starts Here.
        </h2>

        <p
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 14,
            color: '#a5a7ad',
            lineHeight: 1.7,
            marginBottom: 36,
            marginTop: 0,
            maxWidth: 560,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Head over to Assignment Desk, build your free profile, and get in front of every MYE production looking for talent like yours. Gigs, staff roles, and everything in between — all in one place, built for the production community.
        </p>

        <a
          href="https://www.assignmentdesk.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            background: '#e51d26',
            color: '#fff',
            fontFamily: "'Roboto Condensed', sans-serif",
            fontSize: 15,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '2px',
            textDecoration: 'none',
            padding: '16px 40px',
          }}
        >
          Get Started on Assignment Desk &nbsp;&#10095;
        </a>
      </section>

    </div>
  );
}
