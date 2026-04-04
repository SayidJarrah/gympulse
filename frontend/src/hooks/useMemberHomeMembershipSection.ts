import { useEffect, useState } from 'react'
import type { AxiosError } from 'axios'
import { getMemberHomePlanTeasers } from '../api/memberHome'
import { useMembershipStore } from '../store/membershipStore'
import type { ApiErrorResponse } from '../types/auth'
import type { MembershipPlan } from '../types/membershipPlan'
import type { UserMembership } from '../types/userMembership'

type MembershipPrimaryCardMode = 'loading' | 'active' | 'empty' | 'error'

interface UseMemberHomeMembershipSectionResult {
  membership: UserMembership | null;
  availablePlans: MembershipPlan[];
  mode: MembershipPrimaryCardMode;
  error: string | null;
  errorCode: string | null;
  planTeasersLoading: boolean;
  retry: () => Promise<void>;
}

export function useMemberHomeMembershipSection(): UseMemberHomeMembershipSectionResult {
  const {
    activeMembership,
    membershipLoading,
    membershipError,
    membershipErrorCode,
    fetchMyMembership,
  } = useMembershipStore()
  const [availablePlans, setAvailablePlans] = useState<MembershipPlan[]>([])
  const [planTeasersLoading, setPlanTeasersLoading] = useState(false)
  const [hasLoadedPlanTeasers, setHasLoadedPlanTeasers] = useState(false)
  const [planTeasersErrorCode, setPlanTeasersErrorCode] = useState<string | null>(null)

  const membershipStatusPending =
    activeMembership === null &&
    membershipError === null &&
    membershipErrorCode === null &&
    !membershipLoading

  const loadPlanTeasers = async () => {
    setPlanTeasersLoading(true)
    setPlanTeasersErrorCode(null)

    try {
      const plans = await getMemberHomePlanTeasers()
      setAvailablePlans(plans)
      setHasLoadedPlanTeasers(true)
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      setPlanTeasersErrorCode(axiosError.response?.data?.code ?? null)
      setAvailablePlans([])
      setHasLoadedPlanTeasers(true)
    } finally {
      setPlanTeasersLoading(false)
    }
  }

  useEffect(() => {
    if (membershipStatusPending) {
      void fetchMyMembership()
    }
  }, [fetchMyMembership, membershipStatusPending])

  useEffect(() => {
    if (activeMembership) {
      setAvailablePlans([])
      setPlanTeasersLoading(false)
      setHasLoadedPlanTeasers(false)
      setPlanTeasersErrorCode(null)
      return
    }

    if (membershipErrorCode === 'NO_ACTIVE_MEMBERSHIP' && !hasLoadedPlanTeasers && !planTeasersLoading) {
      void loadPlanTeasers()
    }
  }, [
    activeMembership,
    hasLoadedPlanTeasers,
    membershipErrorCode,
    planTeasersLoading,
  ])

  const retry = async () => {
    setHasLoadedPlanTeasers(false)
    setAvailablePlans([])
    setPlanTeasersErrorCode(null)
    await fetchMyMembership()
  }

  if (membershipLoading || membershipStatusPending) {
    return {
      membership: null,
      availablePlans,
      mode: 'loading',
      error: null,
      errorCode: null,
      planTeasersLoading,
      retry,
    }
  }

  if (activeMembership) {
    return {
      membership: activeMembership,
      availablePlans,
      mode: 'active',
      error: null,
      errorCode: null,
      planTeasersLoading: false,
      retry,
    }
  }

  if (membershipErrorCode === 'NO_ACTIVE_MEMBERSHIP') {
    return {
      membership: null,
      availablePlans,
      mode: 'empty',
      error: null,
      errorCode: planTeasersErrorCode ?? membershipErrorCode,
      planTeasersLoading,
      retry,
    }
  }

  return {
    membership: null,
    availablePlans,
    mode: 'error',
    error: membershipError ?? 'We couldn’t load your current membership. Please try again.',
    errorCode: membershipErrorCode,
    planTeasersLoading: false,
    retry,
  }
}
