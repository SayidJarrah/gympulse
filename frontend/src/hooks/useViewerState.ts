import { useEffect, useState } from 'react'
import { fetchViewerState } from '../api/landing'
import type { ViewerStateResponse } from '../types/landing'

interface UseViewerStateResult {
  data: ViewerStateResponse | null;
  loading: boolean;
  error: string | null;
}

export function useViewerState(): UseViewerStateResult {
  const [data, setData] = useState<ViewerStateResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await fetchViewerState()
        if (!cancelled) setData(result)
      } catch {
        if (!cancelled) setError('Unable to load viewer state.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  return { data, loading, error }
}
