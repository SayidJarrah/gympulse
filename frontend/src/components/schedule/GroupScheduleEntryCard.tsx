import type { GroupClassScheduleEntry } from '../../types/groupClassSchedule'
import {
  formatShortDateLabel,
  formatTimeRange,
} from '../../utils/scheduleFormatters'
import {
  formatRemainingSpots,
  getEntrySupportingCopy,
  getScheduleEntryPresentationState,
  type ScheduleEntryPresentationState,
} from '../../utils/bookingPresentation'

interface GroupScheduleEntryCardProps {
  entry: GroupClassScheduleEntry;
  timeZone: string;
  showDate: boolean;
  density?: 'compact' | 'comfortable';
  onSelect?: (entry: GroupClassScheduleEntry) => void;
  onBook?: (entry: GroupClassScheduleEntry) => void;
  onCancel?: (entry: GroupClassScheduleEntry) => void;
  onBrowsePlans?: () => void;
  actionError?: string | null;
}

function getTrainerLine(trainerNames: string[]): string {
  if (trainerNames.length === 0) {
    return 'Trainer TBA'
  }
  if (trainerNames.length === 1) {
    return `Trainer: ${trainerNames[0]}`
  }
  return `Trainers: ${trainerNames.join(', ')}`
}

function getStateBadge(state: ScheduleEntryPresentationState): {
  label: string;
  className: string;
} {
  switch (state) {
    case 'booked':
      return {
        label: 'Booked',
        className: 'border-green-500/30 bg-green-500/10 text-green-300',
      }
    case 'cancellation-locked':
      return {
        label: 'Locked',
        className: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
      }
    case 'full':
      return {
        label: 'Full',
        className: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
      }
    case 'membership-required':
      return {
        label: 'Membership',
        className: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
      }
    case 'available':
      return {
        label: 'Open',
        className: 'border-green-500/30 bg-green-500/10 text-green-300',
      }
    default:
      return {
        label: 'Unavailable',
        className: 'border-gray-700 bg-gray-900 text-gray-400',
      }
  }
}

function getWrapperClass(state: ScheduleEntryPresentationState): string {
  switch (state) {
    case 'booked':
      return 'border-green-500/40 bg-green-500/[0.08]'
    case 'cancellation-locked':
      return 'border-orange-500/30 bg-orange-500/[0.06]'
    case 'membership-required':
      return 'border-orange-500/20 bg-orange-500/[0.04]'
    default:
      return 'border-gray-800 bg-[#0F0F0F] hover:border-green-500/30 hover:bg-gray-900/90'
  }
}

export function GroupScheduleEntryCard({
  entry,
  timeZone,
  showDate,
  density = 'comfortable',
  onSelect,
  onBook,
  onCancel,
  onBrowsePlans,
  actionError,
}: GroupScheduleEntryCardProps) {
  const presentationState = getScheduleEntryPresentationState(entry)
  const remainingCopy = formatRemainingSpots(entry.remainingSpots)
  const badge = getStateBadge(presentationState)
  const isCompact = density === 'compact'
  const actionRowClass = isCompact
    ? 'mt-1 flex w-full flex-col gap-2 border-t border-gray-800 pt-3'
    : 'mt-1 flex w-full flex-col gap-3 border-t border-gray-800 pt-4'

  return (
    <article
      className={`group flex w-full flex-col items-start gap-3 rounded-2xl border p-4 text-left shadow-md shadow-black/20 transition-all duration-200 ${getWrapperClass(presentationState)}`}
    >
      {!isCompact && entry.classPhotoUrl ? (
        <div className="h-40 w-full overflow-hidden rounded-xl border border-gray-800 bg-gray-950">
          <img
            src={entry.classPhotoUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        </div>
      ) : null}

      <div className="flex w-full items-start justify-between gap-3">
        <div className="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-green-300">
          {formatTimeRange(entry.scheduledAt, entry.durationMin, timeZone)}
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      <div className="w-full">
        {showDate ? (
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            {formatShortDateLabel(entry.localDate, timeZone)}
          </div>
        ) : null}
        <div
          className={`${isCompact ? 'text-lg' : 'text-xl'} font-semibold leading-tight text-white`}
        >
          {entry.name}
        </div>
        <div className={`mt-2 ${isCompact ? 'text-xs' : 'text-sm'} leading-6 text-gray-300`}>
          {getTrainerLine(entry.trainerNames)}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-gray-700 bg-gray-900/80 px-3 py-1 text-xs font-medium text-gray-300">
            {entry.durationMin} min
          </span>
          <span className="rounded-full border border-gray-700 bg-gray-900/80 px-3 py-1 text-xs font-medium text-gray-300">
            {presentationState === 'full' ? '0 spots left' : `${remainingCopy} left`}
          </span>
        </div>
        <div className={`mt-3 ${isCompact ? 'text-xs' : 'text-sm'} leading-6 text-gray-400`}>
          {getEntrySupportingCopy(entry)}
        </div>
        {presentationState === 'membership-required' ? (
          <div className="mt-3 rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-sm text-orange-200">
            Active membership required to book this class.
          </div>
        ) : null}
        {actionError ? (
          <div
            role="alert"
            className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
          >
            {actionError}
          </div>
        ) : null}
      </div>

      <div className={actionRowClass}>
        {presentationState === 'available' ? (
          <button
            type="button"
            onClick={() => onBook?.(entry)}
            className="inline-flex w-full items-center justify-center rounded-md bg-green-500 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            Book spot
          </button>
        ) : null}
        {presentationState === 'booked' ? (
          <button
            type="button"
            onClick={() => onCancel?.(entry)}
            className="inline-flex w-full items-center justify-center rounded-md border border-gray-700 bg-transparent px-4 py-2.5 text-sm font-semibold text-gray-200 transition-colors duration-200 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            Cancel booking
          </button>
        ) : null}
        {presentationState === 'cancellation-locked' ? (
          <button
            type="button"
            disabled
            className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-md border border-gray-800 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-500"
          >
            Cancel booking
          </button>
        ) : null}
        {presentationState === 'membership-required' ? (
          <button
            type="button"
            onClick={onBrowsePlans}
            className="inline-flex w-full items-center justify-center rounded-md border border-green-500/40 bg-green-500/10 px-4 py-2.5 text-sm font-semibold text-green-300 transition-colors duration-200 hover:bg-green-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            Browse plans
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onSelect?.(entry)}
          className="inline-flex items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium text-gray-400 transition-all duration-200 hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          View details
        </button>
      </div>
    </article>
  )
}
