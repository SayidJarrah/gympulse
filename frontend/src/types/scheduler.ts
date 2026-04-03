export type ClassCategory =
  | 'Cardio'
  | 'Strength'
  | 'Flexibility'
  | 'Mind & Body'
  | 'Cycling'
  | 'Combat'
  | 'Dance'
  | 'Functional'
  | 'Aqua'
  | 'Wellness'
  | 'Other';

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'All Levels';

export type ClassType = 'GROUP' | 'PERSONAL';

export interface TrainerResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  bio: string | null;
  specialisations: string[];
  hasPhoto: boolean;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrainerRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  bio?: string;
  specialisations?: string[];
}

export interface TrainerSummaryResponse {
  id: string;
  firstName: string;
  lastName: string;
}

export interface RoomResponse {
  id: string;
  name: string;
  capacity: number | null;
  description: string | null;
  hasPhoto: boolean;
  photoUrl: string | null;
  createdAt?: string;
}

export interface RoomRequest {
  name: string;
  capacity?: number;
  description?: string;
}

export interface RoomSummaryResponse {
  id: string;
  name: string;
  photoUrl: string | null;
}

export interface ClassTemplateResponse {
  id: string;
  name: string;
  description: string | null;
  category: ClassCategory;
  defaultDurationMin: number;
  defaultCapacity: number;
  difficulty: Difficulty;
  room: RoomSummaryResponse | null;
  hasPhoto: boolean;
  photoUrl: string | null;
  isSeeded: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClassTemplateRequest {
  name: string;
  description?: string;
  category: ClassCategory;
  defaultDurationMin: number;
  defaultCapacity: number;
  difficulty: Difficulty;
  roomId?: string | null;
}

export interface ClassInstanceResponse {
  id: string;
  templateId: string | null;
  name: string;
  type: ClassType;
  scheduledAt: string;
  durationMin: number;
  capacity: number;
  room: RoomSummaryResponse | null;
  trainers: TrainerSummaryResponse[];
  hasRoomConflict: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClassInstanceRequest {
  templateId?: string | null;
  name: string;
  scheduledAt: string;
  durationMin: number;
  capacity: number;
  roomId?: string | null;
  trainerIds: string[];
}

export interface ClassInstancePatchRequest {
  scheduledAt?: string;
  durationMin?: number;
  capacity?: number;
  roomId?: string | null;
  trainerIds?: string[];
}

export interface WeekScheduleResponse {
  week: string;
  instances: ClassInstanceResponse[];
}

export interface CopyWeekResponse {
  copied: number;
  skipped: number;
  targetWeek: string;
}

export interface ImportRowError {
  row: number;
  reason: string;
  detail: string;
}

export interface ImportResultResponse {
  imported: number;
  rejected: number;
  errors: ImportRowError[];
}

export interface AffectedInstanceResponse {
  id: string;
  name: string;
  scheduledAt: string;
}

export interface TrainerHasAssignmentsResponse {
  error: string;
  code: string;
  affectedInstances: AffectedInstanceResponse[];
}

export interface ClassTemplateHasInstancesResponse {
  error: string;
  code: string;
  affectedInstances: AffectedInstanceResponse[];
}

export interface RoomHasInstancesResponse {
  error: string;
  code: string;
  affectedInstances: AffectedInstanceResponse[];
}

export interface PaginatedTrainers {
  content: TrainerResponse[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface PaginatedTemplates {
  content: ClassTemplateResponse[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface PaginatedRooms {
  content: RoomResponse[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
