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
  onBookEntry?: (entry: GroupClassScheduleEntry) => void;
  onCancelEntry?: (entry: GroupClassScheduleEntry) => void;
  onBrowsePlans?: () => void;
}

export function GroupScheduleWeekGrid({
  anchorDate,
  timeZone,
  entries,
  onSelectEntry,
  onBookEntry,
  onCancelEntry,
  onBrowsePlans,
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
      return (
        <div className="rounded-2xl border border-dashed border-gray-800 bg-[#0F0F0F]/60 px-4 py-6 text-sm text-gray-500">
          No classes
        </div>
      )
    }

    return dayEntries.map((entry) => (
      <GroupScheduleEntryCard
        key={entry.id}
        entry={entry}
        timeZone={timeZone}
        showDate={false}
        density="compact"
        onSelect={onSelectEntry}
        onBook={onBookEntry}
        onCancel={onCancelEntry}
        onBrowsePlans={onBrowsePlans}
      />
    ))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-4 lg:hidden">
        {weekDates.map((date) => {
          const isToday = date === today
          const dayEntries = entriesByDate[date]
          return (
            <section
              key={date}
              className={`flex flex-col rounded-[24px] border border-gray-800 bg-gray-900/80 shadow-md shadow-black/20 ${
                isToday ? 'ring-1 ring-green-500/40' : ''
              }`}
            >
              <div className="border-b border-gray-800 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-300">
                      {formatWeekdayLabel(date, timeZone)}
                    </p>
                    <p
                      className={`font-['Barlow_Condensed'] text-3xl font-bold uppercase leading-none ${
                        isToday ? 'text-green-400' : 'text-white'
                      }`}
                    >
                      {formatMonthDayLabel(date, timeZone)}
                    </p>
                  </div>
                  <span className="rounded-full border border-gray-700 bg-[#0F0F0F] px-2.5 py-1 text-xs font-medium text-gray-300">
                    {dayEntries.length} {dayEntries.length === 1 ? 'class' : 'classes'}
                  </span>
                </div>
                {isToday ? (
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-green-400">
                    Today
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-3 p-4">{renderEntries(dayEntries)}</div>
            </section>
          )
        })}
      </div>

      <div className="hidden lg:grid lg:grid-cols-7 lg:gap-4">
        {weekDates.map((date) => {
          const isToday = date === today
          const dayEntries = entriesByDate[date]
          const bookingCount = dayEntries.filter((entry) => entry.currentUserBooking !== null).length

          return (
            <section
              key={date}
              className={`flex min-h-[18rem] flex-col rounded-[24px] border border-gray-800 bg-gray-900/80 shadow-md shadow-black/20 ${
                isToday ? 'ring-1 ring-green-500/40' : ''
              }`}
            >
              <div className="border-b border-gray-800 px-4 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-300">
                      {formatWeekdayLabel(date, timeZone)}
                    </p>
                    <p
                      className={`mt-1 font-['Barlow_Condensed'] text-3xl font-bold uppercase leading-none ${
                        isToday ? 'text-green-400' : 'text-white'
                      }`}
                    >
                      {formatMonthDayLabel(date, timeZone)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="rounded-full border border-gray-700 bg-[#0F0F0F] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-gray-300">
                      {dayEntries.length} {dayEntries.length === 1 ? 'class' : 'classes'}
                    </span>
                    {bookingCount > 0 ? (
                      <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-green-300">
                        {bookingCount} booked
                      </span>
                    ) : null}
                  </div>
                </div>
                {isToday ? (
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-green-400">
                    Today
                  </p>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">{renderEntries(dayEntries)}</div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
