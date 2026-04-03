import type { GroupClassScheduleEntry } from '../../types/groupClassSchedule'
import {
  formatShortDateLabel,
  formatTimeRange,
} from '../../utils/scheduleFormatters'

interface GroupScheduleEntryCardProps {
  entry: GroupClassScheduleEntry;
  timeZone: string;
  showDate: boolean;
  onSelect?: (entry: GroupClassScheduleEntry) => void;
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
}: GroupScheduleEntryCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(entry)}
      className="group flex w-full flex-col items-start gap-3 rounded-xl border border-gray-800 bg-[#0F0F0F] p-4 text-left transition-colors duration-200 hover:border-green-500/40 hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
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
      <div className="text-sm text-gray-400">
        {showDate && (
          <div className="mb-1">{formatShortDateLabel(entry.localDate, timeZone)}</div>
        )}
        <div>{getTrainerLine(entry.trainerNames)}</div>
      </div>
    </button>
  )
}
