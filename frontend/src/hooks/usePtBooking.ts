import { useEffect, useMemo } from 'react'
import { usePtBookingStore } from '../store/ptBookingStore'
import type { PtTrainerSummary } from '../types/ptBooking'

/** Formats a LocalDate (YYYY-MM-DD) for the availability window */
export function formatAvailabilityWindow(weekOffset: number): { start: string; end: string } {
  const today = new Date()
  const startDate = new Date(today)
  startDate.setDate(today.getDate() + weekOffset * 7)

  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 6)

  return {
    start: formatLocalDate(startDate),
    end: formatLocalDate(endDate),
  }
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function usePtTrainerDirectory() {
  const {
    trainers,
    trainersLoading,
    trainersError,
    selectedSpecialty,
    fetchTrainers,
    setSelectedSpecialty,
    selectTrainer,
  } = usePtBookingStore()

  useEffect(() => {
    fetchTrainers(selectedSpecialty ?? undefined)
  }, [fetchTrainers, selectedSpecialty])

  const allSpecialties = useMemo(() => {
    const set = new Set<string>()
    trainers.forEach((t) => t.specializations.forEach((s) => set.add(s)))
    return Array.from(set).sort()
  }, [trainers])

  const filteredTrainers: PtTrainerSummary[] = useMemo(() => {
    if (!selectedSpecialty) return trainers
    return trainers.filter((t) =>
      t.specializations.some((s) => s.toLowerCase() === selectedSpecialty.toLowerCase())
    )
  }, [trainers, selectedSpecialty])

  return {
    trainers: filteredTrainers,
    allSpecialties,
    trainersLoading,
    trainersError,
    selectedSpecialty,
    setSelectedSpecialty,
    selectTrainer,
  }
}

export function usePtSlotPicker() {
  const {
    selectedTrainer,
    availability,
    availabilityLoading,
    availabilityError,
    availabilityWeekOffset,
    pendingSlot,
    bookingLoading,
    bookingError,
    clearSelectedTrainer,
    fetchAvailability,
    setWeekOffset,
    openConfirmModal,
    closeConfirmModal,
    confirmBooking,
  } = usePtBookingStore()

  useEffect(() => {
    if (!selectedTrainer) return
    const { start, end } = formatAvailabilityWindow(availabilityWeekOffset)
    fetchAvailability(selectedTrainer.id, start, end)
  }, [selectedTrainer, availabilityWeekOffset, fetchAvailability])

  const canGoBack = availabilityWeekOffset > 0
  const canGoForward = availabilityWeekOffset < 1  // max 14 days = 2 weeks

  return {
    selectedTrainer,
    availability,
    availabilityLoading,
    availabilityError,
    availabilityWeekOffset,
    pendingSlot,
    bookingLoading,
    bookingError,
    clearSelectedTrainer,
    setWeekOffset,
    openConfirmModal,
    closeConfirmModal,
    confirmBooking,
    canGoBack,
    canGoForward,
  }
}

export function useMyPtBookings() {
  const { myPtBookings, myPtBookingsLoading, myPtBookingsError, fetchMyPtBookings, cancelMyPtBooking } =
    usePtBookingStore()

  useEffect(() => {
    fetchMyPtBookings('CONFIRMED')
  }, [fetchMyPtBookings])

  const upcoming = myPtBookings.filter(
    (b) => b.status === 'CONFIRMED' && new Date(b.startAt) > new Date()
  )

  return { upcoming, myPtBookingsLoading, myPtBookingsError, cancelMyPtBooking }
}
