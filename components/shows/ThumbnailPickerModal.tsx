'use client';
// ThumbnailPickerModal — lets the user scrub to any frame of a Vimeo sizzle reel
// and capture it as the card thumbnail (great for finding the opening title card).
//
// Flow:
//   1. Embed Vimeo player with full controls (user seeks freely)
//   2. Listen to Vimeo's postMessage API for timeupdate → track current seconds
//   3. "📸 Capture This Frame" → POST /api/sizzles/[id]/capture-thumb?time={s}
//   4. Server opens the embed in a local Chrome CDP tab, seeks, screenshots
//   5. Preview + confirm → onSaved(url) updates the parent card

import { useState, useEffect, useRef, useCallback } from 'react';

interface ThumbnailPickerModalProps {
  sizzleId: string;
  vimeoUrl: string;
  title: string;
  onSaved: (thumbnailUrl: string) => void;
  onClose: () => void;
}

function parseVimeoUrl(url: string): { id: string; hash: string | null } | null {
  const m = url.match(/vimeo\.com\/(\d+)(?:\/([a-f0-9]+))?/i);
  if (!m) return null;
  return { id: m[1], hash: m[2] ?? null };
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function ThumbnailPickerModal({
  sizzleId,
  vimeoUrl,
  title,
  onSaved,
  onClose,
}: ThumbnailPickerModalProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const parsed = parseVimeoUrl(vimeoUrl);
  const embedParams = new URLSearchParams({ title: '0', byline: '0', portrait: '0', api: '1' });
  if (parsed?.hash) embedParams.set('h', parsed.hash);
  const embedUrl = parsed
    ? `https://player.vimeo.com/video/${parsed.id}?${embedParams}`
    : null;

  // Enable Vimeo postMessage events once the iframe is ready.
  // Vimeo's embed API sends timeupdate events after we subscribe via postMessage.
  function enableVimeoEvents() {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ method: 'addEventListener', value: 'timeupdate' }),
      '*'
    );
  }

  useEffect(() => {
    // Try immediately and again after load
    const t1 = setTimeout(enableVimeoEvents, 1000);
    const t2 = setTimeout(enableVimeoEvents, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [embedUrl]);

  // Receive timeupdate from Vimeo iframe
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!String(e.origin).includes('vimeo')) return;
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data.event === 'timeupdate' && typeof data.data?.seconds === 'number') {
          setCurrentTime(data.data.seconds);
        }
        // Re-subscribe on 'ready' event — player signals it's ready to accept methods
        if (data.event === 'ready') enableVimeoEvents();
      } catch {}
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Escape closes, body scroll locked
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') { if (previewUrl) setPreviewUrl(null); else onClose(); }
  }, [onClose, previewUrl]);
  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = prev; };
  }, [handleKey]);

  async function handleCapture() {
    setCapturing(true);
    setError(null);
    setPreviewUrl(null);
    try {
      const res = await fetch(
        `/api/sizzles/${sizzleId}/capture-thumb?time=${currentTime.toFixed(2)}`,
        { method: 'POST' }
      );
      const body = await res.json() as { thumbnail_url?: string; error?: string };
      if (!res.ok || !body.thumbnail_url) {
        setError(body.error ?? `Server error ${res.status}`);
        return;
      }
      // Cache-bust so the browser fetches the new file, not an old version
      setPreviewUrl(`${body.thumbnail_url}?t=${Date.now()}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCapturing(false);
    }
  }

  function handleSave() {
    if (previewUrl) {
      onSaved(previewUrl);
      onClose();
    }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 24,
        overflowY: 'auto',
      }}
    >
      <div style={{ width: '100%', maxWidth: 960 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, color: '#fff', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 24, lineHeight: 1.1 }}>
              Pick Thumbnail
            </h2>
            <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: 13, lineHeight: 1.4 }}>
              {title} · Seek to the opening title card and click Capture.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 22, lineHeight: 1, padding: '3px 10px', flexShrink: 0 }}
          >
            ×
          </button>
        </div>

        {/* Vimeo embed */}
        {embedUrl ? (
          <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
            <iframe
              ref={iframeRef}
              src={embedUrl}
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={title}
            />
          </div>
        ) : (
          <div style={{ paddingTop: '56.25%', position: 'relative', background: '#111', borderRadius: 8 }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              Invalid Vimeo URL
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Live time readout */}
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 15,
            color: 'rgba(255,255,255,0.8)',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            padding: '5px 12px',
            letterSpacing: '0.04em',
          }}>
            ⏱ {formatTime(currentTime)}
          </div>

          {/* Capture button */}
          <button
            onClick={handleCapture}
            disabled={capturing || !embedUrl}
            style={{
              background: capturing ? 'rgba(229,29,38,0.45)' : 'var(--accent, #e51d26)',
              border: 'none', borderRadius: 6, color: '#fff',
              cursor: capturing ? 'wait' : 'pointer',
              fontWeight: 700, fontSize: 14,
              padding: '7px 20px',
              display: 'inline-flex', alignItems: 'center', gap: 7,
              opacity: !embedUrl ? 0.4 : 1,
            }}
          >
            {capturing ? '⏳ Capturing…' : '📸 Capture This Frame'}
          </button>

          {/* Hint */}
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            Pause on a good frame first
          </span>

          {/* Error */}
          {error && (
            <span style={{ fontSize: 12, color: '#f87171', flex: '1 1 100%' }}>
              ✗ {error}
            </span>
          )}
        </div>

        {/* Preview + save */}
        {previewUrl && (
          <div
            style={{
              marginTop: 20,
              display: 'flex',
              gap: 20,
              alignItems: 'flex-start',
              padding: 16,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <img
              src={previewUrl}
              alt="Captured thumbnail preview"
              style={{ width: 280, height: 158, objectFit: 'cover', borderRadius: 6, border: '2px solid var(--accent, #e51d26)', flexShrink: 0 }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 2 }}>
              <p style={{ margin: 0, color: '#fff', fontSize: 15, fontWeight: 700 }}>
                Looks good?
              </p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 1.5 }}>
                This will replace the current thumbnail on the sizzle card.
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button
                  onClick={handleSave}
                  style={{
                    background: 'rgba(34,197,94,0.15)',
                    border: '1px solid rgba(34,197,94,0.35)',
                    borderRadius: 6,
                    color: 'rgb(74,222,128)',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 14,
                    padding: '7px 18px',
                  }}
                >
                  ✓ Save Thumbnail
                </button>
                <button
                  onClick={() => { setPreviewUrl(null); setError(null); }}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 6,
                    color: 'rgba(255,255,255,0.5)',
                    cursor: 'pointer',
                    fontSize: 13,
                    padding: '6px 14px',
                  }}
                >
                  ↩ Retake
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
