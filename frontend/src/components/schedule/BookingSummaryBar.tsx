import type { GroupClassScheduleEntry } from '../../types/groupClassSchedule'
import { formatTimeRange } from '../../utils/scheduleFormatters'

interface BookingSummaryBarProps {
  entries: GroupClassScheduleEntry[];
  timeZone: string;
  onOpenDrawer: () => void;
}

export function BookingSummaryBar({
  entries,
  timeZone,
  onOpenDrawer,
}: BookingSummaryBarProps) {
  if (entries.length === 0) {
    return null
  }

  return (
    <section className="rounded-2xl border border-green-500/20 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-transparent p-4 shadow-lg shadow-black/20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-green-300">
            Booking summary
          </p>
          <p className="mt-1 text-lg font-semibold text-white">
            You have {entries.length} booked {entries.length === 1 ? 'class' : 'classes'} in this view.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenDrawer}
          className="inline-flex items-center justify-center rounded-md border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-200 transition-colors duration-200 hover:bg-green-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        >
          See my bookings
        </button>
      </div>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="min-w-[13rem] rounded-xl border border-gray-800 bg-[#0F0F0F]/80 px-4 py-3"
          >
            <div className="text-sm font-semibold text-white">{entry.name}</div>
            <div className="mt-1 text-xs text-gray-400">
              {formatTimeRange(entry.scheduledAt, entry.durationMin, timeZone)}
            </div>
            <div className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-green-300">
              {entry.cancellationAllowed ? 'Booked' : 'Cancellation locked'}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
