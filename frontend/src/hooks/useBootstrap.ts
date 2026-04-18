import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { getMyProfile } from '../api/profile'

export function useBootstrap() {
  const { isAuthenticated, setOnboardingCompletedAt, setBootstrapLoading } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) return
    setBootstrapLoading(true)
    getMyProfile()
      .then(profile => setOnboardingCompletedAt(profile.onboardingCompletedAt ?? null))
      .catch(() => setOnboardingCompletedAt(null))
      .finally(() => setBootstrapLoading(false))
  }, [isAuthenticated])
}
