export interface ApiErrorPayload {
  error: string;
  code: string;
}

export const ERROR_MESSAGES: Record<string, string> = {
  INVALID_SORT_FIELD: 'Invalid sort selection. Please refresh the page.',
  TRAINER_NOT_FOUND: 'Trainer not found.',
  MEMBERSHIP_REQUIRED: 'An active membership is required to save favorites.',
  ALREADY_FAVORITED: 'Trainer is already in your favorites.',
  FAVORITE_NOT_FOUND: 'Favorite not found.',
  ACCESS_DENIED: 'You do not have permission to perform this action.',
}

export const BOOKING_ERROR_MESSAGES: Record<string, string> = {
  MEMBERSHIP_REQUIRED: 'Active membership required to book.',
  CLASS_FULL: 'This class is fully booked.',
  CLASS_ALREADY_STARTED: 'Booking is closed — this class has already started.',
  CLASS_NOT_BOOKABLE: 'This class is no longer open for booking.',
  CANCELLATION_WINDOW_CLOSED: 'You can no longer cancel within 2 hours of class start.',
  BOOKING_NOT_ACTIVE: 'This booking can no longer be cancelled.',
  BOOKING_NOT_FOUND: 'Booking not found. Please refresh.',
  NOT_FOUND: 'Booking not found. Please refresh.',
  ACCESS_DENIED: 'You do not have permission to perform this action.',
  USER_NOT_FOUND: 'Member not found. They may have been removed.',
  CLASS_INSTANCE_NOT_FOUND: 'This class instance no longer exists.',
}

export function getErrorMessage(code?: string, fallback?: string): string {
  if (!code) return fallback ?? 'Something went wrong. Please try again.'
  return ERROR_MESSAGES[code] ?? fallback ?? 'Something went wrong. Please try again.'
}

export function getBookingErrorMessage(code?: string, fallback?: string): string {
  if (!code) return fallback ?? 'Something went wrong. Please try again.'
  return BOOKING_ERROR_MESSAGES[code] ?? fallback ?? 'Something went wrong. Please try again.'
}

export const PT_BOOKING_ERROR_MESSAGES: Record<string, string> = {
  PT_LEAD_TIME_VIOLATION: 'This slot is too soon. Book at least 24 hours in advance.',
  PT_TRAINER_OVERLAP: 'This slot is no longer available.',
  PT_TRAINER_CLASS_OVERLAP: 'The trainer has a class at this time.',
  PT_OUTSIDE_GYM_HOURS: 'That time is outside gym hours.',
  PT_BOOKING_NOT_FOUND: 'Booking not found. Please refresh.',
  PT_BOOKING_NOT_ACTIVE: 'This booking has already been cancelled.',
  MEMBERSHIP_REQUIRED: 'An active membership is required to book personal training.',
  TRAINER_NOT_FOUND: 'Trainer not found.',
}

export function getPtBookingErrorMessage(code?: string, fallback?: string): string {
  if (!code) return fallback ?? 'Something went wrong. Please try again.'
  return PT_BOOKING_ERROR_MESSAGES[code] ?? fallback ?? 'Something went wrong. Please try again.'
}
