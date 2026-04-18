import { useState } from 'react'
import type { PtBookingResponse } from '../../types/ptBooking'

interface Props {
  bookings: PtBookingResponse[]
  onCancel: (id: string) => Promise<void>
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((d.getTime() - today.getTime()) / 86400000)
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 0) return `Today · ${time}`
  if (diffDays === 1) return `Tomorrow · ${time}`
  return `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · ${time}`
}

function formatCountdown(iso: string): { value: string; unit: string } {
  const diff = new Date(iso).getTime() - Date.now()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return { value: String(days), unit: 'd' }
  if (hours > 0) return { value: String(hours), unit: 'h' }
  return { value: String(Math.max(mins, 1)), unit: 'm' }
}

export function MyUpcomingPT({ bookings, onCancel }: Props) {
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  if (bookings.length === 0) return null

  const handleCancelRequest = (id: string) => setConfirmId(id)
  const handleCancelConfirm = async () => {
    if (!confirmId) return
    setCancellingId(confirmId)
    setConfirmId(null)
    try {
      await onCancel(confirmId)
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <section
      className="mb-8 rounded-2xl border border-[#1F2937] bg-[rgba(255,255,255,0.02)] p-6"
      aria-labelledby="upcoming-pt-heading"
    >
      <div className="mb-4">
        <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#22C55E]">
          YOUR UPCOMING SESSIONS
        </p>
        <p className="text-[18px] font-semibold text-white">
          {bookings.length} personal training session{bookings.length !== 1 ? 's' : ''} booked
        </p>
      </div>

      <ul className="space-y-3" aria-label="Upcoming PT sessions">
        {bookings.map((booking) => {
          const accent = booking.trainerAccentColor ?? '#4ADE80'
          const initial = booking.trainerName.charAt(0).toUpperCase()
          const countdown = formatCountdown(booking.startAt)

          return (
            <li
              key={booking.id}
              className="grid items-center gap-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.35)] px-4 py-3.5"
              style={{ gridTemplateColumns: 'auto 1fr auto auto' }}
            >
              {/* Avatar */}
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[16px] font-bold text-black"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, boxShadow: `0 4px 12px ${accent}40` }}
                aria-hidden="true"
              >
                {initial}
              </div>

              {/* Session info */}
              <div>
                <p className="text-[15px] font-medium text-white">{formatWhen(booking.startAt)}</p>
                <p className="text-[12px] text-[#9CA3AF]">
                  {booking.trainerName}
                  {booking.room ? ` · ${booking.room}` : ''}
                </p>
              </div>

              {/* Countdown */}
              <div className="text-right" aria-label={`${countdown.value}${countdown.unit} away`}>
                <p className="font-['Barlow_Condensed'] text-[22px] font-bold leading-none text-[#4ADE80]">
                  {countdown.value}{countdown.unit}
                </p>
                <p className="text-[10px] text-[#9CA3AF]">away</p>
              </div>

              {/* Cancel button */}
              <button
                className="rounded-lg border border-[rgba(255,255,255,0.10)] px-3 py-1.5 text-[12px] font-medium text-[#9CA3AF] transition-colors hover:border-[rgba(239,68,68,0.40)] hover:text-[#F87171] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                onClick={() => handleCancelRequest(booking.id)}
                disabled={cancellingId === booking.id}
                aria-label={`Cancel session with ${booking.trainerName}`}
              >
                {cancellingId === booking.id ? '…' : 'Cancel'}
              </button>
            </li>
          )
        })}
      </ul>

      {/* Confirm cancel dialog */}
      {confirmId && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-dialog-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-[#1F2937] bg-[#111827] p-6">
            <h3 id="cancel-dialog-title" className="mb-2 text-[18px] font-semibold text-white">
              Cancel this session?
            </h3>
            <p className="mb-5 text-[13px] text-[#9CA3AF]">
              This will free up the slot for other members.
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 rounded-lg border border-[rgba(255,255,255,0.12)] py-2.5 text-[13px] font-medium text-[#D1D5DB] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                onClick={() => setConfirmId(null)}
              >
                Keep it
              </button>
              <button
                className="flex-1 rounded-lg border border-[rgba(239,68,68,0.40)] bg-[rgba(239,68,68,0.10)] py-2.5 text-[13px] font-medium text-[#F87171] hover:bg-[rgba(239,68,68,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                onClick={handleCancelConfirm}
              >
                Yes, cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
