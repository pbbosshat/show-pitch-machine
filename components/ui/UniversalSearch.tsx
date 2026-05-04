'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  type: string;
  id: string | number;
  title: string;
  subtitle: string;
  url: string;
}

// Color badge per entity type — matches pitch-machine brand palette
const TYPE_COLORS: Record<string, string> = {
  'Buyer Contact':    '#6366f1',
  'Network / Buyer':  '#0ea5e9',
  'Prod Co':          '#10b981',
  'Prod Co Contact':  '#14b8a6',
  'Show':             '#f59e0b',
  'IP / Project':     '#8b5cf6',
  'Package':          '#ec4899',
  'Talent':           '#f97316',
  'Deck':             '#64748b',
};

function IconSearch() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

function IconSpinner() {
  return (
    <>
      <style>{`@keyframes spm-spin { to { transform: rotate(360deg); } }`}</style>
      <svg
        width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        style={{ animation: 'spm-spin 0.75s linear infinite' }}
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
    </>
  );
}

export default function UniversalSearch() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced fetch — fires 300 ms after last keystroke
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
        setSelected(-1);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navigate = useCallback((result: SearchResult) => {
    router.push(result.url);
    setQ('');
    setResults([]);
    setOpen(false);
  }, [router]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selected >= 0) {
      e.preventDefault();
      navigate(results[selected]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>

      {/* Results panel — anchored above the input */}
      {open && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            boxShadow: '0 -6px 28px rgba(0,0,0,0.22)',
            maxHeight: 340,
            overflowY: 'auto',
            zIndex: 100,
          }}
        >
          {results.map((r, i) => (
            <button
              key={`${r.type}-${r.id}`}
              onMouseDown={() => navigate(r)}
              onMouseEnter={() => setSelected(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '6px 10px',
                background: i === selected ? 'var(--bg-surface-alt)' : 'transparent',
                border: 'none',
                borderBottom: i < results.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {/* Colored type badge */}
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '2px 5px',
                  borderRadius: 4,
                  background: TYPE_COLORS[r.type] ?? '#64748b',
                  color: '#fff',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {r.type}
              </span>

              {/* Title + subtitle */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.3,
                }}>
                  {r.title}
                </p>
                {r.subtitle && (
                  <p style={{
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.3,
                  }}>
                    {r.subtitle}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Compact search input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 9px',
          background: 'var(--bg-surface-alt)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 7,
          transition: 'border-color 150ms ease',
        }}
      >
        <span style={{ color: 'var(--text-muted)', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {loading ? <IconSpinner /> : <IconSearch />}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder="Search everything…"
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: 11,
            color: 'var(--text-primary)',
            width: '100%',
            lineHeight: 1.4,
          }}
        />
        {q.length > 0 && (
          <button
            onMouseDown={e => { e.preventDefault(); setQ(''); setOpen(false); }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              padding: 0,
              flexShrink: 0,
              fontSize: 14,
              lineHeight: 1,
            }}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
