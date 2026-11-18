import type { Metadata } from 'next';
import { requireFinPageUser } from '@/lib/fin/auth';
import ChargesManager from './ChargesManager';
import '../_components/amex/amex.css';

export const metadata: Metadata = { title: 'Charges' };

export default async function ChargesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireFinPageUser();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const isAdmin = user.role === 'admin';
  return (
    <>
      <h1 className="fin-page-title">{isAdmin ? 'Charges' : 'My charges'}</h1>
      <p className="fin-page-sub">
        Give each charge an Account, a Class and a memo, and attach the receipt if you have it. Save each row when it&apos;s done.
      </p>
      <ChargesManager
        isAdmin={isAdmin}
        currentUserName={user.name}
        initialCardholder={isAdmin ? one(sp.cardholder) : ''}
        initialStatus={one(sp.status)}
      />
    </>
  );
}
