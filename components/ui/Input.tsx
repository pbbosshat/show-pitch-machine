// Input — single-line text field in the app's dark palette.
// Used for search bars, form fields, and filter controls throughout.

interface InputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  type?: string;
  autoFocus?: boolean;
  id?: string;
  name?: string;
}

export default function Input({
  placeholder,
  value,
  onChange,
  className = '',
  type = 'text',
  autoFocus = false,
  id,
  name,
}: InputProps) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      value={value}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      className={`
        w-full px-3 py-2 rounded-md text-sm
        bg-[var(--bg-elevated)] border border-[var(--border-subtle)]
        text-[var(--text-primary)] placeholder:text-[var(--text-muted)]
        focus:outline-none focus:border-[var(--border-strong)] focus:ring-1 focus:ring-[var(--border-strong)]
        ${className}
      `}
      style={{ transition: 'border-color var(--motion-base) var(--ease)' }}
    />
  );
}
