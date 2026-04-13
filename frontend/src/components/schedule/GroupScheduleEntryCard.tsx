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

// Change 4 — left-accent status stripe
function getAccentStripeClass(state: ScheduleEntryPresentationState): string {
  switch (state) {
    case 'booked':
      return 'bg-green-500'
    case 'cancellation-locked':
      return 'bg-orange-400'
    case 'full':
      return 'bg-orange-400'
    case 'membership-required':
      return 'bg-red-500'
    default:
      return 'bg-gray-700'
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

  // Compact layout — used in the 7-column week grid where columns are ~170px wide
  if (isCompact) {
    return (
      <article
        role="button"
        tabIndex={0}
        onClick={() => onSelect?.(entry)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect?.(entry)}
        className={`group flex w-full cursor-pointer flex-row items-stretch overflow-hidden rounded-xl border text-left transition-all duration-200 ${getWrapperClass(presentationState)}`}
      >
        {/* Left accent stripe — 3px, visible color cue */}
        <div
          className={`w-[3px] flex-shrink-0 self-stretch transition-colors duration-300 ${getAccentStripeClass(presentationState)}`}
          aria-hidden="true"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-2.5 py-2.5">
          {/* Time + status row */}
          <div className="flex items-center justify-between gap-1">
            <span className="font-mono text-[11px] font-semibold leading-none text-green-400">
              {formatTimeRange(entry.scheduledAt, entry.durationMin, timeZone)}
            </span>
            <span
              className={`inline-flex flex-shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>

          {/* Class name */}
          <div className="text-sm font-bold leading-tight text-white line-clamp-2">
            {entry.name}
          </div>

          {/* Trainer */}
          <div className="truncate text-[11px] text-gray-500">
            {entry.trainerNames[0] ?? 'TBA'}
          </div>

          {/* Meta row: duration · spots */}
          <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
            <span>{entry.durationMin} min</span>
            {presentationState !== 'full' && presentationState !== 'unavailable' && (
              <>
                <span>·</span>
                <span>{remainingCopy} left</span>
              </>
            )}
            {presentationState === 'full' && (
              <>
                <span>·</span>
                <span className="text-orange-500">Full</span>
              </>
            )}
          </div>

          {/* Inline action for available / booked states — no action for others */}
          {presentationState === 'available' ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onBook?.(entry) }}
              className="mt-1 w-full rounded-lg bg-green-500 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-green-600"
            >
              Book
            </button>
          ) : presentationState === 'booked' ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onCancel?.(entry) }}
              className="mt-1 w-full rounded-lg border border-gray-700 py-1.5 text-[11px] font-semibold text-gray-300 transition-colors hover:border-red-500/40 hover:text-red-300"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </article>
    )
  }

  // Comfortable layout — used in Day agenda and List view where there is more horizontal space
  return (
    <article
      className={`group flex w-full flex-row items-stretch rounded-2xl border text-left shadow-md shadow-black/20 transition-all duration-200 ${getWrapperClass(presentationState)}`}
    >
      <div
        className={`w-[3px] flex-shrink-0 self-stretch rounded-l-2xl transition-colors duration-300 ${getAccentStripeClass(presentationState)}`}
        aria-hidden="true"
      />

      <div className="flex min-w-0 flex-1 flex-col items-start gap-3 p-4">
        {entry.classPhotoUrl ? (
          <div className="h-40 w-full overflow-hidden rounded-xl border border-gray-800 bg-gray-950">
            <img
              src={entry.classPhotoUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
          </div>
        ) : null}

        <div className="flex w-full items-start justify-between gap-3">
          <div className="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-medium text-green-300">
            {formatTimeRange(entry.scheduledAt, entry.durationMin, timeZone)}
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>

        <div className="w-full">
          {showDate ? (
            <div className="mb-2 text-xs font-semibold text-gray-500">
              {formatShortDateLabel(entry.localDate, timeZone)}
            </div>
          ) : null}
          <div className="text-xl font-semibold leading-tight text-white">{entry.name}</div>
          <div className="mt-2 text-sm leading-6 text-gray-300">
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
          <div className="mt-3 text-sm leading-6 text-gray-400">
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
      </div>
    </article>
  )
}
