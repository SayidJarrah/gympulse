export type TimeBlock = 'MORNING' | 'AFTERNOON' | 'EVENING';

export type DayOfWeek =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export type AvailabilityPreview = Record<DayOfWeek, TimeBlock[]>;

export interface TrainerDiscoveryResponse {
  id: string;
  firstName: string;
  lastName: string;
  profilePhotoUrl: string | null;
  specializations: string[];
  experienceYears: number | null;
  classCount: number;
  isFavorited: boolean;
}

export interface TrainerProfileResponse extends TrainerDiscoveryResponse {
  bio: string | null;
  availabilityPreview: AvailabilityPreview;
}

export interface TrainerFavoriteResponse {
  trainerId: string;
  firstName: string;
  lastName: string;
}

export interface PaginatedTrainerDiscoveryResponse {
  content: TrainerDiscoveryResponse[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export type TrainerDiscoverySortOption =
  | 'lastName,asc'
  | 'lastName,desc'
  | 'experienceYears,asc'
  | 'experienceYears,desc';
