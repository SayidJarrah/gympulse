import type { UserRole } from '../types/auth'
import type { ResolvedLandingActions } from '../types/landing'

interface ResolveLandingActionsParams {
  isAuthenticated: boolean;
  role: UserRole | null;
  hasActiveMembership: boolean;
  membershipLoading: boolean;
  membershipErrorCode: string | null;
}

export function resolveLandingActions({
  isAuthenticated,
  role,
  hasActiveMembership,
  membershipLoading,
  membershipErrorCode,
}: ResolveLandingActionsParams): ResolvedLandingActions {
  if (!isAuthenticated) {
    return {
      headerPrimary: { kind: 'link', label: 'Create account', to: '/register' },
      heroPrimary: { kind: 'link', label: 'Join GymFlow', to: '/register' },
      heroSecondary: { kind: 'link', label: 'Browse plans', to: '#plans' },
      planAction: { label: 'Create account', to: '/register', variant: 'primary' },
    }
  }

  if (role === 'ADMIN') {
    return {
      headerPrimary: { kind: 'link', label: 'Admin dashboard', to: '/admin/plans' },
      heroPrimary: { kind: 'link', label: 'Manage plans', to: '/admin/plans' },
      heroSecondary: { kind: 'link', label: 'Browse plans', to: '#plans' },
      planAction: { label: 'Manage plans', to: '/admin/plans', variant: 'secondary' },
    }
  }

  if (hasActiveMembership) {
    return {
      headerPrimary: { kind: 'link', label: 'Go to home', to: '/home' },
      heroPrimary: { kind: 'link', label: 'Go to member home', to: '/home' },
      heroSecondary: { kind: 'link', label: 'Review plans', to: '#plans' },
      planAction: { label: 'Compare plans', to: '/plans', variant: 'secondary' },
    }
  }

  if (membershipLoading) {
    return {
      headerPrimary: {
        kind: 'disabled',
        label: 'Checking membership',
        description: 'Your account status is loading.',
      },
      heroPrimary: {
        kind: 'disabled',
        label: 'Checking membership',
        description: 'We are loading your membership status before sending you forward.',
      },
      heroSecondary: { kind: 'link', label: 'See how it works', to: '#journey' },
      planAction: { label: 'View full plans', to: '/plans', variant: 'primary' },
    }
  }

  // Error fallback: loading is false, no active membership, and no error code set
  // (silent failure — no fetch result landed). Treat the user as a guest so the CTA
  // remains actionable rather than permanently disabled.
  if (membershipErrorCode === null) {
    return {
      headerPrimary: { kind: 'link', label: 'Create account', to: '/register' },
      heroPrimary: { kind: 'link', label: 'Join GymFlow', to: '/register' },
      heroSecondary: { kind: 'link', label: 'Browse plans', to: '#plans' },
      planAction: { label: 'Create account', to: '/register', variant: 'primary' },
    }
  }

  if (membershipErrorCode === 'NO_ACTIVE_MEMBERSHIP') {
    return {
      headerPrimary: { kind: 'link', label: 'Choose a plan', to: '/plans' },
      heroPrimary: { kind: 'link', label: 'View membership plans', to: '/plans' },
      heroSecondary: { kind: 'link', label: 'See how it works', to: '#journey' },
      planAction: { label: 'View full plans', to: '/plans', variant: 'primary' },
    }
  }

  return {
    headerPrimary: { kind: 'link', label: 'Choose a plan', to: '/plans' },
    heroPrimary: { kind: 'link', label: 'View membership plans', to: '/plans' },
    heroSecondary: { kind: 'link', label: 'See how it works', to: '#journey' },
    planAction: { label: 'View full plans', to: '/plans', variant: 'primary' },
  }
}
