import { useCallback, useEffect, useState } from 'react'
import type { AxiosError } from 'axios'
import { getMyFavoriteTrainers } from '../api/trainerDiscovery'
import type {
  PaginatedTrainerDiscoveryResponse,
  TrainerDiscoveryResponse,
  TrainerDiscoverySortOption,
} from '../types/trainerDiscovery'
import { getErrorMessage, type ApiErrorPayload } from '../utils/errorMessages'

interface UseTrainerFavoritesResult {
  trainers: TrainerDiscoveryResponse[];
  totalPages: number;
  totalElements: number;
  page: number;
  size: number;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useTrainerFavorites(params: {
  sort: TrainerDiscoverySortOption;
  page: number;
  size: number;
}): UseTrainerFavoritesResult {
  const [trainers, setTrainers] = useState<TrainerDiscoveryResponse[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFavorites = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data: PaginatedTrainerDiscoveryResponse = await getMyFavoriteTrainers({
        sort: params.sort,
        page: params.page,
        size: params.size,
      })
      setTrainers(data.content)
      setTotalPages(data.totalPages)
      setTotalElements(data.totalElements)
      setPage(data.number)
      setSize(data.size)
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorPayload>
      const code = axiosError.response?.data?.code
      setError(getErrorMessage(code, 'Could not load favorites. Please try again.'))
    } finally {
      setLoading(false)
    }
  }, [params.page, params.size, params.sort])

  useEffect(() => {
    void fetchFavorites()
  }, [fetchFavorites])

  return {
    trainers,
    totalPages,
    totalElements,
    page,
    size,
    loading,
    error,
    reload: fetchFavorites,
  }
}
