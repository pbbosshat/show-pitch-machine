// (public)/layout.tsx — group-level pass-through. No layout chrome here;
// the actual site layout (dark header + footer) lives in (public)/site/layout.tsx.

export default function PublicGroupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
