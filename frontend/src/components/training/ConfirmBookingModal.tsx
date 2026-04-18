import { useEffect, useRef } from 'react'
import type { PtTrainerSummary } from '../../types/ptBooking'

interface Props {
  trainer: PtTrainerSummary
  startAt: string
  room: string
  loading: boolean
  error: string | null
  onConfirm: () => void
  onClose: () => void
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface InfoCellProps {
  eyebrow: string
  value: string
  sub?: string
}

function InfoCell({ eyebrow, value, sub }: InfoCellProps) {
  return (
    <div className="rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.35)] px-3.5 py-3">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">{eyebrow}</p>
      <p className="text-[14px] font-semibold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-[#9CA3AF]">{sub}</p>}
    </div>
  )
}

export function ConfirmBookingModal({ trainer, startAt, room, loading, error, onConfirm, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Focus trap
  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    focusable[0]?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const accent = trainer.accentColor ?? '#4ADE80'
  const initial = trainer.firstName.charAt(0).toUpperCase()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="w-full max-w-[520px] overflow-hidden rounded-[20px] bg-[#0F0F0F]"
        style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header band */}
        <div
          className="relative overflow-hidden px-7 pb-5 pt-6"
          style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,197,94,0.06))' }}
        >
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.25), transparent 70%)' }}
            aria-hidden="true"
          />
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#4ADE80]">
            STEP 3 OF 3 · CONFIRM
          </p>
          <h2
            id="confirm-modal-title"
            className="font-['Barlow_Condensed'] text-[32px] font-bold uppercase text-white"
          >
            One hour, booked.
          </h2>
        </div>

        {/* Body */}
        <div className="px-7 pb-6 pt-5">
          {/* Trainer */}
          <div className="mb-5 flex items-center gap-3">
            {trainer.profilePhotoUrl ? (
              <img
                src={trainer.profilePhotoUrl}
                alt=""
                className="h-[52px] w-[52px] rounded-full object-cover"
                style={{ boxShadow: `0 8px 24px ${accent}40` }}
              />
            ) : (
              <div
                className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-xl font-bold text-black"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)` }}
                aria-hidden="true"
              >
                {initial}
              </div>
            )}
            <div>
              <p className="text-[15px] font-semibold text-white">
                {trainer.firstName} {trainer.lastName}
              </p>
              <p className="text-[12px] text-[#9CA3AF]">
                {trainer.specializations.join(' · ')}
              </p>
            </div>
          </div>

          {/* Info grid */}
          <div className="mb-5 grid grid-cols-2 gap-2.5">
            <InfoCell eyebrow="When" value={formatWhen(startAt)} />
            <InfoCell eyebrow="Duration" value="1 hour" sub="Fixed session length" />
            <InfoCell eyebrow="Where" value={room || 'TBC'} />
            <InfoCell eyebrow="Cost" value="Included" sub="With active membership" />
          </div>

          {/* Error */}
          {error && (
            <p className="mb-3 rounded-lg border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.08)] px-4 py-2.5 text-[13px] text-[#F87171]" role="alert">
              {error}
            </p>
          )}

          {/* Cancel policy */}
          <p className="mb-5 text-[12px] text-[#9CA3AF]">
            Cancel any time before the session. Sessions count towards your booking history.
          </p>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              className="rounded-lg border border-[rgba(255,255,255,0.12)] py-3 text-[13px] font-semibold text-[#D1D5DB] transition-all hover:border-[rgba(255,255,255,0.25)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              onClick={onClose}
              disabled={loading}
            >
              Not yet
            </button>
            <button
              className="rounded-lg bg-[#22C55E] py-3 text-[13px] font-semibold text-black transition-all hover:brightness-110 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              style={{ boxShadow: '0 8px 24px rgba(34,197,94,0.3)' }}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? 'Booking…' : 'Confirm booking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
