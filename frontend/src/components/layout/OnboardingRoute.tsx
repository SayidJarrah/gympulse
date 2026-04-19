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
const BootstrapSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent" />
  </div>
)

export function OnboardingRoute({ children }: OnboardingRouteProps) {
  const { isAuthenticated, onboardingCompletedAt, bootstrapLoading } = useAuthStore()

  if (!isAuthenticated) return <Navigate to="/login" replace />

  // Wait for bootstrap fetch to resolve before making redirect decisions
  if (bootstrapLoading) return <BootstrapSpinner />

  if (onboardingCompletedAt !== null) return <Navigate to="/home" replace />

  return <>{children}</>
}
