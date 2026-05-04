'use client';
// SizzleCard — clickable thumbnail card for a single sizzle reel.
// thumbnail_url is pre-built server-side (build-sizzle-thumbnails.ts) and passed as prop —
// no client-side fetch needed. Clicking opens VimeoPlayerModal (inline, no new tab).
// Placeholder shows project title when no thumbnail is available.

import { useState } from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import VimeoPlayerModal from '@/components/ui/VimeoPlayerModal';
import ThumbnailPickerModal from '@/components/shows/ThumbnailPickerModal';

export interface SizzleCardData {
  id: string;
  ip_catalog_id: string;
  project_title: string;
  sheet_source: string | null;
  vimeo_url: string | null;
  vimeo_password: string | null;
  platform: string | null;
  raw_value: string | null;
  notes: string | null;
  last_email_date: string | null;
  email_thread_count: number;
  thumbnail_url: string | null;
}

function sheetSourceVariant(source: string | null): 'greenlit' | 'inreview' | 'muted' | 'unknown' {
  if (!source) return 'unknown';
  const s = source.toLowerCase();
  if (s === 'priorities' || s === 'full-dev' || s === 'bc-mye') return 'greenlit';
  if (s === 'backburner') return 'inreview';
  if (s === 'brainstorm') return 'muted';
  return 'unknown';
}

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SizzleCard({ sizzle }: { sizzle: SizzleCardData }) {
  const [playing, setPlaying] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // localThumbnail overrides the DB value after a successful capture — no page reload needed
  const [localThumbnail, setLocalThumbnail] = useState<string | null>(null);
  const lastEmail = formatDate(sizzle.last_email_date);
  const hasVideo = !!sizzle.vimeo_url;
  const activeThumbnail = localThumbnail ?? sizzle.thumbnail_url;
  const hasThumbnail = !!activeThumbnail;

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    if (!sizzle.vimeo_url) return;
    navigator.clipboard.writeText(sizzle.vimeo_url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }

  return (
    <>
      {playing && sizzle.vimeo_url && (
        <VimeoPlayerModal
          vimeoUrl={sizzle.vimeo_url}
          title={sizzle.project_title}
          vimeoPassword={sizzle.vimeo_password}
          onClose={() => setPlaying(false)}
        />
      )}

      {pickerOpen && sizzle.vimeo_url && (
        <ThumbnailPickerModal
          sizzleId={sizzle.id}
          vimeoUrl={sizzle.vimeo_url}
          title={sizzle.project_title}
          onSaved={(url) => setLocalThumbnail(url)}
          onClose={() => setPickerOpen(false)}
        />
      )}

      <div
        style={{
          borderRadius: 8,
          border: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: 'border-color 0.15s ease',
        }}
      >
        {/* ── Thumbnail / play area ── */}
        <div
          style={{
            position: 'relative',
            paddingTop: '56.25%',
            cursor: hasVideo ? 'pointer' : 'default',
            overflow: 'hidden',
          }}
          onClick={hasVideo ? () => setPlaying(true) : undefined}
          role={hasVideo ? 'button' : undefined}
          tabIndex={hasVideo ? 0 : undefined}
          onKeyDown={hasVideo ? (e) => { if (e.key === 'Enter' || e.key === ' ') setPlaying(true); } : undefined}
          aria-label={hasVideo ? `Play ${sizzle.project_title}` : undefined}
        >
          {/* Thumbnail image — uses locally updated value after capture, DB value otherwise */}
          {hasThumbnail && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${activeThumbnail})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          )}

          {/* Placeholder gradient when no thumbnail — dark with a subtle directional fade */}
          {!hasThumbnail && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(160deg, #1a1a2e 0%, #0f0f1a 100%)',
              }}
            />
          )}

          {/* Overlay: darkens thumbnail, centers play + title */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: hasThumbnail ? 'rgba(0,0,0,0.42)' : 'rgba(0,0,0,0)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '12px 16px',
            }}
          >
            {hasVideo ? (
              <>
                {/* Show title on placeholder cards so they're identifiable */}
                {!hasThumbnail && (
                  <p
                    style={{
                      color: 'rgba(255,255,255,0.82)',
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 800,
                      fontSize: 18,
                      lineHeight: 1.2,
                      textAlign: 'center',
                      margin: 0,
                      letterSpacing: '0.01em',
                      textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                    }}
                  >
                    {sizzle.project_title}
                  </p>
                )}
                {/* Red play button */}
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: '50%',
                    background: 'var(--accent, #e51d26)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 3px 14px rgba(0,0,0,0.55)',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ color: '#fff', fontSize: 19, marginLeft: 4, lineHeight: 1 }}>▶</span>
                </div>
              </>
            ) : (
              <span
                style={{
                  color: 'rgba(255,255,255,0.28)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 600,
                }}
              >
                No link captured
              </span>
            )}
          </div>
        </div>

        {/* ── Card body ── */}
        <div style={{ padding: '12px 14px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Title + source badge */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <Link
              href={`/projects/${sizzle.ip_catalog_id}`}
              style={{
                color: 'var(--text-primary)',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800,
                fontSize: 15,
                lineHeight: 1.25,
                textDecoration: 'none',
                flex: 1,
              }}
              className="hover:underline"
            >
              {sizzle.project_title}
            </Link>
            {sizzle.sheet_source && (
              <Badge variant={sheetSourceVariant(sizzle.sheet_source)}>
                {sizzle.sheet_source}
              </Badge>
            )}
          </div>

          {/* Password chip */}
          {sizzle.vimeo_password && (
            <div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                PW:{' '}
              </span>
              <code
                style={{
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                  color: 'var(--text-primary)',
                  background: 'var(--bg-surface-alt)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 3,
                  padding: '1px 5px',
                  userSelect: 'all',
                }}
              >
                {sizzle.vimeo_password}
              </code>
            </div>
          )}

          {/* Footer: email activity + last contact + share link */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: 8,
              marginTop: 'auto',
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              ✉{' '}
              {sizzle.email_thread_count === 0
                ? 'No activity'
                : `${sizzle.email_thread_count} thread${sizzle.email_thread_count !== 1 ? 's' : ''}`}
            </span>
            {lastEmail && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{lastEmail}</span>
            )}
          </div>

          {/* Share link row — only shown when a Vimeo URL exists */}
          {sizzle.vimeo_url && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={handleCopy}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  color: copied ? 'var(--status-greenlit)' : 'var(--accent)',
                  letterSpacing: '0.03em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {copied ? '✓ Copied!' : '⧉ Copy link'}
              </button>
              <a
                href={sizzle.vimeo_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none' }}
              >
                Open on Vimeo ↗
              </a>
              {/* Separator */}
              <span style={{ color: 'var(--border-subtle)', fontSize: 11 }}>·</span>
              <button
                onClick={(e) => { e.stopPropagation(); setPickerOpen(true); }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.03em',
                }}
              >
                🎬 Pick thumbnail
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
