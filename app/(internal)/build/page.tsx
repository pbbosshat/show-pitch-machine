'use client';
// Build — 5-step package builder.
// contact_id URL param pre-populates Step 2 (Buyer selection) when arriving from a buyer profile.
// All state is held in a single BuildState object passed between steps.

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { SkeletonCard } from '@/components/ui/Skeleton';
import type { IpCatalog, BuyerContact, Show, Talent, ContentPartner } from '@/types';

// All five step IDs in order
type StepId = 1 | 2 | 3 | 4 | 5;

// Accumulated builder state — grows as the user moves through steps
interface BuildState {
  ip:           IpCatalog | null;
  buyer:        BuyerContact | null;
  compShows:    Show[];
  talent:       Talent[];
  partners:     ContentPartner[];
  askFormat:    string;
  episodeCount: string;
  dealStructure: string;
  narrative:    string;
}

const STEPS = [
  { id: 1, label: 'Select IP' },
  { id: 2, label: 'Buyer' },
  { id: 3, label: 'Comps' },
  { id: 4, label: 'Assemble' },
  { id: 5, label: 'Narrative + Publish' },
] as const;

const EMPTY_STATE: BuildState = {
  ip:           null,
  buyer:        null,
  compShows:    [],
  talent:       [],
  partners:     [],
  askFormat:    '',
  episodeCount: '',
  dealStructure: '',
  narrative:    '',
};

export default function BuildPage() {
  const searchParams = useSearchParams();
  const contactId = searchParams.get('contact_id');

  const [step, setStep]   = useState<StepId>(1);
  const [state, setState] = useState<BuildState>(EMPTY_STATE);

  // Pre-load buyer from URL param — users arrive here from "/build?contact_id=..."
  useEffect(() => {
    if (!contactId) return;
    fetch(`/api/buyers/${contactId}`)
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) {
          setState((s) => ({ ...s, buyer: data }));
          // Jump straight to Step 1 (IP selection) since buyer is already set
        }
      })
      .catch(console.error);
  }, [contactId]);

  const update = (patch: Partial<BuildState>) => setState((s) => ({ ...s, ...patch }));
  const canProgress = (): boolean => {
    if (step === 1) return !!state.ip;
    if (step === 2) return !!state.buyer;
    if (step === 3) return state.compShows.length >= 1;
    return true;
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Step progress indicator */}
      <div>
        <h1
          className="text-2xl font-bold tracking-tight mb-4"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
        >
          Build Package
        </h1>
        <Stepper currentStep={step} />
      </div>

      {/* Step content */}
      {step === 1 && (
        <StepSelectIP
          selected={state.ip}
          onSelect={(ip) => update({ ip })}
        />
      )}
      {step === 2 && (
        <StepSelectBuyer
          selected={state.buyer}
          onSelect={(buyer) => update({ buyer })}
        />
      )}
      {step === 3 && (
        <StepSelectComps
          ipId={state.ip?.id}
          selected={state.compShows}
          onToggle={(show) => {
            const already = state.compShows.find((c) => c.id === show.id);
            if (already) {
              update({ compShows: state.compShows.filter((c) => c.id !== show.id) });
            } else if (state.compShows.length < 3) {
              update({ compShows: [...state.compShows, show] });
            }
          }}
        />
      )}
      {step === 4 && (
        <StepAssemble state={state} update={update} />
      )}
      {step === 5 && (
        <StepNarrative state={state} update={update} />
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
        <Button
          variant="ghost"
          size="md"
          onClick={() => setStep((s) => Math.max(1, s - 1) as StepId)}
          disabled={step === 1}
        >
          ← Back
        </Button>
        {step < 5 && (
          <Button
            variant="primary"
            size="md"
            onClick={() => setStep((s) => (s + 1) as StepId)}
            disabled={!canProgress()}
          >
            Next →
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Progress Stepper ───────────────────────────────────────────────────────────

function Stepper({ currentStep }: { currentStep: StepId }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2"
              style={{
                borderColor: s.id <= currentStep ? 'var(--accent)' : 'var(--border-subtle)',
                background:   s.id <  currentStep ? 'var(--accent)' : s.id === currentStep ? 'rgba(204,18,18,0.15)' : 'transparent',
                color:        s.id <= currentStep ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              {s.id < currentStep ? '✓' : s.id}
            </div>
            <span
              className="text-[11px] mt-1 whitespace-nowrap"
              style={{ color: s.id === currentStep ? 'var(--accent)' : 'var(--text-muted)' }}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className="h-0.5 w-12 mx-1 mt-[-14px]"
              style={{ background: s.id < currentStep ? 'var(--accent)' : 'var(--border-subtle)' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Step 1 — Select IP ─────────────────────────────────────────────────────────

function StepSelectIP({ selected, onSelect }: { selected: IpCatalog | null; onSelect: (ip: IpCatalog) => void }) {
  const [search, setSearch] = useState('');
  const [items, setItems]   = useState<IpCatalog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/catalog')
      .then((r) => r.json())
      .then(({ data }) => setItems(data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((ip) =>
    !search || ip.title.toLowerCase().includes(search.toLowerCase()) ||
    (ip.logline ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
        Step 1 — Select IP from Catalog
      </h2>
      <Input placeholder="Search IP titles, loglines…" value={search} onChange={setSearch} />

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((ip) => (
            <Card
              key={ip.id}
              hoverable
              onClick={() => onSelect(ip)}
              className={selected?.id === ip.id ? 'ring-2 ring-[var(--accent)]' : ''}
            >
              <div className="flex items-start justify-between">
                <p className="text-sm font-semibold" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}>
                  {ip.title}
                </p>
                {selected?.id === ip.id && (
                  <span style={{ color: 'var(--accent)', fontSize: 18 }}>✓</span>
                )}
              </div>
              {ip.genre && <Badge label={ip.genre} variant="muted" />}
              {ip.format && <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>{ip.format}</span>}
              {ip.logline && (
                <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                  {ip.logline}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Step 2 — Select Buyer ──────────────────────────────────────────────────────

function StepSelectBuyer({ selected, onSelect }: { selected: BuyerContact | null; onSelect: (b: BuyerContact) => void }) {
  const [search, setSearch] = useState('');
  const [buyers, setBuyers] = useState<BuyerContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/buyers')
      .then((r) => r.json())
      .then(({ data }) => setBuyers(data ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = buyers.filter((b) =>
    !search ||
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.title ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold">Step 2 — Select Buyer</h2>
      <Input placeholder="Search buyers…" value={search} onChange={setSearch} />

      {selected && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg border"
          style={{ border: '1px solid var(--accent)', background: 'rgba(204,18,18,0.08)' }}
        >
          <span style={{ color: 'var(--accent)' }}>✓</span>
          <span className="text-sm font-medium">{selected.name}</span>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selected.title}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[1,2,3].map((i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {filtered.map((b) => (
            <div
              key={b.id}
              onClick={() => onSelect(b)}
              className="flex items-center justify-between px-4 py-3 rounded-md cursor-pointer hover:bg-[var(--bg-surface-alt)] border border-transparent"
              style={{
                background: selected?.id === b.id ? 'rgba(204,18,18,0.08)' : 'var(--bg-surface)',
                borderColor: selected?.id === b.id ? 'var(--accent)' : 'var(--border-subtle)',
                transition: 'background var(--motion-base) var(--ease)',
              }}
            >
              <div>
                <p className="text-sm font-medium">{b.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{b.title}</p>
              </div>
              <Badge label={b.activity_status} variant={b.activity_status as 'active' | 'quiet' | 'unknown'} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Step 3 — Comp Shows ────────────────────────────────────────────────────────

function StepSelectComps({
  ipId,
  selected,
  onToggle,
}: {
  ipId?: string;
  selected: Show[];
  onToggle: (show: Show) => void;
}) {
  const [search, setSearch]   = useState('');
  const [similar, setSimilar] = useState<Show[]>([]);
  const [all, setAll]         = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBoth = async () => {
      try {
        const [simRes, allRes] = await Promise.all([
          ipId ? fetch(`/api/shows/similar?ip_id=${ipId}`) : Promise.resolve(null),
          fetch('/api/shows'),
        ]);
        const simData = simRes ? await simRes.json() : { data: [] };
        const allData = await allRes.json();
        setSimilar(simData.data ?? []);
        setAll(allData.data ?? []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchBoth();
  }, [ipId]);

  const displayShows = search
    ? all.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()))
    : similar.length > 0 ? similar : all;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Step 3 — Comp Shows (select 2–3)</h2>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {selected.length}/3 selected
        </span>
      </div>

      <Input placeholder="Search all shows…" value={search} onChange={setSearch} />

      {/* Selected comps */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((s) => (
            <button
              key={s.id}
              onClick={() => onToggle(s)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
              style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'rgba(204,18,18,0.1)' }}
            >
              {s.title} ✕
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map((i) => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
          {displayShows.map((show) => {
            const isSelected = selected.some((s) => s.id === show.id);
            const maxReached = selected.length >= 3 && !isSelected;
            return (
              <Card
                key={show.id}
                hoverable={!maxReached}
                onClick={!maxReached ? () => onToggle(show) : undefined}
                className={isSelected ? 'ring-2 ring-[var(--accent)]' : ''}
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {show.title}
                  </p>
                  {isSelected && <span style={{ color: 'var(--accent)' }}>✓</span>}
                </div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{show.network}</p>
                {show.genre && <Badge label={show.genre} variant="muted" />}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Step 4 — Assemble ──────────────────────────────────────────────────────────

function StepAssemble({ state, update }: { state: BuildState; update: (p: Partial<BuildState>) => void }) {
  const [allTalent, setAllTalent]     = useState<Talent[]>([]);
  const [allPartners, setAllPartners] = useState<ContentPartner[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/talent').then((r) => r.json()).catch(() => ({ data: [] })),
      fetch('/api/partners').then((r) => r.json()).catch(() => ({ data: [] })),
    ]).then(([td, pd]) => {
      setAllTalent(td.data ?? []);
      setAllPartners(pd.data ?? []);
    });
  }, []);

  const toggleTalent = (t: Talent) => {
    const has = state.talent.find((x) => x.id === t.id);
    update({ talent: has ? state.talent.filter((x) => x.id !== t.id) : [...state.talent, t] });
  };

  const togglePartner = (p: ContentPartner) => {
    const has = state.partners.find((x) => x.id === p.id);
    update({ partners: has ? state.partners.filter((x) => x.id !== p.id) : [...state.partners, p] });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold">Step 4 — Assemble Package</h2>

      {/* Ask fields */}
      <Card>
        <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
          The Ask
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <label className="space-y-1">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Format</span>
            <Input
              placeholder="e.g. Docuseries"
              value={state.askFormat}
              onChange={(v) => update({ askFormat: v })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Episodes</span>
            <Input
              placeholder="e.g. 8"
              value={state.episodeCount}
              onChange={(v) => update({ episodeCount: v })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Deal Structure</span>
            <Input
              placeholder="e.g. Straight-to-series"
              value={state.dealStructure}
              onChange={(v) => update({ dealStructure: v })}
            />
          </label>
        </div>
      </Card>

      {/* Talent multi-select */}
      {allTalent.length > 0 && (
        <Card>
          <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Talent
          </h3>
          <div className="flex flex-wrap gap-2">
            {allTalent.map((t) => {
              const selected = !!state.talent.find((x) => x.id === t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleTalent(t)}
                  className="px-3 py-1.5 text-xs rounded-full border"
                  style={{
                    borderColor: selected ? 'var(--accent)' : 'var(--border-subtle)',
                    background:  selected ? 'rgba(204,18,18,0.1)' : 'transparent',
                    color:       selected ? 'var(--accent)' : 'var(--text-secondary)',
                    transition:  'all var(--motion-base) var(--ease)',
                  }}
                >
                  {t.name}
                  {t.primary_role && ` · ${t.primary_role}`}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Content Partners multi-select */}
      {allPartners.length > 0 && (
        <Card>
          <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Content Partners
          </h3>
          <div className="flex flex-wrap gap-2">
            {allPartners.map((p) => {
              const selected = !!state.partners.find((x) => x.id === p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePartner(p)}
                  className="px-3 py-1.5 text-xs rounded-full border"
                  style={{
                    borderColor: selected ? 'var(--accent)' : 'var(--border-subtle)',
                    background:  selected ? 'rgba(204,18,18,0.1)' : 'transparent',
                    color:       selected ? 'var(--accent)' : 'var(--text-secondary)',
                    transition:  'all var(--motion-base) var(--ease)',
                  }}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Step 5 — Narrative + Publish ───────────────────────────────────────────────

function StepNarrative({ state, update }: { state: BuildState; update: (p: Partial<BuildState>) => void }) {
  const [copied, setCopied]           = useState(false);
  const [emailModalOpen, setEmailModal] = useState(false);
  const [emailTo, setEmailTo]         = useState(state.buyer?.email ?? '');
  const [emailNote, setEmailNote]     = useState('');
  const [saving, setSaving]           = useState(false);
  const [savedSlug, setSavedSlug]     = useState<string | null>(null);
  const [saveError, setSaveError]     = useState<string | null>(null);

  // Build the prompt that Shawn pastes into Claude Code to generate the narrative
  const prompt = [
    `Write a pitch narrative for "${state.ip?.title ?? 'the IP'}" targeting ${state.buyer?.name ?? 'the buyer'} at ${state.buyer ? '(their company)' : '(unknown company)'}.`,
    '',
    state.buyer?.mandate_statement ? `Mandate: ${state.buyer.mandate_statement}` : '',
    state.compShows.length > 0
      ? `Comps: ${state.compShows.map((s) => `${s.title} (${s.network})`).join(', ')}`
      : '',
    state.talent.length > 0
      ? `Talent: ${state.talent.map((t) => t.name).join(', ')}`
      : '',
    state.partners.length > 0
      ? `Partners: ${state.partners.map((p) => p.name).join(', ')}`
      : '',
    state.askFormat   ? `Ask: ${state.askFormat}` : '',
    state.episodeCount ? `Episodes: ${state.episodeCount}` : '',
    state.dealStructure ? `Deal: ${state.dealStructure}` : '',
  ].filter(Boolean).join('\n');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt).catch(console.error);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSavePackage = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:               uuidv4(),
          name:             state.ip?.title ?? 'New Package',
          ip_id:            state.ip?.id,
          target_contact_id: state.buyer?.id,
          narrative:        state.narrative,
          ask_format:       state.askFormat,
          ask_episode_count: state.episodeCount ? parseInt(state.episodeCount) : null,
          ask_deal_structure: state.dealStructure,
          comp_show_ids:    JSON.stringify(state.compShows.map((s) => s.id)),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { data } = await res.json();
      setSavedSlug(data?.slug ?? data?.id ?? 'saved');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <h2 className="text-base font-semibold">Step 5 — Narrative &amp; Publish</h2>

      {/* Claude Code prompt panel */}
      <Card>
        <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
          Paste into Claude Code to generate the pitch:
        </p>
        <pre
          className="text-sm whitespace-pre-wrap p-3 rounded-md mb-3 select-all"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            background: 'var(--bg-app)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {prompt}
        </pre>
        <Button variant="ghost" size="sm" onClick={handleCopy}>
          {copied ? '✓ Copied' : 'Copy Prompt'}
        </Button>
      </Card>

      {/* Editable narrative textarea — paste Claude Code output here */}
      <Card>
        <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
          Pitch Narrative (paste Claude Code output here)
        </p>
        <textarea
          className="w-full rounded-md px-3 py-2 text-sm min-h-[200px] resize-y focus:outline-none"
          placeholder="Paste the generated narrative here…"
          value={state.narrative}
          onChange={(e) => update({ narrative: e.target.value })}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            transition: 'border-color var(--motion-base) var(--ease)',
          }}
        />
      </Card>

      {/* Publish actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {savedSlug ? (
          <Button
            variant="ghost"
            size="md"
            href={`/pitch/${savedSlug}`}
          >
            Preview Portal →
          </Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            onClick={handleSavePackage}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Package'}
          </Button>
        )}

        {savedSlug && (
          <Button
            variant="ghost"
            size="md"
            onClick={() => setEmailModal(true)}
          >
            Send →
          </Button>
        )}

        {saveError && (
          <p className="text-sm" style={{ color: 'var(--status-pass)' }}>
            {saveError}
          </p>
        )}
      </div>

      {/* Email compose modal */}
      <Modal isOpen={emailModalOpen} onClose={() => setEmailModal(false)} title="Send Package">
        <div className="space-y-4">
          <label className="block space-y-1">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>To</span>
            <Input placeholder="buyer@network.com" value={emailTo} onChange={setEmailTo} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Cover Note</span>
            <textarea
              className="w-full rounded-md px-3 py-2 text-sm min-h-[100px] focus:outline-none"
              placeholder="Hi [Name], wanted to share…"
              value={emailNote}
              onChange={(e) => setEmailNote(e.target.value)}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEmailModal(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={() => setEmailModal(false)}>Send</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
