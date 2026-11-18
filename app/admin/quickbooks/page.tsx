import type { Metadata } from 'next';
import { requireFinPageAdmin } from '@/lib/fin/auth';
import { getQboStatus, getSyncLog } from '@/lib/fin/qbo/status';
import QuickBooksPanel from './QuickBooksPanel';

export const metadata: Metadata = { title: 'QuickBooks' };

function first(v: string | string[] | undefined): string | null {
  return (Array.isArray(v) ? v[0] : v) ?? null;
}

export default async function AdminQuickBooksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireFinPageAdmin();
  const sp = await searchParams;
  const [status, log] = await Promise.all([getQboStatus(), getSyncLog({ limit: 50 })]);

  return (
    <>
      <h1 className="fin-page-title">QuickBooks</h1>
      <p className="fin-page-sub">
        Connection to QuickBooks Online, the account and Class lists used for tagging, and the record of every charge sent.
      </p>
      <QuickBooksPanel
        initialStatus={status}
        initialLog={log}
        flash={{
          connected: first(sp.connected) === '1',
          error: first(sp.error),
          warning: first(sp.warning),
          switched: first(sp.switched),
        }}
      />
    </>
  );
}
