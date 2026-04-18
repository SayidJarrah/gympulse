import { useCallback, useEffect, useState } from 'react'
import { getAdminUserBookings } from '../api/bookings'
import type { PaginatedAdminUserBookingHistoryResponse } from '../types/booking'
import { getBookingErrorMessage } from '../utils/errorMessages'

interface UseAdminUserBookingsParams {
  status?: string;
  page?: number;
  size?: number;
}

interface UseAdminUserBookingsResult {
  data: PaginatedAdminUserBookingHistoryResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Read-only admin fetch of a specific member's booking history.
 * Exposed as a one-shot hook (not a store slice) per SDD Section 5
 * to keep member-facing booking state isolated from admin surfaces.
 */
export function useAdminUserBookings(
  userId: string | null,
  params: UseAdminUserBookingsParams = {}
): UseAdminUserBookingsResult {
  const [data, setData] = useState<PaginatedAdminUserBookingHistoryResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const { status, page, size } = params

  const load = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    setError(null)
    try {
      const response = await getAdminUserBookings(userId, {
        status: (status as 'ALL' | 'CONFIRMED' | 'CANCELLED' | 'ATTENDED' | undefined) ?? undefined,
        page,
        size,
      })
      setData(response)
    } catch (err) {
      const errorResponse = err as { response?: { data?: { code?: string } } }
      const code = errorResponse.response?.data?.code
      setError(getBookingErrorMessage(code, 'Could not load booking history.'))
    } finally {
      setIsLoading(false)
    }
  }, [userId, status, page, size])

  useEffect(() => {
    void load()
  }, [load])

  return {
    data,
    isLoading,
    error,
    refetch: () => {
      void load()
    },
  }
}
