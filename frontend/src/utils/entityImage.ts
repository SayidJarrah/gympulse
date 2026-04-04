const ENTITY_IMAGE_ERROR_MESSAGES: Record<string, string> = {
  IMAGE_REQUIRED: 'Select an image before uploading.',
  INVALID_IMAGE_FORMAT: 'File must be JPEG, PNG or WEBP.',
  IMAGE_TOO_LARGE: 'File exceeds the 5 MB limit.',
  IMAGE_NOT_FOUND: 'No image is available.',
  TRAINER_NOT_FOUND: 'Trainer not found.',
  ROOM_NOT_FOUND: 'Room not found.',
  CLASS_TEMPLATE_NOT_FOUND: 'Class template not found.',
}

export function getEntityImageErrorMessage(code: string, fallback: string): string {
  if (!code) {
    return fallback
  }

  return ENTITY_IMAGE_ERROR_MESSAGES[code] ?? fallback
}

export function revokeObjectUrl(value: string | null) {
  if (value?.startsWith('blob:')) {
    URL.revokeObjectURL(value)
  }
}
