'use client';
// Browser-side helpers for the Amex screens: fetch wrapper, shared types and the
// QuickBooks Account/Class list loader (GET /api/fin/qbo/lists, owned by the QBO side).

import { useEffect, useState } from 'react';
import type { ChargeView, StatementSummary } from '@/lib/fin/amex/charges';

export type { ChargeView, StatementSummary };

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  if (init?.body && typeof init.body === 'string') headers['Content-Type'] = 'application/json';
  const res = await fetch(url, { ...init, headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
  return data as T;
}

export interface QboAccount { qbo_id: string; acct_num: string | null; name: string; fully_qualified_name: string | null; account_type?: string | null }
export interface QboClass { qbo_id: string; name: string; fully_qualified_name: string | null }
export interface QboLists {
  accounts: QboAccount[];
  classes: QboClass[];
  refreshedAt: string | null;
  /** The Amex card account (never offered as a tag). Sent by the lists API when known. */
  cardAccountQboId?: string | null;
}

/** Account + Class lists from the QuickBooks cache. `error` explains why they are missing. */
export function useQboLists() {
  const [lists, setLists] = useState<QboLists>({ accounts: [], classes: [], refreshedAt: null, cardAccountQboId: null });
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let live = true;
    api<QboLists>('/api/fin/qbo/lists')
      .then((l) => {
        if (!live) return;
        setLists({ accounts: l.accounts ?? [], classes: l.classes ?? [], refreshedAt: l.refreshedAt ?? null, cardAccountQboId: l.cardAccountQboId ?? null });
        if (!l.accounts?.length || !l.classes?.length) {
          setError('The QuickBooks Account and Class lists are empty. An admin needs to refresh them on the QuickBooks page.');
        }
      })
      .catch((e: ApiError) => {
        if (!live) return;
        setError(
          e.status === 404
            ? "The QuickBooks Account and Class lists aren't available yet. An admin needs to connect QuickBooks first."
            : `Couldn't load the QuickBooks lists: ${e.message}`
        );
      })
      .finally(() => live && setLoaded(true));
    return () => { live = false; };
  }, []);
  return { lists, error, loaded };
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** "2026-11-03" -> "11/03/26" (dates are calendar dates; no time zone shifting). */
export function shortDate(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  return `${m}/${d}/${y.slice(2)}`;
}

export function shortDateTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

/** Upload a receipt as the raw request body (see the receipt route for why). */
export async function uploadReceipt(chargeId: number, file: File) {
  if (file.size > MAX_RECEIPT_BYTES) throw new ApiError('That file is over 10 MB.', 413);
  const type = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : '');
  if (!(type === 'application/pdf' || (type.startsWith('image/') && !type.includes('svg')))) {
    throw new ApiError('Receipts must be a photo or a PDF.', 400);
  }
  return api<{ receipt: { file_name: string; mime_type: string; size_bytes: number } }>(
    `/api/fin/charges/${chargeId}/receipt`,
    { method: 'PUT', body: file, headers: { 'Content-Type': type, 'X-File-Name': encodeURIComponent(file.name) } }
  );
}

export interface SyncResult { chargeId: number; ok: boolean; qboTxnId?: string; error?: string }

/** POST /api/fin/qbo/sync. Returns null with a readable message when the sync service isn't there yet. */
export async function runSync(body: { chargeIds?: number[]; statementId?: number }): Promise<{ results: SyncResult[] }> {
  try {
    return await api<{ results: SyncResult[] }>('/api/fin/qbo/sync', { method: 'POST', body: JSON.stringify(body) });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      throw new ApiError("QuickBooks sync isn't available yet. Connect QuickBooks on the QuickBooks page first.", 404);
    }
    throw e;
  }
}
