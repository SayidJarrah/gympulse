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
export function AuthRoute({ children }: AuthRouteProps) {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
