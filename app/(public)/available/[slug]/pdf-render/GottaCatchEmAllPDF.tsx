// PDF-optimized layout for "Gotta Catch 'Em All" — rendered headlessly by Puppeteer.
// 7 pages × 816 × 1056 px (8.5" × 11" at 96 DPI), zero margins, full color.
// Featured images are shown at natural dimensions — no cropping.
// Background/texture layers (hero, logline bg, episodes banner, cta bg) use cover fill.
// No 'use client' — pure server-side HTML with inline styles only.

import type { CSSProperties } from 'react';

const GOLD  = '#F5C400';
const RED   = '#CC0000';
const BLACK = '#050505';
const DARK  = '#0d0d0d';
const W = 816;
const H = 1056;

const page = (bg = BLACK): CSSProperties => ({
  width: W,
  height: H,
  overflow: 'hidden',
  position: 'relative',
  background: bg,
  breakAfter: 'page',
  fontFamily: "'Roboto', sans-serif",
  color: '#fff',
  boxSizing: 'border-box',
  flexShrink: 0,
});

function TapeStripe({ height = 16 }: { height?: number }) {
  return (
    <div style={{
      width: '100%',
      height,
      background: `repeating-linear-gradient(-45deg, ${GOLD}, ${GOLD} 14px, #111 14px, #111 28px)`,
      flexShrink: 0,
    }} />
  );
}

function Label({ children, color = GOLD }: { children: React.ReactNode; color?: string }) {
  return (
    <p style={{
      fontFamily: "'Roboto Condensed', sans-serif",
      fontSize: 10, fontWeight: 700, letterSpacing: '0.28em',
      textTransform: 'uppercase', color, margin: '0 0 10px',
    }}>
      {children}
    </p>
  );
}

interface TitleData {
  id: string;
  title: string;
  slug: string;
  rights_type: string | null;
  genre: string | null;
  seasons: number | null;
  episode_count: number | null;
  runtime_mins: number | null;
  markets: string | null;
  description: string | null;
  contact_email: string | null;
  image_url: string | null;
  vimeo_url: string | null;
}

export default function GottaCatchEmAllPDF({ title }: { title: TitleData }) {
  const email = title.contact_email || 'info@myentertainment.tv';

  return (
    <div data-pdf-ready style={{ width: W, background: BLACK }}>

      {/* ══════════════════════════════════════════════════
          PAGE 1 — COVER
          gotta-catch-em-all.png: full-bleed background layer — cover fill intentional
      ══════════════════════════════════════════════════ */}
      <div style={page(BLACK)}>
        <img
          src="/available-thumbs/gotta-catch-em-all.png"
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(5,5,5,0.55) 0%, rgba(5,5,5,0) 28%, rgba(5,5,5,0.7) 60%, rgba(5,5,5,1) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(5,5,5,0.6) 0%, rgba(5,5,5,0) 60%)' }} />

        <div style={{ position: 'absolute', top: 28, left: 36, zIndex: 3, display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 900, fontSize: 18, color: '#e51d26', lineHeight: 1 }}>MY</span>
          <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#fff' }}>Entertainment</span>
          <span style={{ color: '#444', margin: '0 3px', fontSize: 9 }}>·</span>
          <span style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#555' }}>Presents</span>
        </div>

        <div style={{ position: 'absolute', top: 28, right: 36, zIndex: 3 }}>
          <span style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#555', border: '1px solid #2a2a2a', padding: '4px 10px', borderRadius: 2 }}>
            Confidential
          </span>
        </div>

        <div style={{ position: 'absolute', top: '42%', left: 0, right: 0, zIndex: 2 }}>
          <TapeStripe height={14} />
        </div>

        <div style={{ position: 'absolute', bottom: 64, left: 36, right: 36, zIndex: 3 }}>
          <Label color={GOLD}>A 4 Part Investigation Event</Label>
          <h1 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 88, textTransform: 'uppercase', lineHeight: 0.88, margin: '0 0 10px', letterSpacing: '-1px', color: '#fff' }}>
            Gotta Catch<br />
            <span style={{ color: GOLD }}>&lsquo;Em All</span>
          </h1>
          <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#ccc', margin: '0 0 24px' }}>
            Inside the Pokémon Crime Wave
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            {['4 Episodes · Documentary', 'All Rights Available', '2026 Anniversary Year'].map((badge) => (
              <span key={badge} style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#aaa', border: '1px solid #333', padding: '5px 12px', borderRadius: 2 }}>{badge}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          PAGE 2 — THE STORY + STATS
          gcal-logline.png: subtle opacity-0.06 texture layer — cover fill intentional
      ══════════════════════════════════════════════════ */}
      <div style={page(DARK)}>
        <img src="/available-thumbs/gcal-logline.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.06 }} />

        <div style={{ position: 'relative', zIndex: 1, padding: '52px 52px 0', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 48, flex: '0 0 auto' }}>
            <div>
              <div style={{ width: 4, height: 48, background: RED, marginBottom: 16 }} />
              <Label>The Series</Label>
              <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 34, lineHeight: 1.05, color: '#fff', textTransform: 'uppercase', margin: 0 }}>
                For thirty years,{' '}
                <span style={{ color: GOLD }}>Pokémon</span>{' '}
                has been one of the most beloved franchises on Earth.
              </p>
            </div>
            <div style={{ paddingTop: 24 }}>
              <p style={{ fontSize: 15, lineHeight: 1.75, color: '#ccc', margin: '0 0 18px' }}>
                But as nostalgia turned childhood collectibles into million-dollar assets, a darker world emerged — robberies, black-market trading networks, counterfeit rings, and{' '}
                <span style={{ color: RED, fontWeight: 700 }}>even murder</span>{' '}
                tied to the pursuit of rare Pokémon.
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.75, color: '#999', margin: '0 0 24px' }}>
                This premium documentary series investigates how a game built on the thrill of the hunt helped create a global obsession — and a growing wave of real-world crime.
              </p>
              <div style={{ padding: '16px 20px', borderLeft: `4px solid ${GOLD}`, background: 'rgba(245,196,0,0.05)' }}>
                <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: GOLD, margin: 0, fontStyle: 'italic', lineHeight: 1.45 }}>
                  &ldquo;Gotta Catch &lsquo;Em All&rdquo; became more than a slogan. It became a mindset. And for some — an obsession with deadly consequences.
                </p>
              </div>
            </div>
          </div>

          <div style={{ flex: 1 }} />
          <TapeStripe height={14} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid #1a1a1a' }}>
            {[
              { value: '$147B',   label: 'Global Pokémon\nTrading Card Market' },
              { value: '30th',    label: '2026 Pokémon\nAnniversary Year' },
              { value: '$16.5M',  label: 'Record Single-Card\nSale — Logan Paul' },
              { value: '4 Parts', label: 'Cinematic Investigation\nEvent Series' },
            ].map((s, i) => (
              <div key={s.value} style={{ padding: '28px 24px', borderRight: i < 3 ? '1px solid #1a1a1a' : 'none', textAlign: 'center', background: '#0a0a0a' }}>
                <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 42, color: GOLD, margin: '0 0 6px', lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#555', margin: 0, lineHeight: 1.55, whiteSpace: 'pre-line' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          PAGE 3 — INSIDE THE POKÉ-CONOMY
          gcal-pokeconomy.png: featured content image — full natural dimensions, no crop
          Matches web page: image LEFT column, text RIGHT column
      ══════════════════════════════════════════════════ */}
      <div style={page(BLACK)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', alignItems: 'center' }}>

          {/* Left: featured image — full width, natural aspect ratio, no objectFit crop */}
          <div style={{ padding: '52px 0 52px 52px' }}>
            <img
              src="/available-thumbs/gcal-pokeconomy.png"
              alt="Inside the Poké-conomy"
              style={{ width: '100%', display: 'block', borderRadius: 4 }}
            />
            <div style={{ marginTop: 12, height: 3, background: `linear-gradient(to right, ${GOLD}, transparent)` }} />
          </div>

          {/* Right: text */}
          <div style={{ padding: '52px 52px 52px 48px' }}>
            <Label>Inside the Poké-conomy</Label>
            <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 28, textTransform: 'uppercase', color: '#fff', margin: '0 0 22px', lineHeight: 1.05 }}>
              The Highest-Grossing<br />
              <span style={{ color: GOLD }}>Media Franchise</span><br />
              in the World.
            </h2>
            <p style={{ fontSize: 14, color: '#999', lineHeight: 1.8, margin: '0 0 22px' }}>
              2026 marks the 30th anniversary of Pokémon, and the franchise is bigger than ever. The trading card market has exploded into a global industry estimated at more than{' '}
              <strong style={{ color: '#fff' }}>$147 billion</strong>.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                'Rare Pokémon cards are now treated like luxury assets — graded, auctioned like fine art, and stored in vaults.',
                'A single grading point can turn a $5,000 card into a $100,000 collectible.',
                'As trust in traditional financial systems erodes, collectors turn to trading cards as alternative assets alongside art, wine, and cryptocurrency.',
                'The rarest Pokémon cards can now be worth more than gold.',
              ].map((fact, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span style={{ color: GOLD, fontWeight: 900, fontSize: 14, lineHeight: 1, flexShrink: 0, marginTop: 3 }}>◆</span>
                  <p style={{ fontSize: 13, color: '#bbb', lineHeight: 1.7, margin: 0 }}>{fact}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          PAGE 4 — A CRIME WAVE
          gcal-crime-wave.png: featured content image — full natural dimensions, no crop
          Matches web page: text LEFT column, image RIGHT column
      ══════════════════════════════════════════════════ */}
      <div style={page('#0a0008')}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', alignItems: 'center' }}>

          {/* Left: text */}
          <div style={{ padding: '52px 48px 52px 52px' }}>
            <Label>A Crime Wave</Label>
            <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 28, textTransform: 'uppercase', color: '#fff', margin: '0 0 22px', lineHeight: 1.05 }}>
              Wherever That Kind of Money Exists,{' '}
              <span style={{ color: RED }}>Crime Follows.</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { stat: '$180K',             detail: 'In cards stolen from a single Anaheim, CA store — one of the largest reported Pokémon thefts' },
                { stat: 'Mission Impossible', detail: 'Thieves descended from the ceiling of a card store to steal thousands in rare cards' },
                { stat: '$100K',             detail: 'Cards stolen from Tag Collects, Atlanta — on Christmas Eve 2024' },
                { stat: 'At Gunpoint',       detail: "Suspects used Pokémon GO's \"lure\" feature to ambush players in Missouri" },
                { stat: '3 Deaths',          detail: 'Players killed while playing Pokémon GO — Calvin Riley, Cayla Campos, Jiansheng Chen' },
                { stat: 'Millions/Year',     detail: 'In counterfeit Pokémon cards flooding global marketplaces annually' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '13px 0', borderBottom: '1px solid #1a1a1a' }}>
                  <span style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 13, color: RED, flexShrink: 0, minWidth: 110, lineHeight: 1.4 }}>{item.stat}</span>
                  <p style={{ fontSize: 13, color: '#aaa', lineHeight: 1.6, margin: 0 }}>{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: featured image — full width, natural aspect ratio, no objectFit crop */}
          <div style={{ padding: '52px 52px 52px 0' }}>
            <img
              src="/available-thumbs/gcal-crime-wave.png"
              alt="A Crime Wave"
              style={{ width: '100%', display: 'block', borderRadius: 4 }}
            />
            <div style={{ marginTop: 12, height: 3, background: `linear-gradient(to right, ${RED}, transparent)` }} />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          PAGE 5 — THE EPISODES
          gcal-episodes.png: used as background layer with text overlaid — cover fill intentional
      ══════════════════════════════════════════════════ */}
      <div style={page(BLACK)}>
        <div style={{ position: 'relative', height: 192, overflow: 'hidden', flexShrink: 0 }}>
          <img src="/available-thumbs/gcal-episodes.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,5,5,0.62)' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
            <Label>Four-Part Cinematic Event</Label>
            <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 64, textTransform: 'uppercase', color: '#fff', margin: 0, letterSpacing: '-1px' }}>
              The Episodes
            </h2>
          </div>
        </div>

        <TapeStripe height={12} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', height: 852 }}>
          {[
            {
              num: '01', title: 'THE ORIGIN',
              desc: 'Pokémon explodes into a global phenomenon in the late 1990s. Pokémania overtakes the world overnight — and embedded in the game is a powerful psychological loop: rarity, completion, and the thrill of discovery. Decades later, those same childhood cards are suddenly worth astonishing amounts of money. The childhood game has become a collectible gold rush.',
            },
            {
              num: '02', title: 'THE BOOM',
              desc: "As nostalgia collides with internet culture, Pokémon cards explode into one of the hottest collectible markets on Earth. Influencers livestream pack openings to millions of viewers. Logan Paul sells his Pikachu Illustrator for a record-breaking $16.5 million. Scammers flood global marketplaces. The Pokémon economy is no longer a hobby — it's a billion-dollar market.",
            },
            {
              num: '03', title: 'THE HUNT',
              desc: "In 2016, Pokémon GO transforms the franchise — turning the hunt into a real-world experience. Criminals exploit the game's location features to target players. Police departments issue warnings as confrontations escalate. In some cases, the consequences turn deadly. For the first time, Pokémon's fictional hunt had entered the real world — and the stakes were no longer just part of the game.",
            },
            {
              num: '04', title: 'THE BLACK MARKET',
              desc: "A new criminal ecosystem emerges around Pokémon cards. Thieves drill through walls and smash display cases to steal collections worth hundreds of thousands of dollars. Investigators see coordinated patterns — organized groups treating trading card stores as high-value targets. Rare cards are now stored in vaults, traded like stocks. The question isn't just who will catch them all. It's what new crimes may follow.",
            },
          ].map((ep, i) => (
            <div key={ep.num} style={{ padding: '36px 32px', borderRight: i % 2 === 0 ? '1px solid #1a1a1a' : 'none', borderBottom: i < 2 ? '1px solid #1a1a1a' : 'none', background: i % 2 === 0 ? '#0a0a0a' : BLACK, display: 'flex', flexDirection: 'column' }}>
              <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 40, color: `${GOLD}33`, margin: '0 0 2px', lineHeight: 1 }}>{ep.num}</p>
              <div style={{ width: 28, height: 3, background: RED, margin: '0 0 14px' }} />
              <h3 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 20, textTransform: 'uppercase', color: '#fff', margin: '0 0 14px', letterSpacing: '0.05em' }}>{ep.title}</h3>
              <p style={{ fontSize: 12, color: '#888', lineHeight: 1.7, margin: 0 }}>{ep.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          PAGE 6 — UNPRECEDENTED ACCESS + STYLE & TONE
          gcal-tone.png: featured content image — full natural dimensions, no crop
      ══════════════════════════════════════════════════ */}
      <div style={page(DARK)}>
        <div style={{ padding: '44px 48px 0', height: '100%', display: 'flex', flexDirection: 'column' }}>

          <div style={{ marginBottom: 24 }}>
            <Label>Confirmed &amp; Potential Access</Label>
            <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 36, textTransform: 'uppercase', color: '#fff', margin: 0 }}>
              Unprecedented Access
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, marginBottom: 28, flex: '0 0 auto' }}>
            {[
              { name: 'Logan Paul',         role: 'Influencer · sold Pikachu Illustrator for $16.5M' },
              { name: 'Steve Aoki',         role: 'Grammy DJ · avid Pokémon collector' },
              { name: 'Charlie Hurlocker',  role: 'Trading Card Expert · tens of millions of cards' },
              { name: 'Ken Goldin',         role: 'Owner, Goldin Auctions · oversaw Logan Paul sale' },
              { name: 'Tommy Brown',        role: 'Tag Collects · robbed of $100K on Christmas Eve 2024' },
              { name: 'Duy Pham',           role: 'Do-We Collectibles · lost $180K in Anaheim theft' },
              { name: 'Dr. Marcus Carter',  role: 'Pokémon GO Researcher' },
              { name: 'Paul Lesko',         role: 'Attorney · Hobby & Collectibles Law' },
              { name: 'Patricia Hernandez', role: 'Pokémon Culture Journalist' },
              { name: 'Gary Haase',         role: 'Legendary Pokémon Card Collector' },
              { name: 'Manny Luoro',        role: 'Card Cave Central · Union, NJ' },
              { name: 'Law Enforcement',    role: 'Investigators pursuing Pokémon crime networks' },
            ].map((t) => (
              <div key={t.name} style={{ padding: '12px 16px', background: '#0f0f0f', borderBottom: '1px solid #1a1a1a' }}>
                <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: GOLD, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{t.name}</p>
                <p style={{ fontSize: 10, color: '#666', margin: 0, lineHeight: 1.4 }}>{t.role}</p>
              </div>
            ))}
          </div>

          <TapeStripe height={12} />

          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, marginTop: 28 }}>
            {/* Left: Comparable Titles */}
            <div style={{ paddingRight: 36, borderRight: '1px solid #1a1a1a' }}>
              <Label color="#555">Comparable Titles</Label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { title: 'McMillions',           network: 'HBO' },
                  { title: 'The Beanie Bubble',    network: 'Apple TV+' },
                  { title: 'The Hobby',            network: 'Documentary' },
                  { title: 'Dark Side of the Ring', network: 'Vice TV' },
                ].map((c) => (
                  <div key={c.title} style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 3, padding: '16px 12px', textAlign: 'center' }}>
                    <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 14, textTransform: 'uppercase', color: '#fff', margin: '0 0 4px', lineHeight: 1.2 }}>{c.title}</p>
                    <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#555', margin: 0 }}>{c.network}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Style & Tone — gcal-tone.png at full natural size */}
            <div style={{ paddingLeft: 36, display: 'flex', flexDirection: 'column' }}>
              <Label color="#555">Style &amp; Tone</Label>
              {/* Full image, no fixed height, natural aspect ratio */}
              <img
                src="/available-thumbs/gcal-tone.png"
                alt="Style &amp; Tone"
                style={{ width: '100%', display: 'block', borderRadius: 3, marginBottom: 12 }}
              />
              <div style={{ padding: '12px 14px', background: '#0f0f0f', borderLeft: `4px solid ${RED}` }}>
                <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 9, color: '#888', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tone Arc</p>
                <p style={{ fontSize: 11, color: '#ccc', margin: 0, lineHeight: 1.6 }}>
                  Begins playful and nostalgic — then reveals the darker reality beneath the fandom. By episode four, the stakes are unmistakable.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          PAGE 7 — ABOUT MY ENTERTAINMENT + CTA
          gcal-crime-bg.png: subtle opacity-0.05 texture layer — cover fill intentional
      ══════════════════════════════════════════════════ */}
      <div style={page('#080808')}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 52, padding: '52px 52px 36px', flex: '0 0 auto' }}>
            <div>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 900, fontSize: 32, color: '#e51d26', display: 'block', lineHeight: 1 }}>MY</span>
                <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: '#fff' }}>Entertainment</span>
              </div>
              <p style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.14em', lineHeight: 1.8, margin: 0 }}>
                Max · Discovery+ · A&E · VICE · PBS · Nat Geo · BBC · Lifetime · MTV · Comedy Central · Travel Channel · ID · Oxygen · Nickelodeon · Food Network · TruTV · Reelz · CMT
              </p>
            </div>
            <div>
              <Label>About the Company</Label>
              <p style={{ fontSize: 13, color: '#bbb', lineHeight: 1.75, margin: '0 0 13px' }}>
                My Entertainment is an independent production company creating undeniable content since 2000, best known for compelling characters, great storytelling, innovative deals, and high production value. With offices in Manhattan, Toronto, and London.
              </p>
              <p style={{ fontSize: 13, color: '#999', lineHeight: 1.75, margin: '0 0 13px' }}>
                Popular series include the <strong style={{ color: '#fff' }}>#1 paranormal show Ghost Adventures</strong>, Pros vs. Joes, Jane Doe Murders, Uninterrupted, Legacy List, Destination Fear, Baggage Battles, Sin City Justice, and critically acclaimed Breaking Borders.
              </p>
              <p style={{ fontSize: 13, color: '#999', lineHeight: 1.75, margin: 0 }}>
                Partnerships include LeBron James &amp; Maverick Carter&apos;s SpringHill Company, Al Roker&apos;s ARE, Michael Sugar&apos;s Sugar23, and Mark Wahlberg&apos;s Unrealistic Ideas. Strong working relationships with <strong style={{ color: '#fff' }}>40+ producers in 15 countries</strong>.
              </p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #1a1a1a', margin: '0 52px' }} />
          <div style={{ flex: 1 }} />

          <div style={{ position: 'relative', overflow: 'hidden', flex: '0 0 auto' }}>
            <img src="/available-thumbs/gcal-crime-bg.png" alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.05 }} />
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '36px 52px' }}>
              <TapeStripe height={12} />
              <div style={{ padding: '36px 0 28px' }}>
                <Label color={GOLD}>Ready to Acquire?</Label>
                <h2 style={{ fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 900, fontSize: 34, textTransform: 'uppercase', lineHeight: 1.0, color: '#fff', margin: '0 0 16px' }}>
                  Sometimes the Rarest Pokémon<br />
                  <span style={{ color: RED }}>Aren&rsquo;t Just Collectibles.<br />They&rsquo;re Targets.</span>
                </h2>
                <p style={{ fontSize: 13, color: '#888', lineHeight: 1.65, margin: '0 auto 24px', maxWidth: 580 }}>
                  <em>Gotta Catch &lsquo;Em All: Inside the Pokémon Crime Wave</em> is available for international licensing, co-production, and domestic acquisition. Four episodes. All rights available.
                </p>
                <div style={{ display: 'inline-block', background: RED, color: '#fff', fontFamily: "'Roboto Condensed', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '13px 36px', borderRadius: 3 }}>
                  Inquire Now
                </div>
                <p style={{ color: '#555', fontSize: 12, margin: '10px 0 0', fontFamily: "'Roboto', sans-serif" }}>{email}</p>
              </div>
              <TapeStripe height={12} />
            </div>
          </div>

          <div style={{ background: '#030303', padding: '12px 52px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #111' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 900, fontSize: 14, color: '#e51d26' }}>MY</span>
              <span style={{ fontFamily: "'Roboto', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#fff' }}>Entertainment</span>
            </div>
            <p style={{ fontSize: 9, color: '#333', margin: 0, fontFamily: "'Roboto', sans-serif" }}>
              Confidential — For authorized recipients only · myentertainment.tv
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
