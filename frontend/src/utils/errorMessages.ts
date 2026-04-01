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

export function getErrorMessage(code?: string, fallback?: string): string {
  if (!code) return fallback ?? 'Something went wrong. Please try again.'
  return ERROR_MESSAGES[code] ?? fallback ?? 'Something went wrong. Please try again.'
}
