'use client';
// MYE Admin top bar. Admin-only links are hidden from cardholders here, but the
// pages and APIs enforce the role server-side regardless.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const LINKS: Array<{ href: string; label: string; adminOnly: boolean }> = [
  { href: '/admin', label: 'Home', adminOnly: false },
  { href: '/admin/charges', label: 'Charges', adminOnly: false },
  { href: '/admin/statements', label: 'Statements', adminOnly: true },
  { href: '/admin/users', label: 'Users', adminOnly: true },
  { href: '/admin/quickbooks', label: 'QuickBooks', adminOnly: true },
];

export default function AdminNav({ user }: { user: { name: string; role: 'admin' | 'cardholder' } }) {
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch('/api/fin/auth/logout', { method: 'POST' });
    } finally {
      // Full navigation so the layout re-renders without the signed-in chrome.
      window.location.href = '/admin/login';
    }
  }

  return (
    <header className="fin-topbar">
      <div className="fin-brand">
        MYE <span>Admin</span>
      </div>
      <nav className="fin-nav" aria-label="MYE Admin">
        {LINKS.filter((l) => !l.adminOnly || user.role === 'admin').map((l) => {
          const on = l.href === '/admin' ? pathname === '/admin' : pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <Link key={l.href} href={l.href} className={on ? 'fin-nav-on' : undefined}>
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="fin-userbox">
        <span>
          {user.name}<span className="fin-userrole"> · {user.role === 'admin' ? 'Admin' : 'Cardholder'}</span>
        </span>
        <button type="button" className="fin-btn fin-btn-sm" onClick={signOut} disabled={signingOut}>
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </header>
  );
}
