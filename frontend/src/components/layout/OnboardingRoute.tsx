import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useOnboardingStore } from '../../store/onboardingStore'

interface OnboardingRouteProps {
  children: ReactNode
}

/**
 * Guard for the /onboarding route.
 *
 * SDD §4.1 (unified-signup):
 * - **Guest (unauthenticated)** → render the wizard. The wizard starts at
 *   the credentials step. The unified-signup flow makes /onboarding the
 *   single entry point for new accounts.
 * - **Authenticated, bootstrap loading** → spinner (Lesson 11 — never
 *   redirect on async-derived state until the fetch resolves).
 * - **Authenticated, onboarding complete** → /home, EXCEPT when the wizard
 *   is currently on the Done step (lets the user read it and click "Enter
 *   GymFlow →").
 * - **Authenticated, onboarding incomplete** → render the wizard.
 */
const BootstrapSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent" />
  </div>
)

export function OnboardingRoute({ children }: OnboardingRouteProps) {
  const { isAuthenticated, onboardingCompletedAt, bootstrapLoading } = useAuthStore()
  const currentStep = useOnboardingStore(s => s.currentStep)

  // Wait for bootstrap fetch to resolve before deciding (Lesson 11).
  // Only matters when isAuthenticated is true; for guests bootstrap never runs.
  if (isAuthenticated && bootstrapLoading) return <BootstrapSpinner />

  // Guest path: render the wizard (unified-signup AC-01).
  if (!isAuthenticated) return <>{children}</>

  // Allow the Done screen to render — the user navigates to /home via the
  // "Enter GymFlow →" button, not via this guard. Without this exception the
  // route would redirect immediately after onboardingCompletedAt is set,
  // before Done ever mounts (regardless of setTimeout timing).
  if (onboardingCompletedAt !== null && currentStep !== 'done') {
    return <Navigate to="/home" replace />
  }

  return <>{children}</>
}
