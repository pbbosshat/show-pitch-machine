'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface VideoUploaderProps {
  sizzleId: string;
  projectTitle: string;
  onUploaded: (url: string, thumbnail_url: string | null) => void;
  onClose: () => void;
}

type Stage = 'idle' | 'selected' | 'uploading' | 'processing' | 'error';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default function VideoUploader({ sizzleId, projectTitle, onUploaded, onClose }: VideoUploaderProps) {
  const [stage, setStage] = useState<Stage>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearPoll = () => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearPoll();
      xhrRef.current?.abort();
    };
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && stage !== 'uploading') onClose();
  }, [stage, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [handleKeyDown]);

  function selectFile(f: File) {
    setFile(f);
    setStage('selected');
    setProgress(0);
    setErrorMsg('');
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) selectFile(f);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) selectFile(f);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function startPoll(fileId: string) {
    pollCountRef.current = 0;
    const maxPolls = Math.ceil((5 * 60) / 8);

    function poll() {
      if (pollCountRef.current >= maxPolls) {
        clearPoll();
        return;
      }
      pollCountRef.current += 1;
      fetch(`/api/videos/thumbnail/${fileId}?sizzle_id=${encodeURIComponent(sizzleId)}`)
        .then((r) => r.json())
        .then((data: { thumbnail_url: string | null; ready: boolean }) => {
          if (data.ready && data.thumbnail_url) {
            clearPoll();
            onUploaded('__skip__', data.thumbnail_url);
          } else {
            pollTimerRef.current = setTimeout(poll, 8000);
          }
        })
        .catch(() => {
          pollTimerRef.current = setTimeout(poll, 8000);
        });
    }

    pollTimerRef.current = setTimeout(poll, 8000);
  }

  function handleUpload() {
    if (!file) return;
    setStage('uploading');
    setProgress(0);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('sizzle_id', sizzleId);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      xhrRef.current = null;
      let parsed: { fileId?: string; url?: string; thumbnail_url?: string | null; error?: string } = {};
      try {
        parsed = JSON.parse(xhr.responseText);
      } catch {
        setErrorMsg(`Server returned unexpected response (HTTP ${xhr.status})`);
        setStage('error');
        return;
      }

      if (xhr.status !== 200 || parsed.error) {
        setErrorMsg(parsed.error ?? `Upload failed with status ${xhr.status}`);
        setStage('error');
        return;
      }

      const url = parsed.url ?? '';
      const thumbUrl = parsed.thumbnail_url ?? null;
      const fileId = parsed.fileId ?? '';

      onUploaded(url, thumbUrl);

      if (!thumbUrl && fileId) {
        setStage('processing');
        startPoll(fileId);
      }
    };

    xhr.onerror = () => {
      xhrRef.current = null;
      setErrorMsg('Network error — upload failed. Check your connection and try again.');
      setStage('error');
    };

    xhr.onabort = () => {
      xhrRef.current = null;
    };

    xhr.open('POST', '/api/videos/upload');
    xhr.send(formData);
  }

  function handleCancel() {
    xhrRef.current?.abort();
    xhrRef.current = null;
    setStage(file ? 'selected' : 'idle');
    setProgress(0);
  }

  function handleReset() {
    clearPoll();
    xhrRef.current?.abort();
    xhrRef.current = null;
    setFile(null);
    setProgress(0);
    setErrorMsg('');
    setStage('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const canClose = stage !== 'uploading';

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget && canClose) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          background: 'var(--bg-surface, #111)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div>
            <div
              style={{
                color: '#fff',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 800,
                fontSize: 18,
                lineHeight: 1.1,
              }}
            >
              Upload Video
            </div>
            <div
              style={{
                color: 'rgba(255,255,255,0.45)',
                fontSize: 12,
                marginTop: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 380,
              }}
            >
              {projectTitle}
            </div>
          </div>
          {canClose && (
            <button
              onClick={onClose}
              aria-label="Close uploader"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 6,
                color: '#fff',
                cursor: 'pointer',
                fontSize: 20,
                lineHeight: 1,
                padding: '4px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: '24px 20px 20px' }}>

          {/* ── IDLE: drag-drop zone ── */}
          {stage === 'idle' && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--accent, #e51d26)' : 'rgba(255,255,255,0.18)'}`,
                borderRadius: 8,
                padding: '40px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                transition: 'border-color 0.15s ease, background 0.15s ease',
                background: dragOver ? 'rgba(229,29,38,0.07)' : 'transparent',
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                }}
              >
                ↑
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
                  Drag video here
                </div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 4 }}>
                  or click to browse
                </div>
              </div>
              <div
                style={{
                  color: 'rgba(255,255,255,0.25)',
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 600,
                }}
              >
                mp4, mov, avi, mkv — any size
              </div>
            </div>
          )}

          {/* ── SELECTED: confirm file before upload ── */}
          {stage === 'selected' && file && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    background: 'rgba(229,29,38,0.15)',
                    border: '1px solid rgba(229,29,38,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  🎬
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {file.name}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
                    {formatBytes(file.size)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleUpload}
                  style={{
                    flex: 1,
                    background: 'var(--accent, #e51d26)',
                    border: 'none',
                    borderRadius: 7,
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 700,
                    padding: '10px 0',
                    letterSpacing: '0.03em',
                  }}
                >
                  Upload
                </button>
                <button
                  onClick={handleReset}
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 7,
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    padding: '10px 16px',
                    letterSpacing: '0.02em',
                  }}
                >
                  Change file
                </button>
              </div>
            </div>
          )}

          {/* ── UPLOADING: real progress via XHR ── */}
          {stage === 'uploading' && file && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  color: 'rgba(255,255,255,0.55)',
                  fontSize: 12,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {file.name}
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 3,
                  background: 'rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: 'var(--accent, #e51d26)',
                    borderRadius: 3,
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
                  {progress}%
                </span>
                <button
                  onClick={handleCancel}
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 6,
                    color: 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '5px 14px',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── PROCESSING: polling for thumbnail ── */}
          {stage === 'processing' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                padding: '12px 0 4px',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  border: '3px solid rgba(255,255,255,0.1)',
                  borderTop: '3px solid var(--accent, #e51d26)',
                  borderRadius: '50%',
                  animation: 'spin 0.9s linear infinite',
                }}
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
                  Video uploaded
                </div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 5, lineHeight: 1.5 }}>
                  Drive is generating a thumbnail…<br />
                  This can take a few minutes.
                </div>
              </div>
              <button
                onClick={() => { clearPoll(); onClose(); }}
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 7,
                  color: 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '8px 18px',
                  marginTop: 4,
                }}
              >
                Done (skip thumbnail)
              </button>
            </div>
          )}

          {/* ── ERROR ── */}
          {stage === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  background: 'rgba(229,29,38,0.1)',
                  border: '1px solid rgba(229,29,38,0.35)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  color: '#ff6b70',
                  fontSize: 13,
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                }}
              >
                {errorMsg}
              </div>
              <button
                onClick={handleReset}
                style={{
                  background: 'var(--accent, #e51d26)',
                  border: 'none',
                  borderRadius: 7,
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                  padding: '10px 0',
                  width: '100%',
                }}
              >
                Try again
              </button>
            </div>
          )}

        </div>

        {/* Hidden file input — triggered programmatically */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/*"
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />
      </div>
    </div>
  );
}
