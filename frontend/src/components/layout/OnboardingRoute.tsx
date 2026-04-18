import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthStore } from '../../store/authStore'

interface OnboardingRouteProps {
  children: ReactNode
}

/**
 * Guard for the /onboarding route.
 * - Not authenticated → redirect to /login
 * - Authenticated and onboarding already completed → redirect to /home
 * - Authenticated and onboarding not complete → render children
 */
export function OnboardingRoute({ children }: OnboardingRouteProps) {
  const { isAuthenticated, onboardingCompletedAt } = useAuthStore()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (onboardingCompletedAt !== null) return <Navigate to="/home" replace />

  return <>{children}</>
}
