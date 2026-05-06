'use client';
// VimeoPlayerModal — full-screen overlay supporting Vimeo, Google Drive, Frame.io, and
// Vimeo Showcases. Detects URL type and renders the appropriate embed or fallback.
// Vimeo private hash-links pass h= param so no password prompt appears.

import { useEffect, useCallback } from 'react';

interface VimeoPlayerModalProps {
  vimeoUrl: string;
  title: string;
  vimeoPassword: string | null;
  onClose: () => void;
}

type UrlType = 'vimeo' | 'vimeo-showcase' | 'drive' | 'frameio' | 'unknown';

function detectUrlType(url: string): UrlType {
  if (/vimeo\.com\/showcase\//i.test(url)) return 'vimeo-showcase';
  if (/vimeo\.com\/\d+/i.test(url)) return 'vimeo';
  if (/drive\.google\.com/i.test(url)) return 'drive';
  if (/frame\.io/i.test(url)) return 'frameio';
  return 'unknown';
}

// Extracts Google Drive file ID from share/view URLs
// https://drive.google.com/file/d/{ID}/view → ID
function parseDriveFileId(url: string): string | null {
  const m = url.match(/\/file\/d\/([^/]+)/);
  return m ? m[1] : null;
}

// Extracts video ID and optional private hash from a Vimeo URL.
// https://vimeo.com/123456789/abc123def → { id: '123456789', hash: 'abc123def' }
function parseVimeoUrl(url: string): { id: string; hash: string | null } | null {
  const match = url.match(/vimeo\.com\/(\d+)(?:\/([a-f0-9]+))?/i);
  if (!match) return null;
  return { id: match[1], hash: match[2] ?? null };
}

export default function VimeoPlayerModal({
  vimeoUrl,
  title,
  vimeoPassword,
  onClose,
}: VimeoPlayerModalProps) {
  const urlType = detectUrlType(vimeoUrl);
  const parsed = parseVimeoUrl(vimeoUrl);

  const params = new URLSearchParams({ autoplay: '1', title: '0', byline: '0', portrait: '0' });
  if (parsed?.hash) params.set('h', parsed.hash);
  const vimeoEmbedUrl = parsed ? `https://player.vimeo.com/video/${parsed.id}?${params}` : null;

  const driveFileId = urlType === 'drive' ? parseDriveFileId(vimeoUrl) : null;
  const driveEmbedUrl = driveFileId ? `https://drive.google.com/file/d/${driveFileId}/preview` : null;

  // Frame.io presentation URLs embed directly as iframes
  const frameiоEmbedUrl = urlType === 'frameio' ? vimeoUrl : null;

  // Determine which embed URL and label to use
  const embedUrl = vimeoEmbedUrl ?? driveEmbedUrl ?? frameiоEmbedUrl;
  const openLabel = urlType === 'drive' ? 'Open on Google Drive ↗'
    : urlType === 'frameio' ? 'Open on Frame.io ↗'
    : urlType === 'vimeo-showcase' ? 'Open Showcase ↗'
    : 'Open on Vimeo ↗';

  // Vimeo Showcases can't be embedded — open directly in a new tab instead
  const isExternalOnly = urlType === 'vimeo-showcase' || urlType === 'unknown';

  // Escape key closes modal
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prev;
    };
  }, [handleKey]);

  return (
    // Backdrop — click outside the inner box to close
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      {/* Inner box — max 960px wide, never wider than the viewport */}
      <div style={{ width: '100%', maxWidth: 960 }}>

        {/* Header: title + optional password + close */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
            gap: 12,
          }}
        >
          <h2
            style={{
              margin: 0,
              color: '#ffffff',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800,
              fontSize: 22,
              lineHeight: 1.1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
            {vimeoPassword && (
              <span style={{ fontSize: 12, color: '#a5a7ad' }}>
                PW:{' '}
                <code
                  style={{
                    fontFamily: "'JetBrains Mono', 'Courier New', monospace",
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 4,
                    padding: '1px 7px',
                    color: '#ffffff',
                    userSelect: 'all',
                    fontSize: 13,
                  }}
                >
                  {vimeoPassword}
                </code>
              </span>
            )}

            <button
              onClick={onClose}
              aria-label="Close video"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 6,
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: 20,
                lineHeight: 1,
                padding: '4px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* 16:9 embed container — or external-only prompt for Showcases */}
        {isExternalOnly ? (
          <div
            style={{
              borderRadius: 8,
              background: '#111',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '48px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <p style={{ color: '#a5a7ad', fontSize: 14, margin: 0, textAlign: 'center' }}>
              This content can&apos;t be embedded — open it directly to watch.
            </p>
            <a
              href={vimeoUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'var(--accent, #e51d26)',
                color: '#fff',
                padding: '8px 20px',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
                letterSpacing: '0.02em',
              }}
            >
              {openLabel}
            </a>
          </div>
        ) : (
          <div
            style={{
              position: 'relative',
              paddingTop: '56.25%',
              borderRadius: 8,
              overflow: 'hidden',
              background: '#000',
            }}
          >
            {embedUrl ? (
              <iframe
                src={embedUrl}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={title}
              />
            ) : (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#a5a7ad',
                  fontSize: 14,
                }}
              >
                Could not load video
              </div>
            )}
          </div>
        )}

        {/* External link — always shown */}
        <div style={{ marginTop: 10, textAlign: 'right' }}>
          <a
            href={vimeoUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}
          >
            {openLabel}
          </a>
        </div>

      </div>
    </div>
  );
}
