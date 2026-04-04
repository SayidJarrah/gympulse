import { useEffect } from 'react'
import { useMembershipPlanStore } from '../store/membershipPlanStore'

/**
 * Hook for the public plans catalogue page.
 * Fetches and returns the paginated list of active membership plans.
 */
export function usePlans(page = 0, size = 20, enabled = true) {
  const {
    activePlans,
    activePlansTotalPages,
    activePlansPage,
    activePlansTotalElements,
    isLoading,
    error,
    fetchActivePlans,
  } = useMembershipPlanStore()

  useEffect(() => {
    if (!enabled) {
      return
    }

    void fetchActivePlans(page, size)
  }, [enabled, page, size, fetchActivePlans])

  return {
    plans: activePlans,
    totalPages: activePlansTotalPages,
    currentPage: activePlansPage,
    totalElements: activePlansTotalElements,
    isLoading,
    error,
    refetch: () => fetchActivePlans(page, size),
  }
}
