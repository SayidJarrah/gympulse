import type { GroupClassScheduleEntry } from '../../types/groupClassSchedule'
import { formatLongDateLabel } from '../../utils/scheduleFormatters'
import { GroupScheduleEntryCard } from './GroupScheduleEntryCard'

interface GroupScheduleDayAgendaProps {
  anchorDate: string;
  timeZone: string;
  entries: GroupClassScheduleEntry[];
  onSelectEntry?: (entry: GroupClassScheduleEntry) => void;
  onBookEntry?: (entry: GroupClassScheduleEntry) => void;
  onCancelEntry?: (entry: GroupClassScheduleEntry) => void;
  onBrowsePlans?: () => void;
}

export function GroupScheduleDayAgenda({
  anchorDate,
  timeZone,
  entries,
  onSelectEntry,
  onBookEntry,
  onCancelEntry,
  onBrowsePlans,
}: GroupScheduleDayAgendaProps) {
  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 shadow-md shadow-black/50">
      <div className="border-b border-gray-800 px-6 py-5">
        <h2 className="text-lg font-semibold text-white">Day agenda</h2>
        <p className="mt-1 text-sm text-gray-400">
          {formatLongDateLabel(anchorDate, timeZone)}
        </p>
      </div>
      <div className="flex flex-col divide-y divide-gray-800">
        {entries.map((entry) => (
          <div key={entry.id} className="p-4">
            <GroupScheduleEntryCard
              entry={entry}
              timeZone={timeZone}
              showDate={false}
              onSelect={onSelectEntry}
              onBook={onBookEntry}
              onCancel={onCancelEntry}
              onBrowsePlans={onBrowsePlans}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
