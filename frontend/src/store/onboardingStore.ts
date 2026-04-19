import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { StepKey } from '../types/onboarding'
import { useAuthStore } from './authStore'

export interface OnboardingState {
  // Current navigation position
  currentStep: StepKey

  // Form data
  firstName: string
  lastName: string
  phone: string          // raw US-formatted input, E.164 on submit
  dob: string            // YYYY-MM-DD
  goals: string[]        // from GOAL_OPTIONS ids
  classTypes: string[]   // from CLASS_OPTIONS ids
  frequency: string      // '1-2' | '3-4' | '5+' | 'unsure' | ''

  // Plan selection
  selectedPlanId: string | null
  selectedPlanName: string | null
  selectedPlanPriceInCents: number | null
  pendingMembershipId: string | null  // set after POST /onboarding/plan-pending succeeds

  // Booking selection
  bookingMode: 'class' | 'trainer'
  selectedClassInstanceId: string | null
  selectedTrainerId: string | null
  selectedTrainerSlot: string | null  // ISO 8601 datetime string of the slot start
  completedBookingId: string | null   // set after POST /bookings or POST /pt-bookings succeeds

  // Terms
  agreeTerms: boolean
  agreeWaiver: boolean
  notifBooking: boolean
  notifNews: boolean

  // Actions
  setStep: (step: StepKey) => void
  setProfileFields: (fields: Partial<Pick<OnboardingState, 'firstName' | 'lastName' | 'phone' | 'dob'>>) => void
  setPreferences: (fields: Partial<Pick<OnboardingState, 'goals' | 'classTypes' | 'frequency'>>) => void
  setPlan: (planId: string | null, planName: string | null, priceInCents: number | null) => void
  setPendingMembership: (membershipId: string | null) => void
  setBookingSelection: (mode: 'class' | 'trainer', classInstanceId: string | null, trainerId: string | null, slot: string | null) => void
  setCompletedBooking: (bookingId: string | null) => void
  setTerms: (fields: Partial<Pick<OnboardingState, 'agreeTerms' | 'agreeWaiver' | 'notifBooking' | 'notifNews'>>) => void
  reset: () => void
}

const defaultState = {
  currentStep: 'welcome' as StepKey,
  firstName: '',
  lastName: '',
  phone: '',
  dob: '',
  goals: [] as string[],
  classTypes: [] as string[],
  frequency: '',
  selectedPlanId: null,
  selectedPlanName: null,
  selectedPlanPriceInCents: null,
  pendingMembershipId: null,
  bookingMode: 'class' as const,
  selectedClassInstanceId: null,
  selectedTrainerId: null,
  selectedTrainerSlot: null,
  completedBookingId: null,
  agreeTerms: false,
  agreeWaiver: false,
  notifBooking: true,
  notifNews: false,
}

// GAP-05 fix: lazy storage adapter that computes the per-user key at read/write
// time — never at module load. At module evaluation, auth has not rehydrated
// yet, so useAuthStore.getState().user?.id is undefined. By deferring the key
// lookup into each storage method, we guarantee the correct user ID is used the
// first time Zustand actually reads or writes (well after auth rehydration).
const lazyStorageEngine = {
  getItem: (_name: string): string | null => {
    const userId = useAuthStore.getState().user?.id ?? 'anonymous'
    return localStorage.getItem(`gf:onboarding:v1:${userId}`)
  },
  setItem: (_name: string, value: string): void => {
    const userId = useAuthStore.getState().user?.id ?? 'anonymous'
    localStorage.setItem(`gf:onboarding:v1:${userId}`, value)
  },
  removeItem: (_name: string): void => {
    const userId = useAuthStore.getState().user?.id ?? 'anonymous'
    localStorage.removeItem(`gf:onboarding:v1:${userId}`)
  },
}
const lazyStorage = createJSONStorage(() => lazyStorageEngine)

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...defaultState,

      setStep: (step) => set({ currentStep: step }),

      setProfileFields: (fields) => set(fields),

      setPreferences: (fields) => set(fields),

      setPlan: (planId, planName, priceInCents) =>
        set({ selectedPlanId: planId, selectedPlanName: planName, selectedPlanPriceInCents: priceInCents }),

      setPendingMembership: (membershipId) =>
        set({ pendingMembershipId: membershipId }),

      setBookingSelection: (mode, classInstanceId, trainerId, slot) =>
        set({
          bookingMode: mode,
          selectedClassInstanceId: classInstanceId,
          selectedTrainerId: trainerId,
          selectedTrainerSlot: slot,
        }),

      setCompletedBooking: (bookingId) =>
        set({ completedBookingId: bookingId }),

      setTerms: (fields) => set(fields),

      reset: () => set(defaultState),
    }),
    {
      // Static name — ignored by lazyStorage (key is computed per-user inside
      // the adapter). Required by the persist middleware API.
      name: 'gf:onboarding:v1',
      storage: lazyStorage,
    }
  )
)
