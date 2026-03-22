/**
 * Maps backend error codes to user-facing messages for the membership plans feature.
 * All error codes defined in SDD Section 4 are handled here.
 */
export const PLAN_ERROR_MESSAGES: Record<string, string> = {
  INVALID_PRICE: 'Price must be greater than zero.',
  INVALID_DURATION: 'Duration must be at least one day.',
  INVALID_NAME: 'Plan name must not be blank.',
  INVALID_DESCRIPTION: 'Description must not be blank.',
  PLAN_NOT_FOUND: 'This plan could not be found.',
  PLAN_ALREADY_INACTIVE: 'This plan is already inactive.',
  PLAN_ALREADY_ACTIVE: 'This plan is already active.',
  PLAN_HAS_ACTIVE_SUBSCRIBERS:
    'Cannot change the price while members are subscribed to this plan.',
  PLAN_EDIT_CONFLICT:
    'Another admin updated this plan at the same time. Please reload and try again.',
  ACCESS_DENIED: 'You do not have permission to perform this action.',
  INVALID_STATUS_FILTER: 'Invalid status filter. Use ACTIVE or INACTIVE.',
}

/**
 * Returns the user-facing message for a backend error code.
 * Falls back to the raw error message from the response if the code is unknown.
 */
export function getPlanErrorMessage(code: string, fallback?: string): string {
  return PLAN_ERROR_MESSAGES[code] ?? fallback ?? 'An unexpected error occurred.'
}

/**
 * Field-level error codes that map to specific form fields in PlanForm.
 * These are displayed inline under their respective input rather than
 * in the server error banner.
 */
export const FIELD_ERROR_CODES: Record<string, keyof import('../types/membershipPlan').MembershipPlanRequest> = {
  INVALID_NAME: 'name',
  INVALID_DESCRIPTION: 'description',
  INVALID_PRICE: 'priceInCents',
  INVALID_DURATION: 'durationDays',
}
