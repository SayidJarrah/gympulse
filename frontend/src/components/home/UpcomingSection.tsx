import { Link, useNavigate } from 'react-router-dom'
import type { BookingResponse } from '../../types/booking'

interface Props {
  bookings: BookingResponse[];
  loading: boolean;
}

function formatRelativeDay(isoAt: string): { day: string; time: string } {
  const d = new Date(isoAt)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrowStart = new Date(todayStart.getTime() + 86_400_000)
  const dayAfterStart = new Date(todayStart.getTime() + 2 * 86_400_000)

  let day: string
  if (d >= todayStart && d < tomorrowStart) {
    day = 'Today'
  } else if (d >= tomorrowStart && d < dayAfterStart) {
    day = 'Tomorrow'
  } else {
    day = d.toLocaleDateString('en-US', { weekday: 'short' })
  }

  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).toLowerCase()

  return { day, time }
}

function UpcomingRow({
  booking,
  isNext,
}: {
  booking: BookingResponse;
  isNext: boolean;
}) {
  const navigate = useNavigate()
  const { day, time } = formatRelativeDay(booking.scheduledAt)
  const trainerName = booking.trainerNames[0] ?? ''

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/schedule?classId=${booking.classId}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(`/schedule?classId=${booking.classId}`)
      }}
      className="grid cursor-pointer items-center gap-5 py-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0F0F]"
      style={{ gridTemplateColumns: 'auto 1fr auto' }}
    >
      {/* Time column */}
      <div className="min-w-[120px]">
        <p
          className={`font-['Barlow_Condensed'] text-[22px] font-bold leading-[1.1] tracking-[-0.01em] ${
            isNext ? 'text-[#4ADE80]' : 'text-white'
          }`}
        >
          {day}
        </p>
        <p className="mt-1 text-xs tabular-nums text-[#6B7280]">{time}</p>
      </div>

      {/* Class + coach */}
      <div>
        <p className="text-[15px] font-semibold text-white">{booking.className}</p>
        <p className="mt-0.5 text-xs text-[#9CA3AF]">
          {[trainerName, `${booking.durationMin} min`].filter(Boolean).join(' · ')}
        </p>
      </div>

      {/* Status pill */}
      <div
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-[5px] text-[11px] font-semibold tracking-[0.06em] ${
          isNext
            ? 'border-green-500/30 bg-green-500/10 text-[#4ADE80]'
            : 'border-white/8 bg-white/[0.04] text-[#D1D5DB]'
        }`}
      >
        {isNext && (
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden="true" />
        )}
        {isNext ? 'Next up' : 'Booked'}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="py-8 text-center">
      <p className="text-[15px] font-semibold text-white">No sessions booked</p>
      <p className="mt-1 text-[13px] text-[#9CA3AF]">
        Open the schedule to book your week
      </p>
      <Link
        to="/schedule"
        className="mt-4 inline-block rounded-lg border border-white/15 px-5 py-2.5 text-[13px] font-semibold text-white transition-all duration-[160ms] hover:brightness-[1.08]"
      >
        Open schedule →
      </Link>
    </div>
  )
}

export function UpcomingSection({ bookings, loading }: Props) {
  return (
    <div className="rounded-2xl border border-[#1F2937] bg-white/[0.02] p-7">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B7280]">
            Upcoming
          </p>
          <p className="mt-1.5 font-['Barlow_Condensed'] text-[26px] font-bold uppercase tracking-[-0.01em] text-white">
            Next three sessions
          </p>
        </div>
        <Link
          to="/schedule"
          className="text-[13px] font-medium text-[#4ADE80] transition-colors duration-[160ms] hover:brightness-[1.15]"
        >
          Open schedule →
        </Link>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-0">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[76px] animate-pulse border-t border-white/5 first:border-t-0" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col">
          {bookings.map((b, i) => (
            <div
              key={b.id}
              className={i > 0 ? 'border-t border-white/5' : ''}
            >
              <UpcomingRow booking={b} isNext={i === 0} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
