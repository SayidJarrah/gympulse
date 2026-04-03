import { useMemo } from 'react'
import { resolveTimeZone } from '../utils/scheduleDates'

export function useScheduleTimeZone(): string {
  return useMemo(() => resolveTimeZone(), [])
}
