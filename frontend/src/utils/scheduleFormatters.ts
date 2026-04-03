import { addDaysToIsoDate, parseIsoDate } from './scheduleDates'

export function formatShortDateLabel(dateIso: string, timeZone: string): string {
  const date = parseIsoDate(dateIso, timeZone)
  const formatted = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone,
  }).format(date)
  return formatted.replace(',', '')
}

export function formatWeekdayLabel(dateIso: string, timeZone: string): string {
  const date = parseIsoDate(dateIso, timeZone)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone,
  }).format(date)
}

export function formatMonthDayLabel(dateIso: string, timeZone: string): string {
  const date = parseIsoDate(dateIso, timeZone)
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone,
  }).format(date)
}

export function formatLongDateLabel(dateIso: string, timeZone: string): string {
  const date = parseIsoDate(dateIso, timeZone)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(date)
}

export function formatRangeLabel(
  rangeStartDate: string,
  rangeEndDateExclusive: string,
  timeZone: string
): string {
  const rangeEnd = addDaysToIsoDate(rangeEndDateExclusive, -1, timeZone)
  return `${formatShortDateLabel(rangeStartDate, timeZone)} - ${formatShortDateLabel(rangeEnd, timeZone)}`
}

export function formatWeekMeta(week: string): string {
  const [, weekPart] = week.split('-W')
  const weekNumber = Number(weekPart)
  return Number.isFinite(weekNumber) ? `Week ${weekNumber}` : 'Week'
}

export function formatTimeRange(
  scheduledAt: string,
  durationMin: number,
  timeZone: string
): string {
  const start = new Date(scheduledAt)
  const end = new Date(start.getTime() + durationMin * 60 * 1000)
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  })
  return `${formatter.format(start)} - ${formatter.format(end)}`
}
