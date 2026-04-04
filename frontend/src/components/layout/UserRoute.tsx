import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthStore } from '../../store/authStore'

interface UserRouteProps {
  children: ReactNode;
}

/**
 * Client-side member route guard.
 * Redirects unauthenticated users to /login and admins to /admin/plans.
 * Note: this is a UI convenience only — the server enforces real authorization via Spring Security.
 */
export function UserRoute({ children }: UserRouteProps) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'USER') {
    return <Navigate to="/admin/plans" replace />
  }

  return <>{children}</>
}
