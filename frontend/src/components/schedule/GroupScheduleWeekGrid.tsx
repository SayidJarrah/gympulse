import { CalendarDaysIcon } from '@heroicons/react/24/outline'
import type { GroupClassScheduleEntry } from '../../types/groupClassSchedule'
import { getTodayIsoDate, getWeekDates } from '../../utils/scheduleDates'
import {
  formatDayNumber,
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

// Change 6 — "Rest day" placeholder replacing bare "No classes" text
function EmptyDayPlaceholder({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center justify-center py-6">
        <CalendarDaysIcon className="h-5 w-5 text-gray-700" />
      </div>
    )
  }
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8">
      <CalendarDaysIcon className="h-8 w-8 text-gray-700" />
      <span className="text-xs text-gray-600">Rest day</span>
    </div>
  )
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

  const renderEntries = (dayEntries: GroupClassScheduleEntry[], compact = false) => {
    if (dayEntries.length === 0) {
      return <EmptyDayPlaceholder compact={compact} />
    }

    return dayEntries.map((entry) => (
      <GroupScheduleEntryCard
        key={entry.id}
        entry={entry}
        timeZone={timeZone}
        showDate={false}
        density={compact ? 'compact' : 'comfortable'}
        onSelect={onSelectEntry}
        onBook={onBookEntry}
        onCancel={onCancelEntry}
        onBrowsePlans={onBrowsePlans}
      />
    ))
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Mobile stacked layout — unchanged per spec */}
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
                    {/* Change 7 — weekday in uppercase tracking for mobile too */}
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
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
                  {/* Change 7 — class count: sentence case, no uppercase */}
                  <span className="rounded-full border border-gray-700 bg-[#0F0F0F] px-2.5 py-1 text-xs font-medium text-gray-300">
                    {dayEntries.length} {dayEntries.length === 1 ? 'class' : 'classes'}
                  </span>
                </div>
                {/* Change 3 — remove separate Today text row on mobile (circle is desktop only, but keep the ring indicator) */}
              </div>
              <div className="flex flex-col gap-3 p-4">{renderEntries(dayEntries, true)}</div>
            </section>
          )
        })}
      </div>

      {/* Desktop 7-column grid */}
      <div className="hidden lg:grid lg:grid-cols-7 lg:gap-4">
        {weekDates.map((date) => {
          const isToday = date === today
          const dayEntries = entriesByDate[date]
          const bookedCount = dayEntries.filter((entry) => entry.currentUserBooking !== null).length

          // Change 3 — dot indicators for booking density (up to 7 dots)
          const totalDots = Math.min(dayEntries.length, 7)

          return (
            <section
              key={date}
              className={`flex min-h-[18rem] flex-col rounded-[24px] border border-gray-800 bg-gray-900/80 shadow-md shadow-black/20 ${
                isToday ? 'ring-1 ring-green-500/40' : ''
              }`}
            >
              <div className="border-b border-gray-800 px-4 py-4">
                {/* Change 3 — weekday label */}
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                  {formatWeekdayLabel(date, timeZone)}
                </p>

                {/* Change 3 — date number in filled circle for today; no separate "Today" row */}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full text-2xl font-bold leading-none ${
                      isToday
                        ? 'bg-green-500 text-white'
                        : 'bg-transparent text-white'
                    }`}
                  >
                    {formatDayNumber(date, timeZone)}
                  </div>
                </div>

                {/* Change 3 — dot indicators for booking density */}
                {totalDots > 0 ? (
                  <div className="mt-2 flex items-center gap-1">
                    {Array.from({ length: totalDots }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 w-1.5 rounded-full ${
                          i < bookedCount ? 'bg-green-500' : 'bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">{renderEntries(dayEntries, true)}</div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
