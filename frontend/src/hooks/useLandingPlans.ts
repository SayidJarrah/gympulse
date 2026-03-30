import { useEffect, useState } from 'react'
import type { AxiosError } from 'axios'
import { getLandingPlans } from '../api/landingPage'
import type { ApiErrorResponse } from '../types/auth'
import type { MembershipPlan } from '../types/membershipPlan'
import { getPlanErrorMessage } from '../utils/planErrors'

interface LandingPageData {
  plans: MembershipPlan[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLandingPlans(): LandingPageData {
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlans = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getLandingPlans()
      setPlans(data)
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code ?? ''
      setError(getPlanErrorMessage(code, 'Failed to load membership plans.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchPlans()
  }, [])

  return {
    plans,
    loading,
    error,
    refetch: fetchPlans,
  }
}
