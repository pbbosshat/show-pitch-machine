// GET  /api/contact — list all contact leads (auth required)
// POST /api/contact — submit a contact lead (public; accepts JSON or HTML form post)
//
// GET response:  { data: Lead[] }
// POST response: { data: Lead } with status 201, or redirect to /contact?submitted=true for form posts

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
  const caller = token ? getSessionUser(token) : null;
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

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? '';
  const isFormPost = contentType.includes('application/x-www-form-urlencoded');

  let first_name: string;
  let last_name: string;
  let email: string;
  let message: string | undefined;
  let company: string | undefined;
  let available_title_id: string | undefined;

  if (isFormPost) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    first_name          = params.get('first_name')?.trim() ?? '';
    last_name           = params.get('last_name')?.trim() ?? '';
    email               = params.get('email')?.trim() ?? '';
    message             = params.get('message')?.trim() || undefined;
    company             = params.get('company')?.trim() || undefined;
    available_title_id  = params.get('available_title_id')?.trim() || undefined;
  } else {
    const body = await request.json().catch(() => ({})) as {
      first_name?: string;
      last_name?: string;
      email?: string;
      message?: string;
      company?: string;
      available_title_id?: string;
    };
    first_name          = body.first_name?.trim() ?? '';
    last_name           = body.last_name?.trim() ?? '';
    email               = body.email?.trim() ?? '';
    message             = body.message?.trim() || undefined;
    company             = body.company?.trim() || undefined;
    available_title_id  = body.available_title_id?.trim() || undefined;
  }

  if (!first_name || !last_name || !email) {
    if (isFormPost) {
      return NextResponse.redirect(new URL('/contact?error=missing_fields', request.url));
    }
    return NextResponse.json({ error: 'first_name, last_name, and email are required' }, { status: 400 });
  }

  const id = randomBytes(16).toString('hex');
  const created_at = Date.now(); // milliseconds — existing behavior for contact_leads

  await run(
    'INSERT INTO contact_leads (id, first_name, last_name, email, message, company, available_title_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, first_name, last_name, email, message ?? null, company ?? null, available_title_id ?? null, created_at]
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
