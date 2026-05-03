import { Suspense } from 'react';
import type { Metadata } from 'next';
import LoginForm from './LoginForm';

export const metadata: Metadata = { title: 'Sign in' };

// searchParams is async in Next.js 15+
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from = '/dashboard' } = await searchParams;
  return (
    <Suspense>
      <LoginForm defaultRedirect={from} />
    </Suspense>
  );
}
