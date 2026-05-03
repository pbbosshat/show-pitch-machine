'use client';
// ScraperBanner — client island shown when one or more sources haven't run today.
// Dismiss state is local (not persisted) since the banner will re-appear on next refresh if still stale.
// "Run Now" fires a POST to /api/scraper/run and shows feedback inline.

import { useState } from 'react';
import type { ScraperSourceStatus } from '@/types';

interface ScraperBannerProps {
  sources: ScraperSourceStatus[];
}

export default function ScraperBanner({ sources }: ScraperBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);

  if (dismissed) return null;

  const sourceNames = sources.map((s) => s.display_name ?? s.source).join(', ');

  const handleRunNow = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/scraper/run', { method: 'POST' });
      if (!res.ok) {
        const text = await res.text();
        setRunResult(`Error: ${text}`);
      } else {
        const json = await res.json();
        const queued = json.queued?.length ?? 0;
        setRunResult(`${queued} source${queued !== 1 ? 's' : ''} queued`);
      }
    } catch (err) {
      // Show exact error per design system rule — never generic messages
      setRunResult(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-lg text-sm"
      style={{
        background: 'rgba(234, 179, 8, 0.1)',
        border: '1px solid rgba(234, 179, 8, 0.3)',
        color: 'var(--status-inreview)',
      }}
    >
      <span className="shrink-0">⚠</span>
      <span className="flex-1">
        <strong>{sources.length} source{sources.length !== 1 ? 's' : ''}</strong> haven&apos;t run today
        &mdash; <span style={{ color: 'var(--text-secondary)' }}>{sourceNames}</span>
      </span>

      {runResult ? (
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{runResult}</span>
      ) : (
        <button
          onClick={handleRunNow}
          disabled={running}
          className="px-3 py-1 text-xs font-semibold rounded border"
          style={{
            borderColor: 'var(--status-inreview)',
            color: 'var(--status-inreview)',
            background: 'transparent',
            opacity: running ? 0.5 : 1,
            cursor: running ? 'not-allowed' : 'pointer',
          }}
        >
          {running ? 'Running…' : 'Run Now'}
        </button>
      )}

      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 px-2 py-1 text-xs rounded hover:bg-[rgba(234,179,8,0.1)]"
        style={{ color: 'var(--text-muted)' }}
      >
        Dismiss
      </button>
    </div>
  );
}
