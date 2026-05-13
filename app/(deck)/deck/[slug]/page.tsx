// Public pitch deck portal — full-screen cinematic microsite for one show pitch.
// This is the buyer-facing product: a Netflix/HBO-style show announcement page
// crossed with a branded pitch presentation. Each deck site gets its own URL at
// /deck/[slug] — share this link with network executives.
//
// Visibility enforcement:
//   public   → anyone can view
//   internal → anyone can view (network-level restriction handled elsewhere)
//   gated    → requires cookie deck-auth-{id} matching gate_password
//
// Data: reads directly from Postgres via query/queryOne (server component — no fetch round-trip).

import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { query, queryOne } from '@/lib/db';

// ---------------------------------------------------------------------------
// Types (mirrors 007_deck_sites.sql schema)
// ---------------------------------------------------------------------------

interface DeckSite {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  logline: string | null;
  canva_url: string | null;
  genre: string | null;
  format: string | null;
  ep_count: string | null;
  network_target: string | null;
  ep_name: string | null;
  status: string;
  visibility: string;
  gate_password: string | null;
  slide_count: number;
  created_at: number;
  updated_at: number;
}

interface DeckSlide {
  id: string;
  deck_site_id: string;
  slide_order: number;
  slide_image_path: string | null;
  ai_image_path: string | null;
  ai_prompt: string | null;
  section_label: string | null;
  section_type: string;
  heading: string | null;
  body: string | null;
  stats_json: string | null;
  created_at: number;
}

// ---------------------------------------------------------------------------
// Design tokens (all inline — no Tailwind classes for layout)
// ---------------------------------------------------------------------------

const CRIMSON  = '#CC1212';
const AMBER    = '#F5A623';
const DARK_BG  = '#080D18';
const NAVY     = '#0A0F1E';
const LIGHT_BG = '#F8F9FA';
const WHITE    = '#FFFFFF';
const MUTED    = 'rgba(255,255,255,0.55)';

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function DeckPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ gate_error?: string }>;
}) {
  const { slug } = await params;
  const { gate_error } = await searchParams;

  // --- DB lookup (server component — direct access, no HTTP round-trip) ---
  const siteRow = await queryOne<DeckSite>(
    `SELECT * FROM deck_sites WHERE slug = ?`,
    [slug]
  );

  // notFound() throws internally but TS doesn't narrow undefined away — use explicit guard
  if (!siteRow) notFound();
  const site = siteRow!;

  // Slides in presentation order
  const slides = await query<DeckSlide>(
    `SELECT * FROM deck_slides WHERE deck_site_id = ? ORDER BY slide_order ASC`,
    [site.id]
  );

  // --- Gated visibility check ---
  if (site.visibility === 'gated') {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get(`deck-auth-${site.id}`);
    const isAuthed = authCookie?.value === site.gate_password;

    if (!isAuthed) {
      // Render password gate — full-screen dark lockscreen
      return <GatePage site={site} hasError={gate_error === '1'} />;
    }
  }

  // --- Draft with no slides ---
  const heroSlide = slides[0] ?? null;
  const contentSlides = slides.slice(1);

  // Hero background: prefer AI image, fall back to captured slide, then gradient
  const heroImage = heroSlide?.ai_image_path ?? heroSlide?.slide_image_path ?? null;

  // Build stats array for the stats bar from deck metadata
  const statsItems = [
    site.ep_count    ? { label: 'EPISODES',     value: site.ep_count }    : null,
    site.format      ? { label: 'FORMAT',        value: site.format }      : null,
    site.genre       ? { label: 'GENRE',         value: site.genre }       : null,
    site.network_target ? { label: 'TARGETING', value: site.network_target } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div style={{ background: DARK_BG, color: WHITE, fontFamily: "'Roboto', sans-serif", minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 40px',
        background: 'rgba(8,13,24,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* MY Entertainment wordmark */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: CRIMSON, fontFamily: "'Oswald', sans-serif", letterSpacing: '-0.01em' }}>MY</span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontFamily: "'Roboto Condensed', sans-serif" }}>ENTERTAINMENT</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Confidentiality date */}
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: "'Roboto Condensed', sans-serif", letterSpacing: '0.08em' }}>
            {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}
          </span>
          {/* Visibility pill */}
          <VisibilityPill visibility={site.visibility} />
        </div>
      </div>

      {/* ── HERO SECTION ─────────────────────────────────────────────────────── */}
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        paddingBottom: 80,
        overflow: 'hidden',
      }}>
        {/* Background image or gradient */}
        {heroImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt={site.title}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center top',
              }}
            />
            {/* Cinematic dark overlay — heavy at bottom for text legibility */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(8,13,24,0.35) 0%, rgba(8,13,24,0.55) 40%, rgba(8,13,24,0.92) 75%, rgba(8,13,24,1) 100%)',
            }} />
          </>
        ) : (
          /* No image — cinematic gradient with crimson accent */
          <div style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse at 30% 40%, rgba(204,18,18,0.18) 0%, transparent 60%), radial-gradient(ellipse at 70% 20%, rgba(245,166,35,0.08) 0%, transparent 50%), linear-gradient(135deg, #0A0F1E 0%, #080D18 50%, #0D0A18 100%)`,
          }}>
            {/* Large watermark MY logo */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%,-50%)',
              fontSize: 'clamp(120px, 20vw, 280px)',
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              color: 'rgba(204,18,18,0.08)',
              letterSpacing: '-0.03em',
              userSelect: 'none',
              lineHeight: 1,
            }}>
              MY
            </div>
          </div>
        )}

        {/* Hero content */}
        <div style={{ position: 'relative', padding: '0 clamp(24px, 5vw, 80px)', maxWidth: 900 }}>
          {/* Presented by line */}
          <div style={{
            fontSize: 11,
            fontFamily: "'Roboto Condensed', sans-serif",
            fontWeight: 700,
            letterSpacing: '0.22em',
            color: AMBER,
            textTransform: 'uppercase',
            marginBottom: 20,
          }}>
            Presented by MY Entertainment
          </div>

          {/* Show title — massive Oswald */}
          <h1 style={{
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(52px, 10vw, 120px)',
            lineHeight: 0.92,
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            color: WHITE,
            margin: '0 0 24px 0',
            textShadow: '0 2px 40px rgba(0,0,0,0.6)',
          }}>
            {site.title}
          </h1>

          {/* Subtitle / logline */}
          {(site.subtitle || site.logline) && (
            <p style={{
              fontSize: 'clamp(15px, 2vw, 20px)',
              fontStyle: 'italic',
              color: 'rgba(255,255,255,0.7)',
              fontFamily: "'Roboto', sans-serif",
              fontWeight: 300,
              lineHeight: 1.5,
              marginBottom: 28,
              maxWidth: 640,
            }}>
              {site.subtitle || site.logline}
            </p>
          )}

          {/* Genre / format / ep count pill badges */}
          {(site.genre || site.format || site.ep_count) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 48 }}>
              {site.ep_count && <PillBadge>{site.ep_count}</PillBadge>}
              {site.format   && <PillBadge>{site.format}</PillBadge>}
              {site.genre    && <PillBadge>{site.genre}</PillBadge>}
            </div>
          )}

          {/* Draft + no slides notice */}
          {slides.length === 0 && (
            <div style={{ marginBottom: 48 }}>
              <ComingSoonNotice title={site.title} />
            </div>
          )}

          {/* Scroll cue */}
          {slides.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: 'rgba(255,255,255,0.35)',
              fontSize: 11,
              fontFamily: "'Roboto Condensed', sans-serif",
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}>
              <span style={{ fontSize: 18, animation: 'bounce 2s infinite' }}>↓</span>
              Scroll to explore
            </div>
          )}
        </div>
      </section>

      {/* ── STATS BAR ────────────────────────────────────────────────────────── */}
      {statsItems.length > 0 && (
        <div style={{
          background: NAVY,
          borderTop: `1px solid rgba(255,255,255,0.06)`,
          borderBottom: `1px solid rgba(255,255,255,0.06)`,
          padding: '28px clamp(24px, 5vw, 80px)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '28px 48px',
          alignItems: 'center',
        }}>
          {statsItems.map((stat, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{
                fontSize: 10,
                fontFamily: "'Roboto Condensed', sans-serif",
                fontWeight: 700,
                letterSpacing: '0.2em',
                color: AMBER,
                textTransform: 'uppercase',
              }}>
                {stat.label}
              </span>
              <span style={{
                fontSize: 20,
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 600,
                color: WHITE,
                lineHeight: 1,
              }}>
                {stat.value}
              </span>
            </div>
          ))}
          {/* Crimson divider accent on right side */}
          <div style={{ flex: 1, height: 2, background: `linear-gradient(to right, ${CRIMSON}, transparent)`, minWidth: 40 }} />
        </div>
      )}

      {/* ── CONTENT SECTIONS ─────────────────────────────────────────────────── */}
      {contentSlides.map((slide, idx) => {
        // Alternate dark (#080D18) and light (#F8F9FA) sections for visual rhythm
        const isDark = idx % 2 === 0;
        const bg = isDark ? DARK_BG : LIGHT_BG;
        const textColor = isDark ? WHITE : '#0F172A';
        const labelColor = AMBER;
        const headingColor = isDark ? WHITE : '#0A0F1E';
        const bodyColor = isDark ? 'rgba(255,255,255,0.72)' : '#334155';

        // Image source: prefer AI-generated, fall back to captured slide
        const imgSrc = slide.ai_image_path ?? slide.slide_image_path ?? null;

        // Dark sections: image on the right; light sections: image on the left
        const imageOnRight = isDark;

        return (
          <section
            key={slide.id}
            style={{
              background: bg,
              padding: 'clamp(60px, 8vh, 100px) clamp(24px, 5vw, 80px)',
              display: 'grid',
              gridTemplateColumns: imgSrc ? (imageOnRight ? '1fr 1fr' : '1fr 1fr') : '1fr',
              gap: 'clamp(32px, 5vw, 80px)',
              alignItems: 'center',
              borderTop: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.04)',
            }}
          >
            {/* Text block — ordering changes based on image side */}
            <div style={{ order: imageOnRight ? 1 : 2 }}>
              {slide.section_label && (
                <div style={{
                  fontSize: 11,
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  color: labelColor,
                  textTransform: 'uppercase',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}>
                  {/* Crimson accent bar */}
                  <span style={{ display: 'inline-block', width: 24, height: 2, background: CRIMSON, borderRadius: 2 }} />
                  {slide.section_label}
                </div>
              )}

              {slide.heading && (
                <h2 style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontWeight: 700,
                  fontSize: 'clamp(32px, 4vw, 56px)',
                  lineHeight: 1.0,
                  letterSpacing: '-0.01em',
                  textTransform: 'uppercase',
                  color: headingColor,
                  margin: '0 0 20px 0',
                }}>
                  {slide.heading}
                </h2>
              )}

              {slide.body && (
                <p style={{
                  fontSize: 17,
                  fontFamily: "'Roboto', sans-serif",
                  fontWeight: 400,
                  lineHeight: 1.8,
                  color: bodyColor,
                  margin: 0,
                  maxWidth: 580,
                  whiteSpace: 'pre-line',
                }}>
                  {slide.body}
                </p>
              )}

              {/* Stats grid — rendered if this slide has stats_json */}
              {slide.stats_json && <SlideStats statsJson={slide.stats_json} isDark={isDark} />}
            </div>

            {/* Image panel */}
            {imgSrc && (
              <div style={{ order: imageOnRight ? 2 : 1, position: 'relative' }}>
                <div style={{
                  position: 'relative',
                  borderRadius: 8,
                  overflow: 'hidden',
                  aspectRatio: '16/9',
                  boxShadow: isDark
                    ? '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)'
                    : '0 24px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.08)',
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgSrc}
                    alt={slide.heading ?? slide.section_label ?? `Slide ${slide.slide_order}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {/* If both AI and captured exist, show a tiny "AI" label badge */}
                  {slide.ai_image_path && slide.slide_image_path && (
                    <div style={{
                      position: 'absolute',
                      bottom: 10,
                      right: 10,
                      background: 'rgba(245,166,35,0.9)',
                      color: '#000',
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: '0.1em',
                      padding: '3px 7px',
                      borderRadius: 3,
                      fontFamily: "'Roboto Condensed', sans-serif",
                    }}>
                      AI
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* When no image: full-width crimson accent strip */}
            {!imgSrc && (
              <div style={{
                height: 4,
                background: `linear-gradient(to right, ${CRIMSON}, ${AMBER}, transparent)`,
                borderRadius: 2,
                marginTop: 24,
                gridColumn: '1 / -1',
              }} />
            )}
          </section>
        );
      })}

      {/* ── CTA FOOTER ───────────────────────────────────────────────────────── */}
      {slides.length > 0 && (
        <footer style={{
          background: NAVY,
          padding: 'clamp(64px, 10vh, 120px) clamp(24px, 5vw, 80px)',
          borderTop: `3px solid ${CRIMSON}`,
        }}>
          {/* Massive CTA headline */}
          <h2 style={{
            fontFamily: "'Oswald', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(36px, 6vw, 80px)',
            textTransform: 'uppercase',
            color: WHITE,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            marginBottom: 32,
            maxWidth: 800,
          }}>
            Let&apos;s talk about this show.
          </h2>

          {/* Contact block */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 40px', marginBottom: 48 }}>
            <a
              href="mailto:info@myentertainment.tv"
              style={{
                fontSize: 18,
                color: AMBER,
                textDecoration: 'none',
                fontFamily: "'Roboto Condensed', sans-serif",
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            >
              info@myentertainment.tv
            </a>
            <a
              href="https://myentertainment.tv"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 18,
                color: 'rgba(255,255,255,0.5)',
                textDecoration: 'none',
                fontFamily: "'Roboto Condensed', sans-serif",
                fontWeight: 400,
                letterSpacing: '0.04em',
              }}
            >
              myentertainment.tv
            </a>
          </div>

          {/* Horizontal rule */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 32 }} />

          {/* Footer wordmark + confidentiality notice */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: CRIMSON, fontFamily: "'Oswald', sans-serif", letterSpacing: '-0.01em' }}>[MY]</span>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontFamily: "'Roboto Condensed', sans-serif" }}>ENTERTAINMENT</span>
            </div>

            {site.network_target ? (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: "'Roboto', sans-serif", fontStyle: 'italic', maxWidth: 480, textAlign: 'right', lineHeight: 1.5 }}>
                This presentation is confidential and prepared exclusively for {site.network_target}.
              </p>
            ) : (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontFamily: "'Roboto', sans-serif", fontStyle: 'italic' }}>
                This presentation is confidential.
              </p>
            )}
          </div>
        </footer>
      )}

      {/* CSS keyframe for scroll-cue bounce */}
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Pill badge for hero section metadata chips */
function PillBadge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '5px 14px',
      borderRadius: 100,
      border: '1px solid rgba(255,255,255,0.2)',
      fontSize: 11,
      fontFamily: "'Roboto Condensed', sans-serif",
      fontWeight: 700,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.75)',
      background: 'rgba(255,255,255,0.06)',
    }}>
      {children}
    </span>
  );
}

/** Visibility status chip in the top bar */
function VisibilityPill({ visibility }: { visibility: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    public:   { bg: 'rgba(34,197,94,0.15)',  color: '#4ADE80', label: 'PUBLIC' },
    internal: { bg: 'rgba(148,163,184,0.15)', color: '#94A3B8', label: 'INTERNAL' },
    gated:    { bg: 'rgba(245,166,35,0.15)',  color: '#F5A623', label: 'GATED' },
  };
  const s = styles[visibility] ?? styles.internal;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '4px 10px',
      borderRadius: 4,
      background: s.bg,
      color: s.color,
      fontSize: 10,
      fontFamily: "'Roboto Condensed', sans-serif",
      fontWeight: 700,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
    }}>
      {visibility === 'gated' && <span>🔒</span>}
      {s.label}
    </span>
  );
}

/** Renders a stats_json array [{label, value}] as a grid of stat cells */
function SlideStats({ statsJson, isDark }: { statsJson: string; isDark: boolean }) {
  let stats: { label: string; value: string }[] = [];
  try {
    stats = JSON.parse(statsJson);
  } catch {
    return null;
  }
  if (!Array.isArray(stats) || stats.length === 0) return null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: 20,
      marginTop: 28,
      padding: '24px 28px',
      borderRadius: 8,
      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
    }}>
      {stats.map((s, i) => (
        <div key={i}>
          <div style={{ fontSize: 9, fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, letterSpacing: '0.18em', color: AMBER, textTransform: 'uppercase', marginBottom: 4 }}>
            {s.label}
          </div>
          <div style={{ fontSize: 22, fontFamily: "'Oswald', sans-serif", fontWeight: 600, color: isDark ? WHITE : '#0A0F1E', lineHeight: 1 }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Full-screen password gate page — shown when visibility='gated' and no valid cookie */
function GatePage({ site, hasError }: { site: DeckSite; hasError: boolean }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: DARK_BG,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Roboto', sans-serif",
      padding: 24,
    }}>
      {/* Background gradient */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: `radial-gradient(ellipse at 50% 40%, rgba(204,18,18,0.1) 0%, transparent 60%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', maxWidth: 420, width: '100%' }}>
        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 48, justifyContent: 'center' }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: CRIMSON, fontFamily: "'Oswald', sans-serif" }}>MY</span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontFamily: "'Roboto Condensed', sans-serif" }}>ENTERTAINMENT</span>
        </div>

        {/* Lock icon */}
        <div style={{ textAlign: 'center', marginBottom: 24, color: 'rgba(255,255,255,0.2)', fontSize: 32 }}>
          🔒
        </div>

        {/* Show title */}
        <h1 style={{
          fontFamily: "'Oswald', sans-serif",
          fontWeight: 700,
          fontSize: 36,
          textTransform: 'uppercase',
          color: WHITE,
          textAlign: 'center',
          letterSpacing: '-0.01em',
          marginBottom: 8,
        }}>
          {site.title}
        </h1>

        <p style={{ textAlign: 'center', color: MUTED, fontSize: 14, marginBottom: 36, lineHeight: 1.5 }}>
          This pitch deck is password-protected.
        </p>

        {/* Gate form — POSTs to /deck/[slug]/gate route handler */}
        <form action={`/deck/${site.slug}/gate`} method="POST" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            type="password"
            name="password"
            placeholder="Enter access password"
            autoComplete="current-password"
            style={{
              width: '100%',
              padding: '14px 18px',
              borderRadius: 8,
              border: hasError ? `1px solid ${CRIMSON}` : '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)',
              color: WHITE,
              fontSize: 15,
              fontFamily: "'Roboto', sans-serif",
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 150ms ease',
            }}
          />

          {/* Error message */}
          {hasError && (
            <p style={{ color: CRIMSON, fontSize: 13, margin: 0, textAlign: 'center' }}>
              Incorrect password. Please try again.
            </p>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '14px 18px',
              borderRadius: 8,
              border: 'none',
              background: CRIMSON,
              color: WHITE,
              fontSize: 14,
              fontFamily: "'Roboto Condensed', sans-serif",
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'background 150ms ease',
            }}
          >
            View Deck
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 28, lineHeight: 1.5 }}>
          Contact <a href="mailto:info@myentertainment.tv" style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>info@myentertainment.tv</a> for access.
        </p>
      </div>
    </div>
  );
}

/** Beautiful "Coming Soon" dark screen shown for draft decks with no slides yet */
function ComingSoonNotice({ title }: { title: string }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 20px',
      border: `1px solid rgba(245,166,35,0.3)`,
      borderRadius: 6,
      background: 'rgba(245,166,35,0.06)',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: AMBER, display: 'inline-block', boxShadow: `0 0 8px ${AMBER}` }} />
      <span style={{
        fontSize: 12,
        fontFamily: "'Roboto Condensed', sans-serif",
        fontWeight: 700,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: AMBER,
      }}>
        Coming Soon — {title}
      </span>
    </div>
  );
}
