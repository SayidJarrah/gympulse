import axiosInstance from './axiosInstance'
import type {
  AdminPtFilters,
  AdminPtSession,
  AdminPtStats,
  PtBookingRequest,
  PtBookingResponse,
  PtPage,
  PtTrainerSummary,
  TrainerAvailability,
  TrainerScheduleResponse,
} from '../types/ptBooking'

/**
 * Fetch the list of PT trainers for member-facing use (onboarding, trainer discovery).
 * Uses the `/trainers/pt` endpoint without admin scope.
 */
export async function getPtTrainers(params: {
  specialty?: string
  page?: number
  size?: number
} = {}): Promise<PtPage<PtTrainerSummary>> {
  const response = await axiosInstance.get<PtPage<PtTrainerSummary>>('/trainers/pt', {
    params: {
      ...(params.specialty ? { specialty: params.specialty } : {}),
      page: params.page ?? 0,
      size: params.size ?? 50,
    },
  })
  return response.data
}

export async function getPtAvailability(
  trainerId: string,
  start: string,
  end: string
): Promise<TrainerAvailability> {
  const response = await axiosInstance.get<TrainerAvailability>(
    `/trainers/${trainerId}/pt-availability`,
    { params: { start, end } }
  )
  return response.data
}

/**
 * Fetch trainer PT availability without constraining to a date range.
 * Used in the onboarding booking step where the member just browses open slots.
 */
export async function getTrainerPtAvailabilityUnbounded(trainerId: string): Promise<TrainerAvailability> {
  const response = await axiosInstance.get<TrainerAvailability>(
    `/trainers/${trainerId}/pt-availability`
  )
  return response.data
}

export async function createPtBooking(body: PtBookingRequest): Promise<PtBookingResponse> {
  const response = await axiosInstance.post<PtBookingResponse>('/pt-bookings', body)
  return response.data
}

export async function cancelPtBooking(id: string): Promise<PtBookingResponse> {
  const response = await axiosInstance.delete<PtBookingResponse>(`/pt-bookings/${id}`)
  return response.data
}

export async function getMyPtBookings(params: {
  status?: string
  page?: number
  size?: number
} = {}): Promise<PtPage<PtBookingResponse>> {
  const response = await axiosInstance.get<PtPage<PtBookingResponse>>('/pt-bookings/me', {
    params: {
      ...(params.status ? { status: params.status } : {}),
      page: params.page ?? 0,
      size: params.size ?? 20,
    },
  })
  return response.data
}

export async function getTrainerSessions(
  start: string,
  end: string
): Promise<TrainerScheduleResponse> {
  const response = await axiosInstance.get<TrainerScheduleResponse>(
    '/trainers/me/pt-sessions',
    { params: { start, end } }
  )
  return response.data
}

export async function getAdminPtSessions(
  filters: AdminPtFilters = {}
): Promise<PtPage<AdminPtSession>> {
  const response = await axiosInstance.get<PtPage<AdminPtSession>>(
    '/admin/pt-sessions',
    {
      params: {
        ...(filters.trainerId ? { trainerId: filters.trainerId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.start ? { start: filters.start } : {}),
        ...(filters.end ? { end: filters.end } : {}),
        ...(filters.q ? { q: filters.q } : {}),
        page: filters.page ?? 0,
        size: filters.size ?? 20,
      },
    }
  )
  return response.data
}

export async function getAdminPtStats(): Promise<AdminPtStats> {
  const response = await axiosInstance.get<AdminPtStats>('/admin/pt-sessions/stats')
  return response.data
}

export async function exportAdminPtSessions(filters: AdminPtFilters = {}): Promise<Blob> {
  const response = await axiosInstance.get('/admin/pt-sessions/export', {
    params: {
      ...(filters.trainerId ? { trainerId: filters.trainerId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.start ? { start: filters.start } : {}),
      ...(filters.end ? { end: filters.end } : {}),
      ...(filters.q ? { q: filters.q } : {}),
    },
    responseType: 'blob',
  })
  return response.data
}
