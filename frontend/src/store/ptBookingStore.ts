import { create } from 'zustand'
import type { AxiosError } from 'axios'
import {
  cancelPtBooking,
  createPtBooking,
  getAdminPtSessions,
  getAdminPtStats,
  getMyPtBookings,
  getPtAvailability,
  getPtTrainers,
  getTrainerSessions,
} from '../api/ptBookings'
import type {
  AdminPtFilters,
  AdminPtSession,
  AdminPtStats,
  PtBookingResponse,
  PtTrainerSummary,
  TrainerAvailability,
  TrainerScheduleResponse,
} from '../types/ptBooking'
import type { ApiErrorResponse } from '../types/auth'

interface PtBookingState {
  // Trainer directory
  trainers: PtTrainerSummary[]
  trainersLoading: boolean
  trainersError: string | null
  selectedSpecialty: string | null

  // Slot picker
  selectedTrainer: PtTrainerSummary | null
  availability: TrainerAvailability | null
  availabilityLoading: boolean
  availabilityError: string | null
  availabilityWeekOffset: number  // 0 = this week, 1 = next week

  // Confirm modal
  pendingSlot: { trainerId: string; startAt: string } | null
  bookingLoading: boolean
  bookingError: string | null

  // My upcoming PT bookings
  myPtBookings: PtBookingResponse[]
  myPtBookingsLoading: boolean
  myPtBookingsError: string | null

  // Trainer schedule
  trainerSchedule: TrainerScheduleResponse | null
  trainerScheduleLoading: boolean
  trainerScheduleError: string | null

  // Admin
  adminSessions: AdminPtSession[]
  adminSessionsTotal: number
  adminStats: AdminPtStats | null
  adminLoading: boolean
  adminError: string | null
  adminFilters: AdminPtFilters

  // Actions
  fetchTrainers: (specialty?: string) => Promise<void>
  selectTrainer: (trainer: PtTrainerSummary) => void
  clearSelectedTrainer: () => void
  setSelectedSpecialty: (specialty: string | null) => void
  fetchAvailability: (trainerId: string, start: string, end: string) => Promise<void>
  setWeekOffset: (offset: number) => void
  openConfirmModal: (slot: { trainerId: string; startAt: string }) => void
  closeConfirmModal: () => void
  confirmBooking: () => Promise<PtBookingResponse>
  fetchMyPtBookings: (status?: string) => Promise<void>
  cancelMyPtBooking: (id: string) => Promise<void>
  fetchTrainerSchedule: (start: string, end: string) => Promise<void>
  fetchAdminSessions: (filters?: Partial<AdminPtFilters>) => Promise<void>
  fetchAdminStats: () => Promise<void>
  setAdminFilters: (filters: Partial<AdminPtFilters>) => void
}

export const usePtBookingStore = create<PtBookingState>((set, get) => ({
  trainers: [],
  trainersLoading: false,
  trainersError: null,
  selectedSpecialty: null,

  selectedTrainer: null,
  availability: null,
  availabilityLoading: false,
  availabilityError: null,
  availabilityWeekOffset: 0,

  pendingSlot: null,
  bookingLoading: false,
  bookingError: null,

  myPtBookings: [],
  myPtBookingsLoading: false,
  myPtBookingsError: null,

  trainerSchedule: null,
  trainerScheduleLoading: false,
  trainerScheduleError: null,

  adminSessions: [],
  adminSessionsTotal: 0,
  adminStats: null,
  adminLoading: false,
  adminError: null,
  adminFilters: {},

  fetchTrainers: async (specialty) => {
    set({ trainersLoading: true, trainersError: null })
    try {
      const data = await getPtTrainers({ specialty })
      set({ trainers: data.content, trainersLoading: false })
    } catch (err) {
      const code = (err as AxiosError<ApiErrorResponse>).response?.data?.code ?? ''
      set({ trainersLoading: false, trainersError: getPtErrorMessage(code, 'Could not load trainers.') })
    }
  },

  selectTrainer: (trainer) => {
    set({ selectedTrainer: trainer, availability: null, availabilityWeekOffset: 0 })
  },

  clearSelectedTrainer: () => {
    set({ selectedTrainer: null, availability: null, pendingSlot: null, bookingError: null })
  },

  setSelectedSpecialty: (specialty) => {
    set({ selectedSpecialty: specialty })
  },

  fetchAvailability: async (trainerId, start, end) => {
    set({ availabilityLoading: true, availabilityError: null })
    try {
      const data = await getPtAvailability(trainerId, start, end)
      set({ availability: data, availabilityLoading: false })
    } catch (err) {
      const code = (err as AxiosError<ApiErrorResponse>).response?.data?.code ?? ''
      set({ availabilityLoading: false, availabilityError: getPtErrorMessage(code, 'Could not load availability.') })
    }
  },

  setWeekOffset: (offset) => {
    set({ availabilityWeekOffset: offset })
  },

  openConfirmModal: (slot) => {
    set({ pendingSlot: slot, bookingError: null })
  },

  closeConfirmModal: () => {
    set({ pendingSlot: null, bookingError: null })
  },

  confirmBooking: async () => {
    const { pendingSlot } = get()
    if (!pendingSlot) throw new Error('No pending slot')
    set({ bookingLoading: true, bookingError: null })
    try {
      const booking = await createPtBooking(pendingSlot)
      set((state) => ({
        bookingLoading: false,
        pendingSlot: null,
        myPtBookings: [booking, ...state.myPtBookings].sort(
          (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        ),
      }))
      return booking
    } catch (err) {
      const code = (err as AxiosError<ApiErrorResponse>).response?.data?.code ?? ''
      const message = getPtErrorMessage(code, 'Booking failed. Please try again.')
      set({ bookingLoading: false, bookingError: message })
      throw err
    }
  },

  fetchMyPtBookings: async (status) => {
    set({ myPtBookingsLoading: true, myPtBookingsError: null })
    try {
      const data = await getMyPtBookings({ status })
      set({
        myPtBookings: data.content,
        myPtBookingsLoading: false,
      })
    } catch (err) {
      const code = (err as AxiosError<ApiErrorResponse>).response?.data?.code ?? ''
      set({ myPtBookingsLoading: false, myPtBookingsError: getPtErrorMessage(code, 'Could not load your sessions.') })
    }
  },

  cancelMyPtBooking: async (id) => {
    await cancelPtBooking(id)
    set((state) => ({
      myPtBookings: state.myPtBookings.map((b) =>
        b.id === id ? { ...b, status: 'CANCELLED' as const, cancelledAt: new Date().toISOString() } : b
      ),
    }))
  },

  fetchTrainerSchedule: async (start, end) => {
    set({ trainerScheduleLoading: true, trainerScheduleError: null })
    try {
      const data = await getTrainerSessions(start, end)
      set({ trainerSchedule: data, trainerScheduleLoading: false })
    } catch (err) {
      const code = (err as AxiosError<ApiErrorResponse>).response?.data?.code ?? ''
      set({ trainerScheduleLoading: false, trainerScheduleError: getPtErrorMessage(code, 'Could not load schedule.') })
    }
  },

  fetchAdminSessions: async (filters) => {
    const mergedFilters = { ...get().adminFilters, ...filters }
    set({ adminLoading: true, adminError: null, adminFilters: mergedFilters })
    try {
      const data = await getAdminPtSessions(mergedFilters)
      set({ adminSessions: data.content, adminSessionsTotal: data.totalElements, adminLoading: false })
    } catch (err) {
      const code = (err as AxiosError<ApiErrorResponse>).response?.data?.code ?? ''
      set({ adminLoading: false, adminError: getPtErrorMessage(code, 'Could not load sessions.') })
    }
  },

  fetchAdminStats: async () => {
    try {
      const stats = await getAdminPtStats()
      set({ adminStats: stats })
    } catch {
      // non-fatal — stats tile shows 0
    }
  },

  setAdminFilters: (filters) => {
    set((state) => ({ adminFilters: { ...state.adminFilters, ...filters } }))
  },
}))

const PT_ERROR_MESSAGES: Record<string, string> = {
  PT_LEAD_TIME_VIOLATION: 'This slot is too soon. Book at least 24 hours in advance.',
  PT_TRAINER_OVERLAP: 'This slot is no longer available.',
  PT_TRAINER_CLASS_OVERLAP: 'The trainer has a class at this time.',
  PT_OUTSIDE_GYM_HOURS: 'That time is outside gym hours.',
  PT_BOOKING_NOT_FOUND: 'Booking not found. Please refresh.',
  PT_BOOKING_NOT_ACTIVE: 'This booking has already been cancelled.',
  MEMBERSHIP_REQUIRED: 'An active membership is required to book personal training.',
  TRAINER_NOT_FOUND: 'Trainer not found.',
}

function getPtErrorMessage(code: string, fallback: string): string {
  return PT_ERROR_MESSAGES[code] ?? fallback
}
