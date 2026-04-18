import { useCallback, useEffect, useState } from 'react'
import { getClassAttendees } from '../api/bookings'
import type { AdminAttendeeListResponse } from '../types/booking'
import { getBookingErrorMessage } from '../utils/errorMessages'

interface UseClassAttendeesParams {
  status?: string;
  page?: number;
  size?: number;
}

interface UseClassAttendeesResult {
  data: AdminAttendeeListResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Read-only admin fetch of the attendee list for a class instance.
 * Exposed as a one-shot hook (not a store slice) per SDD Section 5.
 */
export function useClassAttendees(
  classId: string | null,
  params: UseClassAttendeesParams = {}
): UseClassAttendeesResult {
  const [data, setData] = useState<AdminAttendeeListResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const { status, page, size } = params

  const load = useCallback(async () => {
    if (!classId) return
    setIsLoading(true)
    setError(null)
    try {
      const response = await getClassAttendees(classId, {
        status: (status as 'ALL' | 'CONFIRMED' | 'CANCELLED' | 'ATTENDED' | undefined) ?? undefined,
        page,
        size,
      })
      setData(response)
    } catch (err) {
      const errorResponse = err as { response?: { data?: { code?: string } } }
      const code = errorResponse.response?.data?.code
      setError(getBookingErrorMessage(code, 'Could not load attendees.'))
    } finally {
      setIsLoading(false)
    }
  }, [classId, status, page, size])

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
