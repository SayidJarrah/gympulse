import { useEffect, useState } from 'react'
import type { AxiosError } from 'axios'
import { getMemberHomeClassesPreview } from '../api/memberHome'
import { useScheduleTimeZone } from './useScheduleTimeZone'
import type { ApiErrorResponse } from '../types/auth'
import type { MemberHomeClassPreviewResponse } from '../types/memberHome'
import { getErrorMessage } from '../utils/errorMessages'

interface UseMemberHomeClassesPreviewResult {
  data: MemberHomeClassPreviewResponse | null;
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  timeZone: string;
  retry: () => Promise<void>;
}

export function useMemberHomeClassesPreview(): UseMemberHomeClassesPreviewResult {
  const timeZone = useScheduleTimeZone()
  const [data, setData] = useState<MemberHomeClassPreviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)

  const loadPreview = async () => {
    setLoading(true)
    setError(null)
    setErrorCode(null)

    try {
      const nextData = await getMemberHomeClassesPreview({ timeZone })
      setData(nextData)
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code ?? null
      setErrorCode(code)
      setError(getErrorMessage(code ?? undefined, 'Could not load upcoming classes right now.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPreview()
  }, [timeZone])

  return {
    data,
    loading,
    error,
    errorCode,
    timeZone,
    retry: loadPreview,
  }
}
