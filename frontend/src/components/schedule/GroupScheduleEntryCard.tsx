import type { GroupClassScheduleEntry } from '../../types/groupClassSchedule'
import {
  formatShortDateLabel,
  formatTimeRange,
} from '../../utils/scheduleFormatters'
import {
  formatRemainingSpots,
  getEntrySupportingCopy,
  getScheduleEntryPresentationState,
} from '../../utils/bookingPresentation'

interface GroupScheduleEntryCardProps {
  entry: GroupClassScheduleEntry;
  timeZone: string;
  showDate: boolean;
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

export function GroupScheduleEntryCard({
  entry,
  timeZone,
  showDate,
  onSelect,
  onBook,
  onCancel,
  onBrowsePlans,
  actionError,
}: GroupScheduleEntryCardProps) {
  const presentationState = getScheduleEntryPresentationState(entry)
  const remainingCopy = formatRemainingSpots(entry.remainingSpots)

  return (
    <article
      className={`group flex w-full flex-col items-start gap-3 rounded-xl border bg-[#0F0F0F] p-4 text-left transition-colors duration-200 ${
        presentationState === 'booked' || presentationState === 'cancellation-locked'
          ? 'border-green-500/40 bg-gray-900/80'
          : 'border-gray-800 hover:border-green-500/40 hover:bg-gray-800'
      }`}
    >
      {entry.classPhotoUrl && (
        <div className="h-36 w-full overflow-hidden rounded-xl border border-gray-800 bg-gray-950">
          <img
            src={entry.classPhotoUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        </div>
      )}
      <div className="text-base font-semibold text-white">{entry.name}</div>
      <div className="flex items-center gap-2 text-sm font-semibold text-green-400">
        {formatTimeRange(entry.scheduledAt, entry.durationMin, timeZone)}
      </div>
      <div className="w-full text-sm text-gray-400">
        {showDate && (
          <div className="mb-1">{formatShortDateLabel(entry.localDate, timeZone)}</div>
        )}
        <div>{getTrainerLine(entry.trainerNames)}</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {presentationState === 'booked' || presentationState === 'cancellation-locked' ? (
            <span className="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-green-300">
              Booked
            </span>
          ) : null}
          {presentationState === 'full' ? (
            <span className="inline-flex items-center rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-orange-300">
              Fully booked
            </span>
          ) : null}
          <span className="text-xs font-medium text-gray-500">
            {presentationState === 'full' ? '0 spots left' : `${remainingCopy} left`}
          </span>
        </div>
        <div className="mt-2 text-sm text-gray-300">{getEntrySupportingCopy(entry)}</div>
        {actionError && (
          <div
            role="alert"
            className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
          >
            {actionError}
          </div>
        )}
      </div>
      <div className="mt-4 flex w-full flex-col gap-3 border-t border-gray-800 pt-4">
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
