'use client';
// Left sidebar — two modes: Shows (pitch machine tools) and Marketing (public site CMS).
// Mode persists in localStorage; auto-switches based on active route.

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import UniversalSearch from '@/components/ui/UniversalSearch';

type SidebarMode = 'shows' | 'marketing';

interface NavItem { href: string; label: string; icon: React.ReactNode; }
interface NavGroup { items: NavItem[]; indent?: boolean; }

function IconDashboard() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
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

function IconBuilding() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>;
}
function IconUsers() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}
// Sizzle play icon — unicode triangle with a styled wrapper to match the badge aesthetic
function IconSizzle() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 18,
        height: 18,
        fontSize: 14,
        lineHeight: 1,
      }}
    >
      ▶
    </span>
  );
}

// Inbox tray — represents contact form leads from the public site
function IconLeads() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>;
}

// Pulse / chart icon — represents live analytics dashboard
function IconAnalytics() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  );
}

// Bar chart / signal icon — represents buying activity score rankings
function IconNetIntel() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6"  y1="20" x2="6"  y2="14"/>
      <line x1="2"  y1="20" x2="22" y2="20"/>
    </svg>
  );
}

// Deck Sites icon — presentation screen with a stand, representing pitch decks
function IconDecks() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
    </svg>
  );
}
// Broadcast antenna — represents TV networks / platforms
function IconNetwork() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
      <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
      <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none"/>
    </svg>
  );
}

const showsNavGroups: NavGroup[] = [
  {
    items: [
      { href: '/network-intel', label: 'Net Intel', icon: <IconNetIntel /> },
    ],
  },
  {
    indent: true,
    items: [
      { href: '/buyers',          label: 'Buyers',   icon: <IconBuyers /> },
      { href: '/market/networks', label: 'Networks', icon: <IconNetwork /> },
      { href: '/show-db',         label: 'Show DB',  icon: <IconShows /> },
      { href: '/market/prodcos',  label: 'Prod Cos', icon: <IconBuilding /> },
    ],
  },
  {
    items: [
      { href: '/pipeline',      label: 'Pipeline',  icon: <IconPipeline /> },
      { href: '/decks',         label: 'Decks',     icon: <IconDecks /> },
      { href: '/sizzles',       label: 'Sizzles',   icon: <IconSizzle /> },
      { href: '/vimeo-library', label: 'Vimeo Lib', icon: <IconSizzle /> },
      { href: '/build',         label: 'Build',     icon: <IconBuild /> },
    ],
  },
];

const marketingNavItems: NavItem[] = [
  { href: '/marketing',           label: 'Analytics',     icon: <IconAnalytics /> },
  { href: '/marketing/shows',     label: 'Shows',         icon: <IconShows /> },
  { href: '/marketing/press',     label: 'Press',         icon: <IconFile /> },
  { href: '/marketing/available', label: 'Available',     icon: <IconPipeline /> },
  { href: '/marketing/genres',    label: 'Genres',        icon: <IconTag /> },
  { href: '/marketing/content',   label: 'Content',       icon: <IconEdit /> },
  { href: '/leads',               label: 'Leads',         icon: <IconLeads /> },
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

  // Profile modal state
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('nav-mode') as SidebarMode | null;
    if (saved === 'shows' || saved === 'marketing') setMode(saved);
  }, []);

  useEffect(() => {
    fetch('/api/me').then((r) => r.ok ? r.json() : null).then((d) => {
      if (d?.data) setUser(d.data);
    }).catch(() => {});
  }, []);

  function openProfile() {
    setProfileName(user?.name ?? '');
    setNameMsg(null);
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setPwMsg(null);
    setProfileOpen(true);
  }

  async function saveName() {
    if (!profileName.trim()) return;
    setNameSaving(true);
    setNameMsg(null);
    try {
      const r = await fetch('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: profileName }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        setUser((u) => u ? { ...u, name: profileName.trim() } : u);
        setNameMsg({ ok: true, text: 'Name updated.' });
      } else {
        setNameMsg({ ok: false, text: d.error || `Error ${r.status}` });
      }
    } catch (e) {
      setNameMsg({ ok: false, text: (e as Error).message });
    } finally {
      setNameSaving(false);
    }
  }

  async function savePassword() {
    if (!newPw) return;
    if (newPw !== confirmPw) { setPwMsg({ ok: false, text: 'Passwords do not match.' }); return; }
    if (newPw.length < 8) { setPwMsg({ ok: false, text: 'Password must be at least 8 characters.' }); return; }
    setPwSaving(true);
    setPwMsg(null);
    try {
      const r = await fetch('/api/me/password', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        setCurrentPw('');
        setNewPw('');
        setConfirmPw('');
        setPwMsg({ ok: true, text: 'Password changed.' });
      } else {
        setPwMsg({ ok: false, text: d.error || `Error ${r.status}` });
      }
    } catch (e) {
      setPwMsg({ ok: false, text: (e as Error).message });
    } finally {
      setPwSaving(false);
    }
  }

  // Auto-switch mode based on active route — /leads lives under Marketing
  useEffect(() => {
    if (pathname.startsWith('/marketing') || pathname.startsWith('/leads')) setMode('marketing');
    else setMode('shows');
  }, [pathname]);

  const switchMode = (m: SidebarMode) => {
    setMode(m);
    localStorage.setItem('nav-mode', m);
    // Each mode button navigates to its command center
    if (m === 'shows')     router.push('/production');
    if (m === 'marketing') router.push('/marketing');
  };

  const navGroups: NavGroup[] = mode === 'shows'
    ? showsNavGroups
    : [{ items: marketingNavItems }];

  const isActive = (href: string) => {
    // Exact-match roots so /marketing doesn't stay active on /marketing/shows
    if (href === '/dashboard' || href === '/marketing') return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <>
    <nav
      className="flex flex-col w-56 shrink-0"
      style={{ height: '100vh', position: 'sticky', top: 0, background: 'var(--bg-surface)', borderRight: '1px solid var(--border-subtle)' }}
    >
      {/* Logo — links to dashboard, tooltip on hover */}
      <Link href="/dashboard" title="Dashboard" className="flex items-center px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Show Pitch Machine" style={{ width: 191, display: 'block' }} />
      </Link>

      {/* Shows / Marketing mode toggle */}
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

      {/* Nav links */}
      <ul className="flex-1 flex flex-col p-3 mt-1 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <li key={gi}>
            {gi > 0 && (
              <div className="my-1.5" style={{ borderTop: '1px solid var(--border-subtle)' }} />
            )}
            <ul
              className="flex flex-col gap-0.5"
              style={group.indent ? {
                marginLeft: 8,
                paddingLeft: 8,
                borderLeft: '1px solid var(--border-subtle)',
              } : undefined}
            >
              {group.items.map(({ href, label, icon }) => {
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
            </ul>
          </li>
        ))}

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

      {/* Universal search — compact bar anchored to the sidebar bottom */}
      <div className="px-3 pb-2 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <UniversalSearch />
      </div>

      {/* Settings — Users link for owner/admin */}
      {user && (user.role === 'owner' || user.role === 'admin') && (
        <div className="px-3 pb-1" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
          <Link
            href="/settings/users"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all"
            style={{
              color: pathname.startsWith('/settings/users') ? 'var(--accent)' : 'var(--text-secondary)',
              background: pathname.startsWith('/settings/users') ? 'var(--bg-surface-alt)' : 'transparent',
              borderLeft: pathname.startsWith('/settings/users') ? '3px solid var(--accent)' : '3px solid transparent',
            }}
          >
            <span style={{ opacity: pathname.startsWith('/settings/users') ? 1 : 0.7 }}><IconUsers /></span>
            Users
          </Link>
        </div>
      )}

      {/* User identity + logout — click avatar/name area to open profile modal */}
      {user && (
        <div className="px-3 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <button
              onClick={openProfile}
              title="Edit profile"
              className="flex items-center gap-2 flex-1 min-w-0 rounded-md px-1 py-0.5 text-left hover:bg-[var(--bg-surface-alt)] transition-colors"
              style={{ cursor: 'pointer' }}
            >
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
            </button>
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

    </nav>

      {/* Profile modal — rendered via portal so it escapes the nav stacking context */}
      {profileOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setProfileOpen(false); }}
        >
          <div
            className="flex flex-col gap-5 rounded-xl p-6 w-full max-w-sm"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Edit Profile</h2>
              <button
                onClick={() => setProfileOpen(false)}
                className="rounded p-1 hover:bg-[var(--bg-surface-alt)]"
                style={{ color: 'var(--text-muted)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Name */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Display Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="rounded-md px-3 py-2 text-sm w-full"
                style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}
                onKeyDown={(e) => { if (e.key === 'Enter') saveName(); }}
              />
              {nameMsg && (
                <p className="text-xs" style={{ color: nameMsg.ok ? 'var(--success, #22c55e)' : 'var(--error, #ef4444)' }}>{nameMsg.text}</p>
              )}
              <button
                onClick={saveName}
                disabled={nameSaving || !profileName.trim()}
                className="rounded-md px-3 py-2 text-xs font-semibold transition-opacity"
                style={{ background: 'var(--accent)', color: '#fff', opacity: nameSaving || !profileName.trim() ? 0.5 : 1 }}
              >
                {nameSaving ? 'Saving…' : 'Save Name'}
              </button>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)' }} />

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Change Password</label>
              <input
                type="password"
                placeholder="Current password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="rounded-md px-3 py-2 text-sm w-full"
                style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}
              />
              <input
                type="password"
                placeholder="New password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="rounded-md px-3 py-2 text-sm w-full"
                style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="rounded-md px-3 py-2 text-sm w-full"
                style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}
                onKeyDown={(e) => { if (e.key === 'Enter') savePassword(); }}
              />
              {pwMsg && (
                <p className="text-xs" style={{ color: pwMsg.ok ? 'var(--success, #22c55e)' : 'var(--error, #ef4444)' }}>{pwMsg.text}</p>
              )}
              <button
                onClick={savePassword}
                disabled={pwSaving || !newPw}
                className="rounded-md px-3 py-2 text-xs font-semibold transition-opacity"
                style={{ background: 'var(--accent)', color: '#fff', opacity: pwSaving || !newPw ? 0.5 : 1 }}
              >
                {pwSaving ? 'Saving…' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
