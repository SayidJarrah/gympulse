import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthStore } from '../../store/authStore'

interface AuthRouteProps {
  children: ReactNode;
}

/**
 * Client-side authenticated route guard.
 * Redirects unauthenticated users to /login.
 * Note: this is a UI convenience only — the server enforces real authorization via Spring Security.
 */
const BootstrapSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent" />
  </div>
)

export function AuthRoute({ children }: AuthRouteProps) {
  const { isAuthenticated, user, onboardingCompletedAt, bootstrapLoading } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Wait for bootstrap fetch to resolve before making redirect decisions
  if (bootstrapLoading) {
    return <BootstrapSpinner />
  }

  // Gate: USER role must complete onboarding before accessing member routes
  // TRAINER and ADMIN roles bypass the onboarding gate (SDD Assumption A5)
  if (user?.role === 'USER' && onboardingCompletedAt === null) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}
