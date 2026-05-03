// Build [id] — view / edit an existing package by ID.
// Fetches the package from the API and renders it in the same 5-step build UI.
// If the package doesn't exist, 404.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';

interface Package {
  id: string;
  name: string;
  ip_id?: string;
  target_company_id?: string;
  target_contact_id?: string;
  pipeline_stage?: string;
  status?: string;
  narrative?: string;
  ask_format?: string;
  ask_episode_count?: number;
  ask_deal_structure?: string;
  created_at?: number;
  updated_at?: number;
}

async function fetchPackage(id: string): Promise<Package | null> {
  try {
    const res = await fetch(`http://localhost:3000/api/packages/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const { data } = await res.json();
    return data ?? null;
  } catch { return null; }
}

function stageVariant(stage?: string): 'greenlit' | 'inreview' | 'pass' | 'muted' {
  if (!stage) return 'muted';
  if (stage === 'greenlit') return 'greenlit';
  if (stage === 'pass') return 'pass';
  if (['sent', 'in-review', 'meeting', 'negotiating'].includes(stage)) return 'inreview';
  return 'muted';
}

export default async function BuildDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pkg = await fetchPackage(id);

  if (!pkg) notFound();

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Package</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: "'Barlow Condensed', sans-serif" }}>{pkg.name}</h1>
        </div>
        <div className="flex gap-2 items-center shrink-0 mt-1">
          <Badge variant={stageVariant(pkg.pipeline_stage)}>{pkg.pipeline_stage ?? 'proposal'}</Badge>
          <Link href="/pipeline" className="text-xs font-medium" style={{ color: 'var(--accent)' }}>View in Pipeline →</Link>
        </div>
      </div>

      {/* Narrative */}
      {pkg.narrative && (
        <Card className="mb-4">
          <div className="p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Narrative</h2>
            <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{pkg.narrative}</p>
          </div>
        </Card>
      )}

      {/* Ask details */}
      {(pkg.ask_format || pkg.ask_episode_count || pkg.ask_deal_structure) && (
        <Card className="mb-4">
          <div className="p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>The Ask</h2>
            <dl className="grid grid-cols-3 gap-4">
              {pkg.ask_format && (
                <div>
                  <dt className="text-xs text-[var(--text-muted)] mb-0.5">Format</dt>
                  <dd className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{pkg.ask_format}</dd>
                </div>
              )}
              {pkg.ask_episode_count && (
                <div>
                  <dt className="text-xs text-[var(--text-muted)] mb-0.5">Episodes</dt>
                  <dd className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{pkg.ask_episode_count}</dd>
                </div>
              )}
              {pkg.ask_deal_structure && (
                <div>
                  <dt className="text-xs text-[var(--text-muted)] mb-0.5">Deal Structure</dt>
                  <dd className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{pkg.ask_deal_structure}</dd>
                </div>
              )}
            </dl>
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <Link
          href={`/build?edit=${pkg.id}`}
          className="px-4 py-2 rounded text-sm font-medium text-white"
          style={{ background: 'var(--accent)' }}
        >
          Edit Package
        </Link>
        <Link
          href="/build"
          className="px-4 py-2 rounded text-sm font-medium"
          style={{ background: 'var(--bg-surface-alt)', color: 'var(--text-secondary)' }}
        >
          ← All Packages
        </Link>
      </div>
    </div>
  );
}
