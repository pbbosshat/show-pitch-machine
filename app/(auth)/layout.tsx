// Auth layout — full-screen centred card, no sidebar nav.

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg-app)' }}
    >
      {children}
    </div>
  );
}
