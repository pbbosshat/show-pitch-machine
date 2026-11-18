import type { Metadata } from 'next';
import { requireFinPageAdmin } from '@/lib/fin/auth';
import UsersManager from './UsersManager';

export const metadata: Metadata = { title: 'Users' };

export default async function AdminUsersPage() {
  const admin = await requireFinPageAdmin();
  return (
    <>
      <h1 className="fin-page-title">Users</h1>
      <p className="fin-page-sub">Who can sign in to MYE Admin, and which Amex Card Member names belong to whom.</p>
      <UsersManager currentUserId={admin.id} />
    </>
  );
}
