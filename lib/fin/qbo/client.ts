// Minimal QuickBooks Online accounting API client (plain fetch, no SDK).
// Only READS (query) and CREATES (purchase, attachable upload) are exposed — this
// app never edits or deletes anything in QuickBooks.
//
// Idempotency: every create is sent with Intuit's `requestid` query parameter.
// If Intuit receives the same requestid again (for the same company) it replays the
// original response instead of creating a second transaction. sync.ts derives the
// requestid from the charge id so a retry after a crash/timeout can't double-post.

import { QBO_MINOR_VERSION, qboApiBase } from './config';
import { getAccessToken } from './connection';

/** QuickBooks answered and refused the request (validation, permissions…). Nothing was created. */
export class QboRejectedError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'QboRejectedError';
  }
}

/** Network failure, timeout, 5xx or throttling — QuickBooks may or may not have processed it. */
export class QboUncertainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QboUncertainError';
  }
}

interface FaultError {
  Message?: string;
  Detail?: string;
  code?: string;
}

function faultMessage(data: unknown, status: number): string {
  const d = data as { Fault?: { Error?: FaultError[] }; fault?: { error?: Array<{ message?: string; detail?: string }> } };
  const errs = d?.Fault?.Error;
  if (errs?.length) {
    return errs
      .map((e) => [e.Message, e.Detail && e.Detail !== e.Message ? e.Detail : null, e.code ? `(code ${e.code})` : null]
        .filter(Boolean)
        .join(' — '))
      .join('; ');
  }
  const lower = d?.fault?.error;
  if (lower?.length) return lower.map((e) => [e.message, e.detail].filter(Boolean).join(' — ')).join('; ');
  return `HTTP ${status}`;
}

type Body = { json: unknown } | { form: FormData } | undefined;

async function send(path: string, method: 'GET' | 'POST', body: Body, requestId?: string): Promise<unknown> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const { accessToken, realmId } = await getAccessToken(attempt > 0);
    const url = new URL(`${qboApiBase()}/v3/company/${encodeURIComponent(realmId)}${path}`);
    url.searchParams.set('minorversion', QBO_MINOR_VERSION);
    if (requestId) url.searchParams.set('requestid', requestId);

    const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' };
    let payload: BodyInit | undefined;
    if (body && 'json' in body) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body.json);
    } else if (body && 'form' in body) {
      payload = body.form; // fetch sets the multipart boundary header
    }

    let res: Response;
    try {
      res = await fetch(url, { method, headers, body: payload, signal: AbortSignal.timeout(60_000) });
    } catch (err) {
      throw new QboUncertainError(`Couldn't reach QuickBooks: ${(err as Error).message}`);
    }
    const data = await res.json().catch(() => null);
    if (res.status === 401 && attempt === 0) continue; // token expired/revoked early → refresh once
    if (res.ok) {
      if (data === null) throw new QboUncertainError('QuickBooks returned an unreadable response.');
      // QBO sometimes returns 200 with a Fault body.
      if ((data as { Fault?: unknown }).Fault) throw new QboRejectedError(faultMessage(data, res.status), res.status);
      return data;
    }
    if (res.status >= 500 || res.status === 429) {
      throw new QboUncertainError(`QuickBooks is unavailable right now (${faultMessage(data, res.status)}).`);
    }
    throw new QboRejectedError(faultMessage(data, res.status), res.status);
  }
  throw new QboRejectedError('QuickBooks refused our sign-in (401) even after refreshing the token.', 401);
}

/** Run a QBO query (SELECT … FROM Account …). Returns QueryResponse. */
export async function qboQuery(sql: string): Promise<Record<string, unknown>> {
  const data = (await send(`/query?query=${encodeURIComponent(sql)}`, 'GET', undefined)) as {
    QueryResponse?: Record<string, unknown>;
  };
  return data.QueryResponse ?? {};
}

/** Create an entity (e.g. 'purchase'). Returns the created entity object. */
export async function qboCreate<T = Record<string, unknown>>(
  entity: 'purchase',
  json: unknown,
  requestId: string
): Promise<T> {
  const data = (await send(`/${entity}`, 'POST', { json }, requestId)) as Record<string, unknown>;
  const created = data.Purchase;
  if (!created) throw new QboUncertainError('QuickBooks did not return the created transaction.');
  return created as T;
}

/**
 * Upload a file as an Attachable linked to a transaction (multipart POST /upload).
 * Returns the Attachable Id.
 */
export async function qboUploadAttachable(opts: {
  entityType: 'Purchase';
  entityId: string;
  fileName: string;
  contentType: string;
  data: Buffer;
  requestId: string;
}): Promise<string> {
  const meta = {
    AttachableRef: [{ EntityRef: { type: opts.entityType, value: opts.entityId }, IncludeOnSend: false }],
    FileName: opts.fileName,
    ContentType: opts.contentType,
  };
  const form = new FormData();
  form.append('file_metadata_0', new Blob([JSON.stringify(meta)], { type: 'application/json' }), 'metadata.json');
  form.append('file_content_0', new Blob([new Uint8Array(opts.data)], { type: opts.contentType }), opts.fileName);
  const data = (await send('/upload', 'POST', { form }, opts.requestId)) as {
    AttachableResponse?: Array<{ Attachable?: { Id?: string }; Fault?: unknown }>;
  };
  const first = data.AttachableResponse?.[0];
  if (first?.Fault) throw new QboRejectedError(faultMessage(first, 400), 400);
  const id = first?.Attachable?.Id;
  if (!id) throw new QboUncertainError('QuickBooks did not return the uploaded attachment.');
  return id;
}
