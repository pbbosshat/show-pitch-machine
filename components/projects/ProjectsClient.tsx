'use client';
// ProjectsClient — handles tab-based filtering of the project list.
// All filtering is client-side — the server already fetched the full list.
// Tabs correspond to sheet_source values in the database.
// Also manages the inline edit modal for individual projects (PUT /api/projects/:id).

import { useState } from 'react';
import ProjectCard from '@/components/projects/ProjectCard';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

interface ProjectSummary {
  id: string;
  title: string;
  status: string | null;
  sheet_source: string | null;
  sheet_status: string | null;
  sheet_point_person: string | null;
  sheet_target_nets: string | null;
  sheet_pitched_to: string | null;
  sheet_passed: string | null;
  extracted_date: string | null;
  date_confidence: string | null;
  brainstorm_rank: number | null;
  email_thread_count: number;
  last_email_date: string | null;
  first_email_date: string | null;
  // sizzle_count comes from the LEFT JOIN on sizzle_reels in /api/projects
  sizzle_count: number;
  has_sizzle: boolean;
}

interface ProjectsClientProps {
  initialProjects: ProjectSummary[];
}

// Tab definitions — label + the sheet_source values that match it.
// 'all' shows everything; other tabs match specific sheet_source strings.
const TABS: { id: string; label: string; sources: string[] | null }[] = [
  { id: 'all',        label: 'All',         sources: null },
  { id: 'active',     label: 'Active',      sources: ['priorities', 'full-dev', 'bc-mye'] },
  { id: 'backburner', label: 'Backburner',  sources: ['backburner'] },
  { id: 'archived',   label: 'Archived',    sources: ['archived'] },
  { id: 'brainstorm', label: 'Brainstorms', sources: ['brainstorm'] },
  { id: 'passes',     label: 'Passes',      sources: ['passes'] },
];

// sheet_source options for the edit modal select field
const SHEET_SOURCE_OPTIONS = [
  { value: '',           label: '— None —' },
  { value: 'priorities', label: 'priorities' },
  { value: 'full-dev',   label: 'full-dev' },
  { value: 'bc-mye',     label: 'bc-mye' },
  { value: 'backburner', label: 'backburner' },
  { value: 'brainstorm', label: 'brainstorm' },
  { value: 'archived',   label: 'archived' },
  { value: 'passes',     label: 'passes' },
];

export default function ProjectsClient({ initialProjects }: ProjectsClientProps) {
  const [activeTab, setActiveTab] = useState<string>('all');

  // projects tracks all projects in client state so edits reflect immediately
  const [projects, setProjects] = useState<ProjectSummary[]>(initialProjects);

  // Edit modal state
  const [editingProject, setEditingProject] = useState<ProjectSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form values for the edit modal — initialized when a project is opened for editing
  const [formValues, setFormValues] = useState({
    title: '',
    sheet_source: '',
    sheet_status: '',
    sheet_point_person: '',
    sheet_target_nets: '',
    status: '',
    notes: '',
  });

  // Close modal and reset transient state
  function closeModal() {
    setEditingProject(null);
    setSaveError(null);
    setSaving(false);
  }

  // PUT the edited values to the API and merge into local state on success
  async function handleSave() {
    if (!editingProject) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      // Merge edited values back into the projects list so the grid reflects changes immediately
      setProjects((prev) =>
        prev.map((p) =>
          p.id === editingProject.id
            ? {
                ...p,
                title: formValues.title,
                sheet_source: formValues.sheet_source || null,
                sheet_status: formValues.sheet_status || null,
                sheet_point_person: formValues.sheet_point_person || null,
                sheet_target_nets: formValues.sheet_target_nets || null,
                status: formValues.status || null,
              }
            : p
        )
      );
      closeModal();
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // Filter projects based on selected tab — uses live `projects` state, not initialProjects
  const filteredProjects = activeTab === 'all'
    ? projects
    : (() => {
        const tab = TABS.find((t) => t.id === activeTab);
        if (!tab?.sources) return projects;
        return projects.filter((p) =>
          p.sheet_source && tab.sources!.includes(p.sheet_source.toLowerCase())
        );
      })();

  return (
    <div className="space-y-5">
      {/* Filter tabs — pill style matching design system */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          // Count projects that would be visible under this tab for context
          const count = tab.sources === null
            ? projects.length
            : projects.filter(
                (p) => p.sheet_source && tab.sources!.includes(p.sheet_source.toLowerCase())
              ).length;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '4px 12px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                border: '1px solid',
                transition: 'background 150ms ease, color 150ms ease, border-color 150ms ease',
                background: isActive ? 'var(--accent)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                borderColor: isActive ? 'var(--accent)' : 'var(--border-subtle)',
              }}
            >
              {tab.label}
              <span
                style={{
                  marginLeft: 5,
                  fontSize: 11,
                  opacity: 0.75,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Results count for current filter */}
      {activeTab !== 'all' && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Showing {filteredProjects.length} of {projects.length} projects
        </p>
      )}

      {/* Project cards grid */}
      {filteredProjects.length === 0 ? (
        <div
          className="rounded-lg border p-10 text-center"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No projects in this category
          </p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((p) => (
            <ProjectCard
              key={p.id}
              id={p.id}
              title={p.title}
              sheet_source={p.sheet_source}
              sheet_status={p.sheet_status}
              sheet_point_person={p.sheet_point_person}
              sheet_target_nets={p.sheet_target_nets}
              email_thread_count={p.email_thread_count}
              last_email_date={p.last_email_date}
              first_email_date={p.first_email_date}
              extracted_date={p.extracted_date}
              date_confidence={p.date_confidence}
              sizzle_count={p.sizzle_count ?? 0}
              onEdit={(e) => {
                e.stopPropagation();
                // Seed form with current values so the modal opens pre-filled
                setFormValues({
                  title: p.title,
                  sheet_source: p.sheet_source ?? '',
                  sheet_status: p.sheet_status ?? '',
                  sheet_point_person: p.sheet_point_person ?? '',
                  sheet_target_nets: p.sheet_target_nets ?? '',
                  status: p.status ?? '',
                  notes: '',
                });
                setEditingProject(p);
              }}
            />
          ))}
        </div>
      )}

      {/* ── Inline Edit Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={!!editingProject}
        onClose={closeModal}
        title={editingProject?.title ?? 'Edit Project'}
      >
        <div>
          {/* Title */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Title
            </label>
            <input
              value={formValues.title}
              onChange={(e) => setFormValues((v) => ({ ...v, title: e.target.value }))}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Sheet Source */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Sheet Source
            </label>
            <select
              value={formValues.sheet_source}
              onChange={(e) => setFormValues((v) => ({ ...v, sheet_source: e.target.value }))}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            >
              {SHEET_SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Sheet Status */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Sheet Status
            </label>
            <input
              value={formValues.sheet_status}
              onChange={(e) => setFormValues((v) => ({ ...v, sheet_status: e.target.value }))}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Point Person */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Point Person
            </label>
            <input
              value={formValues.sheet_point_person}
              onChange={(e) => setFormValues((v) => ({ ...v, sheet_point_person: e.target.value }))}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Target Networks */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Target Networks
            </label>
            <input
              value={formValues.sheet_target_nets}
              onChange={(e) => setFormValues((v) => ({ ...v, sheet_target_nets: e.target.value }))}
              placeholder="Comma-separated"
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Status */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Status
            </label>
            <input
              value={formValues.status}
              onChange={(e) => setFormValues((v) => ({ ...v, status: e.target.value }))}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Notes
            </label>
            <textarea
              rows={3}
              value={formValues.notes}
              onChange={(e) => setFormValues((v) => ({ ...v, notes: e.target.value }))}
              style={{ width: '100%', padding: '6px 10px', borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)', fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>

          {/* Error display — shows exact API error per design system rules */}
          {saveError && <p style={{ color: 'var(--status-pass)', fontSize: 12, marginTop: 8 }}>{saveError}</p>}

          {/* Footer actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
            <Button variant="ghost" size="sm" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
