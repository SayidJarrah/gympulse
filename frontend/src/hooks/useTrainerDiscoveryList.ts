import { useCallback, useEffect, useState } from 'react'
import type { AxiosError } from 'axios'
import {
  listTrainers,
  type ListTrainersParams,
} from '../api/trainerDiscovery'
import type {
  PaginatedTrainerDiscoveryResponse,
  TrainerDiscoveryResponse,
} from '../types/trainerDiscovery'
import { getErrorMessage, type ApiErrorPayload } from '../utils/errorMessages'

interface UseTrainerDiscoveryListResult {
  trainers: TrainerDiscoveryResponse[];
  totalPages: number;
  totalElements: number;
  page: number;
  size: number;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useTrainerDiscoveryList(
  params: ListTrainersParams
): UseTrainerDiscoveryListResult {
  const {
    specialization,
    sort,
    page: requestedPage,
    size: requestedSize,
  } = params
  const [trainers, setTrainers] = useState<TrainerDiscoveryResponse[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data: PaginatedTrainerDiscoveryResponse = await listTrainers({
        specialization,
        sort,
        page: requestedPage,
        size: requestedSize,
      })
      setTrainers(data.content)
      setTotalPages(data.totalPages)
      setTotalElements(data.totalElements)
      setPage(data.number)
      setSize(data.size)
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorPayload>
      const code = axiosError.response?.data?.code
      setError(getErrorMessage(code, 'Could not load trainers. Please try again.'))
    } finally {
      setLoading(false)
    }
  }, [requestedPage, requestedSize, sort, specialization])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  return {
    trainers,
    totalPages,
    totalElements,
    page,
    size,
    loading,
    error,
    reload: fetchList,
  }
}
