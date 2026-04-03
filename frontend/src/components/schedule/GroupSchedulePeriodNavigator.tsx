import type { ScheduleView } from '../../types/groupClassSchedule'
import {
  formatRangeLabel,
  formatShortDateLabel,
  formatWeekMeta,
} from '../../utils/scheduleFormatters'

interface GroupSchedulePeriodNavigatorProps {
  view: ScheduleView;
  anchorDate: string;
  timeZone: string;
  week?: string;
  rangeStartDate?: string;
  rangeEndDateExclusive?: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function GroupSchedulePeriodNavigator({
  view,
  anchorDate,
  timeZone,
  week,
  rangeStartDate,
  rangeEndDateExclusive,
  onPrevious,
  onNext,
  onToday,
  disabled = false,
  isLoading = false,
}: GroupSchedulePeriodNavigatorProps) {
  const label =
    view === 'day'
      ? formatShortDateLabel(anchorDate, timeZone)
      : rangeStartDate && rangeEndDateExclusive
        ? formatRangeLabel(rangeStartDate, rangeEndDateExclusive, timeZone)
        : formatShortDateLabel(anchorDate, timeZone)

  const meta =
    view === 'list'
      ? '14-day view'
      : week
        ? formatWeekMeta(week)
        : ''

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="rounded-xl border border-gray-800 bg-[#0F0F0F] px-4 py-3 text-left">
          <div className="h-4 w-36 rounded-full bg-gray-800 animate-pulse" />
          <div className="mt-2 h-3 w-20 rounded-full bg-gray-800 animate-pulse" />
        </div>
        <div className="inline-flex items-center gap-2">
          {['Previous', 'Today', 'Next'].map((labelText) => (
            <div
              key={labelText}
              className="h-9 w-20 rounded-md border border-gray-800 bg-gray-800/70 animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div
        className="rounded-xl border border-gray-800 bg-[#0F0F0F] px-4 py-3 text-left"
        aria-live="polite"
      >
        <p className="text-base font-semibold text-white">{label}</p>
        <p className="mt-1 text-xs uppercase tracking-[0.12em] text-gray-500">
          {meta}
        </p>
      </div>
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={disabled}
          className="inline-flex items-center justify-center rounded-md border border-green-500 bg-transparent px-3 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-600"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onToday}
          disabled={disabled}
          className="inline-flex items-center justify-center rounded-md border border-green-500 bg-transparent px-3 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-600"
        >
          Today
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={disabled}
          className="inline-flex items-center justify-center rounded-md border border-green-500 bg-transparent px-3 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-600"
        >
          Next
        </button>
      </div>
    </div>
  )
}
