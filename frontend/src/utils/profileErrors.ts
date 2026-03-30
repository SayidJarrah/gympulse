export const PROFILE_ERROR_MESSAGES: Record<string, string> = {
  READ_ONLY_FIELD: 'Email and account ownership fields cannot be changed here.',
  INVALID_FIRST_NAME: 'First name must be between 1 and 50 characters.',
  INVALID_LAST_NAME: 'Last name must be between 1 and 50 characters.',
  INVALID_PHONE: 'Enter a valid international phone number.',
  INVALID_DATE_OF_BIRTH: 'Enter a valid date of birth that is not in the future.',
  INVALID_FITNESS_GOALS:
    'Fitness goals must contain up to 5 items, each 1 to 50 characters long.',
  INVALID_PREFERRED_CLASS_TYPES:
    'Preferred class types must contain up to 5 items, each 1 to 50 characters long.',
  ACCESS_DENIED: 'You do not have permission to view this profile.',
}

export function getProfileErrorMessage(code: string, fallback: string): string {
  if (!code) {
    return fallback
  }

  return PROFILE_ERROR_MESSAGES[code] ?? fallback
}
