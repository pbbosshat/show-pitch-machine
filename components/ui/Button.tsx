// Button — three-variant interactive control. Supports rendering as an <a> tag via href.
// primary: accent red CTA. ghost: bordered secondary. danger: destructive red outline.

import Link from 'next/link';

type ButtonVariant = 'primary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

// Style objects keyed by variant — all colors use CSS variables
const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] border-transparent',
  ghost:   'bg-transparent text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-alt)] hover:text-[var(--text-primary)]',
  danger:  'bg-transparent text-[var(--status-pass)] border-[var(--status-pass)] hover:bg-[rgba(239,68,68,0.1)]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs font-medium rounded',
  md: 'px-4 py-2 text-sm font-medium rounded-md',
};

export default function Button({
  children,
  variant = 'ghost',
  size = 'md',
  onClick,
  href,
  disabled = false,
  type = 'button',
  className = '',
}: ButtonProps) {
  const classes = `
    inline-flex items-center gap-2 border
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}
    ${className}
  `.trim();

  const style = { transition: 'background var(--motion-base) var(--ease), color var(--motion-base) var(--ease)' };

  // Render as Next.js Link when href is provided — keeps routing within the SPA
  if (href) {
    return (
      <Link href={href} className={classes} style={style}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
      style={style}
    >
      {children}
    </button>
  );
}
