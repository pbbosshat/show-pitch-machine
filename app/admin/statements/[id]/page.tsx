import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFinUser, requireFinPageAdmin } from '@/lib/fin/auth';
import { getStatement, monthLabel, parseId } from '@/lib/fin/amex/charges';
import StatementDetail from './StatementDetail';
import '../../_components/amex/amex.css';

type PageProps = { params: Promise<{ id: string }> };

// Tab title "November 2026 statement" — only for admins (the page itself redirects anyone else).
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const user = await getFinUser();
  const id = parseId((await params).id);
  const statement = user?.role === 'admin' && id ? await getStatement(id) : undefined;
  return { title: statement ? `${monthLabel(statement.statement_month)} statement` : 'Statement' };
}

export default async function StatementPage({ params }: PageProps) {
  const admin = await requireFinPageAdmin();
  const id = parseId((await params).id);
  const statement = id ? await getStatement(id) : undefined;
  if (!id || !statement) notFound();
  return (
    <>
      <div className="amx-breadcrumb"><Link href="/admin/statements">← Statements</Link></div>
      <h1 className="fin-page-title">{monthLabel(statement.statement_month)} statement</h1>
      <p className="fin-page-sub">
        Tag every charge, resolve duplicates and unmatched Card Members, then reconcile and close.
        {statement.file_name && (
          <span className="amx-file-name" title="The file this statement was imported from">File: {statement.file_name}</span>
        )}
      </p>
      <StatementDetail statementId={id} currentUserName={admin.name} />
    </>
  );
}
