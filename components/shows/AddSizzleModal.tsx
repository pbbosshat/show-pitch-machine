'use client';
// AddSizzleModal — full "Add Video" flow on the /sizzles page.
//
// Three-pane modal:
//   ① Project picker  — live-search ip_catalog via /api/projects?q=
//   ② Video chooser   — drag-drop / browse + HTML5 <video> scrub deck for thumbnail
//                       capture, plus an alternate "upload thumbnail graphic" path
//   ③ Metadata fields — vimeo_password, notes, sheet_source, raw_value
//
// On submit it POSTs multipart/form-data to /api/sizzles/create-with-video,
// which inserts the sizzle row, uploads the video to the "Sizzle Reels" Drive
// folder, persists the thumbnail (if supplied), and returns the SizzleCardData
// shape so the parent can prepend a card without re-fetching the page.
//
// Upload progress is real (XHR upload progress events) — the cosmetic spinner
// path is reserved for the brief post-upload window while the server finalises
// Drive permissions and writes the DB row.

import { useCallback, useEffect, useRef, useState } from 'react';
import { type SizzleCardData } from '@/components/shows/SizzleCard';

interface ProjectSearchHit {
  id: string;
  title: string;
  sheet_source: string | null;
}

interface AddSizzleModalProps {
  onCreated: (sizzle: SizzleCardData) => void;
  onClose: () => void;
}

// Stages drive what the body of the modal renders. 'idle' is the entry state;
// 'finalising' covers the post-XHR-finish window while we wait for the JSON
// payload to be parsed and the parent to swap the modal out.
type Stage = 'idle' | 'uploading' | 'finalising' | 'error';

// Sheet-source taxonomy mirrors the values stored in ip_catalog.sheet_source so
// the chip styles in SizzleCard line up with whatever the user picks here.
const SHEET_SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: '',           label: '— none —' },
  { value: 'priorities', label: 'priorities' },
  { value: 'full-dev',   label: 'full-dev' },
  { value: 'bc-mye',     label: 'bc-mye' },
  { value: 'backburner', label: 'backburner' },
  { value: 'brainstorm', label: 'brainstorm' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AddSizzleModal({ onCreated, onClose }: AddSizzleModalProps) {
  // Step state — gated linear flow keeps the modal from looking overwhelming.
  // 1 = pick project, 2 = pick video + thumbnail, 3 = fill in fields & submit.
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // ── Step 1: project picker ────────────────────────────────────────────────
  const [projectQuery, setProjectQuery] = useState('');
  const [projectResults, setProjectResults] = useState<ProjectSearchHit[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectSearchHit | null>(null);
  const [searching, setSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Step 2: video file + thumbnail ────────────────────────────────────────
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbFileInputRef = useRef<HTMLInputElement>(null);

  // Thumbnail state — either a Blob (frame capture) or File (uploaded image).
  // We hold the source separately from a preview data-URL so we can preview
  // without re-encoding to base64 on every render.
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbSource, setThumbSource] = useState<'capture' | 'upload' | null>(null);

  // ── Step 3: metadata + submission ─────────────────────────────────────────
  const [vimeoPassword, setVimeoPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [sheetSource, setSheetSource] = useState('');
  const [rawValue, setRawValue] = useState('');

  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  // ── Lifecycle: Escape closes (when safe), body scroll lock, cleanup ───────
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stage !== 'uploading') onClose();
    },
    [stage, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prev;
    };
  }, [handleKey]);

  // Release the blob URL so we don't leak when the user closes the modal mid-flow.
  useEffect(() => {
    return () => {
      if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
      xhrRef.current?.abort();
    };
  }, [videoObjectUrl]);

  // ── Step 1: debounced project search ──────────────────────────────────────
  // Empty queries short-circuit: no fetch and we leave any prior results in place
  // for the render to skip (it gates on `projectQuery.trim()` already). State is
  // reset in the input's `onChange` handler instead — keeping setState out of the
  // effect body avoids cascading renders flagged by react-hooks/set-state-in-effect.
  useEffect(() => {
    const trimmed = projectQuery.trim();
    if (!trimmed) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearching(true);
      // limit=20 because anything wider just adds noise; the typeahead is meant
      // for fast disambiguation, not a full project browse experience.
      fetch(`/api/projects?q=${encodeURIComponent(trimmed)}&limit=20`)
        .then((r) => r.json())
        .then((data: { data?: ProjectSearchHit[] }) => {
          setProjectResults(data.data ?? []);
        })
        .catch(() => setProjectResults([]))
        .finally(() => setSearching(false));
    }, 220);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [projectQuery]);

  // ── Step 2: video file selection ──────────────────────────────────────────
  function selectVideo(f: File) {
    if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
    setVideoFile(f);
    setVideoObjectUrl(URL.createObjectURL(f));
    // Reset any prior thumb capture — a new video invalidates the old frame.
    setThumbnailBlob(null);
    setThumbnailPreview(null);
    setThumbSource(null);
    setVideoCurrentTime(0);
    setVideoDuration(0);
  }

  function handleVideoInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) selectVideo(f);
  }

  function handleVideoDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) selectVideo(f);
  }

  function handleVideoDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(true);
  }

  // Scrub-from-video thumbnail capture — runs entirely client-side. We draw the
  // current frame onto a canvas at the video's natural resolution and convert
  // to a JPEG blob (~85% quality is a sweet spot for size vs. visible quality).
  function captureFrameAsThumbnail() {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement('canvas');
    // Use the underlying video dimensions, not the displayed size — buyer-facing
    // pages may render this card much larger than the modal's preview.
    canvas.width = v.videoWidth || 1280;
    canvas.height = v.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setThumbnailBlob(blob);
        setThumbnailPreview(URL.createObjectURL(blob));
        setThumbSource('capture');
      },
      'image/jpeg',
      0.85
    );
  }

  function handleThumbUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setErrorMsg('Thumbnail must be an image file (jpg, png, webp).');
      setStage('error');
      return;
    }
    setThumbnailBlob(f);
    setThumbnailPreview(URL.createObjectURL(f));
    setThumbSource('upload');
  }

  // Track playback position for the live readout next to the Capture button.
  function handleTimeUpdate() {
    const v = videoRef.current;
    if (v) setVideoCurrentTime(v.currentTime);
  }

  function handleLoadedMetadata() {
    const v = videoRef.current;
    if (v) setVideoDuration(v.duration || 0);
  }

  // ── Step 3: submit ────────────────────────────────────────────────────────
  function handleSubmit() {
    if (!selectedProject) {
      setErrorMsg('Pick a project first.');
      setStage('error');
      return;
    }
    if (!videoFile) {
      setErrorMsg('Pick a video file first.');
      setStage('error');
      return;
    }

    setStage('uploading');
    setProgress(0);
    setErrorMsg('');

    const fd = new FormData();
    fd.append('file', videoFile);
    fd.append('ip_catalog_id', selectedProject.id);
    if (thumbnailBlob) {
      // Filename is informational only — the server names the file by sizzle id
      // and uses the MIME type to pick the correct extension.
      const tname = thumbSource === 'upload' && thumbnailBlob instanceof File
        ? thumbnailBlob.name
        : 'thumbnail.jpg';
      fd.append('thumbnail', thumbnailBlob, tname);
    }
    if (vimeoPassword.trim()) fd.append('vimeo_password', vimeoPassword.trim());
    if (notes.trim())         fd.append('notes', notes.trim());
    if (sheetSource)          fd.append('sheet_source', sheetSource);
    if (rawValue.trim())      fd.append('raw_value', rawValue.trim());

    // XHR (not fetch) because we want real upload progress and the ability to
    // abort cleanly — fetch's upload-progress story is still messy in 2026.
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      xhrRef.current = null;
      // Server may return JSON OR a non-JSON 5xx — parse defensively so we always
      // surface *something* useful in the error toast.
      let parsed: Partial<SizzleCardData> & { error?: string } = {};
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
      setStage('finalising');
      onCreated(parsed as SizzleCardData);
    };

    xhr.onerror = () => {
      xhrRef.current = null;
      setErrorMsg('Network error — upload failed. Check your connection and try again.');
      setStage('error');
    };

    xhr.open('POST', '/api/sizzles/create-with-video');
    xhr.send(fd);
  }

  function handleCancelUpload() {
    xhrRef.current?.abort();
    xhrRef.current = null;
    setStage('idle');
    setProgress(0);
  }

  function handleRetry() {
    setStage('idle');
    setErrorMsg('');
  }

  // ── Render guards ─────────────────────────────────────────────────────────
  const canClose = stage !== 'uploading';
  const canAdvanceStep2 = !!selectedProject;
  const canAdvanceStep3 = !!videoFile;
  const canSubmit = !!selectedProject && !!videoFile && stage !== 'uploading';

  return (
    <div
      // Click on the backdrop closes — but only when we're not mid-upload.
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
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          // Hard-coded dark panel so this modal looks the same in light and dark
          // theme — all the modal's text colors are tuned for a dark surface.
          background: '#0F1729',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10,
          overflow: 'hidden',
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Header ── */}
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
                fontSize: 20,
                lineHeight: 1.1,
                letterSpacing: '0.01em',
              }}
            >
              Add Sizzle Reel
            </div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 3 }}>
              Step {step} of 3 ·{' '}
              {step === 1 ? 'Pick the project' : step === 2 ? 'Choose the video & thumbnail' : 'Add details and upload'}
            </div>
          </div>
          {canClose && (
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 6,
                color: '#fff',
                cursor: 'pointer',
                fontSize: 20,
                lineHeight: 1,
                padding: '4px 10px',
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* ── Step indicator bar (clickable to jump back, never forward) ── */}
        <div style={{ display: 'flex', gap: 4, padding: '0 20px', marginTop: 14 }}>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => {
                // Allow backward navigation only — preserves entered fields and prevents
                // skipping required state (e.g. jumping to step 3 with no project).
                if (n < step && stage !== 'uploading') setStep(n as 1 | 2 | 3);
              }}
              disabled={n > step || stage === 'uploading'}
              style={{
                flex: 1,
                height: 4,
                background: n <= step ? 'var(--accent, #e51d26)' : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: 2,
                cursor: n < step && stage !== 'uploading' ? 'pointer' : 'default',
                padding: 0,
              }}
              aria-label={`Step ${n}`}
            />
          ))}
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>

          {/* ──────────────────── STEP 1 — PROJECT PICKER ──────────────────── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Project
              </label>
              <input
                type="text"
                autoFocus
                value={projectQuery}
                onChange={(e) => {
                  const next = e.target.value;
                  // Typing clears the selection so the user always sees their query as authoritative.
                  setSelectedProject(null);
                  setProjectQuery(next);
                  // Reset stale results / search-flag immediately when the field empties out —
                  // we intentionally do this in the handler instead of the effect to avoid
                  // the react-hooks/set-state-in-effect cascade-render warning.
                  if (!next.trim()) {
                    setProjectResults([]);
                    setSearching(false);
                  }
                }}
                placeholder="Search projects in ip_catalog…"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#fff',
                  fontSize: 14,
                  outline: 'none',
                }}
              />

              {/* Selected chip — short visual confirmation of what's locked in. */}
              {selectedProject && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 6,
                    background: 'rgba(34,197,94,0.08)',
                    border: '1px solid rgba(34,197,94,0.3)',
                  }}
                >
                  <span style={{ color: 'rgb(74,222,128)', fontSize: 14, fontWeight: 700 }}>
                    ✓ {selectedProject.title}
                  </span>
                  {selectedProject.sheet_source && (
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                      ({selectedProject.sheet_source})
                    </span>
                  )}
                  <button
                    onClick={() => setSelectedProject(null)}
                    style={{
                      marginLeft: 'auto',
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    change
                  </button>
                </div>
              )}

              {/* Live results — scrolls if many; capped at maxHeight to avoid pushing buttons off-screen. */}
              {!selectedProject && projectQuery.trim() && (
                <div
                  style={{
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6,
                    maxHeight: 280,
                    overflowY: 'auto',
                    background: 'rgba(255,255,255,0.02)',
                  }}
                >
                  {searching && (
                    <div style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                      Searching…
                    </div>
                  )}
                  {!searching && projectResults.length === 0 && (
                    <div style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                      No matches — try a different term.
                    </div>
                  )}
                  {projectResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProject(p);
                        // Echo the title back into the input so the user sees what they picked.
                        setProjectQuery(p.title);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 14px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ fontWeight: 600 }}>{p.title}</span>
                      {p.sheet_source && (
                        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{p.sheet_source}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ──────────────────── STEP 2 — VIDEO + THUMBNAIL ────────────────── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* No video yet → drag/drop zone */}
              {!videoFile && (
                <div
                  onDrop={handleVideoDrop}
                  onDragOver={handleVideoDragOver}
                  onDragLeave={() => setDragOver(false)}
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
                  <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                    mp4, mov, avi, mkv
                  </div>
                </div>
              )}

              {/* Video selected → scrub deck */}
              {videoFile && videoObjectUrl && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {videoFile.name}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
                        {formatBytes(videoFile.size)}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (videoObjectUrl) URL.revokeObjectURL(videoObjectUrl);
                        setVideoFile(null);
                        setVideoObjectUrl(null);
                        setThumbnailBlob(null);
                        setThumbnailPreview(null);
                        setThumbSource(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 6,
                        color: 'rgba(255,255,255,0.6)',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '5px 12px',
                      }}
                    >
                      Change
                    </button>
                  </div>

                  {/* Native video element — preload="metadata" gives us duration immediately
                       without forcing the browser to download the whole file. */}
                  <video
                    ref={videoRef}
                    src={videoObjectUrl}
                    controls
                    preload="metadata"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    style={{
                      width: '100%',
                      maxHeight: 360,
                      borderRadius: 8,
                      background: '#000',
                      display: 'block',
                    }}
                  />

                  {/* Capture controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.8)',
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 6,
                        padding: '5px 12px',
                        letterSpacing: '0.04em',
                      }}
                    >
                      ⏱ {formatTime(videoCurrentTime)}
                      {videoDuration > 0 && (
                        <span style={{ color: 'rgba(255,255,255,0.35)' }}>
                          {' / '}{formatTime(videoDuration)}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={captureFrameAsThumbnail}
                      style={{
                        background: 'var(--accent, #e51d26)',
                        border: 'none',
                        borderRadius: 6,
                        color: '#fff',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: 13,
                        padding: '7px 16px',
                      }}
                    >
                      📸 Capture this frame
                    </button>

                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                      or
                    </span>

                    <button
                      onClick={() => thumbFileInputRef.current?.click()}
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 6,
                        color: 'rgba(255,255,255,0.85)',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: 13,
                        padding: '7px 16px',
                      }}
                    >
                      ↑ Upload image
                    </button>
                  </div>

                  {/* Thumbnail preview — only renders once the user has either captured
                       or uploaded something. Source label reassures the user which path won. */}
                  {thumbnailPreview && (
                    <div
                      style={{
                        display: 'flex',
                        gap: 14,
                        alignItems: 'center',
                        padding: 10,
                        borderRadius: 8,
                        background: 'rgba(34,197,94,0.05)',
                        border: '1px solid rgba(34,197,94,0.25)',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumbnailPreview}
                        alt="Thumbnail preview"
                        style={{
                          width: 160,
                          height: 90,
                          objectFit: 'cover',
                          borderRadius: 5,
                          flexShrink: 0,
                          border: '1px solid rgba(255,255,255,0.1)',
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: 'rgb(74,222,128)', fontSize: 13, fontWeight: 700 }}>
                          ✓ Thumbnail ready
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 3 }}>
                          {thumbSource === 'capture' ? 'Captured from video frame' : 'Uploaded graphic'}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
                          setThumbnailBlob(null);
                          setThumbnailPreview(null);
                          setThumbSource(null);
                          if (thumbFileInputRef.current) thumbFileInputRef.current.value = '';
                        }}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: 5,
                          color: 'rgba(255,255,255,0.5)',
                          cursor: 'pointer',
                          fontSize: 11,
                          padding: '4px 10px',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {/* Hint when no thumbnail picked — explains the fallback so users
                       don't worry that a missing thumb means a broken card. */}
                  {!thumbnailPreview && (
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, lineHeight: 1.5 }}>
                      Optional. If you skip this, Google Drive will auto-generate a thumbnail
                      a few minutes after upload.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ──────────────────── STEP 3 — METADATA & UPLOAD ────────────────── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Recap chip — quick visual confirmation of what's about to upload. */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6,
                  fontSize: 12,
                }}
              >
                <div style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.35)' }}>Project: </span>
                  <span style={{ color: '#fff', fontWeight: 600 }}>{selectedProject?.title}</span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.35)' }}>Video: </span>
                  <span style={{ color: '#fff' }}>{videoFile?.name}</span>
                  {videoFile && (
                    <span style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {' '}({formatBytes(videoFile.size)})
                    </span>
                  )}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.35)' }}>Thumbnail: </span>
                  <span style={{ color: '#fff' }}>
                    {thumbSource === 'capture' ? 'Captured frame' : thumbSource === 'upload' ? 'Uploaded image' : 'Drive will auto-generate'}
                  </span>
                </div>
              </div>

              {/* Vimeo / share password — sizzle_reels stores a single password regardless
                   of platform; on Drive it doubles as an internal note. */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Password (optional)
                </label>
                <input
                  type="text"
                  value={vimeoPassword}
                  onChange={(e) => setVimeoPassword(e.target.value)}
                  placeholder="e.g. HoopDreams"
                  disabled={stage === 'uploading'}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#fff',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Sheet source — populates the badge variant on SizzleCard. */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Sheet source (optional)
                </label>
                <select
                  value={sheetSource}
                  onChange={(e) => setSheetSource(e.target.value)}
                  disabled={stage === 'uploading'}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#fff',
                    fontSize: 13,
                    outline: 'none',
                  }}
                >
                  {SHEET_SOURCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} style={{ background: '#111', color: '#fff' }}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Raw value — original cell text if migrating from a sheet row, otherwise free notes. */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Raw cell value (optional)
                </label>
                <input
                  type="text"
                  value={rawValue}
                  onChange={(e) => setRawValue(e.target.value)}
                  placeholder="Original sheet cell text, if any"
                  disabled={stage === 'uploading'}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#fff',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything that should follow this reel around — context, version, who cut it…"
                  disabled={stage === 'uploading'}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#fff',
                    fontSize: 13,
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Upload progress bar — only renders during the actual XHR. */}
              {stage === 'uploading' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Uploading to Google Drive…</span>
                    <span style={{ color: '#fff', fontWeight: 700 }}>{progress}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
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
                </div>
              )}

              {/* Brief settle window between XHR-finish and parent-state-update. */}
              {stage === 'finalising' && (
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                  Saving…
                </div>
              )}

              {/* Error toast — shows the exact server-supplied message, per design rules. */}
              {stage === 'error' && errorMsg && (
                <div
                  style={{
                    background: 'rgba(229,29,38,0.1)',
                    border: '1px solid rgba(229,29,38,0.35)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    color: '#ff6b70',
                    fontSize: 12,
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}
                >
                  {errorMsg}
                </div>
              )}
            </div>
          )}

        </div>

        {/* ── Footer: per-step nav buttons ── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 20px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(0,0,0,0.25)',
          }}
        >
          {/* Left side — back/cancel */}
          {step > 1 && stage !== 'uploading' && stage !== 'finalising' ? (
            <button
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 6,
                color: 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                padding: '8px 16px',
              }}
            >
              ← Back
            </button>
          ) : (
            <div />
          )}

          {/* Right side — primary action varies by step */}
          {step === 1 && (
            <button
              onClick={() => setStep(2)}
              disabled={!canAdvanceStep2}
              style={{
                background: canAdvanceStep2 ? 'var(--accent, #e51d26)' : 'rgba(255,255,255,0.07)',
                border: 'none',
                borderRadius: 6,
                color: canAdvanceStep2 ? '#fff' : 'rgba(255,255,255,0.3)',
                cursor: canAdvanceStep2 ? 'pointer' : 'not-allowed',
                fontSize: 13,
                fontWeight: 700,
                padding: '9px 22px',
                letterSpacing: '0.02em',
              }}
            >
              Next →
            </button>
          )}
          {step === 2 && (
            <button
              onClick={() => setStep(3)}
              disabled={!canAdvanceStep3}
              style={{
                background: canAdvanceStep3 ? 'var(--accent, #e51d26)' : 'rgba(255,255,255,0.07)',
                border: 'none',
                borderRadius: 6,
                color: canAdvanceStep3 ? '#fff' : 'rgba(255,255,255,0.3)',
                cursor: canAdvanceStep3 ? 'pointer' : 'not-allowed',
                fontSize: 13,
                fontWeight: 700,
                padding: '9px 22px',
                letterSpacing: '0.02em',
              }}
            >
              Next →
            </button>
          )}
          {step === 3 && stage !== 'uploading' && stage !== 'finalising' && stage !== 'error' && (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              style={{
                background: canSubmit ? 'var(--accent, #e51d26)' : 'rgba(255,255,255,0.07)',
                border: 'none',
                borderRadius: 6,
                color: canSubmit ? '#fff' : 'rgba(255,255,255,0.3)',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                fontSize: 13,
                fontWeight: 700,
                padding: '9px 22px',
                letterSpacing: '0.02em',
              }}
            >
              ↑ Upload & Save
            </button>
          )}
          {stage === 'uploading' && (
            <button
              onClick={handleCancelUpload}
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 6,
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                padding: '8px 16px',
              }}
            >
              Cancel upload
            </button>
          )}
          {stage === 'error' && (
            <button
              onClick={handleRetry}
              style={{
                background: 'var(--accent, #e51d26)',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 700,
                padding: '9px 22px',
              }}
            >
              Try again
            </button>
          )}
        </div>

        {/* Hidden inputs — triggered programmatically from the drop zone / "Upload image" button. */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/*"
          style={{ display: 'none' }}
          onChange={handleVideoInputChange}
        />
        <input
          ref={thumbFileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={handleThumbUpload}
        />
      </div>
    </div>
  );
}
