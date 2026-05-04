'use client';
// EmailTimeline — table of email threads linked to a project.
// Client component so it can eventually support column sorting / filtering.
// Receives pre-parsed participants arrays from the server page.

interface EmailThread {
  id: string;
  thread_id: string;
  subject: string | null;
  participants: string[];
  first_message_date: string | null;
  last_message_date: string | null;
  message_count: number;
  direction: string | null;
  snippet: string | null;
  match_confidence: string | null;
}

interface EmailTimelineProps {
  threads: EmailThread[];
  projectTitle: string;
}

// Format a date string as "Mar 15, 2024". Returns "—" for null/invalid.
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Truncate subject line to 60 chars for table readability
function truncate(str: string | null, maxLen = 60): string {
  if (!str) return '(no subject)';
  return str.length <= maxLen ? str : str.slice(0, maxLen - 1) + '…';
}

// Map direction field to a human-readable label + color
function directionLabel(direction: string | null): { text: string; color: string; bg: string } {
  switch (direction?.toLowerCase()) {
    case 'sent':
      return { text: '→ Sent',     color: '#1d4ed8', bg: 'rgba(29, 78, 216, 0.12)' };
    case 'received':
      return { text: '← Received', color: 'var(--status-greenlit)', bg: 'rgba(34, 197, 94, 0.12)' };
    case 'internal':
      return { text: '↔ Internal', color: 'var(--text-secondary)', bg: 'rgba(74, 93, 128, 0.15)' };
    default:
      return { text: direction ?? '—', color: 'var(--text-muted)', bg: 'rgba(74, 93, 128, 0.10)' };
  }
}

// Summarize participants list — show first 2 addresses, "+N more" if there are extras
function formatParticipants(participants: string[]): string {
  if (!participants || participants.length === 0) return '—';
  const shown = participants.slice(0, 2).join(', ');
  const extra = participants.length - 2;
  return extra > 0 ? `${shown} +${extra} more` : shown;
}

export default function EmailTimeline({ threads, projectTitle }: EmailTimelineProps) {
  if (threads.length === 0) {
    // Empty state — explain how to populate email history
    return (
      <div
        className="rounded-lg border p-8 text-center"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-surface)' }}
      >
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          No email threads found for this project
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Run <code
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              background: 'var(--bg-surface-alt)',
              padding: '1px 5px',
              borderRadius: 3,
            }}
          >
            npm run cross-ref-emails
          </code>{' '}
          to index email history.
        </p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 13,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: '1px solid var(--border-strong)',
            }}
          >
            {['Date', 'Subject', 'Direction', 'Participants', 'Messages'].map((col) => (
              <th
                key={col}
                style={{
                  textAlign: 'left',
                  padding: '8px 12px',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {threads.map((thread, i) => {
            const dir = directionLabel(thread.direction);
            // Alternating row background for readability — odd rows use surface-alt
            const rowBg = i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-alt)';
            return (
              <tr
                key={thread.id}
                style={{ background: rowBg, borderBottom: '1px solid var(--border-subtle)' }}
              >
                {/* Date — use first_message_date as the canonical thread start */}
                <td
                  style={{
                    padding: '9px 12px',
                    whiteSpace: 'nowrap',
                    color: 'var(--text-secondary)',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                  }}
                >
                  {formatDate(thread.first_message_date)}
                </td>

                {/* Subject — truncated with full text in title for hover tooltip */}
                <td
                  style={{
                    padding: '9px 12px',
                    color: 'var(--text-primary)',
                    maxWidth: 320,
                  }}
                  title={thread.subject ?? ''}
                >
                  {truncate(thread.subject)}
                </td>

                {/* Direction pill */}
                <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      background: dir.bg,
                      color: dir.color,
                    }}
                  >
                    {dir.text}
                  </span>
                </td>

                {/* Participants — first 2 addresses + overflow count */}
                <td
                  style={{
                    padding: '9px 12px',
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    maxWidth: 280,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={thread.participants.join(', ')}
                >
                  {formatParticipants(thread.participants)}
                </td>

                {/* Message count */}
                <td
                  style={{
                    padding: '9px 12px',
                    textAlign: 'right',
                    color: 'var(--text-muted)',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {thread.message_count}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
