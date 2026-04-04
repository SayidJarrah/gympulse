import type { GroupClassScheduleEntry } from '../../types/groupClassSchedule'
import { formatShortDateLabel } from '../../utils/scheduleFormatters'
import { GroupScheduleEntryCard } from './GroupScheduleEntryCard'

interface GroupScheduleRollingListProps {
  timeZone: string;
  entries: GroupClassScheduleEntry[];
  onSelectEntry?: (entry: GroupClassScheduleEntry) => void;
  onBookEntry?: (entry: GroupClassScheduleEntry) => void;
  onCancelEntry?: (entry: GroupClassScheduleEntry) => void;
  onBrowsePlans?: () => void;
}

export function GroupScheduleRollingList({
  timeZone,
  entries,
  onSelectEntry,
  onBookEntry,
  onCancelEntry,
  onBrowsePlans,
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
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-white">Upcoming 14 days</h2>
        <p className="text-sm text-gray-400">
          Scan the rolling programme day by day and open details only when you need them.
        </p>
      </div>

      {grouped.map((group) => (
        <div
          key={group.date}
          className="rounded-[24px] border border-gray-800 bg-gray-900/80 shadow-md shadow-black/20"
        >
          <div className="border-b border-gray-800 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-300">
                {formatShortDateLabel(group.date, timeZone)}
              </h3>
              <span className="rounded-full border border-gray-700 bg-[#0F0F0F] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-gray-300">
                {group.items.length} {group.items.length === 1 ? 'class' : 'classes'}
              </span>
            </div>
          </div>
          <div className="grid gap-4 p-4 lg:grid-cols-2">
            {group.items.map((entry) => (
              <GroupScheduleEntryCard
                key={entry.id}
                entry={entry}
                timeZone={timeZone}
                showDate={false}
                density="comfortable"
                onSelect={onSelectEntry}
                onBook={onBookEntry}
                onCancel={onCancelEntry}
                onBrowsePlans={onBrowsePlans}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
