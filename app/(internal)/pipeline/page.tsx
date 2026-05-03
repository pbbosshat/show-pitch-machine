'use client';
// Pipeline Kanban — needs full interactivity: drag-and-drop, SWR polling, modal, toast.
// Uses @dnd-kit for drag-and-drop between stage columns.
// SWR polls every 5 seconds to catch Grok-triggered auto-moves from inbound email.

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDistanceToNow, format } from 'date-fns';
import Badge from '@/components/ui/Badge';
import StatusDot from '@/components/ui/StatusDot';
import Modal from '@/components/ui/Modal';
import { SkeletonCard } from '@/components/ui/Skeleton';
import type { Package, PipelineStage } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Columns in left-to-right board order
const COLUMNS: { id: PipelineStage; label: string }[] = [
  { id: 'proposal',    label: 'Proposal' },
  { id: 'sent',        label: 'Sent' },
  { id: 'in-review',   label: 'In Review' },
  { id: 'meeting',     label: 'Meeting' },
  { id: 'negotiating', label: 'Negotiating' },
  { id: 'greenlit',    label: 'Greenlit' },
  { id: 'pass',        label: 'Pass' },
];

// Extended package shape that includes denormalized buyer/company info from the API
interface PipelinePackage extends Package {
  ip_title?: string;
  buyer_name?: string;
  company_name?: string;
  last_email_date?: number | null;
  grok_signal?: string | null;
}

// Map pipeline stage to a header accent color
const COLUMN_COLORS: Record<string, string> = {
  proposal:    'var(--text-muted)',
  sent:        'var(--status-inreview)',
  'in-review': 'var(--status-inreview)',
  meeting:     'var(--status-deal)',
  negotiating: 'var(--status-deal)',
  greenlit:    'var(--status-greenlit)',
  pass:        'var(--status-pass)',
};

export default function PipelinePage() {
  const { data, mutate, isLoading } = useSWR<{ data: PipelinePackage[] }>(
    '/api/pipeline',
    fetcher,
    { refreshInterval: 5000 }  // 5s polling — catches Grok auto-moves from email watcher
  );

  const [activeId, setActiveId]         = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<PipelinePackage | null>(null);
  const [toast, setToast]               = useState<string | null>(null);

  const packages: PipelinePackage[] = data?.data ?? [];

  // Pointer sensor with a 5px drag threshold so clicks still work for card opening
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Group packages by stage for column rendering
  const byStage = useCallback(
    (stageId: string) => packages.filter((p) => p.pipeline_stage === stageId),
    [packages]
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string);
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;

    // over.id is either a column ID or a card ID — determine the target stage
    const targetStage = COLUMNS.find((c) => c.id === over.id)?.id
      ?? packages.find((p) => p.id === over.id)?.pipeline_stage;

    if (!targetStage) return;

    const pkg = packages.find((p) => p.id === active.id);
    if (!pkg || pkg.pipeline_stage === targetStage) return;

    // Optimistically update local state so the UI feels instant
    mutate(
      {
        data: packages.map((p) =>
          p.id === active.id ? { ...p, pipeline_stage: targetStage as PipelineStage, days_in_stage: 0 } : p
        ),
      },
      false // don't revalidate yet — the PUT below will trigger revalidation
    );

    try {
      const res = await fetch(`/api/pipeline/${active.id}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: targetStage }),
      });
      if (!res.ok) throw new Error(await res.text());
      mutate(); // revalidate to confirm the new state from the server
    } catch (err) {
      // Show exact error message per design system rules — never generic "failed"
      triggerToast(err instanceof Error ? err.message : 'Stage update failed');
      mutate(); // revert to server state on failure
    }
  };

  // Auto-dismiss the toast after 4 seconds — used directly in handleDragEnd's catch
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="h-full flex flex-col p-6 gap-5">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
          >
            Pipeline
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {packages.length} active packages — drag to move stages
          </p>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto">
        {isLoading ? (
          <div className="flex gap-4 h-full">
            {COLUMNS.map((col) => (
              <div key={col.id} className="w-56 shrink-0 space-y-3">
                <div className="h-5 w-24 skeleton rounded" />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 h-full pb-4" style={{ minHeight: '600px' }}>
              {COLUMNS.map((col) => {
                const cards = byStage(col.id);
                return (
                  <KanbanColumn
                    key={col.id}
                    column={col}
                    cards={cards}
                    color={COLUMN_COLORS[col.id]}
                    onCardClick={setSelectedCard}
                  />
                );
              })}
            </div>
          </DndContext>
        )}
      </div>

      {/* Package detail modal */}
      <Modal
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        title={selectedCard?.name ?? 'Package Details'}
        wide
      >
        {selectedCard && <PackageDetail pkg={selectedCard} />}
      </Modal>

      {/* Toast notification — auto-dismisses */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm font-medium shadow-lg z-50"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-strong)',
            color: 'var(--text-primary)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Kanban Column ──────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  column: { id: PipelineStage; label: string };
  cards: PipelinePackage[];
  color: string;
  onCardClick: (pkg: PipelinePackage) => void;
}

function KanbanColumn({ column, cards, color, onCardClick }: KanbanColumnProps) {
  return (
    // Column is a droppable target — dnd-kit detects when a card is dropped here
    <div
      id={column.id}
      data-droppable-id={column.id}
      className="flex flex-col w-56 shrink-0 rounded-lg border border-[var(--border-subtle)]"
      style={{ background: 'var(--bg-surface)', minHeight: '100%' }}
    >
      {/* Column header */}
      <div className="px-3 py-2.5 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color }}
          >
            {column.label}
          </span>
          <span
            className="text-xs tabular-nums"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-muted)' }}
          >
            {cards.length}
          </span>
        </div>
      </div>

      {/* Cards list */}
      <SortableContext
        items={cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 p-2 space-y-2 overflow-y-auto">
          {cards.map((card) => (
            <SortableCard key={card.id} pkg={card} onClick={() => onCardClick(card)} />
          ))}
          {cards.length === 0 && (
            <div
              className="flex items-center justify-center h-16 text-xs rounded border-2 border-dashed border-[var(--border-subtle)]"
              style={{ color: 'var(--text-muted)' }}
            >
              Drop here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ── Sortable Card ──────────────────────────────────────────────────────────────

interface SortableCardProps {
  pkg: PipelinePackage;
  onClick: () => void;
}

function SortableCard({ pkg, onClick }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pkg.id,
  });

  // Combine dnd-kit transform with visual card styles — only one style prop allowed
  const cardStyle = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? transition : 'border-color var(--motion-base) var(--ease)',
    opacity:    isDragging ? 0.4 : 1,
    background: 'var(--bg-elevated)',
    borderColor: pkg.days_in_stage > 14 ? 'rgba(234,179,8,0.4)' : 'var(--border-subtle)',
    boxShadow:  isDragging ? '0 8px 24px rgba(0,0,0,0.4)' : 'none',
  };

  // Flag card amber if package has been in this stage > 14 days
  const isStuck = pkg.days_in_stage > 14;

  return (
    <div
      ref={setNodeRef}
      style={cardStyle}
      {...attributes}
      {...listeners}
      className="rounded-md border p-3 cursor-grab active:cursor-grabbing"
      onClick={(e) => {
        // Don't open modal if this was a drag gesture
        if (!isDragging) onClick();
      }}
    >
      {/* Show title */}
      <p
        className="text-xs font-bold leading-tight"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, color: 'var(--text-primary)' }}
      >
        {pkg.ip_title ?? pkg.name}
      </p>

      {/* Format */}
      {pkg.ask_format && (
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {pkg.ask_format}
        </p>
      )}

      {/* Buyer + company */}
      <div className="flex items-center gap-1.5 mt-1.5">
        <StatusDot status="active" />
        <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
          {pkg.buyer_name ?? '—'} · {pkg.company_name ?? '—'}
        </p>
      </div>

      {/* Days in stage — amber when stuck */}
      <div className="flex items-center justify-between mt-2">
        <span
          className="text-[11px]"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            color: isStuck ? 'var(--status-inreview)' : 'var(--text-muted)',
          }}
        >
          {pkg.days_in_stage}d
          {isStuck && ' ⚠'}
        </span>

        {/* Grok signal badge — shows when auto-moved by email classification */}
        {pkg.grok_signal && (
          <span
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{
              background: 'rgba(204,18,18,0.15)',
              color: 'var(--accent)',
            }}
          >
            Auto-moved
          </span>
        )}
      </div>

      {/* Last email date */}
      {pkg.last_email_date && (
        <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
          Email {formatDistanceToNow(new Date(pkg.last_email_date), { addSuffix: true })}
        </p>
      )}
    </div>
  );
}

// ── Package Detail (inside modal) ─────────────────────────────────────────────

function PackageDetail({ pkg }: { pkg: PipelinePackage }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <DetailRow label="Stage"        value={pkg.pipeline_stage} />
          <DetailRow label="IP"           value={pkg.ip_title ?? pkg.ip_id} />
          <DetailRow label="Buyer"        value={pkg.buyer_name} />
          <DetailRow label="Company"      value={pkg.company_name} />
          <DetailRow label="Format"       value={pkg.ask_format} />
          <DetailRow label="Episodes"     value={pkg.ask_episode_count?.toString()} />
          <DetailRow label="Deal"         value={pkg.ask_deal_structure} />
          <DetailRow label="Days in stage" value={`${pkg.days_in_stage} days`} />
        </div>
        <div className="space-y-2">
          {pkg.narrative && (
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                Narrative
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {pkg.narrative.slice(0, 400)}{pkg.narrative.length > 400 ? '…' : ''}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="shrink-0 w-28 text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--text-secondary)' }}>{value}</span>
    </div>
  );
}
