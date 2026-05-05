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
  has_password: boolean;
}

// Fetch row helper — used by both generateMetadata and the page itself.
function fetchRow(slug: string): AvailableRow | null {
  initDb();
  const rows = query<AvailableRow>(
    `SELECT id, title, slug, rights_type, genre, seasons, episode_count,
            runtime_mins, markets, description, contact_email,
            image_url, vimeo_url, gate_password AS password
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
  const row = fetchRow(slug);

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
  const row = fetchRow(slug);

  if (!row) notFound();

  // Check for a valid admin session — authenticated users skip the password gate
  // so they can preview pages from the backend without needing the password.
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value ?? '';
  const isAdmin = !!getSessionUser(sessionToken);

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

  return <AvailablePackageClient title={safeTitle} />;
}
