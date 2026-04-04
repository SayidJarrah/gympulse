import type { GroupClassScheduleEntry } from '../../types/groupClassSchedule'
import {
  formatLongDateLabel,
  formatTimeRange,
} from '../../utils/scheduleFormatters'
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

function formatStartTime(scheduledAt: string, durationMin: number, timeZone: string): string {
  return formatTimeRange(scheduledAt, durationMin, timeZone).split(' - ')[0] ?? ''
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
    <section className="rounded-[24px] border border-gray-800 bg-gray-900/80 shadow-md shadow-black/40">
      <div className="border-b border-gray-800 px-6 py-5">
        <h2 className="text-lg font-semibold text-white">Day agenda</h2>
        <p className="mt-1 text-sm text-gray-400">
          {formatLongDateLabel(anchorDate, timeZone)}
        </p>
      </div>
      <div className="flex flex-col divide-y divide-gray-800">
        {entries.map((entry) => (
          <div key={entry.id} className="grid gap-4 p-4 md:grid-cols-[7rem_minmax(0,1fr)] md:items-start md:px-6">
            <div className="rounded-2xl border border-gray-800 bg-[#0F0F0F] px-4 py-4 text-left">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                Starts
              </div>
              <div className="mt-2 font-['Barlow_Condensed'] text-3xl font-bold uppercase leading-none text-green-400">
                {formatStartTime(entry.scheduledAt, entry.durationMin, timeZone)}
              </div>
              <div className="mt-2 text-xs text-gray-500">{entry.durationMin} min</div>
            </div>
            <GroupScheduleEntryCard
              entry={entry}
              timeZone={timeZone}
              showDate={false}
              density="comfortable"
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
