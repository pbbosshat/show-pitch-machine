'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { formatCentsWithCredit } from '@/lib/fin/money';
import { api, monthLabel, shortDateTime, type StatementSummary } from '../_components/amex/client';

interface UploadResult { statement: StatementSummary; imported: number; duplicates: number; unmatched: string[]; skipped: number }

const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const addMonths = (n: number) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + n); return ym(d); };

/**
 * The upload month to suggest: the most recent month not imported yet. Statements
 * are uploaded after a month ends, so last month comes first; if it's done, the
 * current month (the next statement); otherwise the latest earlier gap.
 */
export function suggestMonth(imported: Set<string>): string {
  if (!imported.has(addMonths(-1))) return addMonths(-1);
  if (!imported.has(addMonths(0))) return addMonths(0);
  for (let n = -2; n >= -36; n--) if (!imported.has(addMonths(n))) return addMonths(n);
  return addMonths(-1);
}

export default function StatementsManager() {
  const [statements, setStatements] = useState<StatementSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(() => addMonths(-1));
  const monthTouched = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [result, setResult] = useState<UploadResult | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ statements: StatementSummary[] }>('/api/fin/statements');
      setStatements(r.statements);
      // Keep the suggestion current (also after an import) until the admin picks a month.
      if (!monthTouched.current) setMonth(suggestMonth(new Set(r.statements.map((s) => s.statement_month))));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch
    void load();
  }, [load]);

  async function upload(e: FormEvent) {
    e.preventDefault();
    if (!file) { setUploadError('Choose the Amex file first.'); return; }
    setUploading(true);
    setUploadError('');
    setResult(null);
    try {
      const fd = new FormData();
      fd.set('month', month);
      fd.set('file', file);
      const r = await api<UploadResult>('/api/fin/statements', { method: 'POST', body: fd });
      setResult(r);
      setFile(null);
      setFileKey((k) => k + 1);
      await load();
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="fin-card fin-card-pad" style={{ marginBottom: 16 }}>
        <h2 className="amx-panel-title">Upload a statement</h2>
        <form onSubmit={upload} className="fin-formrow">
          <div style={{ flex: '0 1 180px' }}>
            <label className="fin-label" htmlFor="amx-month">Statement month</label>
            <input id="amx-month" type="month" className="fin-input" value={month} onChange={(e) => { setMonth(e.target.value); monthTouched.current = true; }} required />
          </div>
          <div style={{ flex: '1 1 300px' }}>
            <label className="fin-label" htmlFor="amx-file">Amex download (CSV or Excel)</label>
            <input
              key={fileKey}
              id="amx-file"
              type="file"
              className="fin-input"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <button type="submit" className="fin-btn fin-btn-primary" disabled={uploading || !file}>
            {uploading ? 'Importing…' : 'Import'}
          </button>
        </form>
        {uploadError && <p className="fin-error" style={{ marginTop: 10, marginBottom: 0 }}>{uploadError}</p>}
        {result && (
          <div className="fin-notice" style={{ marginTop: 10 }}>
            <span className="fin-ok">Imported {result.imported} charge{result.imported === 1 ? '' : 's'} for {monthLabel(result.statement.statement_month)}.</span>{' '}
            {result.duplicates > 0 && <>{result.duplicates} flagged as possible duplicates. </>}
            {result.unmatched.length > 0 && <>Unmatched Card Members: {result.unmatched.join(', ')}. </>}
            {result.skipped > 0 && <>{result.skipped} non-charge line{result.skipped === 1 ? '' : 's'} skipped. </>}
            <Link href={`/admin/statements/${result.statement.id}`}>Open the statement →</Link>
          </div>
        )}
      </div>

      {error && <p className="fin-error">{error}</p>}
      <div className="fin-table-wrap">
        <table className="fin-table fin-stack">
          <thead>
            <tr>
              <th>Month</th>
              <th>File</th>
              <th className="fin-num">Charges</th>
              <th className="fin-num">Charges total</th>
              <th className="fin-num">Statement total</th>
              <th className="fin-num">Untagged</th>
              <th className="fin-num">Tagged</th>
              <th className="fin-num">In QuickBooks</th>
              <th>Needs attention</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={10} className="fin-empty">Loading…</td></tr>}
            {!loading && statements.length === 0 && <tr><td colSpan={10} className="fin-empty">No statements yet. Upload the first one above.</td></tr>}
            {statements.map((s) => {
              const attention = [
                s.unmatched_count ? `${s.unmatched_count} unmatched` : '',
                s.duplicate_count ? `${s.duplicate_count} duplicate?` : '',
              ].filter(Boolean).join(' · ');
              return (
                <tr key={s.id}>
                  <td className="fin-stack-title" style={{ fontWeight: 600 }}><Link href={`/admin/statements/${s.id}`}>{monthLabel(s.statement_month)}</Link></td>
                  <td data-label="File" className="fin-muted" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${s.file_name ?? ''} — uploaded ${shortDateTime(s.uploaded_at)}${s.uploaded_by_name ? ` by ${s.uploaded_by_name}` : ''}`}>
                    {s.file_name}
                  </td>
                  <td data-label="Charges" className="fin-num">{s.charge_count}</td>
                  <td data-label="Charges total" className={`fin-num${s.charges_total_cents < 0 ? ' fin-credit' : ''}`}>{formatCentsWithCredit(s.charges_total_cents)}</td>
                  <td data-label="Statement total" className="fin-num">{s.statement_total_cents === null ? <span className="fin-muted">—</span> : formatCentsWithCredit(s.statement_total_cents)}</td>
                  <td data-label="Untagged" className="fin-num">{s.new_count || <span className="fin-muted">0</span>}</td>
                  <td data-label="Tagged" className="fin-num">{s.tagged_count || <span className="fin-muted">0</span>}</td>
                  <td data-label="In QuickBooks" className="fin-num">{s.synced_count || <span className="fin-muted">0</span>}</td>
                  <td data-label="Needs attention">{attention ? <span className="fin-error">{attention}</span> : <span className="fin-muted">—</span>}</td>
                  <td data-label="Status">{s.closed_at ? <span className="fin-pill fin-pill-synced" title={`Closed ${shortDateTime(s.closed_at)}${s.closed_by_name ? ` by ${s.closed_by_name}` : ''}`}>Closed</span> : <span className="fin-pill">Open</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
