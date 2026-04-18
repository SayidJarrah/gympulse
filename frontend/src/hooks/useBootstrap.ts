import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { getMyProfile } from '../api/profile'

export function useBootstrap() {
  const { isAuthenticated, setOnboardingCompletedAt } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) return
    getMyProfile()
      .then(profile => setOnboardingCompletedAt(profile.onboardingCompletedAt ?? null))
      .catch(() => setOnboardingCompletedAt(null))
  }, [isAuthenticated])
}
