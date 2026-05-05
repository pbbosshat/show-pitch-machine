'use client';
// Genre edit page — /marketing/genres/[id]
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface SiteGenre {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  show_count: number;
}

export default function EditGenrePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [genre, setGenre] = useState<SiteGenre | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/marketing/genres')
      .then(r => r.json())
      .then(({ data }: { data: SiteGenre[] }) => {
        const g = data?.find((x: SiteGenre) => x.id === id);
        if (g) {
          setGenre(g);
          setName(g.name);
          setDescription(g.description ?? '');
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/marketing/genres/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      router.push('/marketing/genres');
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8" style={{ color: 'var(--text-muted)' }}>Loading...</div>;
  }

  if (!genre) {
    return (
      <div className="p-8">
        <p style={{ color: 'var(--text-muted)' }}>Genre not found.</p>
        <Link href="/marketing/genres" style={{ color: 'var(--accent)' }}>← Back to Genres</Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/marketing/genres" className="text-sm" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          ← Genres
        </Link>
        <span style={{ color: 'var(--border-subtle)' }}>/</span>
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{genre.name}</span>
      </div>

      <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)', fontFamily: "'Barlow Condensed', sans-serif" }}>
        Edit Genre
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        {genre.show_count} active show{genre.show_count !== 1 ? 's' : ''} · anchor: /genres#{genre.slug}
      </p>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={saving}
            required
            className="w-full px-3 py-2 rounded text-sm"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Slug auto-generates from name. Shows are matched by genre name — changing it will update the anchor link but not reassign shows.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            disabled={saving}
            rows={3}
            className="w-full px-3 py-2 rounded text-sm"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', resize: 'vertical' }}
          />
        </div>

        {error && (
          <p className="text-sm" style={{ color: '#e51d26' }}>{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded text-sm font-medium text-white"
            style={{ background: saving ? 'var(--text-muted)' : 'var(--accent)', cursor: saving ? 'not-allowed' : 'pointer' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <Link
            href="/marketing/genres"
            className="px-5 py-2 rounded text-sm font-medium"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', textDecoration: 'none', border: '1px solid var(--border-subtle)' }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
