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
  INVALID_EMERGENCY_CONTACT:
    'Emergency contact requires a valid name (up to 100 characters) and phone (up to 30 characters).',
  INVALID_BIO_FORMAT: 'Use plain text only — no HTML, markdown, or special characters.',
  IMAGE_REQUIRED: 'Select an image before uploading.',
  INVALID_IMAGE_FORMAT: 'File must be JPEG, PNG or WEBP.',
  IMAGE_TOO_LARGE: 'File exceeds the 5 MB limit.',
  IMAGE_NOT_FOUND: 'No profile photo is available.',
  ACCESS_DENIED: 'You do not have permission to view this profile.',
}

export function getProfileErrorMessage(code: string, fallback: string): string {
  if (!code) {
    return fallback
  }

  return PROFILE_ERROR_MESSAGES[code] ?? fallback
}
