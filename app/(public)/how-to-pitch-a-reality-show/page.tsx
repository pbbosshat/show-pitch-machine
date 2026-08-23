import type { Metadata } from 'next';
import Script from 'next/script';

// Pillar page targeting "how to pitch a reality show" — 1.5k/mo search volume.
// Covers what networks want, pitch deck structure, and finding a distribution partner.
// Designed to capture mid-funnel buyers and route them to /work-with-us and /contact.

export const metadata: Metadata = {
  title: { absolute: 'How to Pitch a Reality Show (2026 Complete Guide)' },
  description:
    'Step-by-step guide to pitching a reality show to networks and streamers in 2026. What networks want, pitch deck structure, finding a distribution partner.',
  alternates: {
    canonical: 'https://www.myentertainment.tv/how-to-pitch-a-reality-show',
  },
  openGraph: {
    title: 'How to Pitch a Reality Show (2026 Complete Guide)',
    description:
      'Step-by-step guide to pitching a reality show to networks and streamers in 2026. What networks want, pitch deck structure, finding a distribution partner.',
    url: 'https://www.myentertainment.tv/how-to-pitch-a-reality-show',
    siteName: 'MY Entertainment',
    type: 'article',
  },
};

// HowTo JSON-LD schema — increases eligibility for rich results in Google Search.
const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Pitch a Reality Show',
  description:
    'A step-by-step guide to pitching a reality show concept to networks, cable channels, and streamers.',
  step: [
    {
      '@type': 'HowToStep',
      name: 'Identify your format and target network',
      text: 'Define whether your show is competition, docuseries, or lifestyle. Match the format to the network that buys it.',
    },
    {
      '@type': 'HowToStep',
      name: 'Build a pitch deck',
      text: 'Create an 8-12 slide deck covering concept, format, talent, comparable shows, and why it works now.',
    },
    {
      '@type': 'HowToStep',
      name: 'Produce a sizzle reel',
      text: 'Shoot a 2-3 minute sizzle reel that shows the tone, talent chemistry, and visual world of the show.',
    },
    {
      '@type': 'HowToStep',
      name: 'Find a distribution partner or attach a producer',
      text: 'Partner with a distributor or established production company that has existing network relationships.',
    },
    {
      '@type': 'HowToStep',
      name: 'Submit and follow up',
      text: 'Submit through the production company or directly to development executives. Follow up once after 4-6 weeks.',
    },
  ],
};

// Site design tokens
const BG    = '#000000';
const TEXT  = '#a5a7ad';
const WHITE = '#ffffff';
const RED   = '#e51d26';
const PANEL = '#111111';

export default function HowToPitchARealityShowPage() {
  return (
    <>
      <Script
        id="howto-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />

      <main style={{ background: BG, color: TEXT, fontFamily: "'Roboto', 'Helvetica Neue', sans-serif", lineHeight: 1.75 }}>

        {/* HERO */}
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '80px 24px 48px' }}>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700,
            fontSize: 11, color: RED, letterSpacing: '0.22em',
            textTransform: 'uppercase', margin: '0 0 20px',
          }}>
            MY Entertainment / Pitch Guide
          </p>
          <h1 style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 'clamp(32px, 5vw, 56px)', textTransform: 'uppercase',
            lineHeight: 1.05, color: RED, margin: '0 0 24px',
          }}>
            How to Pitch a Reality Show
          </h1>
          <p style={{ fontSize: 18, color: WHITE, maxWidth: 680, margin: '0 0 12px', lineHeight: 1.65 }}>
            Reality television is still the most accessible genre for independent creators to sell to networks.
            But most pitches fail before they reach a buyer. This guide covers what development executives
            actually look for, what to put in your deck, and how to get your show in front of the right people.
          </p>
          <p style={{ fontSize: 14, color: TEXT }}>
            Updated August 2026 — MY Entertainment has sold 40+ shows to Discovery, A&amp;E, PBS, and 28 other networks.
          </p>
        </section>

        {/* SECTION 1 */}
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px 56px' }}>
          <h2 style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 28, textTransform: 'uppercase', color: WHITE, margin: '0 0 20px',
            borderBottom: `1px solid #222`, paddingBottom: 12,
          }}>
            1. What Networks Want in a Reality Pitch
          </h2>
          <p>
            Every network development executive is solving the same problem: they need shows that attract
            a specific audience, deliver strong ratings, and can sustain multiple seasons without ballooning
            in production cost. Your pitch needs to answer all three before they ask.
          </p>
          <p>
            The single biggest mistake independent creators make is pitching a concept without a clear
            audience. "General audiences" is not an audience. Know exactly who watches your show, what
            other shows they watch, and why your show belongs on the same schedule.
          </p>

          <h3 style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700,
            fontSize: 18, color: WHITE, textTransform: 'uppercase', letterSpacing: '0.08em',
            margin: '32px 0 12px',
          }}>
            Format clarity
          </h3>
          <p>
            Reality television covers a wide range of formats: competition, docuseries, lifestyle and
            makeover, social experiment, true crime, and travel. Buyers think in formats, not just concepts.
            Before you write a word of your pitch, define your format precisely. Is it elimination-based?
            Is there a host? How many episodes per season? What is the production footprint?
          </p>

          <h3 style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700,
            fontSize: 18, color: WHITE, textTransform: 'uppercase', letterSpacing: '0.08em',
            margin: '32px 0 12px',
          }}>
            Comparable shows
          </h3>
          <p>
            Comps are not admissions that your show is derivative. They are the fastest way to communicate
            tone, budget, and audience to a buyer who reads 200 pitches a year. Pick two shows that your
            concept resembles and one that it does not resemble but shares an audience with. That third
            comp is often where the most interesting conversation happens.
          </p>

          <h3 style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700,
            fontSize: 18, color: WHITE, textTransform: 'uppercase', letterSpacing: '0.08em',
            margin: '32px 0 12px',
          }}>
            The "why now" argument
          </h3>
          <p>
            Networks greenlight shows that feel timely. Your pitch should have one paragraph that explains
            why this show needs to exist in 2026 and not 2019. A cultural moment, a regulatory change, a
            trend that has hit mainstream awareness but has not yet been documented on television — any of
            these can power a convincing "why now."
          </p>
        </section>

        {/* SECTION 2 */}
        <section style={{ background: PANEL, padding: '56px 24px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <h2 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 28, textTransform: 'uppercase', color: WHITE, margin: '0 0 20px',
              borderBottom: `1px solid #333`, paddingBottom: 12,
            }}>
              2. What to Include in a Reality Show Pitch Deck
            </h2>
            <p>
              A reality pitch deck is typically 8 to 12 slides. Buyers read them fast, often on a phone
              between meetings. Every slide needs to earn its place. Here is the structure that works:
            </p>

            {[
              { num: '01', title: 'Logline and Title', body: 'One sentence that says what the show is, who it follows, and what is at stake. The title should be memorable and searchable. Avoid clever puns — they read as amateurish to buyers.' },
              { num: '02', title: 'The Concept', body: 'Two to four paragraphs expanding the logline. Cover the premise, the world the show lives in, and what makes it compelling on a weekly basis. Do not bury the hook.' },
              { num: '03', title: 'Format Details', body: 'Episode count, runtime, structure (elimination vs. docuseries vs. hybrid), host or no host, recurring locations, and any notable production requirements. Be specific — vague format slides signal an underdeveloped concept.' },
              { num: '04', title: 'Talent or Cast', body: 'If you have talent attached, show them here with a photo and one sentence on why they are right for this show. If you do not have talent yet, describe the casting profile precisely.' },
              { num: '05', title: 'Comparable Shows', body: 'Three shows: two close comps and one tonal reference. Include network, premiere year, and a brief note on what each comp shares with your concept. Keep this slide to bullet points.' },
              { num: '06', title: 'Episode or Season Arc', body: 'For docuseries: a brief description of two or three episodes that illustrate the variety and depth available. For competition: a season arc showing how conflict escalates toward the finale.' },
              { num: '07', title: 'Target Audience', body: 'Demographics (age, gender skew, HHI if relevant), psychographics, and the shows this audience already watches. The more specific you are, the more credible you look.' },
              { num: '08', title: 'The Ask', body: 'What you are looking for: a development deal, a co-production partnership, or a straight pickup. Be direct. Buyers respect clarity about what you need from them.' },
            ].map(({ num, title, body }) => (
              <div key={num} style={{
                display: 'flex', gap: 24, marginBottom: 28,
                borderLeft: `2px solid ${RED}`, paddingLeft: 20,
              }}>
                <div style={{
                  fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
                  fontSize: 13, color: RED, minWidth: 28, paddingTop: 3,
                }}>{num}</div>
                <div>
                  <p style={{ fontWeight: 700, color: WHITE, margin: '0 0 6px', fontSize: 15 }}>{title}</p>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>{body}</p>
                </div>
              </div>
            ))}

            <p style={{ marginTop: 32 }}>
              Need a template? MY Entertainment publishes a{' '}
              <a href="/tv-show-pitch-deck" style={{ color: RED, textDecoration: 'none' }}>
                free 8-slide TV pitch deck template
              </a>{' '}
              used by creators who have sold shows to Discovery, A&amp;E, and PBS. Download it before
              you build your deck.
            </p>
          </div>
        </section>

        {/* SECTION 3 */}
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '56px 24px' }}>
          <h2 style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 28, textTransform: 'uppercase', color: WHITE, margin: '0 0 20px',
            borderBottom: `1px solid #222`, paddingBottom: 12,
          }}>
            3. The Sizzle Reel: Your Most Important Asset
          </h2>
          <p>
            A pitch deck gets you a meeting. A{' '}
            <a href="/sizzle-reel" style={{ color: RED, textDecoration: 'none' }}>sizzle reel</a>{' '}
            gets you a deal. For reality television, the sizzle reel is often more important than the deck
            because it proves you can execute — that the tone translates to camera, that the talent is
            compelling on screen, and that the production can deliver broadcast-quality content.
          </p>
          <p>
            A good reality sizzle reel is 2 to 3 minutes and structured like a trailer: a strong open
            that establishes the world and the stakes, a middle that shows character chemistry and conflict,
            and a close that leaves the buyer wanting more. It does not need to be a full episode. It needs
            to feel like a show that already exists.
          </p>
          <p>
            Budget considerations: a sizzle reel can be produced for as little as $5,000 or as much as
            $200,000. The ceiling is set by the format. A docuseries about backyard inventors can shoot
            cheaply. A competition show with elaborate set pieces cannot. Know your format's production
            requirements before you set your sizzle budget.
          </p>
        </section>

        {/* SECTION 4 */}
        <section style={{ background: PANEL, padding: '56px 24px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <h2 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 28, textTransform: 'uppercase', color: WHITE, margin: '0 0 20px',
              borderBottom: `1px solid #333`, paddingBottom: 12,
            }}>
              4. How to Find a Distribution Partner
            </h2>
            <p>
              Most networks will not accept unsolicited pitches from individual creators. They buy from
              production companies and distributors with established relationships and the infrastructure
              to deliver a finished show. If you do not have those relationships, you need a partner who does.
            </p>

            <h3 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700,
              fontSize: 18, color: WHITE, textTransform: 'uppercase', letterSpacing: '0.08em',
              margin: '32px 0 12px',
            }}>
              What a distribution partner brings
            </h3>
            <p>
              A distribution company with active network relationships can: present your concept in a pitch
              meeting with a buyer they talk to regularly, attach their name to the project to give it
              credibility, handle deal negotiations, manage delivery requirements, and collect and remit
              licensing fees. In exchange, they take a distribution fee (typically 15 to 25 percent of
              licensing revenue) and sometimes a co-production credit.
            </p>

            <h3 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700,
              fontSize: 18, color: WHITE, textTransform: 'uppercase', letterSpacing: '0.08em',
              margin: '32px 0 12px',
            }}>
              What to look for in a partner
            </h3>
            <p>
              Evaluate a potential distribution partner on three criteria: network relationships (which
              buyers do they actually have meetings with, not just on their website roster), genre fit
              (a company that sells adventure and travel shows is not the right home for a celebrity
              relationship docuseries), and deal transparency (are the terms clear, are there examples
              of deals they have closed in your format?).
            </p>

            <h3 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700,
              fontSize: 18, color: WHITE, textTransform: 'uppercase', letterSpacing: '0.08em',
              margin: '32px 0 12px',
            }}>
              Working with MY Entertainment
            </h3>
            <p>
              MY Entertainment is an independent production and distribution company with 25 years of
              active network relationships across Discovery, A&amp;E, PBS, National Geographic, and 28 other
              networks. We work with external creators on a project-by-project basis for shows that fit our
              buyers.{' '}
              <a href="/work-with-us" style={{ color: RED, textDecoration: 'none' }}>Learn how to work with us</a>{' '}
              or{' '}
              <a href="/contact" style={{ color: RED, textDecoration: 'none' }}>contact us directly</a>{' '}
              to discuss your concept.
            </p>
          </div>
        </section>

        {/* SECTION 5 */}
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '56px 24px' }}>
          <h2 style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 28, textTransform: 'uppercase', color: WHITE, margin: '0 0 20px',
            borderBottom: `1px solid #222`, paddingBottom: 12,
          }}>
            5. Common Mistakes That Kill Reality Pitches
          </h2>
          <p>
            After decades of development meetings, the same mistakes appear across pitches that fail. Avoid these:
          </p>
          <ul style={{ paddingLeft: 20, margin: '0 0 24px' }}>
            <li style={{ marginBottom: 12 }}>
              <strong style={{ color: WHITE }}>Pitching the wrong network.</strong> Sending a paranormal docuseries
              to a lifestyle network is not a near miss — it is a signal that you have not done the work.
              Research who greenlit shows in your genre in the past three years and pitch to those buyers.
            </li>
            <li style={{ marginBottom: 12 }}>
              <strong style={{ color: WHITE }}>No existing materials.</strong> A pitch without a sizzle reel
              or a pitch deck is a conversation, not a submission. Come prepared with both before you contact
              a network or production company.
            </li>
            <li style={{ marginBottom: 12 }}>
              <strong style={{ color: WHITE }}>Overselling the audience.</strong> Claiming your show will appeal
              to 18-to-49-year-olds in all markets is not a sales argument. Networks are buying specific
              audiences for specific dayparts. Know which one your show fits.
            </li>
            <li style={{ marginBottom: 12 }}>
              <strong style={{ color: WHITE }}>Underestimating production cost.</strong> A budget estimate that
              does not account for insurance, permits, post-production, and delivery requirements signals
              inexperience. If you are not a producer, partner with one before you estimate cost.
            </li>
            <li style={{ marginBottom: 12 }}>
              <strong style={{ color: WHITE }}>Following up too aggressively.</strong> One follow-up email after
              four to six weeks is appropriate. Repeated calls or emails to a development executive will
              close the door permanently.
            </li>
          </ul>
        </section>

        {/* FAQ */}
        <section style={{ background: PANEL, padding: '56px 24px' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <h2 style={{
              fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
              fontSize: 28, textTransform: 'uppercase', color: WHITE, margin: '0 0 32px',
              borderBottom: `1px solid #333`, paddingBottom: 12,
            }}>
              Frequently Asked Questions
            </h2>

            {[
              {
                q: 'Do I need an agent to pitch a reality show?',
                a: 'Not necessarily. Many successful reality shows have been sold by independent producers working directly through a distribution company or production partner. An agent helps if you already have a track record — if you are pitching your first show, a strong distribution partner is more valuable than representation.',
              },
              {
                q: 'How long does it take to sell a reality show?',
                a: 'Development cycles vary by network. Cable channels typically move faster than broadcast networks — a development deal can close in 60 to 90 days, though greenlight to air can take 12 to 18 months after that. Streamers operate on different timelines depending on their release strategy. Plan for a 12-to-24-month process from first pitch to premiere.',
              },
              {
                q: 'Can I pitch a reality show without a sizzle reel?',
                a: 'You can get a meeting without one in some cases, particularly if you have existing credits or strong talent attached. But a sizzle reel dramatically increases your close rate. For first-time creators with no credits, it is essentially required. A 2-to-3 minute reel shot on modest production budget is more persuasive than a 20-page deck without footage.',
              },
            ].map(({ q, a }) => (
              <div key={q} style={{ marginBottom: 32, borderLeft: `2px solid #333`, paddingLeft: 20 }}>
                <p style={{ fontWeight: 700, color: WHITE, margin: '0 0 8px', fontSize: 16 }}>{q}</p>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75 }}>{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '72px 24px 96px', textAlign: 'center' }}>
          <p style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 11, color: RED, letterSpacing: '0.22em',
            textTransform: 'uppercase', marginBottom: 16,
          }}>MY Entertainment</p>
          <h2 style={{
            fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900,
            fontSize: 32, textTransform: 'uppercase', color: WHITE, margin: '0 0 16px',
          }}>
            Ready to pitch your show?
          </h2>
          <p style={{ fontSize: 16, maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.7 }}>
            MY Entertainment has active relationships with every major buyer in non-scripted television.
            If your show is ready for a development conversation, we want to hear it.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="/work-with-us"
              style={{
                display: 'inline-block', padding: '14px 32px',
                background: RED, color: WHITE, borderRadius: 3,
                fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700,
                fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.1em',
                textDecoration: 'none',
              }}
            >
              Work With Us
            </a>
            <a
              href="/tv-show-pitch-deck"
              style={{
                display: 'inline-block', padding: '14px 32px',
                background: 'transparent', color: WHITE, borderRadius: 3,
                fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700,
                fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.1em',
                textDecoration: 'none', border: '1px solid #444',
              }}
            >
              Free Pitch Deck Template
            </a>
          </div>
        </section>

      </main>
    </>
  );
}
