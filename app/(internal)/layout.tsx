'use client';
// (internal)/layout.tsx — wraps all internal Show Pitch Machine + Marketing CMS routes.
// Skips the Nav sidebar when on the root path (which renders the public marketing page).

import Nav from '@/components/ui/Nav';
import { usePathname } from 'next/navigation';

export default function InternalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/') return <>{children}</>;
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
      <Nav />
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
