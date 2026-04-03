import type { ClassCategory, ClassTemplateResponse } from '../types/scheduler'

const SEEDED_IMAGE_BY_NAME: Record<string, string> = {
  'HIIT Bootcamp':
    'https://images.unsplash.com/photo-1517960413843-0aee8e2b3285?auto=format&fit=crop&w=1200&q=80',
  'Yoga Flow':
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
  'Spin Cycle':
    'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1200&q=80',
  'Strength & Conditioning':
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80',
  'Pilates Core':
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80',
}

const CATEGORY_IMAGE: Record<ClassCategory, string> = {
  Cardio:
    'https://images.unsplash.com/photo-1517960413843-0aee8e2b3285?auto=format&fit=crop&w=1200&q=80',
  Strength:
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80',
  Flexibility:
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
  'Mind & Body':
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  Cycling:
    'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1200&q=80',
  Combat:
    'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1200&q=80',
  Dance:
    'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80',
  Functional:
    'https://images.unsplash.com/photo-1517838277536-f5f99be501b9?auto=format&fit=crop&w=1200&q=80',
  Aqua:
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  Wellness:
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80',
  Other:
    'https://images.unsplash.com/photo-1517838277536-f5f99be501b9?auto=format&fit=crop&w=1200&q=80',
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80'

interface TemplateArtworkSource {
  category: ClassCategory;
  isSeeded: boolean;
  name: string;
  photoUrl: string | null;
}

export function getClassTemplateArtwork(template: TemplateArtworkSource): string {
  if (template.photoUrl) {
    return template.photoUrl
  }

  if (template.isSeeded) {
    const seededImage = SEEDED_IMAGE_BY_NAME[template.name]
    if (seededImage) {
      return seededImage
    }
  }

  return CATEGORY_IMAGE[template.category] ?? FALLBACK_IMAGE
}

export function getClassTemplateArtworkFromResponse(template: ClassTemplateResponse): string {
  return getClassTemplateArtwork(template)
}
