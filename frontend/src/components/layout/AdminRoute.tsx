import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthStore } from '../../store/authStore'

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * Client-side admin route guard.
 * Redirects non-admins to /plans.
 * Note: this is a UI convenience only — the server enforces real authorization via @PreAuthorize.
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return <Navigate to="/plans" replace />
  }

  return <>{children}</>
}
