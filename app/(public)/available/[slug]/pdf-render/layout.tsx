// Minimal layout for the PDF render route — no site nav, no footer, no padding.
// Only Puppeteer navigates here; it must see raw page content with no chrome around it.
export default function PDFRenderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
