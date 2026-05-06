'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Columns } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VimeoVideo {
  id: string;
  clip_id: string;
  hash: string | null;
  url: string;
  title: string;
  duration_sec: number | null;
  privacy: string | null;
  has_password: number;
  last_modified: string | null;
  scraped_at: string;
  linked_show_id: string | null;
  linked_show_title: string | null;
  linked_video_type: string | null;
  show_video_id: string | null;
}

interface Show { id: string; title: string; }

interface MatchSuggestion {
  video: VimeoVideo;
  show: Show;
  score: number;
  videoType: string;
}

type SortCol = 'title' | 'duration_sec' | 'privacy' | 'linked_show_title' | 'last_modified';
type SortDir = 'asc' | 'desc';

const VIDEO_TYPES = ['sizzle', 'casting_tape', 'interview', 'rough_cut', 'character_reel', 'other'];

const COLS = ['title', 'duration', 'privacy', 'linked_show', 'date'] as const;
type ColName = typeof COLS[number];
const COL_LABELS: Record<ColName, string> = {
  title: 'Title', duration: 'Duration', privacy: 'Privacy', linked_show: 'Linked Show', date: 'Date',
};
const DEFAULT_WIDTHS: Record<ColName, number> = {
  title: 340, duration: 90, privacy: 100, linked_show: 200, date: 160,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDuration(sec: number | null): string {
  if (!sec) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return iso.slice(0, 10); }
}

function privacyBadge(p: string | null) {
  const map: Record<string, string> = {
    unlisted: '#6366f1', anybody: '#22c55e', password: '#f59e0b', nobody: '#ef4444',
  };
  const color = map[p ?? ''] ?? 'var(--text-muted)';
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 9, background: color + '22', color }}>
      {p ?? 'unknown'}
    </span>
  );
}

// ─── Auto-match helpers ───────────────────────────────────────────────────────

// Strip noise words so "Show Name - Sizzle Reel" and "Show Name" can match
function normalizeForMatch(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b(sizzle|reel|trailer|teaser|pilot|rough[\s-]?cut|casting[\s-]?tape|interview|character[\s-]?reel|mye|my\s+entertainment|pitch[\s-]?tape|promo|preview|documentary|series|special)\b/g, '')
    .replace(/[-–—:|\/\\]/g, ' ')
    .replace(/[''"""]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferVideoType(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('cast')) return 'casting_tape';
  if (t.includes('interview')) return 'interview';
  if (t.includes('character')) return 'character_reel';
  if (t.includes('rough') || t.includes('pilot')) return 'rough_cut';
  return 'sizzle';
}

function computeMatchScore(normVideo: string, normShow: string): number {
  if (!normShow || normShow.length < 2) return 0;
  if (normVideo === normShow) return 100;
  // Guard: require normShow >= 5 chars to prevent short names ("from", "the") from matching broadly
  if (normShow.length >= 5 && normVideo.includes(normShow)) return 90;
  if (normShow.length >= 5 && normShow.includes(normVideo) && normVideo.length >= 5) return 85;
  const videoWords = new Set(normVideo.split(/\s+/).filter(w => w.length > 2));
  const showWords  = normShow.split(/\s+/).filter(w => w.length > 2);
  if (showWords.length === 0) return 0;
  const hits = showWords.filter(w => videoWords.has(w)).length;
  const ratio = hits / showWords.length;
  if (ratio >= 0.8) return 75;
  if (ratio >= 0.6) return 60;
  if (ratio >= 0.5) return 50;
  return 0;
}

function buildSuggestions(videos: VimeoVideo[], shows: Show[]): MatchSuggestion[] {
  const unlinked = videos.filter(v => !v.linked_show_id);
  const normShows = shows.map(s => ({ show: s, norm: normalizeForMatch(s.title) }));
  const results: MatchSuggestion[] = [];

  for (const video of unlinked) {
    const normVideo = normalizeForMatch(video.title);
    let best: { show: Show; score: number } | null = null;
    for (const { show, norm } of normShows) {
      const score = computeMatchScore(normVideo, norm);
      if (score > 0 && (!best || score > best.score)) best = { show, score };
    }
    if (best && best.score >= 50) {
      results.push({ video, show: best.show, score: best.score, videoType: inferVideoType(video.title) });
    }
  }

  return results.sort((a, b) => b.score - a.score || a.video.title.localeCompare(b.video.title));
}

// ─── Link-to-show modal ───────────────────────────────────────────────────────

function LinkModal({ video, shows, onClose, onSaved }: {
  video: VimeoVideo; shows: Show[]; onClose: () => void; onSaved: (updated: VimeoVideo) => void;
}) {
  const [showId, setShowId] = useState(video.linked_show_id ?? '');
  const [showSearch, setShowSearch] = useState(video.linked_show_title ?? '');
  const [videoType, setVideoType] = useState(video.linked_video_type ?? 'sizzle');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [dropOpen, setDropOpen] = useState(false);

  const filteredShows = shows.filter(s => s.title.toLowerCase().includes(showSearch.toLowerCase()));

  async function save() {
    if (!showId) { setErr('Select a show'); return; }
    setSaving(true);
    setErr('');
    try {
      const r = await fetch('/api/show-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vimeo_library_id: video.id, ip_catalog_id: showId, video_type: videoType, notes: notes || null }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || `Error ${r.status}`); setSaving(false); return; }
      const show = shows.find(s => s.id === showId);
      onSaved({ ...video, linked_show_id: showId, linked_show_title: show?.title ?? '', linked_video_type: videoType, show_video_id: d.id });
    } catch (e) {
      setErr((e as Error).message);
      setSaving(false);
    }
  }

  async function unlink() {
    if (!video.show_video_id) return;
    setSaving(true);
    try {
      await fetch(`/api/show-videos/${video.show_video_id}`, { method: 'DELETE' });
      onSaved({ ...video, linked_show_id: null, linked_show_title: null, linked_video_type: null, show_video_id: null });
    } catch (e) {
      setErr((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rounded-xl p-6 w-full max-w-md flex flex-col gap-4"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Link to Show</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-[var(--bg-surface-alt)]" style={{ color: 'var(--text-muted)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{video.title}</p>

        {/* Show picker */}
        <div className="flex flex-col gap-1 relative">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Show</label>
          <input
            className="rounded-md px-3 py-2 text-sm w-full"
            style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}
            placeholder="Search shows…"
            value={showSearch}
            onChange={e => { setShowSearch(e.target.value); setShowId(''); setDropOpen(true); }}
            onFocus={() => setDropOpen(true)}
          />
          {dropOpen && filteredShows.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-10 rounded-md overflow-auto mt-1"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', maxHeight: 200, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
              {filteredShows.slice(0, 50).map(s => (
                <button key={s.id} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-surface-alt)]"
                  style={{ color: 'var(--text-primary)' }}
                  onClick={() => { setShowId(s.id); setShowSearch(s.title); setDropOpen(false); }}>
                  {s.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Video type */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Type</label>
          <select value={videoType} onChange={e => setVideoType(e.target.value)}
            className="rounded-md px-3 py-2 text-sm w-full"
            style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}>
            {VIDEO_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Notes (optional)</label>
          <input
            className="rounded-md px-3 py-2 text-sm w-full"
            style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none' }}
            placeholder="Any notes…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {err && <p className="text-xs" style={{ color: 'var(--error, #ef4444)' }}>{err}</p>}

        <div className="flex gap-2 mt-1">
          <button onClick={save} disabled={saving || !showId}
            className="flex-1 rounded-md py-2 text-xs font-semibold transition-opacity"
            style={{ background: 'var(--accent)', color: '#fff', opacity: saving || !showId ? 0.5 : 1 }}>
            {saving ? 'Saving…' : 'Link'}
          </button>
          {video.show_video_id && (
            <button onClick={unlink} disabled={saving}
              className="rounded-md px-4 py-2 text-xs font-semibold"
              style={{ background: 'var(--bg-surface-alt)', color: 'var(--error, #ef4444)', border: '1px solid var(--border-subtle)' }}>
              Unlink
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Auto-match panel ─────────────────────────────────────────────────────────

function MatchPanel({
  suggestions,
  applied,
  skipped,
  onClose,
  onApply,
  onSkip,
}: {
  suggestions: MatchSuggestion[];
  applied: Set<string>;
  skipped: Set<string>;
  onClose: () => void;
  onApply: (s: MatchSuggestion, type: string) => Promise<void>;
  onSkip: (videoId: string) => void;
}) {
  const [types, setTypes] = useState<Record<string, string>>(
    () => Object.fromEntries(suggestions.map(s => [s.video.id, s.videoType]))
  );
  const [applying, setApplying] = useState<string | null>(null);
  const [applyingAll, setApplyingAll] = useState(false);

  const pending = suggestions.filter(s => !applied.has(s.video.id) && !skipped.has(s.video.id));

  async function applyOne(s: MatchSuggestion) {
    setApplying(s.video.id);
    await onApply(s, types[s.video.id] ?? s.videoType);
    setApplying(null);
  }

  async function applyAll() {
    setApplyingAll(true);
    for (const s of pending) await onApply(s, types[s.video.id] ?? s.videoType);
    setApplyingAll(false);
  }

  function scoreColor(score: number) {
    if (score >= 90) return '#22c55e';
    if (score >= 75) return '#f59e0b';
    return '#6366f1';
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex flex-col w-full max-w-2xl h-full overflow-hidden"
        style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-subtle)', boxShadow: '-6px 0 32px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Auto-Match Suggestions</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {suggestions.length} found · {pending.length} pending · {applied.size} applied · {skipped.size} skipped
            </p>
          </div>
          <div className="flex items-center gap-2">
            {pending.length > 0 && (
              <button onClick={applyAll} disabled={applyingAll}
                className="text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity"
                style={{ background: 'var(--accent)', color: '#fff', opacity: applyingAll ? 0.6 : 1 }}>
                {applyingAll ? 'Applying…' : `Apply All (${pending.length})`}
              </button>
            )}
            <button onClick={onClose}
              className="flex items-center justify-center rounded p-1.5 hover:bg-[var(--bg-surface-alt)]"
              style={{ color: 'var(--text-muted)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto">
          {suggestions.length === 0 && (
            <div className="px-6 py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No matches found. All videos may already be linked, or no title overlap was detected.
            </div>
          )}
          {suggestions.map(s => {
            const isApplied  = applied.has(s.video.id);
            const isSkipped  = skipped.has(s.video.id);
            const isPending  = !isApplied && !isSkipped;
            const isApplying = applying === s.video.id;
            const color      = scoreColor(s.score);
            return (
              <div key={s.video.id}
                className="px-6 py-4 flex flex-col gap-3"
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  opacity: !isPending ? 0.45 : 1,
                  background: isApplied ? color + '0a' : undefined,
                  transition: 'opacity 200ms ease',
                }}>

                <div className="flex items-start gap-3">
                  {/* Confidence badge */}
                  <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 tabular-nums"
                    style={{ background: color + '22', color }}>
                    {s.score}%
                  </span>
                  <div className="flex-1 min-w-0">
                    <a href={s.video.url} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-medium hover:underline truncate block" style={{ color: 'var(--text-primary)' }}>
                      {s.video.title}
                    </a>
                    <p className="text-xs mt-0.5 flex items-center gap-1.5">
                      <span style={{ color: 'var(--text-muted)' }}>→</span>
                      <span className="font-semibold" style={{ color: 'var(--accent)' }}>{s.show.title}</span>
                      {s.video.duration_sec && (
                        <span style={{ color: 'var(--text-muted)' }}>· {fmtDuration(s.video.duration_sec)}</span>
                      )}
                    </p>
                  </div>
                  {isApplied && <span className="shrink-0 text-xs font-medium mt-0.5" style={{ color: '#22c55e' }}>✓ Applied</span>}
                  {isSkipped && <span className="shrink-0 text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Skipped</span>}
                </div>

                {isPending && (
                  <div className="flex items-center gap-2">
                    <select
                      value={types[s.video.id] ?? s.videoType}
                      onChange={e => setTypes(t => ({ ...t, [s.video.id]: e.target.value }))}
                      className="rounded px-2 py-1 text-xs flex-1"
                      style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', outline: 'none' }}>
                      {VIDEO_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                    </select>
                    <button onClick={() => applyOne(s)} disabled={!!applying}
                      className="px-3 py-1 rounded text-xs font-semibold transition-opacity"
                      style={{ background: 'var(--accent)', color: '#fff', opacity: applying ? 0.5 : 1 }}>
                      {isApplying ? '…' : 'Apply'}
                    </button>
                    <button onClick={() => onSkip(s.video.id)}
                      className="px-3 py-1 rounded text-xs transition-colors hover:bg-[var(--bg-surface)]"
                      style={{ background: 'var(--bg-surface-alt)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                      Skip
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Deck view ────────────────────────────────────────────────────────────────

function DeckView({ videos, onRemove }: {
  videos: VimeoVideo[];
  onRemove: (video: VimeoVideo) => Promise<void>;
}) {
  const [deckSearch, setDeckSearch] = useState('');
  const [removing, setRemoving]     = useState<string | null>(null);

  const linked = videos.filter(v => v.linked_show_id);

  // Group by show
  const grouped = new Map<string, { title: string; videos: VimeoVideo[] }>();
  for (const v of linked) {
    const sid = v.linked_show_id!;
    if (!grouped.has(sid)) grouped.set(sid, { title: v.linked_show_title ?? 'Unknown', videos: [] });
    grouped.get(sid)!.videos.push(v);
  }

  const q = deckSearch.toLowerCase();
  const decks = Array.from(grouped.entries())
    .map(([id, g]) => ({
      id,
      title: g.title,
      videos: q
        ? g.videos.filter(v => g.title.toLowerCase().includes(q) || v.title.toLowerCase().includes(q))
        : g.videos,
    }))
    .filter(d => !q || d.videos.length > 0)
    .sort((a, b) => a.title.localeCompare(b.title));

  async function remove(video: VimeoVideo) {
    setRemoving(video.id);
    await onRemove(video);
    setRemoving(null);
  }

  function typeBadge(type: string | null) {
    if (!type) return null;
    const colors: Record<string, string> = {
      sizzle: '#6366f1', casting_tape: '#f59e0b', interview: '#22c55e',
      rough_cut: '#ef4444', character_reel: '#8b5cf6', other: 'var(--text-muted)',
    };
    const c = colors[type] ?? 'var(--text-muted)';
    return (
      <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: c + '22', color: c }}>
        {type.replace(/_/g, ' ')}
      </span>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Search bar */}
      <div className="px-6 py-3 flex items-center gap-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
        <input
          type="search"
          placeholder="Search decks or videos…"
          value={deckSearch}
          onChange={e => setDeckSearch(e.target.value)}
          className="rounded-md px-3 py-1.5 text-sm"
          style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none', width: 240 }}
        />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {decks.length} deck{decks.length !== 1 ? 's' : ''} · {linked.length} videos linked
        </span>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4 flex flex-col gap-3">
        {decks.length === 0 && (
          <p className="text-sm text-center py-12" style={{ color: 'var(--text-muted)' }}>
            {linked.length === 0 ? 'No videos are linked to any show yet.' : 'No decks match your search.'}
          </p>
        )}

        {decks.map(deck => (
          <div key={deck.id} className="rounded-lg overflow-hidden shrink-0"
            style={{ border: '1px solid var(--border-subtle)' }}>

            {/* Deck header */}
            <div className="px-4 py-2.5 flex items-center gap-3"
              style={{ background: 'var(--bg-surface-alt)', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 className="text-sm font-semibold flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                {deck.title}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'var(--accent)22', color: 'var(--accent)' }}>
                {deck.videos.length} video{deck.videos.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Video rows */}
            {deck.videos.map((v, i) => (
              <div key={v.id}
                className="px-4 py-3 flex items-center gap-3 hover:bg-[var(--bg-surface-alt)] transition-colors"
                style={{
                  borderBottom: i < deck.videos.length - 1 ? '1px solid var(--border-subtle)' : undefined,
                  opacity: removing === v.id ? 0.4 : 1,
                  transition: 'opacity 150ms ease',
                }}>
                <div className="flex-1 min-w-0">
                  <a href={v.url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline truncate block"
                    style={{ color: 'var(--text-primary)' }}>
                    {v.title}
                  </a>
                  <div className="flex items-center gap-2 mt-0.5">
                    {v.duration_sec != null && (
                      <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                        {fmtDuration(v.duration_sec)}
                      </span>
                    )}
                    {typeBadge(v.linked_video_type)}
                    {privacyBadge(v.privacy)}
                  </div>
                </div>
                <button
                  onClick={() => remove(v)}
                  disabled={removing === v.id}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-md font-medium transition-opacity"
                  style={{
                    background: 'rgba(239,68,68,0.08)',
                    color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.2)',
                    opacity: removing === v.id ? 0.5 : 1,
                    cursor: removing === v.id ? 'not-allowed' : 'pointer',
                  }}>
                  {removing === v.id ? '…' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function VimeoLibraryPage() {
  const [videos, setVideos]     = useState<VimeoVideo[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [shows, setShows]       = useState<Show[]>([]);

  // Table state
  const [search, setSearch]     = useState('');
  const [privFilter, setPrivFilter] = useState('');
  const [linkedFilter, setLinkedFilter] = useState('');
  const [sort, setSort]         = useState<{ col: SortCol; dir: SortDir }>({ col: 'last_modified', dir: 'desc' });
  const [colWidths, setColWidths] = useState<Record<ColName, number>>(DEFAULT_WIDTHS);
  const [visibleCols, setVisibleCols] = useState<Record<ColName, boolean>>({ title: true, duration: true, privacy: true, linked_show: true, date: true });
  const [colSelectorOpen, setColSelectorOpen] = useState(false);
  const [linkModal, setLinkModal] = useState<VimeoVideo | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<'list' | 'decks'>('list');

  // Auto-match state
  const [matchOpen, setMatchOpen]           = useState(false);
  const [matchSuggestions, setMatchSuggestions] = useState<MatchSuggestion[]>([]);
  const [matchApplied, setMatchApplied]     = useState<Set<string>>(new Set());
  const [matchSkipped, setMatchSkipped]     = useState<Set<string>>(new Set());

  // Persist sort + col visibility
  useEffect(() => {
    try {
      const s = localStorage.getItem('vimeo-lib-sort');
      if (s) setSort(JSON.parse(s));
      const c = localStorage.getItem('vimeo-lib-cols');
      if (c) setVisibleCols(JSON.parse(c));
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { try { localStorage.setItem('vimeo-lib-sort', JSON.stringify(sort)); } catch { /**/ } }, [sort]);
  useEffect(() => { try { localStorage.setItem('vimeo-lib-cols', JSON.stringify(visibleCols)); } catch { /**/ } }, [visibleCols]);

  function handleSortClick(col: SortCol) {
    setSort(prev => prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' });
  }

  function SortIcon({ col }: { col: SortCol }) {
    if (sort.col !== col) return <ChevronsUpDown size={12} style={{ opacity: 0.4 }} />;
    return sort.dir === 'asc'
      ? <ChevronUp size={12} style={{ color: 'var(--accent)' }} />
      : <ChevronDown size={12} style={{ color: 'var(--accent)' }} />;
  }

  // Column resize
  function startResize(e: React.MouseEvent, col: ColName) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = colWidths[col];
    function onMove(ev: MouseEvent) {
      const next = Math.max(60, startW + ev.clientX - startX);
      setColWidths(prev => ({ ...prev, [col]: next }));
    }
    function onUp() { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // Load shows once for the link modal
  useEffect(() => {
    fetch('/api/catalog').then(r => r.ok ? r.json() : { data: [] }).then(d => {
      const arr: { id: string; title: string }[] = Array.isArray(d) ? d : (d.data ?? []);
      setShows(arr.map(s => ({ id: s.id, title: s.title })));
    }).catch(() => {});
  }, []);

  // Load all videos (all at once — 940 rows is fine for client-side sort/filter)
  useEffect(() => {
    setLoading(true);
    fetch('/api/vimeo-library?per_page=500&page=1')
      .then(r => r.ok ? r.json() : { data: [], total: 0 })
      .then(d => {
        const first = d.data ?? [];
        if (d.total > 500) {
          // Fetch remaining pages
          const pages = Math.ceil(d.total / 500);
          const rest = Array.from({ length: pages - 1 }, (_, i) =>
            fetch(`/api/vimeo-library?per_page=500&page=${i + 2}`).then(r => r.json())
          );
          Promise.all(rest).then(results => {
            const all = [...first, ...results.flatMap(r => r.data ?? [])];
            setVideos(all);
            setTotal(all.length);
          });
        } else {
          setVideos(first);
          setTotal(d.total);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Client-side filter + sort
  const filtered = videos.filter(v => {
    if (search && !v.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (privFilter && v.privacy !== privFilter) return false;
    if (linkedFilter === 'true'  && !v.linked_show_id) return false;
    if (linkedFilter === 'false' && v.linked_show_id) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const col = sort.col;
    const aVal = a[col] ?? '';
    const bVal = b[col] ?? '';
    const cmp = typeof aVal === 'number' && typeof bVal === 'number'
      ? aVal - bVal
      : String(aVal).localeCompare(String(bVal));
    return sort.dir === 'asc' ? cmp : -cmp;
  });

  const privacyValues = [...new Set(videos.map(v => v.privacy).filter(Boolean))] as string[];

  const visibleColList = COLS.filter(c => visibleCols[c]);

  function handleVideoSaved(updated: VimeoVideo) {
    setVideos(prev => prev.map(v => v.id === updated.id ? updated : v));
    setLinkModal(updated);
  }

  function openAutoMatch() {
    const suggestions = buildSuggestions(videos, shows);
    setMatchSuggestions(suggestions);
    setMatchApplied(new Set());
    setMatchSkipped(new Set());
    setMatchOpen(true);
  }

  async function applyMatch(s: MatchSuggestion, videoType: string) {
    try {
      const r = await fetch('/api/show-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vimeo_library_id: s.video.id, ip_catalog_id: s.show.id, video_type: videoType }),
      });
      if (r.ok) {
        const d = await r.json();
        setVideos(prev => prev.map(v =>
          v.id === s.video.id
            ? { ...v, linked_show_id: s.show.id, linked_show_title: s.show.title, linked_video_type: videoType, show_video_id: d.id }
            : v
        ));
        setMatchApplied(prev => new Set(prev).add(s.video.id));
      }
    } catch { /* ignore individual failures */ }
  }

  function skipMatch(videoId: string) {
    setMatchSkipped(prev => new Set(prev).add(videoId));
  }

  async function handleRemoveFromDeck(video: VimeoVideo) {
    if (!video.show_video_id) return;
    try {
      const r = await fetch(`/api/show-videos/${video.show_video_id}`, { method: 'DELETE' });
      if (r.ok) {
        setVideos(prev => prev.map(v =>
          v.id === video.id
            ? { ...v, linked_show_id: null, linked_show_title: null, linked_video_type: null, show_video_id: null }
            : v
        ));
      }
    } catch { /* ignore */ }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ── Header ── */}
      <div className="px-6 py-4 flex items-center justify-between gap-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Vimeo Library</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {loading ? 'Loading…' : viewMode === 'list'
              ? `${sorted.length} of ${total} videos`
              : `${videos.filter(v => v.linked_show_id).length} linked videos`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex rounded-md overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
            {(['list', 'decks'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className="text-xs px-3 py-1.5 font-medium transition-colors"
                style={{
                  background: viewMode === m ? 'var(--accent)' : 'transparent',
                  color: viewMode === m ? '#fff' : 'var(--text-secondary)',
                }}>
                {m === 'list' ? 'All Videos' : 'By Deck'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openAutoMatch}
            disabled={loading || shows.length === 0}
            className="text-xs px-3 py-1.5 rounded-md font-semibold transition-opacity"
            style={{ background: 'var(--accent)', color: '#fff', opacity: loading || shows.length === 0 ? 0.5 : 1 }}>
            Auto-Match
          </button>
          <a href="https://vimeo.com/library" target="_blank" rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded-md"
            style={{ background: 'var(--bg-surface-alt)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
            Open Vimeo ↗
          </a>
        </div>
      </div>

      {/* ── Deck view ── */}
      {viewMode === 'decks' && (
        <DeckView videos={videos} onRemove={handleRemoveFromDeck} />
      )}

      {/* ── List mode: controls + table ── */}
      {viewMode === 'list' && <>
      <div className="px-6 py-3 flex flex-wrap items-center gap-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>

        {/* Live search */}
        <input
          type="search"
          placeholder="Search titles…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-md px-3 py-1.5 text-sm"
          style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', outline: 'none', width: 220 }}
        />

        {/* Privacy filter chips */}
        <div className="flex items-center gap-1.5">
          {(['', ...privacyValues]).map(p => (
            <button key={p || 'all'} onClick={() => setPrivFilter(p === privFilter ? '' : p)}
              className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                background: privFilter === p ? 'var(--accent)' : 'transparent',
                color: privFilter === p ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${privFilter === p ? 'var(--accent)' : 'var(--border-subtle)'}`,
              }}>
              {p || 'All Privacy'}
            </button>
          ))}
        </div>

        {/* Linked filter chips */}
        <div className="flex items-center gap-1.5">
          {[['', 'All'], ['true', 'Linked'], ['false', 'Unlinked']].map(([val, label]) => (
            <button key={val} onClick={() => setLinkedFilter(val === linkedFilter ? '' : val)}
              className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                background: linkedFilter === val ? 'var(--accent)' : 'transparent',
                color: linkedFilter === val ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${linkedFilter === val ? 'var(--accent)' : 'var(--border-subtle)'}`,
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Column selector */}
        <div className="relative ml-auto">
          <button onClick={() => setColSelectorOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs"
            style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
            <Columns size={13} />
            Columns
          </button>
          {colSelectorOpen && (
            <div className="absolute right-0 top-full mt-1 z-20 rounded-md p-2 flex flex-col gap-1"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', minWidth: 140 }}>
              {COLS.filter(c => c !== 'title').map(c => (
                <label key={c} className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-[var(--bg-surface-alt)] text-xs"
                  style={{ color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={visibleCols[c]} onChange={e => setVisibleCols(v => ({ ...v, [c]: e.target.checked }))} />
                  {COL_LABELS[c]}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            {visibleColList.map(c => <col key={c} style={{ width: colWidths[c] }} />)}
            <col style={{ width: 80 }} />
          </colgroup>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-surface)' }}>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {visibleColList.map((c) => {
                const sortCol: SortCol | null = c === 'title' ? 'title' : c === 'duration' ? 'duration_sec' : c === 'privacy' ? 'privacy' : c === 'linked_show' ? 'linked_show_title' : c === 'date' ? 'last_modified' : null;
                return (
                  <th key={c} className="relative text-left px-4 py-2.5 text-xs font-semibold select-none"
                    style={{ color: 'var(--text-muted)', userSelect: 'none', cursor: sortCol ? 'pointer' : 'default' }}
                    onClick={() => sortCol && handleSortClick(sortCol)}>
                    <span className="flex items-center gap-1">
                      {COL_LABELS[c]}
                      {sortCol && <SortIcon col={sortCol} />}
                    </span>
                    {/* Resize handle */}
                    <div
                      onMouseDown={e => { e.stopPropagation(); startResize(e, c); }}
                      style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, cursor: 'col-resize', opacity: 0 }}
                      className="hover:opacity-100"
                    />
                  </th>
                );
              })}
              <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={visibleColList.length + 1} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</td></tr>
            )}
            {!loading && sorted.length === 0 && (
              <tr><td colSpan={visibleColList.length + 1} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No videos match your filters.</td></tr>
            )}
            {sorted.map(v => (
              <tr key={v.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                className="hover:bg-[var(--bg-surface-alt)] transition-colors">
                {visibleColList.map(c => (
                  <td key={c} className="px-4 py-2.5 text-sm" style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c === 'title' && (
                      <a href={v.url} target="_blank" rel="noopener noreferrer"
                        className="hover:underline font-medium" style={{ color: 'var(--accent)' }}>
                        {v.title}
                      </a>
                    )}
                    {c === 'duration' && <span style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{fmtDuration(v.duration_sec)}</span>}
                    {c === 'privacy' && privacyBadge(v.privacy)}
                    {c === 'linked_show' && (
                      v.linked_show_title
                        ? <span>{v.linked_show_title} <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>({v.linked_video_type})</span></span>
                        : <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                    {c === 'date' && <span style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{fmtDate(v.last_modified)}</span>}
                  </td>
                ))}
                <td className="px-4 py-2.5">
                  <button
                    onClick={() => setLinkModal(v)}
                    className="text-xs px-2.5 py-1 rounded"
                    style={{
                      background: v.linked_show_id ? 'var(--accent-dim, #6366f122)' : 'var(--bg-surface-alt)',
                      color: v.linked_show_id ? 'var(--accent)' : 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }}>
                    {v.linked_show_id ? 'Edit' : 'Link'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>}

      {/* ── Link modal ── */}
      {linkModal && (
        <LinkModal
          video={linkModal}
          shows={shows}
          onClose={() => setLinkModal(null)}
          onSaved={updated => { handleVideoSaved(updated); }}
        />
      )}

      {/* ── Auto-match panel ── */}
      {matchOpen && (
        <MatchPanel
          suggestions={matchSuggestions}
          applied={matchApplied}
          skipped={matchSkipped}
          onClose={() => setMatchOpen(false)}
          onApply={applyMatch}
          onSkip={skipMatch}
        />
      )}
    </div>
  );
}
