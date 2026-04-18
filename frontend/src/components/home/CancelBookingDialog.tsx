import { type MouseEvent, useEffect, useRef } from 'react'

interface Props {
  className: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

export function CancelBookingDialog({ className, onConfirm, onCancel, loading }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Trap focus inside dialog and close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKey)
    dialogRef.current?.focus()
    return () => document.removeEventListener('keydown', handleKey)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-dialog-title"
      aria-describedby="cancel-dialog-desc"
      onClick={(e: MouseEvent<HTMLDivElement>) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-[420px] rounded-2xl border border-[#1F2937] bg-[#111827] p-7 outline-none shadow-2xl"
      >
        <h2
          id="cancel-dialog-title"
          className="text-[18px] font-bold text-white"
        >
          Cancel booking?
        </h2>
        <p
          id="cancel-dialog-desc"
          className="mt-2 text-[14px] text-[#9CA3AF]"
        >
          You're about to cancel your spot in{' '}
          <span className="font-semibold text-white">{className}</span>.
          This action cannot be undone.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-lg border border-white/15 bg-transparent py-3 text-[13px] font-semibold text-white transition-all duration-[160ms] hover:brightness-[1.08] disabled:opacity-50"
          >
            Keep booking
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-lg border border-red-500/30 bg-red-500/10 py-3 text-[13px] font-semibold text-red-400 transition-all duration-[160ms] hover:brightness-[1.08] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Cancelling…' : 'Yes, cancel'}
          </button>
        </div>
      </div>
    </div>
  )
}
