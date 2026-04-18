import { useEffect } from 'react'
import { usePtBookingStore } from '../store/ptBookingStore'

export function useTrainerSessions() {
  const { trainerSchedule, trainerScheduleLoading, trainerScheduleError, fetchTrainerSchedule } =
    usePtBookingStore()

  useEffect(() => {
    const today = new Date()
    const end = new Date(today)
    end.setDate(today.getDate() + 14)

    const fmt = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    fetchTrainerSchedule(fmt(today), fmt(end))
  }, [fetchTrainerSchedule])

  return { trainerSchedule, trainerScheduleLoading, trainerScheduleError }
}
