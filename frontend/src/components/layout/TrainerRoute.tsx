import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthStore } from '../../store/authStore'

interface TrainerRouteProps {
  children: ReactNode
}

/**
 * Client-side trainer route guard.
 * Redirects unauthenticated users to /login, non-trainers to /home.
 * Note: server enforces real authorization via @PreAuthorize("hasRole('TRAINER')").
 */
export function TrainerRoute({ children }: TrainerRouteProps) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'TRAINER') {
    return <Navigate to="/home" replace />
  }

  return <>{children}</>
}
