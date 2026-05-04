// Badge — pill label that maps variant strings to design system status colors.
// Used throughout tables, cards, and show listings to show greenlit/pass/review state.

type BadgeVariant =
  | 'greenlit'
  | 'inreview'
  | 'pass'
  | 'deal'
  | 'active'
  | 'quiet'
  | 'unknown'
  | 'muted';

interface BadgeProps {
  children?: React.ReactNode;
  label?: string;
  variant: BadgeVariant;
}

// Maps each variant to a bg + text color pair pulled from the design system palette.
const variantStyles: Record<BadgeVariant, { bg: string; color: string }> = {
  greenlit:  { bg: 'rgba(34, 197, 94, 0.15)',  color: 'var(--status-greenlit)' },
  inreview:  { bg: 'rgba(234, 179, 8, 0.15)',   color: 'var(--status-inreview)' },
  pass:      { bg: 'rgba(239, 68, 68, 0.15)',   color: 'var(--status-pass)' },
  deal:      { bg: 'rgba(245, 166, 35, 0.15)',  color: 'var(--status-deal)' },
  active:    { bg: 'rgba(34, 197, 94, 0.15)',   color: 'var(--status-greenlit)' },
  quiet:     { bg: 'rgba(234, 179, 8, 0.15)',   color: 'var(--status-inreview)' },
  unknown:   { bg: 'rgba(74, 93, 128, 0.25)',   color: 'var(--text-muted)' },
  muted:     { bg: 'rgba(74, 93, 128, 0.15)',   color: 'var(--text-secondary)' },
};

export default function Badge({ children, label, variant }: BadgeProps) {
  const { bg, color } = variantStyles[variant];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase"
      style={{ background: bg, color }}
    >
      {children ?? label}
    </span>
  );
}
