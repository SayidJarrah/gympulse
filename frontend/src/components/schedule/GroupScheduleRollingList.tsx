import type { GroupClassScheduleEntry } from '../../types/groupClassSchedule'
import { formatShortDateLabel } from '../../utils/scheduleFormatters'
import { GroupScheduleEntryCard } from './GroupScheduleEntryCard'

interface GroupScheduleRollingListProps {
  timeZone: string;
  entries: GroupClassScheduleEntry[];
  onSelectEntry?: (entry: GroupClassScheduleEntry) => void;
}

export function GroupScheduleRollingList({
  timeZone,
  entries,
  onSelectEntry,
}: GroupScheduleRollingListProps) {
  const grouped: Array<{ date: string; items: GroupClassScheduleEntry[] }> = []
  const groupedMap = new Map<string, GroupClassScheduleEntry[]>()

  entries.forEach((entry) => {
    if (!groupedMap.has(entry.localDate)) {
      groupedMap.set(entry.localDate, [])
      grouped.push({ date: entry.localDate, items: groupedMap.get(entry.localDate)! })
    }
    groupedMap.get(entry.localDate)!.push(entry)
  })

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-white">Upcoming 14 days</h2>
      {grouped.map((group) => (
        <div
          key={group.date}
          className="rounded-2xl border border-gray-800 bg-gray-900"
        >
          <div className="border-b border-gray-800 px-5 py-4">
            <h3 className="text-sm font-semibold text-gray-300">
              {formatShortDateLabel(group.date, timeZone)}
            </h3>
          </div>
          <div className="divide-y divide-gray-800">
            {group.items.map((entry) => (
              <div key={entry.id} className="p-4">
                <GroupScheduleEntryCard
                  entry={entry}
                  timeZone={timeZone}
                  showDate={false}
                  onSelect={onSelectEntry}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
