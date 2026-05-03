// Skeleton — shimmer loading placeholder. Uses the .skeleton CSS class from globals.css
// which animates a gradient sweep to signal content is incoming.
// SkeletonCard is a pre-composed multi-line variant for buyer/show cards.

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      aria-hidden="true"
    />
  );
}

// Pre-built buyer card skeleton — mirrors the 3-line layout of buyer cards
export function SkeletonCard() {
  return (
    <div
      className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 space-y-3"
      aria-hidden="true"
    >
      {/* Name line */}
      <Skeleton className="h-5 w-3/5 rounded" />
      {/* Title + company line */}
      <Skeleton className="h-3.5 w-4/5 rounded" />
      {/* Activity line */}
      <Skeleton className="h-3.5 w-2/3 rounded" />
      {/* Mandate line */}
      <Skeleton className="h-3 w-full rounded" />
    </div>
  );
}

export default Skeleton;
