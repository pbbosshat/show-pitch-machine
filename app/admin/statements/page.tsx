import type { Metadata } from 'next';
import { requireFinPageAdmin } from '@/lib/fin/auth';
import StatementsManager from './StatementsManager';
import '../_components/amex/amex.css';

export const metadata: Metadata = { title: 'Statements' };

export default async function StatementsPage() {
  await requireFinPageAdmin();
  return (
    <>
      <h1 className="fin-page-title">Statements</h1>
      <p className="fin-page-sub">Upload each month&apos;s Amex download (CSV or Excel), then tag, reconcile and close the month.</p>
      <StatementsManager />
    </>
  );
}
