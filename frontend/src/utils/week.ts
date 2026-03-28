const MS_IN_DAY = 24 * 60 * 60 * 1000

export function getWeekStart(week: string): Date {
  const [yearPart, weekPart] = week.split('-W')
  const year = Number(yearPart)
  const weekNumber = Number(weekPart)
  if (!year || !weekNumber) {
    return new Date()
  }

  const simple = new Date(Date.UTC(year, 0, 1 + (weekNumber - 1) * 7))
  const dayOfWeek = simple.getUTCDay() || 7
  if (dayOfWeek > 1) {
    simple.setUTCDate(simple.getUTCDate() - (dayOfWeek - 1))
  } else {
    simple.setUTCDate(simple.getUTCDate() + (1 - dayOfWeek))
  }
  simple.setUTCHours(0, 0, 0, 0)
  return simple
}

export function formatWeekString(date: Date): string {
  const temp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  temp.setUTCDate(temp.getUTCDate() + 4 - (temp.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((temp.getTime() - yearStart.getTime()) / MS_IN_DAY + 1) / 7)
  const year = temp.getUTCFullYear()
  return `${year}-W${String(weekNo).padStart(2, '0')}`
}

export function addWeeks(week: string, delta: number): string {
  const start = getWeekStart(week)
  const next = new Date(start.getTime() + delta * 7 * MS_IN_DAY)
  return formatWeekString(next)
}

export function formatWeekLabel(week: string): string {
  const start = getWeekStart(week)
  const end = new Date(start.getTime() + 6 * MS_IN_DAY)
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
  const yearFormatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    timeZone: 'UTC',
  })
  const startText = formatter.format(start)
  const endText = formatter.format(end)
  const yearText = yearFormatter.format(end)
  return `${startText}–${endText} ${yearText}`
}

export function getWeekNumberLabel(week: string): string {
  const [, weekPart] = week.split('-W')
  return `Week ${Number(weekPart)}`
}

export function formatUtcTime(dateIso: string): string {
  const date = new Date(dateIso)
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(date)
}
