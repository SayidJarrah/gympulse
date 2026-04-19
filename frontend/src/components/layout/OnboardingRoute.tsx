import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useOnboardingStore } from '../../store/onboardingStore'

interface OnboardingRouteProps {
  children: ReactNode
}

/**
 * Guard for the /onboarding route.
 * - Not authenticated → redirect to /login
 * - Authenticated and onboarding already completed → redirect to /home
 *   EXCEPT when currentStep === 'done': the Done screen must render so the
 *   user can read it and click "Enter GymFlow →". The auth store update
 *   (onboardingCompletedAt) is set synchronously after advance(), so without
 *   this guard the route would redirect before Done ever mounts.
 * - Authenticated and onboarding not complete → render children
 */
const BootstrapSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent" />
  </div>
)

export function OnboardingRoute({ children }: OnboardingRouteProps) {
  const { isAuthenticated, onboardingCompletedAt, bootstrapLoading } = useAuthStore()
  const currentStep = useOnboardingStore(s => s.currentStep)

  if (!isAuthenticated) return <Navigate to="/login" replace />

  // Wait for bootstrap fetch to resolve before making redirect decisions
  if (bootstrapLoading) return <BootstrapSpinner />

  // Allow the Done screen to render — the user navigates to /home via the
  // "Enter GymFlow →" button, not via this guard. Without this exception the
  // route would redirect immediately after onboardingCompletedAt is set,
  // before Done ever mounts (regardless of setTimeout timing).
  if (onboardingCompletedAt !== null && currentStep !== 'done') {
    return <Navigate to="/home" replace />
  }

  return <>{children}</>
}
