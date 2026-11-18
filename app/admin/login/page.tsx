import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getFinUser } from '@/lib/fin/auth';
import AdminLoginForm from './AdminLoginForm';

export const metadata: Metadata = { title: 'Sign in' };

export default async function AdminLoginPage() {
  // Already signed in to the admin area — go straight home.
  if (await getFinUser()) redirect('/admin');
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <AdminLoginForm />
    </div>
  );
}
