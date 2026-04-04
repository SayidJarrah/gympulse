import type { GroupClassScheduleEntry } from '../types/groupClassSchedule'

export type ScheduleEntryPresentationState =
  | 'available'
  | 'booked'
  | 'cancellation-locked'
  | 'full'
  | 'membership-required'
  | 'unavailable';

export function getScheduleEntryPresentationState(
  entry: GroupClassScheduleEntry
): ScheduleEntryPresentationState {
  if (entry.currentUserBooking) {
    return entry.cancellationAllowed ? 'booked' : 'cancellation-locked'
  }

  if (entry.bookingDeniedReason === 'CLASS_FULL') {
    return 'full'
  }

  if (entry.bookingDeniedReason === 'MEMBERSHIP_REQUIRED') {
    return 'membership-required'
  }

  if (entry.bookingAllowed) {
    return 'available'
  }

  return 'unavailable'
}

export function getEntrySupportingCopy(entry: GroupClassScheduleEntry): string {
  const state = getScheduleEntryPresentationState(entry)

  switch (state) {
    case 'booked':
      return 'Your place is reserved.'
    case 'cancellation-locked':
      return 'Cancellation closes 3 hours before class start.'
    case 'full':
      return 'No spots left in this class.'
    case 'membership-required':
      return 'Active membership required to book.'
    case 'available':
      return `${formatRemainingSpots(entry.remainingSpots)} left`
    case 'unavailable':
      return 'Booking is not available for this class.'
    default:
      return 'Booking is not available for this class.'
  }
}

export function formatRemainingSpots(remainingSpots: number): string {
  return `${remainingSpots} spot${remainingSpots === 1 ? '' : 's'}`
}
