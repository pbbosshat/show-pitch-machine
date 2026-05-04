// Development Pipeline — server component fetches /api/projects and passes
// the full list to a client wrapper that handles tab filtering client-side.
// No re-fetch on tab switch — all filtering is done in memory.

import ProjectsClient from '@/components/projects/ProjectsClient';

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
  sizzle_count: number;
  has_sizzle: boolean;
}

// Fetch all projects at request time — cache: no-store so it stays fresh.
// Limit set high (200) to get the full pipeline in one shot.
async function fetchProjects(): Promise<ProjectSummary[]> {
  try {
    const res = await fetch('http://localhost:3000/api/projects?limit=200', {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const { data } = await res.json();
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function ProjectsPage() {
  const projects = await fetchProjects();

  // Determine last sync timestamp — use the most recent last_email_date across all projects
  // as a proxy for "last synced from Google Sheets" (the sheet sync populates these records)
  const lastSynced = projects
    .map((p) => p.last_email_date)
    .filter(Boolean)
    .sort()
    .at(-1);

  const syncLabel = lastSynced
    ? new Date(lastSynced).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'unknown';

  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
        >
          Development Pipeline
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {projects.length} projects · last synced from Google Sheets {syncLabel}
        </p>
      </div>

      {/* Client component handles tab filter + grid rendering */}
      <ProjectsClient initialProjects={projects} />
    </div>
  );
}
