export const dynamic = 'force-dynamic';

// Server component for the public show package page.
// Fetches title data from DB, strips the password before passing to the client,
// and delegates rendering (including the password gate) to AvailablePackageClient.

import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { query, queryOne, initDb } from '@/lib/db';
import { getSessionUser, SESSION_COOKIE } from '@/lib/auth';
import type { Metadata } from 'next';
import AvailablePackageClient from './AvailablePackageClient';
// ShowPageWrapper injects JSON-LD WebPage schema (with relatedLink to the 4
// B2B money pages) and the BuyerCTA feeder block on every custom OneSheet.
// AvailablePackageClient already includes BuyerCTA inline, so for that path
// we use ShowPageWrapper with noExtraCta=true to skip the duplicate block.
import ShowPageWrapper from '@/components/shows/ShowPageWrapper';
import GottaCatchEmAllOneSheet from './GottaCatchEmAllOneSheet';
import HauntedWorldOneSheet from './HauntedWorldOneSheet';
import MissingInAmericaOneSheet from './MissingInAmericaOneSheet';
import HeartlandPowerOneSheet from './HeartlandPowerOneSheet';
import HeidiMontagRookiePiOneSheet from './HeidiMontagRookiePiOneSheet';
import CanadaHeidiMontagOneSheet from './CanadaHeidiMontagOneSheet';
import GoneViralOneSheet from './GoneViralOneSheet';
import ScaredShirtlessOneSheet from './ScaredShirtlessOneSheet';
import OutOfBoundsOneSheet from './OutOfBoundsOneSheet';
import SenselessOneSheet from './SenselessOneSheet';
import PrettyBigLiarsOneSheet from './PrettyBigLiarsOneSheet';
import StormWarriorsOneSheet from './StormWarriorsOneSheet';
import HauntedWorldYouTubeOneSheet from './HauntedWorldYouTubeOneSheet';
import HauntedWorldNorthAmericaOneSheet from './HauntedWorldNorthAmericaOneSheet';
import HomeGameOneSheet from './HomeGameOneSheet';
import HomeGameExcelOneSheet from './HomeGameExcelOneSheet';
import HomeGameAthletesFirstOneSheet from './HomeGameAthletesFirstOneSheet';
import HomeGameCAAOneSheet from './HomeGameCAAOneSheet';
import StormWarriorsUSOneSheet from './StormWarriorsUSOneSheet';
import WelcomeToCrunkvilleOneSheet from './WelcomeToCrunkvilleOneSheet';
import OpenSecretsOneSheet from './OpenSecretsOneSheet';
import JustLikeHomeOneSheet from './JustLikeHomeOneSheet';
import SwingThoughtsOneSheet from './SwingThoughtsOneSheet';
import MagicShowdownOneSheet from './MagicShowdownOneSheet';
import HappyHourHustlersOneSheet from './HappyHourHustlersOneSheet';
import FandemoniumOneSheet from './FandemoniumOneSheet';
import OopsIBrokeTheLawOneSheet from './OopsIBrokeTheLawOneSheet';
import CarolinaGridironOneSheet from './CarolinaGridironOneSheet';
import BotchedByATikTokDocOneSheet from './BotchedByATikTokDocOneSheet';
import SomethingHappenedInNashvilleOneSheet from './SomethingHappenedInNashvilleOneSheet';
import SusanSmithOneSheet from './SusanSmithOneSheet';
import UpForParoleOneSheet from './UpForParoleOneSheet';
import DontFWithMyKidsOneSheet from './DontFWithMyKidsOneSheet';
import CollateralDamageOneSheet from './CollateralDamageOneSheet';
import ExitStrategyOneSheet from './ExitStrategyOneSheet';
import ColdBloodedOneSheet from './ColdBloodedOneSheet';
import NumberOneWithABulletOneSheet from './NumberOneWithABulletOneSheet';
import TheGirlInTheTeslaOneSheet from './TheGirlInTheTeslaOneSheet';
import ProjectSkywatchOneSheet from './ProjectSkywatchOneSheet';
import SummerOf69OneSheet from './SummerOf69OneSheet';
import BuriedSecretsOneSheet from './BuriedSecretsOneSheet';
import NowYouKnowOneSheet from './NowYouKnowOneSheet';
import QueensVerdictOneSheet from './QueensVerdictOneSheet';
import IAmTheWarriorOneSheet from './IAmTheWarriorOneSheet';
import IraJudlesonOneSheet from './IraJudlesonOneSheet';
import CurbsideCashOneSheet from './CurbsideCashOneSheet';
import FrightBeforeChristmasOneSheet from './FrightBeforeChristmasOneSheet';
import GhostedOneSheet from './GhostedOneSheet';
import WeHuntSerialKillersOneSheet from './WeHuntSerialKillersOneSheet';
import MyFatherTheSerialKillerOneSheet from './MyFatherTheSerialKillerOneSheet';
import ShowTellSandyShawOneSheet from './ShowTellSandyShawOneSheet';
import ArtOfMurderWalsheOneSheet from './ArtOfMurderWalsheOneSheet';
import MurderOnMusicRowOneSheet from './MurderOnMusicRowOneSheet';
import WhatHappenedToMichelleReneeOneSheet from './WhatHappenedToMichelleReneeOneSheet';
import DeathOnDemandOneSheet from './DeathOnDemandOneSheet';
import ParentalGuiltOneSheet from './ParentalGuiltOneSheet';
import GiveMeShelterOneSheet from './GiveMeShelterOneSheet';
import BouchardsOneSheet from './BouchardsOneSheet';
import TheDayBeforeOneSheet from './TheDayBeforeOneSheet';
import PVJOneSheet from './PVJOneSheet';
import JoseFernandezOneSheet from './JoseFernandezOneSheet';
import WoodyStrodeOneSheet from './WoodyStrodeOneSheet';
import LoriVallowOneSheet from './LoriVallowOneSheet';
import ALittleChristmasSpiritOneSheet from './ALittleChristmasSpiritOneSheet';
import MichelleReneeOneSheet from './MichelleReneeOneSheet';
import TheArtOfMurderOneSheet from './TheArtOfMurderOneSheet';

// Full DB row — password included here so we can compute has_password server-side.
// The actual password value is never forwarded to the client component.
interface AvailableRow {
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
  // Google Drive file ID for the sizzle reel. Preferred over vimeo_url — see
  // pickDeckVideoEmbed() in lib/vimeo.ts.
  drive_file_id: string | null;
  password: string | null;
}

// What the client component receives — password column stripped, boolean flag added.
export interface SafeTitle {
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
  drive_file_id: string | null;
  has_password: boolean;
}

// Fetch row helper — used by both generateMetadata and the page itself.
// Async because initDb() and query() are now Postgres-backed Promises.
// WHY try/catch: if a schema column is missing, Postgres throws "column does not
// exist" immediately. Without this guard, that error propagates as an HTTP 500
// for every slug request. Logging + re-throw surfaces the root cause in Railway
// logs while still letting Next.js emit the 500 (rather than silently 404).
async function fetchRow(slug: string): Promise<AvailableRow | null> {
  try {
    await initDb();
    return await queryOne<AvailableRow>(
      `SELECT id, title, slug, rights_type, genre, seasons, episode_count,
              runtime_mins, markets, description, contact_email,
              image_url, vimeo_url, drive_file_id, gate_password AS password
       FROM deck_sites
       WHERE slug = ? AND is_active = 1 AND status = 'published'
       LIMIT 1`,
      [slug]
    ) ?? null;
  } catch (err) {
    console.error('[available/[slug]] fetchRow failed for slug=%s:', slug, err);
    throw err;
  }
}

// Per-show Open Graph metadata — falls back to site defaults when not found.
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const row = await fetchRow(slug);

  if (!row) {
    return { title: 'Show Not Found | MyEntertainment' };
  }

  const description = row.description
    ? row.description.slice(0, 160)
    : `${row.title} — available for development, licensing, and international co-production from MyEntertainment.`;

  return {
    title: `${row.title} | MyEntertainment`,
    description,
    alternates: { canonical: `https://www.myentertainment.tv/available/${slug}` },
    openGraph: {
      title: `${row.title} | MyEntertainment`,
      description,
      url: `https://www.myentertainment.tv/available/${slug}`,
      siteName: 'MyEntertainment',
      type: 'website',
      ...(row.image_url ? { images: [{ url: row.image_url, alt: row.title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${row.title} | MyEntertainment`,
      description,
      ...(row.image_url ? { images: [row.image_url] } : {}),
    },
  };
}

export default async function AvailablePackagePage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const row = await fetchRow(slug);

  if (!row) notFound();

  // Check for a valid admin session — authenticated users skip the password gate
  // so they can preview pages from the backend without needing the password.
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value ?? '';
  // getSessionUser is now async — must be awaited
  const isAdmin = !!(await getSessionUser(sessionToken));

  // Strip the raw password — never send it to the browser.
  // has_password is false when no password is set OR when the viewer is an admin.
  const { password: _pw, ...rest } = row;
  const safeTitle: SafeTitle = {
    ...rest,
    has_password: !isAdmin && !!(row.password),
  };

  // Helper: shared ShowPageWrapper props derived from the DB row.
  // Passes title, slug, image, and description so the wrapper can build
  // both the WebPage JSON-LD schema and the BuyerCTA anchor-text variant.
  const wrapperProps = {
    title: safeTitle.title,
    slug:  safeTitle.slug,
    imageUrl:    safeTitle.image_url,
    description: safeTitle.description,
  };

  // Rich custom one-sheet for this specific show.
  // Every branch is wrapped in ShowPageWrapper which:
  //   • injects WebPage JSON-LD with relatedLink to the 4 B2B money pages
  //   • appends the BuyerCTA feeder block below the OneSheet content
  // WHY wrap here not inside each OneSheet: the ~60 OneSheet components are
  // client components — JSON-LD must be server-rendered. A single wrapper
  // in this server component is the minimal, non-invasive approach.
  if (slug === 'gotta-catch-em-all') {
    return <ShowPageWrapper {...wrapperProps}><GottaCatchEmAllOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'haunted-world') {
    return <ShowPageWrapper {...wrapperProps}><HauntedWorldOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'missing-in-america') {
    return <ShowPageWrapper {...wrapperProps}><MissingInAmericaOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'heartland-power') {
    return <ShowPageWrapper {...wrapperProps}><HeartlandPowerOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'heidi-montag-rookie-pi') {
    return <ShowPageWrapper {...wrapperProps}><HeidiMontagRookiePiOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'canada-heidi-montag') {
    return <ShowPageWrapper {...wrapperProps}><CanadaHeidiMontagOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'gone-viral') {
    return <ShowPageWrapper {...wrapperProps}><GoneViralOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'scared-shirtless') {
    return <ShowPageWrapper {...wrapperProps}><ScaredShirtlessOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'out-of-bounds') {
    return <ShowPageWrapper {...wrapperProps}><OutOfBoundsOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'senseless') {
    return <ShowPageWrapper {...wrapperProps}><SenselessOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'pretty-big-liars') {
    return <ShowPageWrapper {...wrapperProps}><PrettyBigLiarsOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'storm-warriors-deck') {
    return <ShowPageWrapper {...wrapperProps}><StormWarriorsOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'haunted-world-youtube') {
    return <ShowPageWrapper {...wrapperProps}><HauntedWorldYouTubeOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'haunted-world-north-america') {
    return <ShowPageWrapper {...wrapperProps}><HauntedWorldNorthAmericaOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'home-game') {
    return <ShowPageWrapper {...wrapperProps}><HomeGameOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'home-game-excel') {
    return <ShowPageWrapper {...wrapperProps}><HomeGameExcelOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'home-game-athletes-first') {
    return <ShowPageWrapper {...wrapperProps}><HomeGameAthletesFirstOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'home-game-caa') {
    return <ShowPageWrapper {...wrapperProps}><HomeGameCAAOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'storm-warriors-us') {
    return <ShowPageWrapper {...wrapperProps}><StormWarriorsUSOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'welcome-to-crunkville') {
    return <ShowPageWrapper {...wrapperProps}><WelcomeToCrunkvilleOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'open-secrets') {
    return <ShowPageWrapper {...wrapperProps}><OpenSecretsOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'just-like-home') {
    return <ShowPageWrapper {...wrapperProps}><JustLikeHomeOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'swing-thoughts') {
    return <ShowPageWrapper {...wrapperProps}><SwingThoughtsOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'magic-showdown') {
    return <ShowPageWrapper {...wrapperProps}><MagicShowdownOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'happy-hour-hustlers') {
    return <ShowPageWrapper {...wrapperProps}><HappyHourHustlersOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'fandemonium') {
    return <ShowPageWrapper {...wrapperProps}><FandemoniumOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'oops-i-broke-the-law') {
    return <ShowPageWrapper {...wrapperProps}><OopsIBrokeTheLawOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'carolina-gridiron') {
    return <ShowPageWrapper {...wrapperProps}><CarolinaGridironOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'botched-by-a-tiktok-doc') {
    return <ShowPageWrapper {...wrapperProps}><BotchedByATikTokDocOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'something-happened-in-nashville') {
    return <ShowPageWrapper {...wrapperProps}><SomethingHappenedInNashvilleOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'susan-smith') {
    return <ShowPageWrapper {...wrapperProps}><SusanSmithOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'up-for-parole') {
    return <ShowPageWrapper {...wrapperProps}><UpForParoleOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'dont-f-with-my-kids') {
    return <ShowPageWrapper {...wrapperProps}><DontFWithMyKidsOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'collateral-damage') {
    return <ShowPageWrapper {...wrapperProps}><CollateralDamageOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'exit-strategy') {
    return <ShowPageWrapper {...wrapperProps}><ExitStrategyOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'cold-blooded') {
    return <ShowPageWrapper {...wrapperProps}><ColdBloodedOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'number-one-with-a-bullet') {
    return <ShowPageWrapper {...wrapperProps}><NumberOneWithABulletOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'the-girl-in-the-tesla') {
    return <ShowPageWrapper {...wrapperProps}><TheGirlInTheTeslaOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'project-skywatch') {
    return <ShowPageWrapper {...wrapperProps}><ProjectSkywatchOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'summer-of-69') {
    return <ShowPageWrapper {...wrapperProps}><SummerOf69OneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'buried-secrets') {
    return <ShowPageWrapper {...wrapperProps}><BuriedSecretsOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'now-you-know') {
    return <ShowPageWrapper {...wrapperProps}><NowYouKnowOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'queens-verdict') {
    return <ShowPageWrapper {...wrapperProps}><QueensVerdictOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'i-am-the-warrior') {
    return <ShowPageWrapper {...wrapperProps}><IAmTheWarriorOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'ira-judleson') {
    return <ShowPageWrapper {...wrapperProps}><IraJudlesonOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'curbside-cash') {
    return <ShowPageWrapper {...wrapperProps}><CurbsideCashOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'fright-before-christmas') {
    return <ShowPageWrapper {...wrapperProps}><FrightBeforeChristmasOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'ghosted') {
    return <ShowPageWrapper {...wrapperProps}><GhostedOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'we-hunt-serial-killers') {
    return <ShowPageWrapper {...wrapperProps}><WeHuntSerialKillersOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'my-father-the-serial-killer') {
    return <ShowPageWrapper {...wrapperProps}><MyFatherTheSerialKillerOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'show-tell-sandy-shaw') {
    return <ShowPageWrapper {...wrapperProps}><ShowTellSandyShawOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'art-of-murder-walshe') {
    return <ShowPageWrapper {...wrapperProps}><ArtOfMurderWalsheOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'murder-on-music-row') {
    return <ShowPageWrapper {...wrapperProps}><MurderOnMusicRowOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'what-happened-to-michelle-renee') {
    return <ShowPageWrapper {...wrapperProps}><WhatHappenedToMichelleReneeOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'death-on-demand') {
    return <ShowPageWrapper {...wrapperProps}><DeathOnDemandOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'parental-guilt') {
    return <ShowPageWrapper {...wrapperProps}><ParentalGuiltOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'give-me-shelter') {
    return <ShowPageWrapper {...wrapperProps}><GiveMeShelterOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'the-bouchards') {
    return <ShowPageWrapper {...wrapperProps}><BouchardsOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'the-day-before') {
    return <ShowPageWrapper {...wrapperProps}><TheDayBeforeOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'pvj') {
    return <ShowPageWrapper {...wrapperProps}><PVJOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'jose-fernandez') {
    return <ShowPageWrapper {...wrapperProps}><JoseFernandezOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'woody-strode') {
    return <ShowPageWrapper {...wrapperProps}><WoodyStrodeOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'lori-vallow') {
    return <ShowPageWrapper {...wrapperProps}><LoriVallowOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'a-little-christmas-spirit') {
    return <ShowPageWrapper {...wrapperProps}><ALittleChristmasSpiritOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'michelle-renee') {
    return <ShowPageWrapper {...wrapperProps}><MichelleReneeOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'storm-warriors') {
    return <ShowPageWrapper {...wrapperProps}><StormWarriorsOneSheet title={safeTitle} /></ShowPageWrapper>;
  }
  if (slug === 'the-art-of-murder') {
    return <ShowPageWrapper {...wrapperProps}><TheArtOfMurderOneSheet title={safeTitle} /></ShowPageWrapper>;
  }

  // Generic fallback — AvailablePackageClient already contains BuyerCTA
  // internally (added in this PR), so noExtraCta prevents a duplicate block.
  // ShowPageWrapper still fires here to inject the WebPage JSON-LD schema.
  return (
    <ShowPageWrapper {...wrapperProps} noExtraCta>
      <AvailablePackageClient title={safeTitle} />
    </ShowPageWrapper>
  );
}