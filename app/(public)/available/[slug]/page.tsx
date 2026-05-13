export const dynamic = 'force-dynamic';

// Server component for the public show package page.
// Fetches title data from DB, strips the password before passing to the client,
// and delegates rendering (including the password gate) to AvailablePackageClient.

import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { query, initDb } from '@/lib/db';
import { getSessionUser, SESSION_COOKIE } from '@/lib/auth';
import type { Metadata } from 'next';
import AvailablePackageClient from './AvailablePackageClient';
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
async function fetchRow(slug: string): Promise<AvailableRow | null> {
  await initDb();
  const rows = await query<AvailableRow>(
    `SELECT id, title, slug, rights_type, genre, seasons, episode_count,
            runtime_mins, markets, description, contact_email,
            image_url, vimeo_url, drive_file_id, gate_password AS password
     FROM deck_sites
     WHERE slug = ? AND is_active = 1 AND status = 'published'`,
    [slug]
  );
  return rows.length ? rows[0] : null;
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

  // Rich custom one-sheet for this specific show
  if (slug === 'gotta-catch-em-all') {
    return <GottaCatchEmAllOneSheet title={safeTitle} />;
  }
  if (slug === 'haunted-world') {
    return <HauntedWorldOneSheet title={safeTitle} />;
  }
  if (slug === 'missing-in-america') {
    return <MissingInAmericaOneSheet title={safeTitle} />;
  }
  if (slug === 'heartland-power') {
    return <HeartlandPowerOneSheet title={safeTitle} />;
  }
  if (slug === 'heidi-montag-rookie-pi') {
    return <HeidiMontagRookiePiOneSheet title={safeTitle} />;
  }
  if (slug === 'canada-heidi-montag') {
    return <CanadaHeidiMontagOneSheet title={safeTitle} />;
  }
  if (slug === 'gone-viral') {
    return <GoneViralOneSheet title={safeTitle} />;
  }
  if (slug === 'scared-shirtless') {
    return <ScaredShirtlessOneSheet title={safeTitle} />;
  }
  if (slug === 'out-of-bounds') {
    return <OutOfBoundsOneSheet title={safeTitle} />;
  }
  if (slug === 'senseless') {
    return <SenselessOneSheet title={safeTitle} />;
  }
  if (slug === 'pretty-big-liars') {
    return <PrettyBigLiarsOneSheet title={safeTitle} />;
  }
  if (slug === 'storm-warriors-deck') {
    return <StormWarriorsOneSheet title={safeTitle} />;
  }
  if (slug === 'haunted-world-youtube') {
    return <HauntedWorldYouTubeOneSheet title={safeTitle} />;
  }
  if (slug === 'haunted-world-north-america') {
    return <HauntedWorldNorthAmericaOneSheet title={safeTitle} />;
  }
  if (slug === 'home-game') {
    return <HomeGameOneSheet title={safeTitle} />;
  }
  if (slug === 'home-game-excel') {
    return <HomeGameExcelOneSheet title={safeTitle} />;
  }
  if (slug === 'home-game-athletes-first') {
    return <HomeGameAthletesFirstOneSheet title={safeTitle} />;
  }
  if (slug === 'home-game-caa') {
    return <HomeGameCAAOneSheet title={safeTitle} />;
  }
  if (slug === 'storm-warriors-us') {
    return <StormWarriorsUSOneSheet title={safeTitle} />;
  }
  if (slug === 'welcome-to-crunkville') {
    return <WelcomeToCrunkvilleOneSheet title={safeTitle} />;
  }
  if (slug === 'open-secrets') {
    return <OpenSecretsOneSheet title={safeTitle} />;
  }
  if (slug === 'just-like-home') {
    return <JustLikeHomeOneSheet title={safeTitle} />;
  }
  if (slug === 'swing-thoughts') {
    return <SwingThoughtsOneSheet title={safeTitle} />;
  }
  if (slug === 'magic-showdown') {
    return <MagicShowdownOneSheet title={safeTitle} />;
  }
  if (slug === 'happy-hour-hustlers') {
    return <HappyHourHustlersOneSheet title={safeTitle} />;
  }
  if (slug === 'fandemonium') {
    return <FandemoniumOneSheet title={safeTitle} />;
  }
  if (slug === 'oops-i-broke-the-law') {
    return <OopsIBrokeTheLawOneSheet title={safeTitle} />;
  }
  if (slug === 'carolina-gridiron') {
    return <CarolinaGridironOneSheet title={safeTitle} />;
  }
  if (slug === 'botched-by-a-tiktok-doc') {
    return <BotchedByATikTokDocOneSheet title={safeTitle} />;
  }
  if (slug === 'something-happened-in-nashville') {
    return <SomethingHappenedInNashvilleOneSheet title={safeTitle} />;
  }
  if (slug === 'susan-smith') {
    return <SusanSmithOneSheet title={safeTitle} />;
  }
  if (slug === 'up-for-parole') {
    return <UpForParoleOneSheet title={safeTitle} />;
  }
  if (slug === 'dont-f-with-my-kids') {
    return <DontFWithMyKidsOneSheet title={safeTitle} />;
  }
  if (slug === 'collateral-damage') {
    return <CollateralDamageOneSheet title={safeTitle} />;
  }
  if (slug === 'exit-strategy') {
    return <ExitStrategyOneSheet title={safeTitle} />;
  }
  if (slug === 'cold-blooded') {
    return <ColdBloodedOneSheet title={safeTitle} />;
  }
  if (slug === 'number-one-with-a-bullet') {
    return <NumberOneWithABulletOneSheet title={safeTitle} />;
  }
  if (slug === 'the-girl-in-the-tesla') {
    return <TheGirlInTheTeslaOneSheet title={safeTitle} />;
  }
  if (slug === 'project-skywatch') {
    return <ProjectSkywatchOneSheet title={safeTitle} />;
  }
  if (slug === 'summer-of-69') {
    return <SummerOf69OneSheet title={safeTitle} />;
  }
  if (slug === 'buried-secrets') {
    return <BuriedSecretsOneSheet title={safeTitle} />;
  }
  if (slug === 'now-you-know') {
    return <NowYouKnowOneSheet title={safeTitle} />;
  }
  if (slug === 'queens-verdict') {
    return <QueensVerdictOneSheet title={safeTitle} />;
  }
  if (slug === 'i-am-the-warrior') {
    return <IAmTheWarriorOneSheet title={safeTitle} />;
  }
  if (slug === 'ira-judleson') {
    return <IraJudlesonOneSheet title={safeTitle} />;
  }
  if (slug === 'curbside-cash') {
    return <CurbsideCashOneSheet title={safeTitle} />;
  }
  if (slug === 'fright-before-christmas') {
    return <FrightBeforeChristmasOneSheet title={safeTitle} />;
  }
  if (slug === 'ghosted') {
    return <GhostedOneSheet title={safeTitle} />;
  }
  if (slug === 'we-hunt-serial-killers') {
    return <WeHuntSerialKillersOneSheet title={safeTitle} />;
  }
  if (slug === 'my-father-the-serial-killer') {
    return <MyFatherTheSerialKillerOneSheet title={safeTitle} />;
  }
  if (slug === 'show-tell-sandy-shaw') {
    return <ShowTellSandyShawOneSheet title={safeTitle} />;
  }
  if (slug === 'art-of-murder-walshe') {
    return <ArtOfMurderWalsheOneSheet title={safeTitle} />;
  }
  if (slug === 'murder-on-music-row') {
    return <MurderOnMusicRowOneSheet title={safeTitle} />;
  }
  if (slug === 'what-happened-to-michelle-renee') {
    return <WhatHappenedToMichelleReneeOneSheet title={safeTitle} />;
  }
  if (slug === 'death-on-demand') {
    return <DeathOnDemandOneSheet title={safeTitle} />;
  }
  if (slug === 'parental-guilt') {
    return <ParentalGuiltOneSheet title={safeTitle} />;
  }
  if (slug === 'give-me-shelter') {
    return <GiveMeShelterOneSheet title={safeTitle} />;
  }
  if (slug === 'the-bouchards') {
    return <BouchardsOneSheet title={safeTitle} />;
  }
  if (slug === 'the-day-before') {
    return <TheDayBeforeOneSheet title={safeTitle} />;
  }
  if (slug === 'pvj') {
    return <PVJOneSheet title={safeTitle} />;
  }
  if (slug === 'jose-fernandez') {
    return <JoseFernandezOneSheet title={safeTitle} />;
  }
  if (slug === 'woody-strode') {
    return <WoodyStrodeOneSheet title={safeTitle} />;
  }
  if (slug === 'lori-vallow') {
    return <LoriVallowOneSheet title={safeTitle} />;
  }
  if (slug === 'a-little-christmas-spirit') {
    return <ALittleChristmasSpiritOneSheet title={safeTitle} />;
  }

  return <AvailablePackageClient title={safeTitle} />;
}