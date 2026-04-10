import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="rounded-2xl border border-gray-800 bg-[#0F0F0F] px-4 py-3 text-left">
          <div className="h-4 w-36 rounded-full bg-gray-800 animate-pulse" />
          <div className="mt-2 h-3 w-20 rounded-full bg-gray-800 animate-pulse" />
        </div>
        <div className="inline-flex items-center gap-2 self-start">
          <div className="h-9 w-9 rounded-md border border-gray-800 bg-gray-800/70 animate-pulse" />
          <div className="h-9 w-16 rounded-md border border-gray-800 bg-gray-800/70 animate-pulse" />
          <div className="h-9 w-9 rounded-md border border-gray-800 bg-gray-800/70 animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div
        className="rounded-2xl border border-gray-800 bg-[#0F0F0F] px-4 py-3 text-left"
        aria-live="polite"
      >
        <p className="text-base font-semibold text-white">{label}</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
          {meta}
        </p>
      </div>
      <div className="inline-flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={disabled}
          title="Previous week (← key)"
          aria-label="Previous period"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-700 bg-transparent text-gray-200 transition-all duration-200 hover:border-green-500/40 hover:bg-green-500/10 hover:text-green-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-600"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToday}
          disabled={disabled}
          className="inline-flex items-center justify-center rounded-md bg-green-500 px-3 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:bg-green-500/40"
        >
          Today
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={disabled}
          title="Next week (→ key)"
          aria-label="Next period"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-700 bg-transparent text-gray-200 transition-all duration-200 hover:border-green-500/40 hover:bg-green-500/10 hover:text-green-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-600"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
