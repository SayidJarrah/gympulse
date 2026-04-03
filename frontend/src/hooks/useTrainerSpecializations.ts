import { useCallback, useEffect, useState } from 'react'
import type { AxiosError } from 'axios'
import { getDistinctSpecializations } from '../api/trainerDiscovery'
import { getErrorMessage, type ApiErrorPayload } from '../utils/errorMessages'

interface UseTrainerSpecializationsResult {
  specializations: string[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useTrainerSpecializations(): UseTrainerSpecializationsResult {
  const [specializations, setSpecializations] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSpecializations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const values = await getDistinctSpecializations()
      setSpecializations(values)
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorPayload>
      const code = axiosError.response?.data?.code
      setError(getErrorMessage(code, 'Could not load filters. Please try again.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchSpecializations()
  }, [fetchSpecializations])

  return { specializations, loading, error, reload: fetchSpecializations }
}
