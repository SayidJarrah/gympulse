import { useMemo } from 'react'
import type { PtTrainerSummary, TrainerAvailability, SlotStatus } from '../../types/ptBooking'

interface Props {
  trainer: PtTrainerSummary
  availability: TrainerAvailability | null
  loading: boolean
  error: string | null
  weekOffset: number
  canGoBack: boolean
  canGoForward: boolean
  onBack: () => void
  onNextWeek: () => void
  onPrevWeek: () => void
  onSlotClick: (trainerId: string, startAt: string) => void
}

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatHour(h: number): string {
  if (h === 0) return '12am'
  if (h < 12) return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

function isoDateTime(dateStr: string, hour: number): string {
  // Construct ISO datetime at whole hour in local time, then convert to UTC
  const d = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:00:00`)
  return d.toISOString()
}

function getDayLabel(dateStr: string): { short: string; num: number; isToday: boolean } {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isToday = d.getTime() === today.getTime()
  const dow = d.getDay()  // 0=Sun
  const shortName = DAYS_SHORT[(dow + 6) % 7]  // convert to Mon-first
  return { short: shortName, num: d.getDate(), isToday }
}

interface SlotCellProps {
  status: SlotStatus
  date: string
  hour: number
  trainerId: string
  onSlotClick: (trainerId: string, startAt: string) => void
}

function SlotCell({ status, date, hour, trainerId, onSlotClick }: SlotCellProps) {
  const label = `${date} at ${formatHour(hour)}`

  if (status === 'available') {
    return (
      <button
        className="flex h-[52px] w-full items-center justify-center rounded-[6px] border border-[rgba(34,197,94,0.25)] bg-[rgba(34,197,94,0.08)] text-[10px] font-bold uppercase tracking-[0.04em] text-[#4ADE80] transition-all duration-[160ms] hover:border-[#22C55E] hover:bg-[#22C55E] hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        aria-label={`Book ${label} — available`}
        onClick={() => onSlotClick(trainerId, isoDateTime(date, hour))}
      >
        Book
      </button>
    )
  }

  if (status === 'class') {
    return (
      <div
        className="flex h-[52px] w-full items-center justify-center rounded-[6px] bg-[rgba(249,115,22,0.08)] text-[10px] font-bold uppercase tracking-[0.04em] text-[#FB923C]"
        aria-label={`${label} — group class, not available`}
        aria-hidden={true}
      >
        Class
      </div>
    )
  }

  if (status === 'booked') {
    return (
      <div
        className="h-[52px] w-full rounded-[6px] border border-dashed border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]"
        aria-label={`${label} — booked, not available`}
        aria-hidden={true}
      />
    )
  }

  // past
  return (
    <div
      className="h-[52px] w-full rounded-[6px] border border-dashed border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.015)]"
      aria-label={`${label} — past or too soon`}
      aria-hidden={true}
    />
  )
}

export function SlotPicker({
  trainer,
  availability,
  loading,
  error,
  weekOffset,
  canGoBack,
  canGoForward,
  onBack,
  onNextWeek,
  onPrevWeek,
  onSlotClick,
}: Props) {
  const accent = trainer.accentColor ?? '#4ADE80'
  const initial = trainer.firstName.charAt(0).toUpperCase()
  const days = availability?.days ?? []
  const gymOpen = days[0]?.open ?? 6
  const gymClose = days[0]?.close ?? 22
  const hours = useMemo(() => Array.from({ length: gymClose - gymOpen }, (_, i) => gymOpen + i), [gymOpen, gymClose])

  return (
    <section aria-labelledby="slot-picker-heading">
      {/* Back button */}
      <button
        className="mb-6 flex items-center gap-1.5 text-[13px] font-medium text-[#9CA3AF] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded"
        onClick={onBack}
      >
        ← Back to trainers
      </button>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          {trainer.profilePhotoUrl ? (
            <img
              src={trainer.profilePhotoUrl}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
              style={{ boxShadow: `0 8px 24px ${accent}40` }}
            />
          ) : (
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-black"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, boxShadow: `0 8px 24px ${accent}40` }}
              aria-hidden="true"
            >
              {initial}
            </div>
          )}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#22C55E]" id="slot-picker-heading">
              STEP 2 OF 3 · PICK A TIME
            </p>
            <h2 className="font-['Barlow_Condensed'] text-[44px] font-bold uppercase leading-none text-white">
              {trainer.firstName} {trainer.lastName}
            </h2>
            <p className="text-[13px] text-[#9CA3AF]">
              {trainer.specializations.join(' · ')} · 1 hour · no cost
            </p>
          </div>
        </div>

        {/* Week paginator */}
        <div className="flex items-center gap-2 self-start">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.10)] text-[14px] text-white transition-colors hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            onClick={onPrevWeek}
            disabled={!canGoBack}
            aria-label="Previous week"
          >
            ←
          </button>
          <span className="text-[13px] font-medium text-[#D1D5DB] min-w-[80px] text-center">
            {weekOffset === 0 ? 'This week' : 'Next week'}
          </span>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.10)] text-[14px] text-white transition-colors hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            onClick={onNextWeek}
            disabled={!canGoForward}
            aria-label="Next week"
          >
            →
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-4">
        {[
          { color: '#22C55E', bg: 'rgba(34,197,94,0.12)', label: 'Available' },
          { color: '#F97316', bg: 'rgba(249,115,22,0.12)', label: 'Group class' },
          { color: 'rgba(255,255,255,0.12)', bg: 'rgba(255,255,255,0.04)', label: 'Booked' },
          { color: 'rgba(255,255,255,0.06)', bg: 'rgba(255,255,255,0.02)', label: 'Too soon · 24h rule' },
        ].map(({ color, bg, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div
              className="h-3 w-3 rounded-sm"
              style={{ background: bg, border: `1px solid ${color}` }}
              aria-hidden="true"
            />
            <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#9CA3AF]">{label}</span>
          </div>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#22C55E] border-t-transparent" aria-label="Loading availability" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <p className="text-[14px] text-[#F87171]" role="alert">{error}</p>
      )}

      {/* Calendar grid */}
      {!loading && !error && days.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-[#1F2937]">
          <div
            className="grid min-w-[600px]"
            style={{ gridTemplateColumns: `72px repeat(${days.length}, 1fr)` }}
            role="grid"
            aria-label="Availability calendar"
          >
            {/* Day header */}
            <div className="border-b border-[#1F2937] p-3" />
            {days.map((day) => {
              const { short, num, isToday } = getDayLabel(day.date)
              return (
                <div
                  key={day.date}
                  className="border-b border-l border-[#1F2937] p-2 text-center"
                  role="columnheader"
                >
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isToday ? 'text-[#22C55E]' : 'text-[#9CA3AF]'}`}>
                    {short}
                  </p>
                  <p className={`font-['Barlow_Condensed'] text-[22px] font-bold ${isToday ? 'text-[#22C55E]' : 'text-white'}`}>
                    {num}
                  </p>
                </div>
              )
            })}

            {/* Hour rows */}
            {hours.map((hour) => (
              <>
                <div
                  key={`label-${hour}`}
                  className="flex items-center justify-end border-b border-[#1F2937] px-3 text-[12px] font-medium text-[#9CA3AF]"
                  role="rowheader"
                >
                  {formatHour(hour)}
                </div>
                {days.map((day) => {
                  const status: SlotStatus = (day.slots[hour] as SlotStatus) ?? 'past'
                  return (
                    <div
                      key={`${day.date}-${hour}`}
                      className="border-b border-l border-[#1F2937] p-1"
                      role="gridcell"
                    >
                      <SlotCell
                        status={status}
                        date={day.date}
                        hour={hour}
                        trainerId={trainer.id}
                        onSlotClick={onSlotClick}
                      />
                    </div>
                  )
                })}
              </>
            ))}
          </div>
        </div>
      )}

      {/* 24h rule banner */}
      <div className="mt-4 rounded-[10px] border border-[rgba(59,130,246,0.15)] bg-[rgba(59,130,246,0.05)] px-4 py-3 text-[12px] text-[#93C5FD]">
        Grey cells are within 24 hours and cannot be booked. Availability updates live when group class schedules change.
      </div>
    </section>
  )
}
