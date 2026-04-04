import axiosInstance from './axiosInstance'
import type {
  AdminBookingMemberSummaryResponse,
  AdminBookingRequest,
  BookingRequest,
  BookingResponse,
  BookingStatus,
  PaginatedBookingsResponse,
  SearchBookingMembersParams,
} from '../types/booking'

export async function createBooking(req: BookingRequest): Promise<BookingResponse> {
  const response = await axiosInstance.post<BookingResponse>('/bookings', req)
  return response.data
}

export async function getMyBookings(params: {
  status?: BookingStatus;
  page?: number;
  size?: number;
} = {}): Promise<PaginatedBookingsResponse> {
  const response = await axiosInstance.get<PaginatedBookingsResponse>('/bookings/me', {
    params: {
      ...(params.status ? { status: params.status } : {}),
      page: params.page ?? 0,
      size: params.size ?? 20,
    },
  })
  return response.data
}

export async function cancelBooking(bookingId: string): Promise<BookingResponse> {
  const response = await axiosInstance.delete<BookingResponse>(`/bookings/${bookingId}`)
  return response.data
}

export async function adminCreateBooking(
  req: AdminBookingRequest
): Promise<BookingResponse> {
  const response = await axiosInstance.post<BookingResponse>('/admin/bookings', req)
  return response.data
}

export async function searchBookingMembers(
  params: SearchBookingMembersParams = {}
): Promise<{
  content: AdminBookingMemberSummaryResponse[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}> {
  const response = await axiosInstance.get<{
    content: AdminBookingMemberSummaryResponse[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
  }>('/admin/booking-members', {
    params: {
      ...(params.query !== undefined ? { query: params.query } : {}),
      page: params.page ?? 0,
      size: params.size ?? 10,
    },
  })
  return response.data
}
