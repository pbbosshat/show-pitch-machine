'use client';
// Modal — overlay dialog with Escape-key close and click-outside close.
// Uses CSS transitions (250ms) rather than a full animation library.
// Rendered into a portal-style overlay div so it sits above all page content.

import { useEffect, useCallback } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  // wide: expands max-width for detail panels like package cards
  wide?: boolean;
}

export default function Modal({ isOpen, onClose, title, children, wide = false }: ModalProps) {
  // Close on Escape key — standard accessibility expectation for modal dialogs
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll while modal is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    // Overlay — click outside the panel to close
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(8, 13, 24, 0.8)',
        backdropFilter: 'blur(4px)',
        // Fade in the overlay itself
        animation: 'fadeIn 250ms var(--ease) forwards',
      }}
      onClick={onClose}
    >
      {/* Panel — stop propagation so clicks inside don't close the modal */}
      <div
        className={`
          relative flex flex-col w-full rounded-xl border border-[var(--border-strong)]
          bg-[var(--bg-elevated)] shadow-2xl
          ${wide ? 'max-w-4xl' : 'max-w-lg'}
        `}
        style={{
          maxHeight: '90vh',
          animation: 'slideUp 250ms var(--ease) forwards',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header row — title + close button */}
        {(title || true) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] shrink-0">
            {title && (
              <h2
                className="text-base font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {title}
              </h2>
            )}
            <button
              onClick={onClose}
              className="ml-auto p-1.5 rounded hover:bg-[var(--bg-surface-alt)]"
              style={{ color: 'var(--text-muted)', transition: 'background var(--motion-base) var(--ease)' }}
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Scrollable content area */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {children}
        </div>
      </div>

      {/* Keyframe animations injected inline — avoids adding to globals.css */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
