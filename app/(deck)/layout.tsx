// (deck) route group layout — no header, no footer, no sidebar.
// Each deck portal is a self-contained cinematic microsite.
// This layout is intentionally minimal so the portal pages have full visual control.

export default function DeckLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
