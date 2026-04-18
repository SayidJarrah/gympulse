import { useEffect } from 'react'
import { usePtBookingStore } from '../store/ptBookingStore'
import { exportAdminPtSessions } from '../api/ptBookings'
import type { AdminPtFilters } from '../types/ptBooking'

export function useAdminPtSessions() {
  const {
    adminSessions,
    adminSessionsTotal,
    adminStats,
    adminLoading,
    adminError,
    adminFilters,
    fetchAdminSessions,
    fetchAdminStats,
    setAdminFilters,
  } = usePtBookingStore()

  useEffect(() => {
    fetchAdminSessions()
    fetchAdminStats()
  }, [fetchAdminSessions, fetchAdminStats])

  const applyFilter = (filters: Partial<AdminPtFilters>) => {
    setAdminFilters(filters)
    fetchAdminSessions(filters)
  }

  const handleExport = async () => {
    try {
      const blob = await exportAdminPtSessions(adminFilters)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'pt-sessions.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // non-fatal
    }
  }

  return {
    adminSessions,
    adminSessionsTotal,
    adminStats,
    adminLoading,
    adminError,
    adminFilters,
    applyFilter,
    handleExport,
  }
}
