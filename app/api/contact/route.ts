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
 *               gclid?, fbclid?, landing_page?, referrer? }
 * Body (form): same fields as application/x-www-form-urlencoded
 * Response: { data: Lead } at 201, or HTTP redirect to /contact?submitted=true
 *   for form posts (to support browsers with no JS)
 *
 * Persists the lead (including attribution fields), classifies the channel,
 * then fires a notification email to leads_email (from site_settings) in
 * fire-and-forget mode — mail failure must not block the 201 response.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { query, queryOne, run } from '@/lib/db';
import { getSessionUser, SESSION_COOKIE } from '@/lib/auth';
import { sendEmail } from '@/lib/gmail';

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
                  <span style="font-size:15px;color:#111;">${lead.first_name} ${lead.last_name}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;">
                  <span style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#a1a1aa;">Email</span><br>
                  <a href="mailto:${lead.email}" style="font-size:15px;color:#3b82f6;text-decoration:none;">${lead.email}</a>
                </td>
              </tr>
              ${lead.company ? `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;">
                  <span style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#a1a1aa;">Company</span><br>
                  <span style="font-size:15px;color:#111;">${lead.company.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
                </td>
              </tr>` : ''}
              ${showTitle ? `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;">
                  <span style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#a1a1aa;">Show Requested</span><br>
                  <span style="font-size:15px;color:#111;">${showTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
                </td>
              </tr>` : ''}
              ${lead.message ? `
              <tr>
                <td style="padding:10px 0;">
                  <span style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#a1a1aa;">Message</span><br>
                  <span style="font-size:15px;color:#111;line-height:1.6;white-space:pre-wrap;">${lead.message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
                </td>
              </tr>` : ''}
            </table>
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
            cl.available_title_id, cl.created_at, at.title AS show_title
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
  }

  if (!first_name || !last_name || !email) {
    if (isFormPost) {
      return NextResponse.redirect(new URL('/contact?error=missing_fields', request.url));
    }
    return NextResponse.json({ error: 'first_name, last_name, and email are required' }, { status: 400 });
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

  await run(
    `INSERT INTO contact_leads
       (id, first_name, last_name, email, message, company, available_title_id, created_at,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        gclid, fbclid, landing_page, referrer, channel)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  sendEmail(leadsEmail, `New Contact Lead: ${first_name} ${last_name}`, leadNotificationHtml(lead, showTitle))
    .catch((err) => console.error('[contact] notification email failed:', err));

  if (isFormPost) {
    return NextResponse.redirect(new URL('/contact?submitted=true', request.url));
  }

  return NextResponse.json({ data: lead }, { status: 201 });
}
