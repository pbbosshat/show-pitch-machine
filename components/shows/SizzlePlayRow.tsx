'use client';
// SizzlePlayRow — client wrapper that replaces the static "Watch →" anchor in MaterialsTab.
// Renders the existing row layout (platform badge, title, password chip) with an inline
// "▶ Play" button that mounts VimeoPlayerModal on click. Falls back to "Open on Vimeo →"
// link for cases where the embed fails or the user prefers a new tab.

import { useState } from 'react';
import Badge from '@/components/ui/Badge';
import VimeoPlayerModal from '@/components/ui/VimeoPlayerModal';
import type { PitchHub } from '@/types';

type SizzleItem = PitchHub['sizzles'][0];

export default function SizzlePlayRow({ sizzle }: { sizzle: SizzleItem }) {
  const [playing, setPlaying] = useState(false);

  return (
    <>
      {playing && sizzle.vimeo_url && (
        <VimeoPlayerModal
          vimeoUrl={sizzle.vimeo_url}
          title={sizzle.title ?? 'Sizzle Reel'}
          vimeoPassword={sizzle.vimeo_password}
          onClose={() => setPlaying(false)}
        />
      )}

      <div
        className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border-subtle)]"
        style={{ background: 'var(--bg-surface)' }}
      >
        <Badge variant="muted">{sizzle.platform}</Badge>

        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {sizzle.title || 'Untitled Reel'}
          </span>
          {sizzle.notes && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {sizzle.notes}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Password chip — shown when the reel is password-protected */}
          {sizzle.vimeo_password && (
            <span
              className="px-2 py-0.5 rounded text-[11px] font-mono"
              style={{
                background: 'rgba(234,179,8,0.1)',
                color: 'var(--status-inreview)',
                border: '1px solid rgba(234,179,8,0.2)',
              }}
            >
              pw: {sizzle.vimeo_password}
            </span>
          )}

          {sizzle.vimeo_url ? (
            <>
              {/* Primary: inline player button */}
              <button
                onClick={() => setPlaying(true)}
                className="text-xs font-semibold"
                style={{
                  color: '#ffffff',
                  background: 'var(--accent)',
                  border: 'none',
                  borderRadius: 5,
                  padding: '4px 10px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                ▶ Play
              </button>
              {/* Secondary: open in new tab for fallback */}
              <a
                href={sizzle.vimeo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs"
                style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
              >
                Open on Vimeo →
              </a>
            </>
          ) : sizzle.raw_value ? (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {sizzle.raw_value}
            </span>
          ) : null}
        </div>
      </div>
    </>
  );
}
