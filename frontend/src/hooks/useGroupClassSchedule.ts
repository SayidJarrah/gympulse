import { useEffect } from 'react'
import type { GetGroupClassScheduleParams } from '../types/groupClassSchedule'
import { useGroupClassScheduleStore } from '../store/groupClassScheduleStore'

export function useGroupClassSchedule(params: GetGroupClassScheduleParams | null) {
  const {
    schedule,
    isLoading,
    error,
    errorCode,
    fetchSchedule,
    view,
    anchorDate,
    timeZone,
  } = useGroupClassScheduleStore()

  useEffect(() => {
    if (!params) return
    void fetchSchedule(params)
  }, [fetchSchedule, params?.view, params?.anchorDate, params?.timeZone])

  return {
    schedule,
    isLoading,
    error,
    errorCode,
    view,
    anchorDate,
    timeZone,
  }
}
