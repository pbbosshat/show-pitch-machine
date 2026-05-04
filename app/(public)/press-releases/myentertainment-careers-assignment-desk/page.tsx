// Press release: MyEntertainment Careers & Assignment Desk partnership announcement.
// Follows the same pattern as film-commission-crew-directories/page.tsx.

import type { Metadata } from 'next';
import Link from 'next/link';

const OG_IMAGE = 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/67c9c4bc80ecce7a341a501c_MYE%20Banner%20.png';

export const metadata: Metadata = {
  title: 'Working at MyEntertainment Is a Blast — All Hiring Through Assignment Desk | Press Release',
  description: 'MyEntertainment announces that all production staffing and hiring is handled exclusively through Assignment Desk. Sign up for gigs and full-time jobs in the production community.',
  alternates: { canonical: 'https://www.myentertainment.tv/press-releases/myentertainment-careers-assignment-desk' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Working at MyEntertainment Is a Blast — All Hiring Through Assignment Desk',
    description: 'MYE is one of the most exciting production companies in non-fiction TV. All staffing runs through Assignment Desk — sign up for gigs or find a full-time role in the production community.',
    url: 'https://www.myentertainment.tv/press-releases/myentertainment-careers-assignment-desk',
    siteName: 'MyEntertainment',
    type: 'article',
    images: [{ url: OG_IMAGE, width: 1887, alt: 'MyEntertainment Careers — Assignment Desk' }],
  },
};

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'NewsArticle',
  headline: 'Working at MyEntertainment Is a Blast — All Hiring Through Assignment Desk',
  description: 'MyEntertainment announces that all production staffing and hiring is handled exclusively through Assignment Desk.',
  datePublished: '2026-05-03',
  publisher: {
    '@type': 'Organization',
    name: 'MyEntertainment',
    url: 'https://www.myentertainment.tv',
  },
};

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

const strong: React.CSSProperties = { color: '#f2f4f7' };

export default function CareersAssignmentDeskPressRelease() {
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
            Careers &nbsp;·&nbsp; May 2026
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
            Working at MyEntertainment Is a Total Blast — And You Can Join Us Through Assignment Desk
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
            MyEntertainment — the award-winning non-fiction production company behind Ghost Adventures, Legacy List, and thousands of hours of network television — announces that all staffing and hiring is now powered exclusively by Assignment Desk. Whether you&apos;re chasing your next gig or a permanent seat on a world-class production team, here&apos;s everything you need to know.
          </p>
        </div>
      </section>

      {/* ── Article body ── */}
      <section style={{ background: '#000', padding: '60px 20px 80px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>

          <h2 style={h2}>Twenty-Five Years of Making Television That Matters</h2>
          <p style={body}>
            MyEntertainment has been producing undeniable non-fiction content since 2000. In that time, we&apos;ve delivered thousands of hours of programming for virtually every major network on the planet — <strong style={strong}>Discovery+, A&amp;E, Max, National Geographic, BBC, PBS, Lifetime, TruTV, Food Network, Animal Planet, Nickelodeon, Comedy Central, MTV, Travel Channel, ID, Oxygen, Reelz, CMT</strong> — and the slate keeps growing.
          </p>
          <p style={body}>
            The titles speak for themselves: <strong style={strong}>Ghost Adventures</strong> — the number one paranormal show in television history. <strong style={strong}>Legacy List. Destination Fear. Baggage Battles. Breaking Borders. Pros vs. Joes. Billy Buys Brooklyn. Sin City Justice. Manson Bloodlines.</strong> Series that connected with audiences, delivered ratings, and put crews to work year after year.
          </p>
          <p style={body}>
            We&apos;ve built that track record from our offices in <strong style={strong}>New York, Toronto, and London</strong>, co-producing series across the globe and maintaining strong working relationships with more than 40 producers in 15 countries. The international co-production business keeps our development pipeline rich and our crews constantly active.
          </p>

          <h2 style={h2}>What It&apos;s Actually Like Here</h2>
          <p style={body}>
            Let&apos;s be direct: working at MyEntertainment is genuinely exciting. This is not a place where ideas get buried in committee or talent gets treated like a replaceable variable. Our culture runs on <strong style={strong}>compelling characters, great storytelling, and the relentless pursuit of high production value</strong> — and those aren&apos;t marketing words, they&apos;re the actual filter on every decision we make from development pitch to delivery.
          </p>
          <p style={body}>
            Our team has worked alongside <strong style={strong}>LeBron James and Maverick Carter&apos;s SpringHill Company, Mark Wahlberg&apos;s Unrealistic Ideas, Al Roker&apos;s ARE, and Michael Sugar&apos;s Sugar23</strong>. That caliber of partnership creates an energy inside the company that pushes everyone to bring their best every single day. Producers collaborate across offices. APs sit in on development calls. The CEO knows your name. No one is a cog here.
          </p>
          <p style={body}>
            We move fast. We trust our instincts. We back our people. If you&apos;re serious about your craft — whether that&apos;s as an editor, a story producer, a field cam op, or a development executive — this is the kind of company where that seriousness compounds into a career.
          </p>

          <h2 style={h2}>All Staffing Runs Through Assignment Desk</h2>
          <p style={body}>
            MyEntertainment has chosen to handle all of its hiring and crew staffing exclusively through{' '}
            <a href="https://www.assignmentdesk.com" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              Assignment Desk
            </a>
            {' '}— the production community&apos;s dedicated platform for gigs and full-time production jobs. This is where every MYE opening is posted and where our team goes when we&apos;re building a crew.
          </p>
          <p style={body}>
            The reason is simple: Assignment Desk was built for this industry. It understands the difference between a freelance day-rate gig and a staff position. It knows what a story producer&apos;s credit history looks like versus a camera operator&apos;s. It speaks production — and that makes the matching faster and cleaner for everyone involved.
          </p>
          <p style={body}>
            If you want to work with MYE, Assignment Desk is where it starts. Full stop.
          </p>

          <h2 style={h2}>What Types of Opportunities Are Available</h2>
          <p style={body}>
            MYE is an active production company with a deep slate spanning development, production, post, and international co-production. At any given time, we&apos;re looking for people across the full production ecosystem:
          </p>

          <div
            style={{
              background: '#0a0a0a',
              border: '1px solid #1e1e1e',
              padding: '28px 32px',
              marginBottom: 32,
            }}
          >
            {[
              ['Production Gigs', 'Camera operators, APs, PAs, story producers, loggers, field producers, sound mixers — short-term freelance across all active productions'],
              ['Development', 'Story researchers, development producers, sizzle writers, pitch deck creators, format researchers shaping the next greenlight'],
              ['Post Production', 'Episodic and documentary editors, assistant editors, colorists, motion graphics artists, audio mixers, post supervisors'],
              ['International', 'Local fixers, production coordinators, casting leads, international series producers across our 15-country co-production network'],
              ['Full-Time Staff', 'Permanent roles in production, development, business affairs, finance, and operations across New York, Toronto, and London'],
              ['Talent & Casting', 'On-camera hosts, voiceover artists, casting researchers, and on-screen talent for series in development and active production'],
            ].map(([category, detail]) => (
              <div
                key={category}
                style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'flex-start' }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    background: '#e51d26',
                    borderRadius: '50%',
                    flexShrink: 0,
                    marginTop: 7,
                  }}
                />
                <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 13, color: '#a5a7ad', margin: 0, lineHeight: 1.5 }}>
                  <strong style={strong}>{category}:</strong> {detail}
                </p>
              </div>
            ))}
          </div>

          <h2 style={h2}>How to Sign Up on Assignment Desk</h2>
          <p style={body}>
            Creating your Assignment Desk profile takes about five minutes and is completely free for talent and crew. Here&apos;s the process:
          </p>

          {[
            ['Create Your Account', 'Go to assignmentdesk.com and sign up. No fee, no catch — just your industry profile.'],
            ['Build Your Profile', 'Add your credits, skills, department, rate, reel link, and the types of work you\'re open to — gigs, staff, or both.'],
            ['Browse MYE Postings', 'Search for MyEntertainment to see active gigs and full-time openings. Apply directly through the platform.'],
            ['Get Discovered', 'Our production team actively scouts profiles on Assignment Desk when staffing. A strong, complete profile means we may reach out to you before you even apply.'],
            ['Stay Connected', 'Assignment Desk keeps you visible to the broader production community — not just MYE. Multiple companies, multiple productions, all in one place.'],
          ].map(([step, detail], i) => (
            <div
              key={step}
              style={{ display: 'flex', gap: 20, marginBottom: 28, alignItems: 'flex-start' }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  background: '#e51d26',
                  color: '#fff',
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div>
                <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 14, fontWeight: 600, color: '#f2f4f7', margin: '4px 0 6px 0' }}>
                  {step}
                </p>
                <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 13, color: '#a5a7ad', lineHeight: 1.6, margin: 0 }}>
                  {detail}
                </p>
              </div>
            </div>
          ))}

          <h2 style={h2}>The Bottom Line</h2>
          <p style={body}>
            MyEntertainment is one of the most exciting production companies in non-fiction television — with the track record, the international reach, the A-list partnerships, and the creative culture to prove it. We have a full slate in development and production, and we&apos;re always looking for talented people who want to build something great.
          </p>
          <p style={body}>
            If that&apos;s you — get on Assignment Desk. Build your free profile. Browse our postings. Let us find you. The work is worth it.
          </p>

          {/* CTA cards */}
          <div style={{ margin: '40px 0 0', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ padding: '32px', border: '1px solid #1c1c1c', background: '#0a0a0a' }}>
              <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 11, color: '#e51d26', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>
                Find a Gig or Job
              </p>
              <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 18, fontWeight: 700, color: '#f2f4f7', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
                Assignment Desk
              </p>
              <p style={{ ...body, margin: '0 0 20px' }}>
                The production community&apos;s hiring platform. Sign up free — gigs, staff positions, and the full MYE roster of open roles, all in one place.
              </p>
              <a
                href="https://www.assignmentdesk.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 13, fontWeight: 500, color: '#e02027', textTransform: 'uppercase', textDecoration: 'none', letterSpacing: '0.05em' }}
              >
                SIGN UP ON ASSIGNMENT DESK &#10095;
              </a>
            </div>
            <div style={{ padding: '32px', border: '1px solid #1c1c1c', background: '#0a0a0a' }}>
              <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 11, color: '#e51d26', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>
                Learn More
              </p>
              <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 18, fontWeight: 700, color: '#f2f4f7', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 12px' }}>
                MYE Careers Page
              </p>
              <p style={{ ...body, margin: '0 0 20px' }}>
                Read about the culture, the opportunity types, and why MyEntertainment is one of the best places to build a career in non-fiction TV.
              </p>
              <Link
                href="/careers"
                style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 13, fontWeight: 500, color: '#e02027', textTransform: 'uppercase', textDecoration: 'none', letterSpacing: '0.05em' }}
              >
                VIEW CAREERS PAGE &#10095;
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ── Back link ── */}
      <section style={{ background: '#000', padding: '0 20px 60px', borderTop: '1px solid #1a1a1a' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', paddingTop: 40 }}>
          <Link
            href="/press-releases"
            style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 12, fontWeight: 500, color: '#636570', textTransform: 'uppercase', textDecoration: 'none', letterSpacing: '0.05em' }}
          >
            &#8592; &nbsp;All Press Releases
          </Link>
        </div>
      </section>

    </div>
  );
}
