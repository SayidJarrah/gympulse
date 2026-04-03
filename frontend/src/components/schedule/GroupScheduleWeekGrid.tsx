import type { GroupClassScheduleEntry } from '../../types/groupClassSchedule'
import { getTodayIsoDate, getWeekDates } from '../../utils/scheduleDates'
import {
  formatMonthDayLabel,
  formatWeekdayLabel,
} from '../../utils/scheduleFormatters'
import { GroupScheduleEntryCard } from './GroupScheduleEntryCard'

interface GroupScheduleWeekGridProps {
  anchorDate: string;
  timeZone: string;
  entries: GroupClassScheduleEntry[];
  onSelectEntry?: (entry: GroupClassScheduleEntry) => void;
}

export function GroupScheduleWeekGrid({
  anchorDate,
  timeZone,
  entries,
  onSelectEntry,
}: GroupScheduleWeekGridProps) {
  const weekDates = getWeekDates(anchorDate, timeZone)
  const today = getTodayIsoDate(timeZone)

  const entriesByDate = weekDates.reduce<Record<string, GroupClassScheduleEntry[]>>(
    (acc, date) => {
      acc[date] = entries.filter((entry) => entry.localDate === date)
      return acc
    },
    {}
  )

  const renderEntries = (dayEntries: GroupClassScheduleEntry[]) => {
    if (dayEntries.length === 0) {
      return <p className="text-sm text-gray-500">No classes</p>
    }

    return dayEntries.map((entry) => (
      <GroupScheduleEntryCard
        key={entry.id}
        entry={entry}
        timeZone={timeZone}
        showDate={false}
        onSelect={onSelectEntry}
      />
    ))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-4 lg:hidden">
        {weekDates.map((date) => {
          const isToday = date === today
          return (
            <section
              key={date}
              className={`flex flex-col rounded-2xl border border-gray-800 bg-gray-900 ${
                isToday ? 'ring-1 ring-green-500/40' : ''
              }`}
            >
              <div className="border-b border-gray-800 px-4 py-4">
                <p className="text-sm font-semibold text-gray-300">
                  {formatWeekdayLabel(date, timeZone)}
                </p>
                <p
                  className={`text-lg font-semibold ${
                    isToday ? 'text-green-400' : 'text-white'
                  }`}
                >
                  {formatMonthDayLabel(date, timeZone)}
                </p>
                {isToday && (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-green-400">
                    Today
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-3 p-4">
                {renderEntries(entriesByDate[date])}
              </div>
            </section>
          )
        })}
      </div>

      <div className="hidden lg:grid lg:grid-cols-7 lg:gap-4">
        {weekDates.map((date) => {
          const isToday = date === today
          return (
            <section
              key={date}
              className={`flex min-h-[18rem] flex-col rounded-2xl border border-gray-800 bg-gray-900 ${
                isToday ? 'ring-1 ring-green-500/40' : ''
              }`}
            >
              <div className="border-b border-gray-800 px-4 py-4">
                <p className="text-sm font-semibold text-gray-300">
                  {formatWeekdayLabel(date, timeZone)}
                </p>
                <p
                  className={`text-base font-semibold ${
                    isToday ? 'text-green-400' : 'text-white'
                  }`}
                >
                  {formatMonthDayLabel(date, timeZone)}
                </p>
                {isToday && (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-green-400">
                    Today
                  </p>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                {renderEntries(entriesByDate[date])}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
