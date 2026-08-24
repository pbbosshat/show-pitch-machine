/**
 * POST /api/connections/queue/verify
 * Auth: Bearer INGEST_API_KEY.
 * Body: { profiles: [{ url, sent_label?, note_preview? }] }
 * Response: { ok: true, verified: number, unmatched: number }
 *
 * Independent confirmation that a LinkedIn invite actually went out.
 *
 * WHY: until now "invite pending" was only ever the poller's own claim. Bubba
 * said it sent, and the app believed it — a single unchecked source for the one
 * step that leaves the building. If the engine silently failed, or throttled, or
 * a profile URL was wrong, every row would still read exactly the same.
 *
 * The worker on Bang reads Shawn's own LinkedIn "Sent invitations" page and
 * posts the profiles it finds there. That is LinkedIn's own record, not ours, so
 * a match is real evidence: this person genuinely has a pending invite from him.
 *
 * Matching is on the profile SLUG (/in/<slug>), not the whole URL — stored URLs
 * vary between http/https, with and without www or a trailing slash, depending
 * on whether they came from Apollo, the search worker, or a human paste.
 */
import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';

export const runtime = 'nodejs';

function checkBearer(req: NextRequest): boolean {
  const key = process.env.INGEST_API_KEY;
  if (!key) return false;
  const auth = req.headers.get('authorization') ?? '';
  return auth.startsWith('Bearer ') && auth.slice(7) === key;
}

/** '/in/jenny-tartikoff/' -> 'jenny-tartikoff'. Null when it isn't a profile URL. */
function slugOf(url: string | null | undefined): string | null {
  const m = (url ?? '').match(/linkedin\.com\/in\/([^/?#]+)/i);
  return m ? decodeURIComponent(m[1]).toLowerCase() : null;
}

export async function POST(request: NextRequest) {
  if (!checkBearer(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      profiles?: { url?: string; sent_label?: string; note_preview?: string }[];
    };
    const profiles = Array.isArray(body.profiles) ? body.profiles : [];
    if (!profiles.length) {
      return NextResponse.json({ error: 'profiles[] is required' }, { status: 400 });
    }

    // slug -> what LinkedIn says about it
    const seen = new Map<string, { sent_label: string; note_preview: string }>();
    for (const p of profiles) {
      const slug = slugOf(p.url);
      if (slug) {
        seen.set(slug, {
          sent_label: (p.sent_label ?? '').slice(0, 60),
          note_preview: (p.note_preview ?? '').slice(0, 120),
        });
      }
    }

    // Only rows the poller claims it handled. A row still 'pending'/'picked' has
    // not been attempted yet, so its absence from LinkedIn proves nothing.
    const rows = await query<{ id: string; lead_id: string; linkedin_url: string | null }>(
      `SELECT q.id, q.lead_id, cl.linkedin_url
         FROM connect_queue q
         JOIN connection_leads cl ON cl.id = q.lead_id
        WHERE q.channel = 'linkedin'
          AND q.status IN ('pending_invite', 'sent', 'picked')`
    );

    let verified = 0;
    const now = Date.now();
    for (const r of rows) {
      const slug = slugOf(r.linkedin_url);
      if (!slug) continue;
      const hit = seen.get(slug);
      if (!hit) continue;

      await run(
        `UPDATE connect_queue
            SET status = 'invite_confirmed', result_detail = ?, completed_at = ?
          WHERE id = ?`,
        [
          `confirmed on LinkedIn${hit.sent_label ? ` — ${hit.sent_label}` : ''}`,
          now,
          r.id,
        ]
      );
      verified++;
    }

    return NextResponse.json({
      ok: true,
      verified,
      // Profiles on his Sent list that we did not queue — invites he sent by
      // hand, or through another tool. Reported, never acted on.
      unmatched: Math.max(0, seen.size - verified),
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
