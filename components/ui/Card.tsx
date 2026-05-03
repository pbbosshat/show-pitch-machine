// Card — base surface container. hoverable adds a subtle lift on hover.
// All color via CSS variables so it respects light/dark mode automatically.

interface CardProps {
  children: React.ReactNode;
  className?: string;
  // hoverable: cursor pointer + background shift on hover
  hoverable?: boolean;
  onClick?: () => void;
}

export default function Card({ children, className = '', hoverable = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4
        ${hoverable ? 'cursor-pointer hover:bg-[var(--bg-surface-alt)] hover:border-[var(--border-strong)]' : ''}
        ${className}
      `}
      style={{ transition: 'background var(--motion-base) var(--ease), border-color var(--motion-base) var(--ease)' }}
    >
      {children}
    </div>
  );
}
