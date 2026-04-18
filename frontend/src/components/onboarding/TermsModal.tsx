import { useEffect } from 'react'

interface TermsModalProps {
  title: string
  onClose: () => void
}

export function TermsModal({ title, onClose }: TermsModalProps) {
  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.70)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl p-8"
        style={{
          background: 'var(--color-bg-surface-1)',
          border: '1px solid var(--color-border-card)',
          boxShadow: 'var(--shadow-xl)',
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--color-fg-default)' }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 transition-colors"
            style={{ color: 'var(--color-fg-muted)' }}
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p style={{ color: 'var(--color-fg-muted)', lineHeight: 1.6 }}>
          Full terms of use — coming soon.
        </p>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full text-sm font-semibold"
            style={{ background: 'var(--color-primary)', color: '#0F0F0F' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
