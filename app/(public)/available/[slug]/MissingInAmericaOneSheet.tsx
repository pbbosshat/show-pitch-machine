'use client';

import { useState } from 'react';
import type { SafeTitle } from './page';

function vimeoEmbedUrl(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)(?:\/([a-f0-9]+))?/);
  if (!m) return null;
  return `https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}&autoplay=0` : '?autoplay=0'}`;
}

const AMBER  = '#F5C400';   // amber alert yellow — headlines, stats
const RED    = '#CC0000';   // urgency/crime — accents, CTA
const WHITE  = '#FFFFFF';   // body text
const BLACK  = '#050505';   // page background
const DARK   = '#0d0d0d';   // alternate section background
const PANEL  = '#111111';   // card background

const inputStyle: React.CSSProperties = {
  background: '#0e0e0e', border: '1px solid #2a2a2a', color: '#fff',
  borderRadius: 6, padding: '10px 14px', width: '100%',
  fontSize: 14, fontFamily: "'Roboto', sans-serif", boxSizing: 'border-box',
};

// Police tape diagonal divider
function TapeDivider() {
  return (
    <div style={{
      height: 20,
      background: `repeating-linear-gradient(-45deg, ${AMBER}, ${AMBER} 16px, #111 16px, #111 32px)`,
      width: '100%',
    }} />
  );
}

function SectionLabel({ children, color = AMBER }: { children: React.ReactNode; color?: string }) {
  return (
    <p style={{
      fontFamily: "'Roboto Condensed', sans-serif",
      fontSize: 11, fontWeight: 700, letterSpacing: '0.3em',
      textTransform: 'uppercase', color, margin: '0 0 16px',
    }}>
      {children}
    </p>
  );
}

const FORMAT_STEPS = [
  {
    num: '01',
    title: 'Meet the Family',
    desc: "We meet the people whose lives were permanently changed — parents, siblings, spouses, and children still waiting for answers. Their story, in their words.",
  },
  {
    num: '02',
    title: 'Retrace the Case',
    desc: "Hartmann retraces the moment their loved one went missing, the early investigation, and the years that followed. What was tried. What was missed. What never made sense.",
  },
  {
    num: '03',
    title: 'Activate the Present',
    desc: "New detectives. Reopened files. DNA submissions. Age-progressed images. Modern investigative tools reveal what couldn't be seen before. The investigation as it stands right now.",
  },
  {
    num: '04',
    title: 'Call to Action',
    desc: "Each episode ends with urgency: what we know, what we're looking for, and exactly how the public can help. The audience leaves with a live search — not an abstraction.",
  },
];

const ACTION_CHANNELS = [
  {
    label: 'Anonymous Tip Line',
    desc: "A dedicated, staffed call center where viewers can call in tips anonymously and speak to trained professionals who relay the information responsibly to appropriate agencies.",
  },
  {
    label: 'Official Digital Tip Portal',
    desc: "A secure website where viewers can submit tips, photos, locations, and supporting information connected to active cases featured in the series.",
  },
  {
    label: 'Trusted National Partners',
    desc: "Viewers are also directed to established partners including Crime Stoppers and the National Center for Missing & Exploited Children (NCMEC) hotline.",
  },
];

const ACCESS_BULLETS = [
  'Direct relationships with families who have waited decades for answers',
  'Active involvement in reopened investigations',
  'Collaboration with law enforcement and forensic experts',
  'Responsible, ethical handling of unadjudicated cases',
];

const NETWORKS = ['Peacock', 'Max', 'A&E', 'Oxygen', 'ID: Investigation Discovery', 'Hulu', 'Tubi', 'Lifetime', 'WE tv', 'CBS', 'Paramount+', 'Prime Video'];

export default function MissingInAmericaOneSheet({ title }: { title: SafeTitle }) {
  const [unlocked, setUnlocked] = useState(!title.has_password);
  const [password, setPassword] = useState('');
  const [pwError, setPwError]   = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [reqForm, setReqForm]   = useState({ first_name: '', last_name: '', email: '', company: '' });
  const [reqLoading, setReqLoading] = useState(false);
  const [reqSent, setReqSent]   = useState(false);
  const [reqError, setReqError] = useState('');

  const embedUrl = title.vimeo_url ? vimeoEmbedUrl(title.vimeo_url) : null;

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pwLoading) return;
    setPwLoading(true); setPwError('');
    try {
      const res  = await fetch(`/api/available/${title.slug}/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json() as { ok: boolean };
      if (data.ok) setUnlocked(true); else setPwError('Incorrect password');
    } catch { setPwError('Network error — try again.'); }
    finally   { setPwLoading(false); }
  }

  async function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reqLoading) return;
    setReqLoading(true);
    setReqError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reqForm, available_title_id: title.id }),
      });
      if (res.ok) {
        setReqSent(true);
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setReqError(data.error ?? `Error ${res.status} — please try again.`);
      }
    } catch { setReqError('Network error — please try again.'); }
    finally { setReqLoading(false); }
  }

  return (
    <div style={{ background: BLACK, minHeight: '100vh', color: WHITE, fontFamily: "'Roboto', sans-serif" }}>

      {/* ── PASSWORD GATE ─────────────────────────────────────────────── */}
      {!unlocked && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.97)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ maxWidth: 440, width: '100%', background: '#0e0e0e', border: `1px solid ${AMBER}33`, borderRadius: 12, padding: 40 }}>
            <div style={{ marginBottom: 20, textAlign: 'center' }}>
              <span style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 900, fontSize: 22, color: '#e51d26' }}>MY</span>
              <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#fff', marginLeft: 6 }}>Entertainment</span>
            </div>
            <h1 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 28, fontWeight: 900, color: AMBER, textAlign: 'center', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Missing in America
            </h1>
            <p style={{ fontSize: 11, color: '#888', textAlign: 'center', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 28px' }}>
              with Angeline Hartmann
            </p>
            <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 10px' }}>Have Access?</p>
            <form onSubmit={handlePasswordSubmit}>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" style={inputStyle} />
              {pwError && <p style={{ color: RED, fontSize: 13, margin: '6px 0 0' }}>{pwError}</p>}
              <button type="submit" disabled={pwLoading} style={{ background: AMBER, color: BLACK, width: '100%', padding: 10, borderRadius: 6, border: 'none', cursor: 'pointer', marginTop: 8, fontSize: 14, fontWeight: 700, opacity: pwLoading ? 0.7 : 1 }}>
                {pwLoading ? 'Verifying…' : 'Unlock'}
              </button>
            </form>
            <div style={{ borderTop: '1px solid #1a1a1a', margin: '24px 0' }} />
            <p style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 10px' }}>Request Access</p>
            {reqSent ? (
              <p style={{ fontSize: 14, color: WHITE, textAlign: 'center' }}>Request sent! We&apos;ll be in touch.</p>
            ) : (
              <form onSubmit={handleRequestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input type="text" placeholder="First Name" value={reqForm.first_name} onChange={e => setReqForm(f => ({ ...f, first_name: e.target.value }))} required style={inputStyle} />
                <input type="text" placeholder="Last Name" value={reqForm.last_name} onChange={e => setReqForm(f => ({ ...f, last_name: e.target.value }))} required style={inputStyle} />
                <input type="email" placeholder="Email" value={reqForm.email} onChange={e => setReqForm(f => ({ ...f, email: e.target.value }))} required style={inputStyle} />
                <input type="text" placeholder="Company" value={reqForm.company} onChange={e => setReqForm(f => ({ ...f, company: e.target.value }))} style={inputStyle} />
                <button type="submit" disabled={reqLoading} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#888', width: '100%', padding: 10, borderRadius: 6, cursor: 'pointer', fontSize: 14, opacity: reqLoading ? 0.7 : 1 }}>
                  {reqLoading ? 'Sending…' : 'Request Access'}
                </button>
                {reqError && <p style={{ color: '#ef4444', fontSize: 13, margin: '4px 0 0' }}>{reqError}</p>}
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── 1. HERO ───────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <img
            src="/available-thumbs/mia-hero.png"
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block', filter: 'brightness(0.55) saturate(0.8)' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, rgba(5,5,5,0.6) 0%, rgba(5,5,5,0) 20%, rgba(5,5,5,0.5) 60%, rgba(5,5,5,1) 100%)` }} />
        </div>

        {/* MY Entertainment badge */}
        <div style={{ position: 'absolute', top: 32, left: 40, zIndex: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 900, fontSize: 20, color: '#e51d26' }}>MY</span>
          <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#fff' }}>Entertainment</span>
          <span style={{ fontSize: 10, color: '#444', margin: '0 4px' }}>·</span>
          <span style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#555' }}>Presents</span>
        </div>

        {/* Hero content */}
        <div style={{ position: 'relative', zIndex: 2, padding: '0 40px 80px', maxWidth: 960 }}>
          <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: '0.35em', textTransform: 'uppercase', color: AMBER, margin: '0 0 12px' }}>
            From Executive Producer · John Walsh
          </p>
          <h1 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(60px, 9vw, 110px)', textTransform: 'uppercase', lineHeight: 0.88, margin: '0 0 8px', letterSpacing: '-2px', color: WHITE }}>
            MISSING<br />
            <span style={{ color: AMBER }}>IN AMERICA</span>
          </h1>
          <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 18, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#ccc', margin: '0 0 32px', fontWeight: 400 }}>
            with Angeline Hartmann
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {['Active Investigative Series', '60 min', 'All Rights Available'].map(badge => (
              <span key={badge} style={{
                fontFamily: "'Roboto Condensed', sans-serif", fontSize: 11, fontWeight: 700,
                letterSpacing: '0.15em', textTransform: 'uppercase',
                border: `1px solid ${AMBER}88`, color: AMBER,
                padding: '5px 14px', borderRadius: 2,
              }}>{badge}</span>
            ))}
          </div>
          <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 20, fontStyle: 'italic', color: '#bbb', margin: '32px 0 0', maxWidth: 640, lineHeight: 1.4 }}>
            Every episode asks one urgent question:<br />
            <span style={{ color: WHITE, fontWeight: 700, fontStyle: 'normal' }}>Can you help solve this case?</span>
          </p>
        </div>
      </section>

      <TapeDivider />

      {/* ── 2. THE SERIES ─────────────────────────────────────────────── */}
      <section style={{ background: BLACK, padding: '80px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'start' }}>
          <div>
            <SectionLabel>The Series</SectionLabel>
            <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(36px, 5vw, 64px)', textTransform: 'uppercase', lineHeight: 0.92, margin: '0 0 32px', color: WHITE }}>
              Right now in America,<br />
              <span style={{ color: AMBER }}>thousands of<br />people are missing.</span>
            </h2>
            <div style={{ borderLeft: `3px solid ${RED}`, paddingLeft: 20 }}>
              <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 20, fontStyle: 'italic', color: '#ccc', margin: 0, lineHeight: 1.5 }}>
                &ldquo;Sometimes the one person who can solve a case is the person watching at home.&rdquo;
              </p>
            </div>
          </div>
          <div>
            <p style={{ color: '#bbb', lineHeight: 1.7, fontSize: 16, margin: '0 0 20px' }}>
              <strong style={{ color: WHITE }}>Missing in America with Angeline Hartmann</strong> is an active investigative series examining unresolved missing-person cases across America.
            </p>
            <p style={{ color: '#bbb', lineHeight: 1.7, fontSize: 16, margin: '0 0 20px' }}>
              At a time when cases like Nancy Guthrie&apos;s have reignited national conversation around missing persons and institutional blind spots, the series arrives at a cultural turning point: families are speaking out, databases are expanding, and long-silent investigations are finally moving again.
            </p>
            <p style={{ color: '#bbb', lineHeight: 1.7, fontSize: 16, margin: '0 0 20px' }}>
              With consumer DNA databases expanding by the millions, genetic genealogy connecting strangers to long-buried truths, and modern age-progression techniques making the missing visible again — <strong style={{ color: WHITE }}>these cases are no longer frozen in time.</strong>
            </p>
            <p style={{ color: '#bbb', lineHeight: 1.7, fontSize: 16, margin: 0 }}>
              <em>Missing in America</em> transforms cold cases into living investigations, combining journalistic rigor with public participation to help move real searches forward.
            </p>
          </div>
        </div>
      </section>

      <TapeDivider />

      {/* ── 3. STATS BAR ──────────────────────────────────────────────── */}
      <section style={{ background: DARK, padding: '60px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, textAlign: 'center' }}>
          {[
            { num: '600,000+', label: 'Missing persons reports\nfiled annually in the U.S.' },
            { num: '1,200+', label: 'Fugitives captured\nvia America\'s Most Wanted' },
            { num: '450,000+', label: 'Missing children aided\nby NCMEC since 1984' },
            { num: '23 years', label: 'Cold case solved by Hartmann\'s\npodcast audience in 2022' },
          ].map(({ num, label }) => (
            <div key={num}>
              <div style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(32px, 4vw, 52px)', color: AMBER, lineHeight: 1 }}>{num}</div>
              <div style={{ fontSize: 12, color: '#777', marginTop: 10, lineHeight: 1.5, whiteSpace: 'pre-line', letterSpacing: '0.03em' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      <TapeDivider />

      {/* ── 4. THE FORMAT ─────────────────────────────────────────────── */}
      <section style={{ background: BLACK, padding: '80px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionLabel>The Format</SectionLabel>
          <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(32px, 4vw, 52px)', textTransform: 'uppercase', color: WHITE, margin: '0 0 16px' }}>
            In the Spirit of <span style={{ color: AMBER }}>America&apos;s Most Wanted</span><br />for a New Generation
          </h2>
          <p style={{ color: '#888', fontSize: 16, margin: '0 0 52px', maxWidth: 700, lineHeight: 1.6 }}>
            Each episode focuses on active missing-person investigations where the search is ongoing and answers may still be within reach. Led by Angeline Hartmann, every hour follows a structured arc built around the live investigation.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
            {FORMAT_STEPS.map(step => (
              <div key={step.num} style={{ background: PANEL, border: `1px solid #1a1a1a`, borderRadius: 8, padding: 28, display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                <div style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 36, color: AMBER, lineHeight: 1, flexShrink: 0 }}>{step.num}</div>
                <div>
                  <div style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.05em', color: WHITE, marginBottom: 8 }}>{step.title}</div>
                  <div style={{ color: '#999', fontSize: 14, lineHeight: 1.6 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TapeDivider />

      {/* ── 5. WATCHING LEADS TO ACTION ───────────────────────────────── */}
      <section style={{ background: DARK, padding: '80px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionLabel color={RED}>Watching Leads to Action</SectionLabel>
          <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(32px, 4vw, 52px)', textTransform: 'uppercase', color: WHITE, margin: '0 0 12px' }}>
            Missing in America Creates a<br /><span style={{ color: AMBER }}>Real Pathway to Solve Cases</span>
          </h2>
          <p style={{ color: '#888', fontSize: 16, margin: '0 0 48px', maxWidth: 700, lineHeight: 1.6 }}>
            Some people will watch for the story. Others may be watching with the answer. Every credible lead is reviewed and forwarded to the appropriate law enforcement agency, investigator, or organization connected to the case.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {ACTION_CHANNELS.map(ch => (
              <div key={ch.label} style={{ background: PANEL, border: `1px solid ${RED}33`, borderRadius: 8, padding: 28 }}>
                <div style={{ width: 40, height: 3, background: RED, marginBottom: 20 }} />
                <div style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 17, textTransform: 'uppercase', letterSpacing: '0.05em', color: WHITE, marginBottom: 12 }}>{ch.label}</div>
                <div style={{ color: '#999', fontSize: 14, lineHeight: 1.6 }}>{ch.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TapeDivider />

      {/* ── 6. JOHN WALSH ─────────────────────────────────────────────── */}
      <section style={{ background: BLACK, padding: '80px 40px', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '380px 1fr', gap: 60, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <img
              src="/available-thumbs/mia-walsh.png"
              alt="John Walsh"
              style={{ width: '100%', borderRadius: 8, display: 'block', filter: 'brightness(0.9) contrast(1.05)' }}
            />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', background: `linear-gradient(to top, ${BLACK}, transparent)` }} />
          </div>
          <div>
            <SectionLabel>Executive Producer</SectionLabel>
            <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(40px, 5vw, 64px)', textTransform: 'uppercase', lineHeight: 0.92, margin: '0 0 8px', color: WHITE }}>
              John Walsh
            </h2>
            <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', color: AMBER, margin: '0 0 28px' }}>
              National Missing-Person Advocate · Architect of America&apos;s Most Wanted
            </p>
            <p style={{ color: '#bbb', lineHeight: 1.7, fontSize: 16, margin: '0 0 20px' }}>
              For more than four decades, John Walsh has been one of the most influential voices in missing-person advocacy and crime awareness in America. As the creator and longtime host of <em>America&apos;s Most Wanted</em>, Walsh demonstrated that national attention can directly impact investigations.
            </p>
            <p style={{ color: '#bbb', lineHeight: 1.7, fontSize: 16, margin: '0 0 28px' }}>
              His advocacy helped facilitate the capture of more than <strong style={{ color: WHITE }}>1,200 fugitives</strong> and contributed to the recovery of <strong style={{ color: WHITE }}>over 60 children</strong> and 40 adults. Walsh reshaped how media, law enforcement, and the public intersect in unresolved cases.
            </p>
            <p style={{ color: '#bbb', lineHeight: 1.7, fontSize: 16, margin: 0 }}>
              Now, as Executive Producer of <em>Missing in America</em>, Walsh brings that same urgency to a new generation of unresolved disappearances. <strong style={{ color: WHITE }}>He built the model that turned viewers into participants. This series updates it for a world of DNA databases, digital footprints, and real-time investigations.</strong>
            </p>
          </div>
        </div>
      </section>

      <TapeDivider />

      {/* ── 7. ANGELINE HARTMANN ──────────────────────────────────────── */}
      <section style={{ background: DARK, padding: '80px 40px', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 380px', gap: 60, alignItems: 'center' }}>
          <div>
            <SectionLabel>Host &amp; Lead Investigator</SectionLabel>
            <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(40px, 5vw, 64px)', textTransform: 'uppercase', lineHeight: 0.92, margin: '0 0 8px', color: WHITE }}>
              Angeline Hartmann
            </h2>
            <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', color: AMBER, margin: '0 0 28px' }}>
              Award-Winning Journalist · Director of Communications, NCMEC
            </p>
            <p style={{ color: '#bbb', lineHeight: 1.7, fontSize: 16, margin: '0 0 20px' }}>
              Angeline Hartmann is one of the most respected voices in missing-persons investigations — an <strong style={{ color: WHITE }}>award-winning journalist</strong> and the <strong style={{ color: WHITE }}>Director of Communications at the National Center for Missing &amp; Exploited Children (NCMEC)</strong>. She has spent decades earning the confidence of families, investigators, and advocates.
            </p>
            <p style={{ color: '#bbb', lineHeight: 1.7, fontSize: 16, margin: '0 0 20px' }}>
              Her background as a correspondent on <em>America&apos;s Most Wanted</em> and close relationships with law enforcement nationwide give her a rare ability to move between empathy and investigation — honoring families while pushing cases forward.
            </p>
            <p style={{ color: '#bbb', lineHeight: 1.7, fontSize: 16, margin: '0 0 28px' }}>
              Her podcast, <em>Inside Crime</em>, has built a loyal following that doesn&apos;t just follow stories — they participate in them. In 2022, they helped solve the <strong style={{ color: WHITE }}>1999 John Doe case of William DaShawn Hamilton</strong> after more than two decades, proving that storytelling can lead directly to justice.
            </p>
            <div style={{ borderLeft: `3px solid ${AMBER}`, paddingLeft: 20 }}>
              <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 18, fontStyle: 'italic', color: '#ccc', margin: 0, lineHeight: 1.5 }}>
                &ldquo;These stories demand more than a narrator. They require someone families trust.&rdquo;
              </p>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <img
              src="/available-thumbs/mia-hartmann-portrait.png"
              alt="Angeline Hartmann"
              style={{ width: '100%', borderRadius: 8, display: 'block', filter: 'brightness(0.9) contrast(1.05)' }}
            />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: `linear-gradient(to top, ${DARK}, transparent)` }} />
          </div>
        </div>
      </section>

      <TapeDivider />

      {/* ── 8. UNMATCHED ACCESS / NCMEC ───────────────────────────────── */}
      <section style={{ background: BLACK, padding: '80px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'start' }}>
          <div>
            <SectionLabel>Unmatched Access</SectionLabel>
            <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 'clamp(32px, 4vw, 52px)', textTransform: 'uppercase', color: WHITE, margin: '0 0 24px', lineHeight: 0.95 }}>
              Partnered with <span style={{ color: AMBER }}>NCMEC</span><br />from Day One
            </h2>
            <p style={{ color: '#bbb', lineHeight: 1.7, fontSize: 16, margin: '0 0 28px' }}>
              By partnering with the National Center for Missing &amp; Exploited Children and Angeline Hartmann, <em>Missing in America</em> enters production with access that no other series can replicate.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {ACCESS_BULLETS.map(bullet => (
                <li key={bullet} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ color: AMBER, fontWeight: 900, fontSize: 18, lineHeight: 1.2, flexShrink: 0 }}>→</span>
                  <span style={{ color: '#bbb', fontSize: 15, lineHeight: 1.5 }}>{bullet}</span>
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 28, padding: '16px 20px', background: `${RED}11`, border: `1px solid ${RED}44`, borderRadius: 6 }}>
              <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.1em', color: RED, margin: 0 }}>
                This is storytelling with results.
              </p>
            </div>
          </div>
          <div>
            <div style={{ background: PANEL, borderRadius: 8, padding: 32, border: `1px solid #1a1a1a`, marginBottom: 24 }}>
              <img
                src="/available-thumbs/mia-ncmec.png"
                alt="National Center for Missing & Exploited Children"
                style={{ width: '100%', borderRadius: 4, display: 'block', marginBottom: 20, filter: 'brightness(0.85)' }}
              />
              <div style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 42, color: AMBER, lineHeight: 1 }}>450,000+</div>
              <div style={{ color: '#888', fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
                Missing children aided by NCMEC over the past four decades — one of the most trusted resources in missing-person investigations nationwide.
              </div>
            </div>
          </div>
        </div>
      </section>

      <TapeDivider />

      {/* ── 9. SIZZLE REEL ────────────────────────────────────────────── */}
      <section style={{ background: DARK, padding: '80px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionLabel>Sizzle Reel</SectionLabel>
          <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 44, textTransform: 'uppercase', color: WHITE, margin: '0 0 32px' }}>
            Watch the Series Preview
          </h2>
          {embedUrl ? (
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              <iframe
                src={embedUrl}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0, borderRadius: 4 }}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#0a0a0a', border: `2px dashed ${AMBER}33`, borderRadius: 4 }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <span style={{ fontSize: 48, marginBottom: 16 }}>▶</span>
                <p style={{ color: AMBER, fontFamily: "'Roboto Condensed'", fontWeight: 900, fontSize: 24, textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0 }}>
                  Sizzle Available Upon Request
                </p>
                <p style={{ color: '#555', fontSize: 14, margin: '10px 0 0' }}>Contact us for screener access</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <TapeDivider />

      {/* ── 10. COMPANY BIO ───────────────────────────────────────────── */}
      <section style={{ background: BLACK, padding: '80px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <SectionLabel>About the Producer</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                <span style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 900, fontSize: 28, color: '#e51d26' }}>MY</span>
                <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#fff' }}>Entertainment</span>
              </div>
              <p style={{ color: '#bbb', lineHeight: 1.7, fontSize: 16, margin: '0 0 16px' }}>
                MY Entertainment is a premium unscripted production company with a proven track record of delivering impactful, high-stakes documentary content to global broadcasters and streaming platforms.
              </p>
              <p style={{ color: '#bbb', lineHeight: 1.7, fontSize: 16, margin: 0 }}>
                Our portfolio spans true crime, investigative journalism, social impact, and history — with distribution partnerships across major linear networks and streaming platforms worldwide.
              </p>
            </div>
            <div>
              <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#555', margin: '0 0 16px' }}>Distribution Partners &amp; Target Buyers</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {NETWORKS.map(n => (
                  <span key={n} style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', padding: '4px 10px', background: '#111', border: '1px solid #222', borderRadius: 2, color: '#888', textTransform: 'uppercase' }}>{n}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <TapeDivider />

      {/* ── 11. CTA ───────────────────────────────────────────────────── */}
      <section style={{ background: DARK, padding: '80px 40px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 22, fontStyle: 'italic', color: '#bbb', lineHeight: 1.5, margin: '0 0 16px' }}>
            &ldquo;If America once gathered around the television to help catch fugitives —
          </p>
          <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 28, textTransform: 'uppercase', color: AMBER, margin: '0 0 52px', letterSpacing: '0.02em' }}>
            Missing in America asks them to gather again to help bring people home.&rdquo;
          </p>
          <SectionLabel>Inquire Now</SectionLabel>
          <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 44, textTransform: 'uppercase', color: WHITE, margin: '0 0 40px' }}>
            Get in Touch
          </h2>
          <a
            href="mailto:info@myentertainment.tv"
            style={{ display: 'inline-block', background: RED, color: WHITE, padding: '14px 36px', borderRadius: 6, textDecoration: 'none', fontSize: 16, fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}
          >
            Get in Touch
          </a>
          <div style={{ marginTop: 40, borderTop: '1px solid #1a1a1a', paddingTop: 32 }}>
            <p style={{ color: '#555', fontSize: 13, margin: '0 0 4px' }}>Direct inquiries:</p>
            <a href="mailto:info@myentertainment.tv" style={{ color: AMBER, fontSize: 15, textDecoration: 'none', fontFamily: "'Roboto Condensed', sans-serif", letterSpacing: '0.05em' }}>
              info@myentertainment.tv
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer style={{ background: '#000', borderTop: '1px solid #111', padding: '24px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 900, fontSize: 16, color: '#e51d26' }}>MY</span>
          <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#444' }}>Entertainment</span>
        </div>
        <p style={{ color: '#333', fontSize: 11, margin: 0, letterSpacing: '0.05em' }}>
          © {new Date().getFullYear()} MY Entertainment · Confidential
        </p>
      </footer>

    </div>
  );
}
