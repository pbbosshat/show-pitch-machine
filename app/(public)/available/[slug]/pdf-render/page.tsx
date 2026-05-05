// Server component — rendered headlessly by Puppeteer when exporting the pitch deck PDF.
// No password gate, no nav, no interactive elements. Pure print layout.
// Accessed at /available/[slug]/pdf-render — only intended for internal Puppeteer use.

import { notFound } from 'next/navigation';
import { query, initDb } from '@/lib/db';
import GottaCatchEmAllPDF from './GottaCatchEmAllPDF';

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
}

export default async function AvailablePDFRenderPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  initDb();
  const rows = query<AvailableRow>(
    `SELECT id, title, slug, rights_type, genre, seasons, episode_count,
            runtime_mins, markets, description, contact_email, image_url, vimeo_url
     FROM deck_sites
     WHERE slug = ? AND is_active = 1 AND status = 'published'`,
    [slug]
  );

  if (!rows.length) notFound();
  const title = rows[0];

  if (slug === 'gotta-catch-em-all') {
    return <GottaCatchEmAllPDF title={title} />;
  }

  // No PDF render defined for this slug yet
  notFound();
}
