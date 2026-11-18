// /admin — MYE Admin home. The shell (auth + heading) is owned by the foundation;
// the body lives in _components/HomeContent.tsx (owned by the Amex agent).

import type { Metadata } from 'next';
import { requireFinPageUser } from '@/lib/fin/auth';
import HomeContent from './_components/HomeContent';

export const metadata: Metadata = { title: { absolute: 'Home | MYE Admin' } };

export default async function AdminHomePage() {
  const user = await requireFinPageUser();
  return (
    <>
      <h1 className="fin-page-title">Welcome, {user.name.split(' ')[0]}</h1>
      <p className="fin-page-sub">
        {user.role === 'admin'
          ? 'Statements, cardholders and QuickBooks sync for the MCS Show Amex card.'
          : 'Your Amex charges to tag with an account, Class and memo.'}
      </p>
      <HomeContent user={user} />
    </>
  );
}
