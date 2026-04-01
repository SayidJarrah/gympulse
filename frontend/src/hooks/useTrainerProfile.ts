import { useCallback, useEffect, useState } from 'react'
import type { AxiosError } from 'axios'
import { getTrainerProfile } from '../api/trainerDiscovery'
import type { TrainerProfileResponse } from '../types/trainerDiscovery'
import { getErrorMessage, type ApiErrorPayload } from '../utils/errorMessages'

interface UseTrainerProfileResult {
  profile: TrainerProfileResponse | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
  reload: () => void;
}

export function useTrainerProfile(id: string | undefined): UseTrainerProfileResult {
  const [profile, setProfile] = useState<TrainerProfileResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const fetchProfile = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    setNotFound(false)
    try {
      const data = await getTrainerProfile(id)
      setProfile(data)
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorPayload>
      const code = axiosError.response?.data?.code
      if (code === 'TRAINER_NOT_FOUND') {
        setNotFound(true)
      } else {
        setError(getErrorMessage(code, 'Could not load trainer profile. Please try again.'))
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void fetchProfile()
  }, [fetchProfile])

  return { profile, loading, error, notFound, reload: fetchProfile }
}
