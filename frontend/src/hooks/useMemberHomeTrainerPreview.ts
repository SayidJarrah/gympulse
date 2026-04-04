import { useEffect, useState } from 'react'
import type { AxiosError } from 'axios'
import { getMemberHomeTrainerPreview } from '../api/memberHome'
import type { ApiErrorResponse } from '../types/auth'
import type { TrainerDiscoveryResponse } from '../types/trainerDiscovery'
import { getErrorMessage } from '../utils/errorMessages'

interface UseMemberHomeTrainerPreviewResult {
  data: TrainerDiscoveryResponse[];
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  retry: () => Promise<void>;
}

export function useMemberHomeTrainerPreview(): UseMemberHomeTrainerPreviewResult {
  const [data, setData] = useState<TrainerDiscoveryResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)

  const loadPreview = async () => {
    setLoading(true)
    setError(null)
    setErrorCode(null)

    try {
      const nextData = await getMemberHomeTrainerPreview()
      setData(nextData)
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code ?? null
      setErrorCode(code)
      setError(getErrorMessage(code ?? undefined, 'Could not load trainers right now.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPreview()
  }, [])

  return {
    data,
    loading,
    error,
    errorCode,
    retry: loadPreview,
  }
}
