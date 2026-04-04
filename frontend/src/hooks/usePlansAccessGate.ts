import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useMembershipStore } from '../store/membershipStore'
import { buildHomeMembershipPath } from '../utils/accessFlowNavigation'

type PlansAccessMode = 'public' | 'loading' | 'authenticated' | 'redirect'

interface UsePlansAccessGateResult {
  mode: PlansAccessMode;
  canPurchase: boolean;
  redirectTo: string | null;
}

export function usePlansAccessGate(): UsePlansAccessGateResult {
  const { isAuthenticated, user } = useAuthStore()
  const {
    activeMembership,
    membershipErrorCode,
    membershipLoading,
    fetchMyMembership,
  } = useMembershipStore()

  const isAuthenticatedUser = isAuthenticated && user?.role === 'USER'
  const membershipStatusPending =
    isAuthenticatedUser &&
    activeMembership === null &&
    membershipErrorCode === null &&
    !membershipLoading

  useEffect(() => {
    if (membershipStatusPending) {
      void fetchMyMembership()
    }
  }, [fetchMyMembership, membershipStatusPending])

  if (!isAuthenticatedUser) {
    return {
      mode: 'public',
      canPurchase: false,
      redirectTo: null,
    }
  }

  if (membershipLoading || membershipStatusPending) {
    return {
      mode: 'loading',
      canPurchase: false,
      redirectTo: null,
    }
  }

  if (activeMembership) {
    return {
      mode: 'redirect',
      canPurchase: false,
      redirectTo: buildHomeMembershipPath('already-active'),
    }
  }

  return {
    mode: 'authenticated',
    canPurchase: membershipErrorCode === 'NO_ACTIVE_MEMBERSHIP',
    redirectTo: null,
  }
}
