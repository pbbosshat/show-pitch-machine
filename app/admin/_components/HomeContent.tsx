// MYE Admin home body (server component). Rendered by app/admin/page.tsx, which
// has already checked the session.
//   Cardholders: their open-month charges, untagged count first.
//   Admins: status counts across open months + the statements list.

import Link from 'next/link';
import type { FinUser } from '@/lib/fin/auth';
import { queryOne } from '@/lib/db';
import { formatCentsWithCredit } from '@/lib/fin/money';
import { listStatements, monthLabel } from '@/lib/fin/amex/charges';
import './amex/amex.css';

interface Counts { new_count: number; tagged_count: number; synced_count: number; total_cents: number; no_receipt: number }

export default async function HomeContent({ user }: { user: FinUser }) {
  return user.role === 'admin' ? <AdminHome /> : <CardholderHome user={user} />;
}

async function CardholderHome({ user }: { user: FinUser }) {
  const c = (await queryOne<Counts>(
    `SELECT COUNT(*) FILTER (WHERE c.status = 'new')::int AS new_count,
            COUNT(*) FILTER (WHERE c.status = 'tagged')::int AS tagged_count,
            COUNT(*) FILTER (WHERE c.status = 'synced')::int AS synced_count,
            COALESCE(SUM(c.amount_cents), 0)::bigint AS total_cents,
            COUNT(*) FILTER (WHERE r.id IS NULL AND c.status <> 'synced')::int AS no_receipt
       FROM fin_charges c
       JOIN fin_statements s ON s.id = c.statement_id
       LEFT JOIN fin_receipts r ON r.charge_id = c.id
      WHERE c.cardholder_id = ? AND c.deleted_at IS NULL AND s.closed_at IS NULL`,
    [user.id]
  ))!;
  const total = c.new_count + c.tagged_count + c.synced_count;
  return (
    <div>
      <div className="amx-tiles">
        <div className={`amx-tile${c.new_count ? ' amx-tile-warn' : ''}`}>
          <div className="amx-tile-label">Untagged</div>
          <div className="amx-tile-value"><Link href="/admin/charges?status=new">{c.new_count}</Link><small>to do</small></div>
        </div>
        <div className="amx-tile">
          <div className="amx-tile-label">Tagged</div>
          <div className="amx-tile-value">{c.tagged_count}</div>
        </div>
        <div className="amx-tile">
          <div className="amx-tile-label">In QuickBooks</div>
          <div className="amx-tile-value">{c.synced_count}</div>
        </div>
        <div className="amx-tile">
          <div className="amx-tile-label">Open months total</div>
          <div className="amx-tile-value">{formatCentsWithCredit(c.total_cents)}<small>{total} charges</small></div>
        </div>
      </div>
      {total === 0 ? (
        <div className="fin-card fin-card-pad fin-muted">You have no charges in open months.</div>
      ) : (
        <div className="fin-card fin-card-pad" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.875rem' }}>
            {c.new_count > 0
              ? <>You have <strong>{c.new_count}</strong> charge{c.new_count === 1 ? '' : 's'} to tag.</>
              : <span className="fin-ok">All your charges are tagged. Thank you!</span>}
            {c.no_receipt > 0 && <span className="fin-muted"> {c.no_receipt} without a receipt.</span>}
          </div>
          <Link href={c.new_count ? '/admin/charges?status=new' : '/admin/charges'} className="fin-btn fin-btn-primary">
            {c.new_count ? 'Tag my charges' : 'View my charges'}
          </Link>
        </div>
      )}
    </div>
  );
}

async function AdminHome() {
  const statements = await listStatements();
  const open = statements.filter((s) => !s.closed_at);
  const sum = (k: 'new_count' | 'tagged_count' | 'synced_count' | 'duplicate_count' | 'unmatched_count') =>
    open.reduce((n, s) => n + s[k], 0);
  return (
    <div>
      <h2 className="fin-section-title" style={{ marginTop: 0 }}>Open months</h2>
      <div className="amx-tiles">
        <div className={`amx-tile${sum('new_count') ? ' amx-tile-warn' : ''}`}>
          <div className="amx-tile-label">Untagged</div>
          <div className="amx-tile-value"><Link href="/admin/charges?status=new">{sum('new_count')}</Link></div>
        </div>
        <div className="amx-tile">
          <div className="amx-tile-label">Tagged, not synced</div>
          <div className="amx-tile-value"><Link href="/admin/charges?status=tagged">{sum('tagged_count')}</Link></div>
        </div>
        <div className="amx-tile">
          <div className="amx-tile-label">In QuickBooks</div>
          <div className="amx-tile-value">{sum('synced_count')}</div>
        </div>
        <div className={`amx-tile${sum('duplicate_count') ? ' amx-tile-warn' : ''}`}>
          <div className="amx-tile-label">Possible duplicates</div>
          <div className="amx-tile-value">{sum('duplicate_count')}</div>
        </div>
        <div className={`amx-tile${sum('unmatched_count') ? ' amx-tile-warn' : ''}`}>
          <div className="amx-tile-label">Unmatched charges</div>
          <div className="amx-tile-value">{sum('unmatched_count')}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h2 className="fin-section-title">Statements</h2>
        <Link href="/admin/statements" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Upload a statement →</Link>
      </div>
      <div className="fin-table-wrap">
        <table className="fin-table">
          <thead>
            <tr>
              <th>Month</th>
              <th className="fin-num">Charges</th>
              <th className="fin-num">Total</th>
              <th className="fin-num">Untagged</th>
              <th className="fin-num">Tagged</th>
              <th className="fin-num">In QuickBooks</th>
              <th>Needs attention</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {statements.length === 0 && (
              <tr><td colSpan={8} className="fin-empty">No statements yet. <Link href="/admin/statements">Upload the first one</Link>.</td></tr>
            )}
            {statements.slice(0, 12).map((s) => {
              const attention = [s.unmatched_count ? `${s.unmatched_count} unmatched` : '', s.duplicate_count ? `${s.duplicate_count} duplicate?` : '']
                .filter(Boolean).join(' · ');
              return (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}><Link href={`/admin/statements/${s.id}`}>{monthLabel(s.statement_month)}</Link></td>
                  <td className="fin-num">{s.charge_count}</td>
                  <td className={`fin-num${s.charges_total_cents < 0 ? ' fin-credit' : ''}`}>{formatCentsWithCredit(s.charges_total_cents)}</td>
                  <td className="fin-num">{s.new_count || <span className="fin-muted">0</span>}</td>
                  <td className="fin-num">{s.tagged_count || <span className="fin-muted">0</span>}</td>
                  <td className="fin-num">{s.synced_count || <span className="fin-muted">0</span>}</td>
                  <td>{attention ? <span className="fin-error">{attention}</span> : <span className="fin-muted">—</span>}</td>
                  <td>{s.closed_at ? <span className="fin-pill fin-pill-synced">Closed</span> : <span className="fin-pill">Open</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
