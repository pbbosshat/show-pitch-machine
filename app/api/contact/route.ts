/**
 * GET /api/contact
 * Called by: Leads dashboard page in admin UI (browser, authenticated)
 * Auth: spm_session cookie required — returns 401 if missing or expired
 * Response: { data: Lead[] } — all contact leads, newest-first, with show_title
 *   joined from deck_sites when available_title_id is set
 *
 * Returns PII (name, email, company). Auth check MUST be awaited — getSessionUser
 * is async and a non-awaited call returns a truthy Promise regardless of session
 * validity, making this endpoint publicly readable.
 */

/**
 * POST /api/contact
 * Called by: Public contact form on myentertainment.tv (browser, unauthenticated);
 *   also callable directly by bots or API consumers via JSON
 * Auth: none — intentionally public
 * Body (JSON): { first_name, last_name, email, message?, company?, available_title_id?,
 *               utm_source?, utm_medium?, utm_campaign?, utm_term?, utm_content?,
 *               gclid?, fbclid?, landing_page?, referrer?,
 *               source?, phone?, material_title?, material_nature?, material_pages?,
 *               release_accepted?, release_signature? }
 * Body (form): same fields as application/x-www-form-urlencoded
 * Response: { data: Lead } at 201, or HTTP redirect to /contact?submitted=true
 *   for form posts (to support browsers with no JS)
 *
 * Persists the lead (including attribution fields), classifies the channel,
 * then fires a notification email to leads_email (from site_settings) in
 * fire-and-forget mode — mail failure must not block the 201 response.
 *
 * SUBMISSIONS RELEASE: when `source` is on the gated allow-list in
 * lib/submission-release.ts ('pitch', 'work-with-us'), the request MUST carry an
 * accepted release — checkbox, a signature matching the submitted name, and the
 * material's title/nature/page count — or it is rejected with 400. This check
 * lives here, not only in ContactForm, because this endpoint is public and a
 * browser-only gate could simply be posted around. Sources not on the list
 * (including absent) are unaffected, which is what keeps /contact and the ten
 * /available/[slug] one-sheet request forms working unchanged.
 *
 * release_version and release_accepted_at are stamped from server-side values,
 * never from the request, so a caller cannot claim agreement to other wording
 * or backdate an acceptance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { query, queryOne, run } from '@/lib/db';
import { getSessionUser, SESSION_COOKIE } from '@/lib/auth';
import { sendEmail } from '@/lib/gmail';
import {
  SUBMISSION_RELEASE_VERSION,
  isReleaseRequired,
  signatureMatchesName,
} from '@/lib/submission-release';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  message: string | null;
  company: string | null;
  available_title_id: string | null;
  show_title: string | null;
  created_at: number;
  // Submissions Release — populated only for gated sources (see isReleaseRequired).
  source: string | null;
  phone: string | null;
  material_title: string | null;
  material_nature: string | null;
  material_pages: number | null;
  release_accepted: boolean;
  release_signature: string | null;
  release_version: string | null;
  release_accepted_at: number | null;
}

/**
 * Best-effort client IP for the release record.
 *
 * The site sits behind Cloudflare in front of Railway, so request.ip is the
 * proxy rather than the submitter. cf-connecting-ip is Cloudflare's own header
 * and the most trustworthy value available here; x-forwarded-for is the
 * standard fallback and may be a comma-separated chain, in which case the
 * left-most entry is the original client.
 *
 * Returns null rather than a placeholder when nothing usable is present — an
 * absent IP is honest, a fabricated one would poison an evidentiary record.
 */
function clientIp(request: NextRequest): string | null {
  const cf = request.headers.get('cf-connecting-ip')?.trim();
  if (cf) return cf;

  const xff = request.headers.get('x-forwarded-for');
  const first = xff?.split(',')[0]?.trim();
  if (first) return first;

  const real = request.headers.get('x-real-ip')?.trim();
  return real || null;
}

/**
 * Escape untrusted text for interpolation into the notification email's HTML.
 *
 * Every value below originates from a public, unauthenticated form, so all of it
 * is attacker-controlled. The previous inline escaping handled only < and >, and
 * was not applied to the name or email fields at all — meaning a submitter could
 * inject markup into the mail that staff read. Ampersand must be replaced first,
 * or it would double-escape the entities introduced by the later replacements.
 */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Accepts pre-fetched showTitle so the function stays synchronous.
// showTitle is only passed when available_title_id is set and the title was found.
function leadNotificationHtml(lead: Lead, showTitle?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>New Contact Lead</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#111;padding:28px 36px;">
            <span style="font-size:22px;font-weight:900;color:#e53935;letter-spacing:-0.5px;">MY</span>
            <span style="font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#fff;margin-left:6px;">Entertainment</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 36px 28px;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111;">New Contact Lead</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
              Someone submitted the contact form on MY Entertainment.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;">
                  <span style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#a1a1aa;">Name</span><br>
                  <span style="font-size:15px;color:#111;">${esc(lead.first_name)} ${esc(lead.last_name)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;">
                  <span style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#a1a1aa;">Email</span><br>
                  <!-- esc() escapes the quote characters that would otherwise let a
                       crafted address break out of the href attribute; it leaves the
                       @ intact, which encodeURIComponent would mangle into %40 and
                       break the mailto: link in several mail clients. -->
                  <a href="mailto:${esc(lead.email)}" style="font-size:15px;color:#3b82f6;text-decoration:none;">${esc(lead.email)}</a>
                </td>
              </tr>
              ${lead.company ? `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;">
                  <span style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#a1a1aa;">Company</span><br>
                  <span style="font-size:15px;color:#111;">${esc(lead.company)}</span>
                </td>
              </tr>` : ''}
              ${showTitle ? `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;">
                  <span style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#a1a1aa;">Show Requested</span><br>
                  <span style="font-size:15px;color:#111;">${esc(showTitle)}</span>
                </td>
              </tr>` : ''}
              ${lead.phone ? `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;">
                  <span style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#a1a1aa;">Phone</span><br>
                  <span style="font-size:15px;color:#111;">${esc(lead.phone)}</span>
                </td>
              </tr>` : ''}
              ${lead.message ? `
              <tr>
                <td style="padding:10px 0;">
                  <span style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#a1a1aa;">Message</span><br>
                  <span style="font-size:15px;color:#111;line-height:1.6;white-space:pre-wrap;">${esc(lead.message)}</span>
                </td>
              </tr>` : ''}
            </table>

            ${lead.release_accepted ? `
            <!-- Submissions Release record. Rendered only for gated sources, and
                 kept in the notification itself so the signed agreement lands in
                 the leads inbox at the same moment as the material it covers. -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;border:1px solid #e4e4e7;border-radius:8px;">
              <tr>
                <td style="padding:16px 18px 6px;">
                  <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#16a34a;">✓ Submissions Release Signed</span>
                </td>
              </tr>
              <tr>
                <td style="padding:0 18px 16px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;">
                        <span style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#a1a1aa;">Material</span><br>
                        <span style="font-size:15px;color:#111;">${esc(lead.material_title ?? '—')}</span><br>
                        <span style="font-size:13px;color:#52525b;">${esc(lead.material_nature ?? '—')}${lead.material_pages != null ? ` · ${lead.material_pages} page${lead.material_pages === 1 ? '' : 's'}` : ''}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #f4f4f5;">
                        <span style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#a1a1aa;">Signed by</span><br>
                        <span style="font-size:15px;color:#111;font-style:italic;">${esc(lead.release_signature ?? '—')}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;">
                        <span style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#a1a1aa;">Accepted</span><br>
                        <span style="font-size:13px;color:#52525b;">${lead.release_accepted_at ? new Date(lead.release_accepted_at).toUTCString() : '—'} · release version ${esc(lead.release_version ?? '—')}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>` : ''}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #f4f4f5;">
            <p style="margin:0;font-size:12px;color:#a1a1aa;">
              Submitted via the MY Entertainment contact form.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  // Must await — getSessionUser returns Promise<SessionUser | null>.
  // Without await, caller is a non-null Promise (always truthy), so !caller
  // never fires and all PII leads are exposed to any request with any cookie.
  const caller = token ? await getSessionUser(token) : null;
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const leads = await query<Lead>(
    `SELECT cl.id, cl.first_name, cl.last_name, cl.email, cl.message, cl.company,
            cl.available_title_id, cl.created_at, at.title AS show_title,
            cl.source, cl.phone, cl.material_title, cl.material_nature, cl.material_pages,
            cl.release_accepted, cl.release_signature, cl.release_version, cl.release_accepted_at
     FROM contact_leads cl
     LEFT JOIN deck_sites at ON cl.available_title_id = at.id
     ORDER BY cl.created_at DESC`
  );

  return NextResponse.json({ data: leads });
}

// ── Channel classification ───────────────────────────────────────────────────

/**
 * classifyChannel — maps raw attribution signals to a human-readable channel label.
 *
 * Priority order (most specific → least specific):
 *   1. gclid present → paid_search (Google click IDs only exist in paid traffic)
 *   2. fbclid present → paid_social (Facebook click IDs only exist in FB/IG ads)
 *   3. utm_medium = cpc | ppc | paidsearch → paid_search
 *   4. utm_medium = social | social-media | socialmedia → organic_social
 *   5. referrer is present and external AND is a known search engine → organic_search
 *   6. referrer is present and external (not a search engine) → referral
 *   7. everything else → direct (typed URL, bookmarks, dark social, etc.)
 *
 * WHY store the classified channel (vs. computing it at query time): avoids
 * re-running the classification on every dashboard load or export query.
 * Also future-proofs against changing the classification logic — historical
 * rows keep the channel they were classified with at insert time.
 */
function classifyChannel(params: {
  gclid:      string | null;
  fbclid:     string | null;
  utm_medium: string | null;
  referrer:   string | null;
}): string {
  const { gclid, fbclid, utm_medium, referrer } = params;

  // Google click ID → paid search (highest precedence; present = GA paid)
  if (gclid) return 'paid_search';

  // Facebook/Instagram click ID → paid social
  if (fbclid) return 'paid_social';

  // UTM medium overrides referrer-based classification when explicitly set
  if (utm_medium) {
    const m = utm_medium.toLowerCase().trim();
    if (['cpc', 'ppc', 'paidsearch', 'paid_search', 'paid search'].includes(m)) {
      return 'paid_search';
    }
    if (['social', 'social-media', 'socialmedia', 'social_media'].includes(m)) {
      return 'organic_social';
    }
    // email, display, video, affiliate etc. — return the medium as-is so
    // operators see "email" in the dashboard rather than "direct"
    if (m) return m;
  }

  // Referrer-based classification — only meaningful if a referrer is present
  // and it's external (not the same domain — that would be internal navigation)
  if (referrer) {
    try {
      const refHost = new URL(referrer).hostname.replace(/^www\./, '');
      const SEARCH_ENGINES = [
        'google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com',
        'baidu.com', 'yandex.com', 'ecosia.org', 'brave.com',
      ];
      if (SEARCH_ENGINES.some((se) => refHost.endsWith(se))) {
        return 'organic_search';
      }
      // External referrer but not a search engine → referral traffic
      return 'referral';
    } catch {
      // Malformed referrer URL — fall through to direct
    }
  }

  return 'direct';
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? '';
  const isFormPost = contentType.includes('application/x-www-form-urlencoded');

  let first_name: string;
  let last_name: string;
  let email: string;
  let message: string | undefined;
  let company: string | undefined;
  let available_title_id: string | undefined;

  // Attribution fields — all optional, all nullable in the DB.
  // Sent by the ContactForm client component via readAttribution().
  let utm_source:   string | undefined;
  let utm_medium:   string | undefined;
  let utm_campaign: string | undefined;
  let utm_term:     string | undefined;
  let utm_content:  string | undefined;
  let gclid:        string | undefined;
  let fbclid:       string | undefined;
  let landing_page: string | undefined;
  let referrer:     string | undefined;

  // Submissions Release fields. `source` identifies the entry point and is what
  // decides whether the release is enforced at all.
  let source:            string | undefined;
  let phone:             string | undefined;
  let material_title:    string | undefined;
  let material_nature:   string | undefined;
  let material_pages_raw: string | undefined;
  let release_accepted_raw: boolean;
  let release_signature: string | undefined;

  if (isFormPost) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    first_name          = params.get('first_name')?.trim() ?? '';
    last_name           = params.get('last_name')?.trim() ?? '';
    email               = params.get('email')?.trim() ?? '';
    message             = params.get('message')?.trim() || undefined;
    company             = params.get('company')?.trim() || undefined;
    available_title_id  = params.get('available_title_id')?.trim() || undefined;
    // Attribution (form submissions via no-JS browser path)
    utm_source          = params.get('utm_source')?.trim() || undefined;
    utm_medium          = params.get('utm_medium')?.trim() || undefined;
    utm_campaign        = params.get('utm_campaign')?.trim() || undefined;
    utm_term            = params.get('utm_term')?.trim() || undefined;
    utm_content         = params.get('utm_content')?.trim() || undefined;
    gclid               = params.get('gclid')?.trim() || undefined;
    fbclid              = params.get('fbclid')?.trim() || undefined;
    landing_page        = params.get('landing_page')?.trim() || undefined;
    referrer            = params.get('referrer')?.trim() || undefined;
    // Release (no-JS form path)
    source              = params.get('source')?.trim() || undefined;
    phone               = params.get('phone')?.trim() || undefined;
    material_title      = params.get('material_title')?.trim() || undefined;
    material_nature     = params.get('material_nature')?.trim() || undefined;
    material_pages_raw  = params.get('material_pages')?.trim() || undefined;
    release_signature   = params.get('release_signature')?.trim() || undefined;
    // An HTML checkbox posts 'on' (or its value) when ticked and is absent when not.
    release_accepted_raw = ['on', 'true', '1', 'yes'].includes(
      (params.get('release_accepted') ?? '').trim().toLowerCase()
    );
  } else {
    const body = await request.json().catch(() => ({})) as {
      first_name?: string;
      last_name?: string;
      email?: string;
      message?: string;
      company?: string;
      available_title_id?: string;
      // Attribution fields
      utm_source?: string | null;
      utm_medium?: string | null;
      utm_campaign?: string | null;
      utm_term?: string | null;
      utm_content?: string | null;
      gclid?: string | null;
      fbclid?: string | null;
      landing_page?: string | null;
      referrer?: string | null;
      // Submissions Release
      source?: string | null;
      phone?: string | null;
      material_title?: string | null;
      material_nature?: string | null;
      material_pages?: number | string | null;
      release_accepted?: boolean | null;
      release_signature?: string | null;
    };
    first_name          = body.first_name?.trim() ?? '';
    last_name           = body.last_name?.trim() ?? '';
    email               = body.email?.trim() ?? '';
    message             = body.message?.trim() || undefined;
    company             = body.company?.trim() || undefined;
    available_title_id  = body.available_title_id?.trim() || undefined;
    // Attribution — null is treated the same as absent (→ SQL NULL)
    utm_source          = body.utm_source?.trim() || undefined;
    utm_medium          = body.utm_medium?.trim() || undefined;
    utm_campaign        = body.utm_campaign?.trim() || undefined;
    utm_term            = body.utm_term?.trim() || undefined;
    utm_content         = body.utm_content?.trim() || undefined;
    gclid               = body.gclid?.trim() || undefined;
    fbclid              = body.fbclid?.trim() || undefined;
    landing_page        = body.landing_page?.trim() || undefined;
    referrer            = body.referrer?.trim() || undefined;
    // Release (JSON path)
    source              = body.source?.trim() || undefined;
    phone               = body.phone?.trim() || undefined;
    material_title      = body.material_title?.trim() || undefined;
    material_nature     = body.material_nature?.trim() || undefined;
    material_pages_raw  = body.material_pages == null ? undefined : String(body.material_pages).trim() || undefined;
    release_signature   = body.release_signature?.trim() || undefined;
    release_accepted_raw = body.release_accepted === true;
  }

  if (!first_name || !last_name || !email) {
    if (isFormPost) {
      return NextResponse.redirect(new URL('/contact?error=missing_fields', request.url));
    }
    return NextResponse.json({ error: 'first_name, last_name, and email are required' }, { status: 400 });
  }

  /* ── Submissions Release enforcement ────────────────────────────────────────
     THIS is the gate, not the checkbox in the browser. This endpoint is public
     and documented as callable directly with JSON, so a release enforced only
     in ContactForm would be decoration: anyone could POST around it.

     Only sources on the allow-list are gated (see lib/submission-release.ts).
     /contact and the ten /available/[slug] one-sheets send no source and are
     deliberately unaffected — the one-sheets are buyers requesting materials
     FROM MY Entertainment, which a submissions release should never block.

     LIMITATION, stated plainly: a determined party can still omit `source` and
     post as though they were a general enquiry. No server-side check can tell
     which page a caller *meant* to use. What this guarantees is that anything
     arriving through the gated channels carries a signed release, and that
     everything else is recorded with release_accepted = false and its source,
     so an ungated submission is visible as such rather than silently mixed in. */
  const releaseRequired = isReleaseRequired(source);
  let material_pages: number | undefined;

  if (releaseRequired) {
    const reject = (msg: string) =>
      isFormPost
        ? NextResponse.redirect(new URL('/contact?error=release_required', request.url))
        : NextResponse.json({ error: msg }, { status: 400 });

    if (!release_accepted_raw) {
      return reject('You must agree to the Submissions Release before submitting material.');
    }
    if (!release_signature) {
      return reject('An electronic signature is required to accept the Submissions Release.');
    }
    // Re-run the same check the browser ran, from the same shared function, so
    // the two can never diverge and a crafted request cannot skip it.
    if (!signatureMatchesName(release_signature, first_name, last_name)) {
      return reject('The typed signature must include the first and last name given on the form.');
    }
    if (!material_title)  return reject('A title for the submitted Material is required.');
    if (!material_nature) return reject('The nature of the submitted Material is required.');

    const pages = Number(material_pages_raw);
    if (!Number.isInteger(pages) || pages < 1) {
      return reject('The number of pages must be a whole number of 1 or more.');
    }
    material_pages = pages;

    if (!phone) return reject('A phone number is required for the Submissions Release.');
  }

  // Classify the channel BEFORE insert so it's stored atomically with the lead.
  const channel = classifyChannel({
    gclid:      gclid ?? null,
    fbclid:     fbclid ?? null,
    utm_medium: utm_medium ?? null,
    referrer:   referrer ?? null,
  });

  const id = randomBytes(16).toString('hex');
  const created_at = Date.now(); // milliseconds — existing behavior for contact_leads

  /* Release provenance is stamped SERVER-side.
     • release_version comes from the server's own constant, never from the
       request — otherwise a crafted POST could claim it agreed to some other
       wording than the one actually shown.
     • release_accepted_at reuses `created_at` so the agreement timestamp and
       the submission timestamp cannot disagree.
     • release_ip is best-effort and may be null; see clientIp(). */
  const release_accepted   = releaseRequired;
  const release_version    = releaseRequired ? SUBMISSION_RELEASE_VERSION : null;
  const release_accepted_at = releaseRequired ? created_at : null;
  const release_ip         = releaseRequired ? clientIp(request) : null;

  await run(
    `INSERT INTO contact_leads
       (id, first_name, last_name, email, message, company, available_title_id, created_at,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        gclid, fbclid, landing_page, referrer, channel,
        source, phone, material_title, material_nature, material_pages,
        release_accepted, release_signature, release_version, release_accepted_at, release_ip)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, first_name, last_name, email,
      message ?? null, company ?? null, available_title_id ?? null, created_at,
      utm_source    ?? null,
      utm_medium    ?? null,
      utm_campaign  ?? null,
      utm_term      ?? null,
      utm_content   ?? null,
      gclid         ?? null,
      fbclid        ?? null,
      landing_page  ?? null,
      referrer      ?? null,
      channel,
      source            ?? null,
      phone             ?? null,
      material_title    ?? null,
      material_nature   ?? null,
      material_pages    ?? null,
      release_accepted,
      release_signature ?? null,
      release_version,
      release_accepted_at,
      release_ip,
    ]
  );

  const lead: Lead = {
    id,
    first_name,
    last_name,
    email,
    message: message ?? null,
    company: company ?? null,
    available_title_id: available_title_id ?? null,
    show_title: null, // not needed in POST response; only populated by GET's JOIN
    created_at,
    source: source ?? null,
    phone: phone ?? null,
    material_title: material_title ?? null,
    material_nature: material_nature ?? null,
    material_pages: material_pages ?? null,
    release_accepted,
    release_signature: release_signature ?? null,
    release_version,
    release_accepted_at,
  };

  const settingRow = await queryOne<{ value: string }>('SELECT value FROM site_settings WHERE key = ?', ['leads_email']);
  const leadsEmail = settingRow?.value ?? 'sm@gototeam.com';

  // Look up the available title name to include in the notification email.
  // Do this synchronously before the fire-and-forget so the template renders correctly.
  let showTitle: string | undefined;
  if (available_title_id) {
    const titleRow = await queryOne<{ title: string }>('SELECT title FROM deck_sites WHERE id = ?', [available_title_id]);
    showTitle = titleRow?.title;
  }

  // Fire-and-forget — a mail failure must not break form submission
  // Distinct subject for signed submissions so they're filterable in the inbox
  // and don't read as ordinary enquiries.
  const subject = release_accepted
    ? `New Show Submission (release signed): ${first_name} ${last_name}${material_title ? ` — ${material_title}` : ''}`
    : `New Contact Lead: ${first_name} ${last_name}`;

  sendEmail(leadsEmail, subject, leadNotificationHtml(lead, showTitle))
    .catch((err) => console.error('[contact] notification email failed:', err));

  if (isFormPost) {
    return NextResponse.redirect(new URL('/contact?submitted=true', request.url));
  }

  return NextResponse.json({ data: lead }, { status: 201 });
}
