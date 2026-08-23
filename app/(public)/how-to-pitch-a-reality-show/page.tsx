// ============================================================
// /how-to-pitch-a-reality-show — Pillar Page
// Target keywords:
//   "how to pitch a reality show"  (primary)
//   "reality tv pitch"             (H2)
//   "pitch a reality show idea"    (FAQ)
//   "reality show pitch deck"      (H2 link target)
//
// Server Component — no 'use client'. Inline styles match site tokens.
// ============================================================

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: {
    absolute: 'How to Pitch a Reality Show (2026 Complete Guide)',
  },
  description:
    'Step-by-step guide to pitching a reality show to networks and streamers in 2026. What networks want, pitch deck structure, finding a distribution partner.',
  keywords: [
    'how to pitch a reality show', 'reality tv pitch', 'pitch a reality show idea',
    'reality show pitch deck', 'reality tv pitch deck', 'how to sell a reality show',
    'unscripted tv pitch', 'reality format pitch',
  ],
  alternates: { canonical: 'https://www.myentertainment.tv/how-to-pitch-a-reality-show' },
  openGraph: {
    title: 'How to Pitch a Reality Show (2026 Complete Guide)',
    description:
      'Step-by-step guide to pitching a reality show to networks and streamers in 2026. What networks want, pitch deck structure, finding a distribution partner.',
    url: 'https://www.myentertainment.tv/how-to-pitch-a-reality-show',
    siteName: 'MY Entertainment',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Pitch a Reality Show (2026 Complete Guide)',
    description:
      'Step-by-step guide to pitching a reality show to networks and streamers in 2026. What networks want, pitch deck structure, finding a distribution partner.',
  },
};

const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Pitch a Reality Show',
  description: 'A step-by-step guide to pitching a reality TV show to networks and streaming platforms.',
  step: [
    {
      '@type': 'HowToStep',
      name: 'Develop a clear format',
      text: 'Define the core format: the premise, recurring structure per episode, cast or subject type, and what makes it repeatable.',
    },
    {
      '@type': 'HowToStep',
      name: 'Build your pitch deck',
      text: 'Create a pitch deck covering logline, format, episode breakdown, talent attachments, comparable shows, and visual look and feel.',
    },
    {
      '@type': 'HowToStep',
      name: 'Produce a sizzle reel',
      text: 'Shoot a 2-5 minute sizzle reel that shows the concept in action, establishes tone, and proves the cast is compelling on camera.',
    },
    {
      '@type': 'HowToStep',
      name: 'Find a distribution partner',
      text: 'Approach a distribution company or production partner who has relationships with the networks buying in your genre.',
    },
    {
      '@type': 'HowToStep',
      name: 'Submit and follow up',
      text: 'Submit through proper industry channels and follow up consistently without being aggressive.',
    },
  ],
};

const container: React.CSSProperties = {
  maxWidth: 780,
  margin: '0 auto',
  padding: '0 20px',
};

const bodyText: React.CSSProperties = {
  fontFamily: "'Roboto', sans-serif",
  fontSize: 15,
  color: '#a5a7ad',
  lineHeight: 1.8,
  marginBottom: 20,
  marginTop: 0,
};

const h2Style: React.CSSProperties = {
  fontFamily: "'Roboto', sans-serif",
  fontSize: 26,
  fontWeight: 500,
  color: '#f2f4f7',
  marginTop: 56,
  marginBottom: 16,
};

const h3Style: React.CSSProperties = {
  fontFamily: "'Roboto', sans-serif",
  fontSize: 18,
  fontWeight: 500,
  color: '#f2f4f7',
  marginTop: 32,
  marginBottom: 12,
};

export default function HowToPitchARealityShowPage() {
  return (
    <div style={{ background: '#000', color: '#a5a7ad' }}>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />

      {/* ── Header ── */}
      <section style={{ paddingTop: 100, paddingBottom: 60, paddingLeft: 20, paddingRight: 20, textAlign: 'center', background: '#000' }}>
        <h1
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 48,
            fontWeight: 400,
            color: '#e51d26',
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            marginBottom: 24,
            marginTop: 0,
          }}
        >
          How to Pitch a Reality Show
        </h1>
        <p
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 16,
            color: '#a5a7ad',
            lineHeight: 1.7,
            maxWidth: 660,
            margin: '0 auto',
          }}
        >
          Pitching a reality show is different from pitching scripted television. Networks and streamers
          buy unscripted concepts based on format, repeatable structure, and casting viability, not on
          the strength of a written pilot. This guide covers everything you need to know about
          pitching a reality show in 2026.
        </p>
      </section>

      {/* ── Body ── */}
      <section style={{ background: '#000', paddingBottom: 80, paddingLeft: 20, paddingRight: 20 }}>
        <div style={container}>

          {/* Section 1 */}
          <h2 style={h2Style}>What Makes Reality TV Different to Pitch</h2>
          <p style={bodyText}>
            In scripted television, buyers evaluate your pilot script and series bible. In reality TV,
            they are buying a format: a structure that can repeat across episodes and seasons without
            exhausting its premise. A great reality pitch shows that the engine of the show is
            self-replenishing.
          </p>
          <p style={bodyText}>
            That distinction changes everything about how you build your pitch materials. You need to
            demonstrate that the concept scales, that the casting pool is deep, and that the format
            produces emotion and conflict naturally rather than through scripted drama. If a buyer
            cannot immediately picture ten episodes, you need to refine your format before you pitch.
          </p>
          <p style={bodyText}>
            Reality TV also moves faster than scripted. Development conversations can go from initial
            pitch to a greenlight order in months rather than years, but buyers receive hundreds of
            pitches per year. The ones that move are specific, visual, and easy to explain in two
            sentences.
          </p>

          {/* Section 2 */}
          <h2 style={h2Style}>What Networks Want in a Reality Pitch</h2>
          <p style={bodyText}>
            Every network and streamer has a lane. Discovery buys adventure, science, and survival.
            Bravo buys lifestyle and social competition. A&amp;E buys crime and investigation.
            Lifetime buys relationship and family drama. The first job of any reality pitch is to
            show the buyer that your concept belongs in their lane and competes with what is already
            performing there.
          </p>

          <h3 style={h3Style}>A castable, recurring cast or subject type</h3>
          <p style={bodyText}>
            Buyers need to believe you can fill the show repeatedly. If you have a fixed cast, they
            want to know why these specific people are compelling enough to carry a series. If you
            have a rotating cast format (dating shows, competition shows, intervention shows), they
            need to see that the subject pool is broad enough to sustain multiple seasons.
          </p>

          <h3 style={h3Style}>A clear hook that travels in a sentence</h3>
          <p style={bodyText}>
            The shows that get greenlit can be explained in one sentence that contains a built-in
            tension. "Families swap lives for two weeks" is immediately visual and immediately
            dramatic. "A show about different kinds of people" is not. Sharpen your logline until
            the conflict is self-evident.
          </p>

          <h3 style={h3Style}>Comparable shows that are currently performing</h3>
          <p style={bodyText}>
            Your pitch should name two or three shows that are either on the target network or on a
            competing network in the same genre, and explain why yours is the next evolution of that
            format. Comps give buyers a familiar anchor. They also signal that you understand the
            marketplace.
          </p>

          <h3 style={h3Style}>Evidence of real-world demand</h3>
          <p style={bodyText}>
            If the show is based on a community, a movement, a trend, or a proven digital format,
            include that evidence. A YouTube channel with 500,000 subscribers is proof of concept.
            A viral social moment around your subject is proof of demand. Buyers are risk-averse.
            Anything that reduces their perceived risk increases your chances.
          </p>

          {/* Section 3 */}
          <h2 style={h2Style}>What to Include in a Reality Show Pitch Deck</h2>
          <p style={bodyText}>
            A reality show pitch deck is typically 10 to 20 slides. Every slide should earn its
            place. Here is the standard structure that production companies and networks expect:
          </p>

          <h3 style={h3Style}>1. Logline and one-sentence hook</h3>
          <p style={bodyText}>
            The first slide tells buyers exactly what the show is. One sentence. No jargon. The
            format is: [who] [does what] [with what built-in conflict]. If your logline requires
            a paragraph to explain, the concept needs more work.
          </p>

          <h3 style={h3Style}>2. The format</h3>
          <p style={bodyText}>
            Describe the structure of a single episode. How does each episode begin? What is the
            recurring structure that moves it forward? How does it end? If the show is episodic
            (each episode a self-contained story), describe the recurring engine. If it is serial
            (a story that continues across episodes), explain the season arc.
          </p>

          <h3 style={h3Style}>3. Episode breakdown</h3>
          <p style={bodyText}>
            Pitch five to ten episode ideas that demonstrate the concept works repeatedly. These do
            not need to be final episodes. They need to show the buyer that the format can sustain
            a full season without running out of material. Each episode idea should be one to three
            sentences: the subject, the setup, and the conflict.
          </p>

          <h3 style={h3Style}>4. Talent and casting</h3>
          <p style={bodyText}>
            If you have attached talent, leads, or a specific cast, put them here with photos and
            a brief description of why they are compelling on camera. If the format uses a rotating
            or subject-based cast, describe the casting criteria and the target subject pool.
          </p>

          <h3 style={h3Style}>5. Comparable shows (comps)</h3>
          <p style={bodyText}>
            List two or three shows from the target network or its closest competitor. Be specific:
            name the show, the network, and the performance metric that proves it works. Then explain
            what your show does differently or better.
          </p>

          <h3 style={h3Style}>6. Visual look and feel</h3>
          <p style={bodyText}>
            Reality TV is a visual medium. Include reference images, mood boards, or production
            stills that communicate the visual tone of the show. Buyers want to know whether this
            looks like a high-production-value cable series or a raw, immersive docuseries. The
            visual references help them see the budget range and the audience.
          </p>

          <p style={bodyText}>
            You can{' '}
            <Link href="/tv-show-pitch-deck" style={{ color: '#e51d26', textDecoration: 'none' }}>
              download a free TV show pitch deck template
            </Link>{' '}
            from MY Entertainment, an 8-slide annotated PDF built from 25+ years of pitching
            unscripted concepts to Discovery, A&amp;E, PBS, and 28+ networks.
          </p>

          {/* Section 4 */}
          <h2 style={h2Style}>How to Find a Distribution Partner</h2>
          <p style={bodyText}>
            Most independent creators cannot pitch directly to major networks. Networks buy from
            production companies they have worked with, not from individuals who cold-submit through
            a website. The fastest path to a greenlight is through a distribution or production
            company that already has those relationships.
          </p>

          <h3 style={h3Style}>What a distribution partner does</h3>
          <p style={bodyText}>
            A television distribution company takes your format, attaches their production
            infrastructure and network relationships, and brings the pitch to buyers on your behalf.
            In exchange, they take a distribution fee and often a production credit. The relationship
            is structured differently at every company, but the core value is access: they get your
            concept in front of buyers who would otherwise never see it.
          </p>

          <h3 style={h3Style}>How to approach a distribution company</h3>
          <p style={bodyText}>
            Do your research before you reach out. Every distribution company has a genre focus.
            Approaching a company that specializes in true crime with a cooking competition show
            wastes everyone&apos;s time. Study their catalog, understand their network relationships,
            and explain in your outreach why your show fits their lane.
          </p>
          <p style={bodyText}>
            Your initial outreach should be short: one paragraph on the concept, one paragraph on
            why you are reaching out to this company specifically, and a link to your sizzle reel
            or pitch deck if it is polished enough to share. The goal is a conversation, not a
            full pitch by email.
          </p>
          <p style={bodyText}>
            MY Entertainment is a New York-based unscripted television distribution company with
            25+ years of experience and relationships across Discovery, A&amp;E, PBS, Lifetime,
            Travel Channel, and 28+ other networks. If you have an unscripted concept you believe
            is ready for distribution, you can{' '}
            <Link href="/work-with-us" style={{ color: '#e51d26', textDecoration: 'none' }}>
              learn more about working with us
            </Link>{' '}
            or{' '}
            <Link href="/contact" style={{ color: '#e51d26', textDecoration: 'none' }}>
              contact us directly
            </Link>.
          </p>

          {/* Section 5 */}
          <h2 style={h2Style}>Common Mistakes and How to Avoid Them</h2>

          <h3 style={h3Style}>Pitching a format that only works once</h3>
          <p style={bodyText}>
            Reality shows are ordered in seasons, not episodes. If your concept has a natural end
            point after one season, networks will pass unless the first season is a cultural
            phenomenon. Stress-test your format: can you run it for three seasons without repeating
            the same story? If not, redesign the engine.
          </p>

          <h3 style={h3Style}>Leading with concept instead of conflict</h3>
          <p style={bodyText}>
            "A show about food" is a concept. "Chefs compete to recreate dishes they have never
            tasted, using only memory and technique" is a conflict. Every pitch should lead with
            the conflict that drives the show, not the subject matter that surrounds it.
          </p>

          <h3 style={h3Style}>Skipping the sizzle reel</h3>
          <p style={bodyText}>
            A sizzle reel is not optional for a reality pitch. Buyers need to see that your concept
            translates to camera and that your cast is compelling on screen. A polished 2-3 minute
            sizzle that shows the format in action will move a pitch further than a 30-slide deck
            without one. Read more about{' '}
            <Link href="/sizzle-reel" style={{ color: '#e51d26', textDecoration: 'none' }}>
              what a sizzle reel is and how to make one
            </Link>.
          </p>

          <h3 style={h3Style}>Pitching to the wrong buyers</h3>
          <p style={bodyText}>
            Netflix does not want the same show as the Food Network. Do the work of understanding
            who buys in your genre and what their current programming slate looks like. A pitch
            that says "this could be on Netflix, Hulu, or Peacock" tells the buyer you have not
            done your homework. Specificity is credibility.
          </p>

          {/* FAQ */}
          <h2 style={h2Style}>Frequently Asked Questions</h2>

          {[
            {
              q: 'Do I need a production company to pitch a reality show?',
              a: 'You do not need to own a production company, but you almost certainly need a production or distribution partner to get in front of major network buyers. Most networks have submission policies that only accept pitches from companies they have worked with. The exception is open call programs, which some networks run periodically, but these are competitive and represent a small fraction of what gets made.',
            },
            {
              q: 'How long should a reality show pitch deck be?',
              a: 'Between 10 and 20 slides for a standard pitch deck. If you are pitching in a room, aim for 10 to 12 slides because you want time to talk through each one. If you are submitting a leave-behind, you can go to 15 or 20 slides with more detail. Anything beyond 20 slides suggests the concept is not focused enough.',
            },
            {
              q: 'What is the difference between pitching a reality format and a scripted show?',
              a: 'In scripted television, the pilot script is the primary pitch document. In reality television, the format document and sizzle reel are the primary pitch materials. Scripted pitches sell a specific story. Reality pitches sell a repeatable engine. That distinction means reality pitches need to prove scalability in a way scripted pitches do not.',
            },
          ].map(({ q, a }, idx) => (
            <div key={idx} style={{ marginBottom: 28 }}>
              <h3 style={{ ...h3Style, marginTop: idx === 0 ? 0 : 32 }}>{q}</h3>
              <p style={{ ...bodyText, marginBottom: 0 }}>{a}</p>
            </div>
          ))}

        </div>
      </section>

      {/* ── CTA ── */}
      <section
        style={{
          padding: '80px 20px',
          textAlign: 'center',
          background: '#000',
          borderTop: '1px solid #1a1a1a',
        }}
      >
        <h2
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 32,
            fontWeight: 400,
            color: '#f2f4f7',
            textTransform: 'capitalize',
            marginBottom: 16,
            marginTop: 0,
          }}
        >
          Ready to Pitch Your Reality Show?
        </h2>
        <p
          style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: 14,
            color: '#a5a7ad',
            lineHeight: 1.7,
            marginBottom: 28,
            marginTop: 0,
            maxWidth: 560,
            margin: '0 auto 28px',
          }}
        >
          MY Entertainment has distributed 40+ unscripted titles to Discovery, A&amp;E, PBS, and 28+
          networks over 25 years. If your concept is ready, we want to hear it.
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
          }}
        >
          CONTACT US &#10095;
        </a>
      </section>

    </div>
  );
}
