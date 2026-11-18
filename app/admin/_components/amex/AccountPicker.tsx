'use client';
// Searchable QuickBooks account picker: type a number or any part of the name.
// Starts blank (no suggestions, no remembered choices). The popup is position:fixed
// so it isn't clipped by the scrolling table wrapper.

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { accountDisplayName } from '@/lib/fin/amex/rules';
import type { QboAccount } from './client';

const MAX_SHOWN = 60;

export default function AccountPicker({
  accounts,
  value,
  onChange,
  disabled,
  id,
}: {
  accounts: QboAccount[];
  value: string | null;
  onChange: (qboId: string | null) => void;
  disabled?: boolean;
  id?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);

  // A fixed popup would drift if the page or table scrolls underneath it: close instead.
  useEffect(() => {
    if (!open) return;
    const onScroll = (e: Event) => {
      if (e.target instanceof Element && e.target.closest('.amx-picker-pop')) return;
      setOpen(false);
    };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll, true); window.removeEventListener('resize', onScroll); };
  }, [open]);

  const options = useMemo(
    () => accounts.map((a) => ({ id: a.qbo_id, label: accountDisplayName(a), num: (a.acct_num ?? '').trim(), hay: `${a.acct_num ?? ''} ${a.fully_qualified_name ?? ''} ${a.name}`.toLowerCase() })),
    [accounts]
  );
  const selected = options.find((o) => o.id === value) ?? null;

  const matches = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const list = terms.length ? options.filter((o) => terms.every((t) => o.hay.includes(t))) : options;
    return list.slice(0, MAX_SHOWN);
  }, [options, q]);

  function show() {
    const r = inputRef.current?.getBoundingClientRect();
    if (r) {
      const width = Math.max(r.width, 300);
      const left = Math.min(r.left, window.innerWidth - width - 8);
      const below = window.innerHeight - r.bottom;
      setPos({ left, top: below < 220 ? Math.max(8, r.top - 284) : r.bottom + 2, width });
    }
    setQ('');
    setHi(0);
    setOpen(true);
  }

  function choose(idx: number) {
    const o = matches[idx];
    if (!o) return;
    onChange(o.id);
    setOpen(false);
    inputRef.current?.blur();
  }

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        className="fin-input"
        disabled={disabled}
        placeholder="Account…"
        title={selected?.label ?? ''}
        value={open ? q : selected?.label ?? ''}
        onFocus={show}
        onChange={(e) => { setQ(e.target.value); setHi(0); if (!open) show(); }}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, matches.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === 'Enter') { e.preventDefault(); if (open) choose(hi); }
          else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
        }}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
      />
      {open && pos && (
        <div id={listId} className="amx-picker-pop" style={{ left: pos.left, top: pos.top, width: pos.width }} role="listbox">
          {value && !q && (
            <div className="amx-picker-opt fin-muted" onMouseDown={(e) => { e.preventDefault(); onChange(null); setOpen(false); inputRef.current?.blur(); }}>
              Clear account
            </div>
          )}
          {matches.length === 0 && <div className="amx-picker-empty">No account matches “{q}”.</div>}
          {matches.map((o, i) => {
            const rest = o.num && o.label.startsWith(o.num) ? o.label.slice(o.num.length).trim() : o.label;
            return (
              <div
                key={o.id}
                role="option"
                aria-selected={o.id === value}
                className={`amx-picker-opt${i === hi ? ' amx-on' : ''}`}
                onMouseEnter={() => setHi(i)}
                onMouseDown={(e) => { e.preventDefault(); choose(i); }}
                title={o.label}
              >
                {o.num && <b>{o.num}</b>}
                {rest}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
