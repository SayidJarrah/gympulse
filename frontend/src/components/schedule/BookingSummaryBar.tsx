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
    <section className="rounded-[24px] border border-gray-800 bg-gray-900/80 p-5 shadow-md shadow-black/30">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-300">
            Booking summary
          </p>
          <p className="text-lg font-semibold text-white">
            You have {entries.length} booked {entries.length === 1 ? 'class' : 'classes'} in this view.
          </p>
          <p className="text-sm text-gray-400">
            Reserved classes stay visible here so you can review or jump into the full drawer quickly.
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
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {entries.slice(0, 3).map((entry) => (
          <div
            key={entry.id}
            className="rounded-2xl border border-gray-800 bg-[#0F0F0F]/90 px-4 py-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-semibold text-white">{entry.name}</div>
              <div className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-green-300">
                {entry.cancellationAllowed ? 'Booked' : 'Locked'}
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              {formatTimeRange(entry.scheduledAt, entry.durationMin, timeZone)}
            </div>
            <div className="mt-3 text-sm text-gray-300">
              {entry.cancellationAllowed ? 'Your place is reserved.' : 'Cancellation window has closed.'}
            </div>
          </div>
        ))}
        {entries.length > 3 ? (
          <button
            type="button"
            onClick={onOpenDrawer}
            className="flex min-h-[8.75rem] flex-col items-start justify-between rounded-2xl border border-dashed border-gray-700 bg-[#0F0F0F]/60 px-4 py-4 text-left transition-colors duration-200 hover:border-green-500/40 hover:bg-gray-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            <span className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
              More bookings
            </span>
            <div>
              <div className="font-['Barlow_Condensed'] text-4xl font-bold uppercase leading-none text-white">
                +{entries.length - 3}
              </div>
              <div className="mt-2 text-sm text-gray-400">
                Open the drawer to manage the rest of your upcoming reservations.
              </div>
            </div>
          </button>
        ) : null}
      </div>
    </section>
  )
}
