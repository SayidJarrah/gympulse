import { useEffect, useState } from 'react'
import { fetchLandingStats } from '../api/landing'
import type { LandingStats } from '../types/landing'

interface UseLandingStatsResult {
  stats: LandingStats | null;
  loading: boolean;
}

export function useLandingStats(): UseLandingStatsResult {
  const [stats, setStats] = useState<LandingStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const result = await fetchLandingStats()
        if (!cancelled) setStats(result)
      } catch {
        // Stats failure is non-blocking
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  return { stats, loading }
}
