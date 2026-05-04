/**
 * POST /deck/[slug]/gate
 *   Password gate for gated deck portals. Receives { password } from the gate form,
 *   validates it against deck_sites.gate_password, and sets a session cookie if correct.
 *
 *   Cookie name: deck-auth-{id}   (id = deck_sites.id)
 *   Cookie value: gate_password   (exact match — simple shared-password gate)
 *   Cookie: httpOnly, sameSite=lax, maxAge=86400 (24 hours)
 *
 *   On success: 302 redirect back to /deck/[slug]
 *   On failure: 302 redirect to /deck/[slug]?gate_error=1
 *
 * Called by: gate form on the public deck portal page
 * Auth: none (this route IS the auth)
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

interface DeckSite {
  id: string;
  gate_password: string | null;
  visibility: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Look up the deck by slug to get its gate password
  const site = queryOne<DeckSite>(
    `SELECT id, gate_password, visibility FROM deck_sites WHERE slug = ?`,
    [slug]
  );

  const returnUrl = `/deck/${slug}`;

  // If the deck doesn't exist or isn't gated, just redirect back
  if (!site || site.visibility !== 'gated') {
    return NextResponse.redirect(new URL(returnUrl, request.url), 302);
  }

  // Parse submitted password from the form body
  let submittedPassword = '';
  try {
    const formData = await request.formData();
    submittedPassword = String(formData.get('password') ?? '');
  } catch {
    return NextResponse.redirect(new URL(`${returnUrl}?gate_error=1`, request.url), 302);
  }

  // Compare submitted password against stored gate_password (case-sensitive exact match)
  if (!site.gate_password || submittedPassword !== site.gate_password) {
    return NextResponse.redirect(new URL(`${returnUrl}?gate_error=1`, request.url), 302);
  }

  // Password correct — set auth cookie and redirect back to the deck portal
  const response = NextResponse.redirect(new URL(returnUrl, request.url), 302);
  response.cookies.set(`deck-auth-${site.id}`, site.gate_password, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 86400, // 24 hours
    path: '/',
  });

  return response;
}
