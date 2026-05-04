/**
 * UnverifiedSection — reusable amber callout for any entity whose scraped data
 * has not yet been manually confirmed. Renders nothing when already verified or
 * when all provided fields are null (nothing to confirm).
 *
 * Usage: drop onto any detail page (buyer, prodco, show) that has an is_verified column.
 * On "Confirm & Verify" click, PATCHes the supplied verifyEndpoint and then hides itself.
 */

'use client';

import { useState } from 'react';

interface FieldDef {
  label: string;
  value: string | null;
  fieldName: string;
}

interface UnverifiedSectionProps {
  entityId: string;
  entityType: 'buyer' | 'prodco' | 'show';
  fields: FieldDef[];
  /** 0 = unverified, 1 = verified (matches DB tinyint convention used throughout the app) */
  isVerified: number;
  /** e.g. '/api/buyers/abc123/verify' — receives PATCH { verified_by: 'manual' } */
  verifyEndpoint: string;
}

export default function UnverifiedSection({
  fields,
  isVerified,
  verifyEndpoint,
}: UnverifiedSectionProps) {
  const [loading, setLoading]     = useState(false);
  const [verified, setVerified]   = useState(false);
  const [hidden, setHidden]       = useState(false);
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);

  // Already verified in DB, or all fields are null — nothing to show
  const hasAnyValue = fields.some((f) => f.value !== null && f.value !== '');
  if (isVerified === 1 || !hasAnyValue || hidden) return null;

  const handleVerify = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(verifyEndpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified_by: 'manual' }),
      });
      if (!res.ok) {
        // Always surface the exact error message — never swallow it
        const errBody = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errBody.error ?? res.statusText);
      }
      setVerified(true);
      // Hide section after a short delay so the user sees the confirmation
      setTimeout(() => setHidden(true), 1500);
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="mb-6 px-4 py-3 rounded-lg"
      style={{
        background: 'rgba(234,179,8,0.08)',
        border: '1px solid rgba(234,179,8,0.25)',
        borderRadius: 8,
      }}
    >
      {/* Heading */}
      <p
        className="text-xs font-semibold mb-2"
        style={{ color: 'rgba(234,179,8,0.9)', letterSpacing: '0.02em' }}
      >
        ⚠ Unverified Data
      </p>

      {/* Field list — only show fields that have a value */}
      <ul className="space-y-1 mb-3">
        {fields
          .filter((f) => f.value !== null && f.value !== '')
          .map((f) => (
            <li key={f.fieldName} className="flex items-baseline gap-2">
              <span
                className="text-xs font-semibold"
                style={{ color: 'var(--text-muted)', minWidth: 56 }}
              >
                {f.label}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {f.value}
              </span>
            </li>
          ))}
      </ul>

      {/* Action row */}
      {verified ? (
        <p className="text-xs font-semibold" style={{ color: '#22c55e' }}>
          Verified ✓
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <button
            onClick={handleVerify}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-semibold rounded"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
              border: 'none',
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? 'Saving…' : 'Confirm & Verify'}
          </button>
          {/* Display the exact error — matches the app-wide "always show exact errors" rule */}
          {errorMsg && (
            <p className="text-xs" style={{ color: '#f87171' }}>
              {errorMsg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
