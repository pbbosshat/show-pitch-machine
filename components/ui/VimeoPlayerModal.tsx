'use client';
// VimeoPlayerModal — full-screen overlay that embeds a Vimeo video with autoplay.
// Parses both public URLs (vimeo.com/ID) and private hash-link URLs (vimeo.com/ID/HASH).
// The HASH in a private link IS the unlock token — passed as ?h= in the embed URL so no
// password prompt appears. Vimeo's iframe handles its own native fullscreen button.

import { useEffect, useCallback } from 'react';

interface VimeoPlayerModalProps {
  vimeoUrl: string;
  title: string;
  vimeoPassword: string | null;
  onClose: () => void;
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
  const parsed = parseVimeoUrl(vimeoUrl);

  const params = new URLSearchParams({ autoplay: '1', title: '0', byline: '0', portrait: '0' });
  if (parsed?.hash) params.set('h', parsed.hash);
  const embedUrl = parsed ? `https://player.vimeo.com/video/${parsed.id}?${params}` : null;

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

        {/* 16:9 iframe container */}
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
              Could not parse Vimeo URL
            </div>
          )}
        </div>

        {/* External link fallback */}
        <div style={{ marginTop: 10, textAlign: 'right' }}>
          <a
            href={vimeoUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}
          >
            Open on Vimeo ↗
          </a>
        </div>

      </div>
    </div>
  );
}
