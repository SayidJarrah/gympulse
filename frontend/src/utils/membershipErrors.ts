/**
 * Maps backend error codes to user-facing messages for the user membership feature.
 * All error codes defined in SDD Section 4 are handled here.
 */
export const MEMBERSHIP_ERROR_MESSAGES: Record<string, string> = {
  MEMBERSHIP_ALREADY_ACTIVE:
    'You already have an active membership. Please cancel it before activating a new one.',
  NO_ACTIVE_MEMBERSHIP: 'You do not have an active membership.',
  MEMBERSHIP_NOT_FOUND: 'This membership record could not be found.',
  MEMBERSHIP_NOT_ACTIVE: 'This membership is already cancelled or expired.',
  PLAN_NOT_FOUND: 'This plan could not be found.',
  PLAN_NOT_AVAILABLE: 'This plan is no longer available for purchase.',
  INVALID_PLAN_ID: 'A valid plan must be selected.',
  INVALID_STATUS_FILTER:
    'Invalid status filter. Use ACTIVE, CANCELLED, or EXPIRED.',
  ACCESS_DENIED: 'You do not have permission to perform this action.',
}

/**
 * Returns the user-facing message for a backend error code.
 * Falls back to the provided fallback string if the code is unknown,
 * or to a generic error message if no fallback is provided.
 */
export function getMembershipErrorMessage(code: string, fallback?: string): string {
  return (
    MEMBERSHIP_ERROR_MESSAGES[code] ??
    fallback ??
    'Something went wrong. Please try again.'
  )
}
