import { create } from 'zustand'
import type { AxiosError } from 'axios'
import { cancelBooking, createBooking, getMyBookings } from '../api/bookings'
import type {
  BookingResponse,
  BookingStatus,
  PaginatedBookingsResponse,
} from '../types/booking'
import type { ApiErrorResponse } from '../types/auth'
import { getBookingErrorMessage } from '../utils/errorMessages'

interface FetchMyBookingsParams {
  status?: BookingStatus;
  page?: number;
  size?: number;
}

interface BookingState {
  myBookings: BookingResponse[];
  myBookingsTotalPages: number;
  myBookingsPage: number;
  myBookingsLoading: boolean;
  myBookingsError: string | null;
  fetchMyBookings: (params?: FetchMyBookingsParams) => Promise<void>;
  bookClass: (classId: string) => Promise<BookingResponse>;
  cancelUserBooking: (bookingId: string) => Promise<BookingResponse>;
  upsertBooking: (booking: BookingResponse) => void;
}

function sortBookings(bookings: BookingResponse[]): BookingResponse[] {
  return [...bookings].sort(
    (left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime()
  )
}

function mergeBooking(
  bookings: BookingResponse[],
  booking: BookingResponse
): BookingResponse[] {
  const withoutCurrent = bookings.filter((item) => item.id !== booking.id)
  return sortBookings([booking, ...withoutCurrent])
}

export const useBookingStore = create<BookingState>((set) => ({
  myBookings: [],
  myBookingsTotalPages: 0,
  myBookingsPage: 0,
  myBookingsLoading: false,
  myBookingsError: null,

  fetchMyBookings: async (params = {}) => {
    set({ myBookingsLoading: true, myBookingsError: null })
    try {
      const data: PaginatedBookingsResponse = await getMyBookings(params)
      set({
        myBookings: data.content,
        myBookingsTotalPages: data.totalPages,
        myBookingsPage: data.number,
        myBookingsLoading: false,
      })
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code ?? ''
      set({
        myBookingsLoading: false,
        myBookingsError: getBookingErrorMessage(code, 'Could not load your bookings right now.'),
      })
    }
  },

  bookClass: async (classId) => {
    const booking = await createBooking({ classId })
    set((state) => ({
      myBookings: mergeBooking(state.myBookings, booking),
    }))
    return booking
  },

  cancelUserBooking: async (bookingId) => {
    const booking = await cancelBooking(bookingId)
    set((state) => ({
      myBookings: mergeBooking(state.myBookings, booking),
    }))
    return booking
  },

  upsertBooking: (booking) =>
    set((state) => ({
      myBookings: mergeBooking(state.myBookings, booking),
    })),
}))
