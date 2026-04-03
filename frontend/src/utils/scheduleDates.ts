export function resolveTimeZone(): string {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return timeZone && timeZone.length > 0 ? timeZone : 'UTC'
}

export function formatIsoDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).format(date)
}

export function parseIsoDate(value: string, timeZone: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  if (timeZone === 'UTC') {
    return new Date(Date.UTC(year, month - 1, day))
  }
  return new Date(year, month - 1, day)
}

export function addDaysToIsoDate(value: string, days: number, timeZone: string): string {
  const date = parseIsoDate(value, timeZone)
  date.setDate(date.getDate() + days)
  return formatIsoDate(date, timeZone)
}

export function getTodayIsoDate(timeZone: string): string {
  return formatIsoDate(new Date(), timeZone)
}

export function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function getWeekDates(anchorDate: string, timeZone: string): string[] {
  const anchor = parseIsoDate(anchorDate, timeZone)
  const dayIndex = anchor.getDay()
  const offset = (dayIndex + 6) % 7
  const monday = new Date(anchor)
  monday.setDate(anchor.getDate() - offset)

  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(monday)
    next.setDate(monday.getDate() + index)
    return formatIsoDate(next, timeZone)
  })
}
