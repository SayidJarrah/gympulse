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
  ALREADY_BOOKED: 'You already booked this class.',
  CLASS_ALREADY_STARTED:
    'Booking is no longer available because this class has already started.',
  CLASS_NOT_BOOKABLE: 'This class is no longer open for booking.',
  CANCELLATION_WINDOW_CLOSED: 'You can no longer cancel within 3 hours of class start.',
  BOOKING_NOT_ACTIVE: 'This booking can no longer be cancelled.',
  ACCESS_DENIED: 'Only admins can book on behalf of a member.',
}

export function getErrorMessage(code?: string, fallback?: string): string {
  if (!code) return fallback ?? 'Something went wrong. Please try again.'
  return ERROR_MESSAGES[code] ?? fallback ?? 'Something went wrong. Please try again.'
}

export function getBookingErrorMessage(code?: string, fallback?: string): string {
  if (!code) return fallback ?? 'Something went wrong. Please try again.'
  return BOOKING_ERROR_MESSAGES[code] ?? fallback ?? 'Something went wrong. Please try again.'
}
