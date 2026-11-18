// MYE Admin layout — the walled-off finance area. NOT inside app/(internal):
// no staff nav, no staff auth. Signed out (e.g. /admin/login) it renders the page
// bare; signed in it adds the top bar + nav. Each page still guards itself with
// requireFinPageUser()/requireFinPageAdmin() from lib/fin/auth.ts — the layout
// is presentation only and is not an auth boundary.

import type { Metadata } from 'next';
import { getFinUser } from '@/lib/fin/auth';
import AdminNav from './_components/AdminNav';
import './admin.css';

export const metadata: Metadata = {
  title: { template: '%s | MYE Admin', default: 'MYE Admin' },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getFinUser();

  if (!user) {
    return <div className="fin-shell">{children}</div>;
  }

  return (
    <div className="fin-shell">
      <AdminNav user={{ name: user.name, role: user.role }} />
      <main className="fin-main">{children}</main>
    </div>
  );
}
