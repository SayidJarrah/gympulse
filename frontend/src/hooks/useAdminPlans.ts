import { useEffect } from 'react'
import { useMembershipPlanStore } from '../store/membershipPlanStore'
import type { PlanStatus } from '../types/membershipPlan'

/**
 * Hook for the admin plans management page.
 * Fetches and returns the paginated plan list with optional status filtering.
 */
export function useAdminPlans(status?: PlanStatus, page = 0, size = 20) {
  const {
    adminPlans,
    adminPlansTotalPages,
    adminPlansPage,
    adminPlansTotalElements,
    isLoading,
    error,
    fetchAdminPlans,
  } = useMembershipPlanStore()

  useEffect(() => {
    fetchAdminPlans(status, page, size)
  }, [status, page, size, fetchAdminPlans])

  return {
    plans: adminPlans,
    totalPages: adminPlansTotalPages,
    currentPage: adminPlansPage,
    totalElements: adminPlansTotalElements,
    isLoading,
    error,
    refetch: () => fetchAdminPlans(status, page, size),
  }
}
