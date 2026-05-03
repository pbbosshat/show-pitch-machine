// StatusDot — small colored circle indicating buyer activity status.
// active = green, quiet = amber, unknown = muted gray.
// Optional label renders inline next to the dot.

type ActivityStatus = 'active' | 'quiet' | 'unknown';

interface StatusDotProps {
  status: ActivityStatus;
  label?: string;
}

// Color map from design system status variables
const dotColors: Record<ActivityStatus, string> = {
  active:  'var(--status-greenlit)',
  quiet:   'var(--status-inreview)',
  unknown: 'var(--text-muted)',
};

export default function StatusDot({ status, label }: StatusDotProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block rounded-full shrink-0"
        style={{
          width: 8,
          height: 8,
          background: dotColors[status],
          // Active status pulses subtly — draws the eye to high-priority buyers
          boxShadow: status === 'active' ? `0 0 0 2px rgba(34,197,94,0.2)` : undefined,
        }}
      />
      {label && (
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
      )}
    </span>
  );
}
