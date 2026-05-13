/**
 * GET /api/users
 * Called by: Team management page in admin UI (browser, authenticated)
 * Auth: spm_session cookie — owner or admin role required; returns 403 otherwise
 * Response: { data: UserRow[] } — all team members with has_password and
 *   pending_invite computed fields so the UI can show invite status
 *
 * Only owner/admin roles may list team members to prevent exec users from
 * harvesting colleague email addresses.
 */

/**
 * POST /api/users
 * Called by: Invite-user form in admin UI (browser, authenticated owner/admin)
 * Auth: spm_session cookie — owner or admin role required; returns 403 otherwise
 * Body: { email: string; name?: string; role?: 'owner'|'admin'|'exec' }
 * Response: { data: { id, name, email, role } } at 201 on success;
 *   { data, warning, setupUrl } at 201 when email delivery fails (so admin can
 *   share the setup link manually); { error } with 400/409 on validation failure
 *
 * Creates a pending user record, generates a 72-hour invite token, and emails
 * the /setup-account?token=... link via Gmail service account. Role defaults to
 * 'exec' when omitted or unrecognised. The invite email failing does NOT fail
 * the request — the setupUrl is returned so the admin can share it another way.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getSessionUser, ensureAuthSchema, SESSION_COOKIE, createInviteToken } from '@/lib/auth';
import { query, run, queryOne } from '@/lib/db';
import { sendEmail } from '@/lib/gmail';

const VALID_ROLES = ['owner', 'admin', 'exec'] as const;

function isPrivileged(role: string | null): boolean {
  return role === 'owner' || role === 'admin';
}

function inviteEmailHtml(inviteeName: string, inviterName: string, setupUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>You've been invited</title>
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
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111;">You've been invited</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
              <strong style="color:#111;">${inviterName}</strong> has invited you to join the <strong style="color:#111;">Show Pitch Machine</strong> — MY Entertainment's internal pitch and pipeline tool.
            </p>
            <p style="margin:0 0 28px;font-size:14px;color:#71717a;line-height:1.6;">
              Click the button below to set up your account. This link expires in <strong>72 hours</strong>.
            </p>

            <!-- CTA button -->
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:8px;background:#e53935;">
                  <a href="${setupUrl}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#fff;text-decoration:none;letter-spacing:0.01em;">
                    Set up your account →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:28px 0 0;font-size:12px;color:#a1a1aa;">
              Or copy this link into your browser:<br>
              <span style="color:#3b82f6;word-break:break-all;">${setupUrl}</span>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #f4f4f5;">
            <p style="margin:0;font-size:12px;color:#a1a1aa;">
              If you didn't expect this invitation, you can safely ignore this email.
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
  await ensureAuthSchema();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const caller = token ? await getSessionUser(token) : null;
  if (!caller || !isPrivileged(caller.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await query<{
    id: string;
    name: string;
    email: string;
    role: string | null;
    created_at: number;
    has_password: number;
    pending_invite: number;
  }>(
    `SELECT id, name, email, role, created_at,
            CASE WHEN password_hash IS NOT NULL THEN 1 ELSE 0 END AS has_password,
            CASE WHEN invite_token IS NOT NULL AND invite_expires > ? THEN 1 ELSE 0 END AS pending_invite
     FROM team_users ORDER BY created_at ASC`,
    [Date.now()]
  );

  return NextResponse.json({ data: users });
}

export async function POST(request: NextRequest) {
  await ensureAuthSchema();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const caller = token ? await getSessionUser(token) : null;
  if (!caller || !isPrivileged(caller.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({})) as {
    email?: string;
    name?: string;
    role?: string;
  };

  const email = body.email?.toLowerCase().trim();
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }

  const existing = await queryOne<{ id: string }>('SELECT id FROM team_users WHERE email = ?', [email]);
  if (existing) {
    return NextResponse.json({ error: 'A user with that email already exists' }, { status: 409 });
  }

  const role = VALID_ROLES.includes(body.role as typeof VALID_ROLES[number])
    ? (body.role as string)
    : 'exec';
  const name = body.name?.trim() || email;
  const userId = randomBytes(16).toString('hex');

  await run(
    'INSERT INTO team_users (id, name, email, role, created_at) VALUES (?, ?, ?, ?, ?)',
    [userId, name, email, role, Date.now()]
  );

  const inviteToken = await createInviteToken(userId);
  const origin = new URL(request.url).origin;
  const setupUrl = `${origin}/setup-account?token=${inviteToken}`;

  try {
    await sendEmail(
      email,
      "You've been invited to MY Entertainment",
      inviteEmailHtml(name, caller.name, setupUrl)
    );
  } catch (err) {
    // Don't fail the invite if email delivery fails — log it and return the setup URL
    // so the admin can share it manually.
    console.error('[invite] email send failed:', err);
    return NextResponse.json({
      data: { id: userId, name, email, role },
      warning: 'User created but invite email failed to send.',
      setupUrl,
    }, { status: 201 });
  }

  return NextResponse.json({ data: { id: userId, name, email, role } }, { status: 201 });
}
