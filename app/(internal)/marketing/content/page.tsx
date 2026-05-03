'use client';
// Marketing Content — edit key-value copy blocks for homepage, about, and contact pages.
// Uses a simple form to PATCH /api/marketing/content.

import { useState, useEffect } from 'react';

interface ContentEntry { key: string; value: string; type: string; }

const CONTENT_LABELS: Record<string, string> = {
  'homepage.tagline':     'Homepage — Tagline',
  'homepage.description': 'Homepage — Description',
  'about.founded':        'About — Year Founded',
  'about.acquired':       'About — Acquisition Note',
  'about.offices':        'About — Office Locations',
  'contact.email':        'Contact — Email Address',
  'contact.address':      'Contact — Mailing Address',
  'site.ga4_id':          'GA4 Measurement ID',
};

export default function MarketingContent() {
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/marketing/content').then(r => r.json()).then(d => setEntries(d.data ?? []));
  }, []);

  async function save(key: string, value: string) {
    setSaving(key);
    await fetch('/api/marketing/content', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }) });
    setSaving(null);
    setSaved(key);
    setTimeout(() => setSaved(null), 2000);
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)', fontFamily: "'Barlow Condensed', sans-serif" }}>Site Content</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Edit copy blocks for the public myentertainment.tv pages. Changes go live immediately.</p>
      <div className="flex flex-col gap-4">
        {entries.map((entry) => (
          <div key={entry.key} className="rounded-lg p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {CONTENT_LABELS[entry.key] ?? entry.key}
            </label>
            <ContentField entry={entry} saving={saving === entry.key} saved={saved === entry.key} onSave={save} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ContentField({ entry, saving, saved, onSave }: { entry: ContentEntry; saving: boolean; saved: boolean; onSave: (k: string, v: string) => void; }) {
  const [value, setValue] = useState(entry.value);
  const isLong = entry.value.length > 80;
  return (
    <div className="flex gap-3 items-start">
      {isLong ? (
        <textarea className="flex-1 text-sm px-3 py-2 rounded border resize-y min-h-[80px]" style={{ background: 'var(--bg-surface-alt)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} value={value} onChange={e => setValue(e.target.value)} />
      ) : (
        <input className="flex-1 text-sm px-3 py-2 rounded border" style={{ background: 'var(--bg-surface-alt)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }} value={value} onChange={e => setValue(e.target.value)} />
      )}
      <button onClick={() => onSave(entry.key, value)} disabled={saving} className="px-3 py-2 rounded text-xs font-semibold text-white shrink-0 mt-0" style={{ background: saved ? 'var(--status-greenlit)' : 'var(--accent)', opacity: saving ? 0.6 : 1 }}>
        {saving ? '…' : saved ? '✓' : 'Save'}
      </button>
    </div>
  );
}
