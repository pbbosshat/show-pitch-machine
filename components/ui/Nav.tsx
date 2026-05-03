'use client';
// Left sidebar — two modes: Shows (pitch machine tools) and Marketing (public site CMS).
// Mode persists in localStorage; auto-switches based on active route.

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

type SidebarMode = 'shows' | 'marketing';

interface NavItem { href: string; label: string; icon: React.ReactNode; }

function IconDashboard() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
}
function IconIntelligence() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 1 7 7c0 2.5-1.3 4.7-3.3 6L15 21H9l-.3-5.9A7 7 0 0 1 12 2z"/><path d="M9 21h6"/></svg>;
}
function IconBuyers() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M17 11l2 2 4-4"/></svg>;
}
function IconPipeline() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 10h16M4 14h10M4 18h6"/></svg>;
}
function IconBuild() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
}
function IconShows() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3l-4 4-4-4"/></svg>;
}
function IconGlobe() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
}
function IconFile() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
}
function IconTag() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
}
function IconEdit() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
}
function IconExternalLink() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
}
function IconLogout() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
}

const showsNavItems: NavItem[] = [
  { href: '/dashboard',    label: 'Dashboard',    icon: <IconDashboard /> },
  { href: '/intelligence', label: 'Intelligence', icon: <IconIntelligence /> },
  { href: '/buyers',       label: 'Buyers',       icon: <IconBuyers /> },
  { href: '/pipeline',     label: 'Pipeline',     icon: <IconPipeline /> },
  { href: '/build',        label: 'Build',        icon: <IconBuild /> },
  { href: '/shows',        label: 'Show DB',      icon: <IconShows /> },
];

const marketingNavItems: NavItem[] = [
  { href: '/marketing',           label: 'Site Overview', icon: <IconGlobe /> },
  { href: '/marketing/shows',     label: 'Shows',         icon: <IconShows /> },
  { href: '/marketing/press',     label: 'Press',         icon: <IconFile /> },
  { href: '/marketing/available', label: 'Available',     icon: <IconPipeline /> },
  { href: '/marketing/genres',    label: 'Genres',        icon: <IconTag /> },
  { href: '/marketing/content',   label: 'Content',       icon: <IconEdit /> },
];

interface NavUser { id: string; name: string; email: string; role: string | null; }

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mode, setMode] = useState<SidebarMode>('shows');
  const [user, setUser] = useState<NavUser | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('nav-mode') as SidebarMode | null;
    if (saved === 'shows' || saved === 'marketing') setMode(saved);
  }, []);

  useEffect(() => {
    fetch('/api/me').then((r) => r.ok ? r.json() : null).then((d) => {
      if (d?.data) setUser(d.data);
    }).catch(() => {});
  }, []);

  // Auto-switch to marketing when navigating to /marketing/* routes
  useEffect(() => {
    if (pathname.startsWith('/marketing')) setMode('marketing');
  }, [pathname]);

  const switchMode = (m: SidebarMode) => {
    setMode(m);
    localStorage.setItem('nav-mode', m);
  };

  const navItems = mode === 'shows' ? showsNavItems : marketingNavItems;

  const isActive = (href: string) => {
    if (href === '/dashboard' || href === '/marketing') return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="flex flex-col w-56 shrink-0"
      style={{ minHeight: '100vh', background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)' }}
    >
      {/* Shows / Marketing mode toggle — top of sidebar */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex rounded overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
          {(['shows', 'marketing'] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className="flex-1 text-[10px] font-bold py-1.5 uppercase tracking-wider transition-all"
              style={{
                background: mode === m ? 'var(--accent)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--text-muted)',
              }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* MYE wordmark */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold leading-none" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--accent)' }}>MY</span>
          <span className="text-[11px] font-semibold tracking-wider leading-none" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--text-primary)', letterSpacing: '0.12em' }}>ENTERTAINMENT</span>
        </div>
      </div>

      {/* Nav links */}
      <ul className="flex-1 flex flex-col gap-0.5 p-3 mt-1">
        {navItems.map(({ href, label, icon }) => {
          const active = isActive(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all"
                style={{
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  background: active ? 'var(--bg-surface-alt)' : 'transparent',
                  borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
                }}
              >
                <span style={{ opacity: active ? 1 : 0.7 }}>{icon}</span>
                {label}
              </Link>
            </li>
          );
        })}

        {/* Preview site link — Marketing mode only */}
        {mode === 'marketing' && (
          <li className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <a
              href="/site"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              <IconExternalLink />
              Preview Site
            </a>
          </li>
        )}
      </ul>

      {/* User identity + logout */}
      {user && (
        <div className="px-3 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            {/* Initials avatar */}
            <div
              className="flex items-center justify-center rounded-full text-[10px] font-bold shrink-0"
              style={{ width: 28, height: 28, background: 'var(--accent-dim)', color: 'var(--accent)' }}
            >
              {initials(user.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate leading-tight" style={{ color: 'var(--text-primary)' }}>{user.name}</p>
              <p className="text-[10px] leading-tight capitalize" style={{ color: 'var(--text-muted)' }}>{user.role ?? 'user'}</p>
            </div>
            {/* Logout button */}
            <button
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                router.push('/login');
              }}
              title="Sign out"
              className="shrink-0 flex items-center justify-center rounded p-1 hover:bg-[var(--bg-surface-alt)]"
              style={{ color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 150ms ease' }}
            >
              <IconLogout />
            </button>
          </div>
        </div>
      )}

      {/* Product label — changes with mode */}
      <div className="px-5 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <p
          className="text-[11px] tracking-[0.2em] uppercase"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", color: 'var(--text-muted)' }}
        >
          {mode === 'shows' ? 'Show Pitch Machine' : 'Marketing CMS'}
        </p>
      </div>
    </nav>
  );
}
