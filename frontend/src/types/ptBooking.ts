export type SlotStatus = 'available' | 'class' | 'booked' | 'past'

export interface PtTrainerSummary {
  id: string
  firstName: string
  lastName: string
  profilePhotoUrl: string | null
  bio: string | null
  specializations: string[]
  experienceYears: number | null
  sessionsCompleted: number
  accentColor: string | null
  defaultRoom: string | null
  nextOpenAt: string | null  // ISO datetime
  weekOpenCount: number
}

export interface DayAvailability {
  date: string           // YYYY-MM-DD
  open: number           // gym open hour
  close: number          // gym close hour
  slots: Record<number, SlotStatus>  // hour → status
}

export interface TrainerAvailability {
  trainerId: string
  days: DayAvailability[]
}

export interface PtBookingResponse {
  id: string
  trainerId: string
  trainerName: string
  trainerAccentColor: string | null
  trainerPhotoUrl: string | null
  memberId: string
  memberName: string
  startAt: string        // ISO datetime
  endAt: string          // ISO datetime
  room: string
  note: string | null
  status: 'CONFIRMED' | 'CANCELLED'
  cancelledAt: string | null
  createdAt: string
}

export interface PtBookingRequest {
  trainerId: string
  startAt: string        // ISO datetime
}

export interface TrainerSessionClass {
  id: string
  name: string
  scheduledAt: string
  durationMin: number
  room: string | null
  type: 'class'
}

export interface TrainerSessionStats {
  ptCount: number
  classCount: number
  total: number
}

export interface TrainerScheduleResponse {
  trainerId: string
  trainerName: string
  ptSessions: PtBookingResponse[]
  groupClasses: TrainerSessionClass[]
  stats: TrainerSessionStats
}

export interface AdminPtSession {
  id: string
  trainerId: string
  trainerName: string
  trainerAccentColor: string | null
  memberId: string
  memberName: string
  startAt: string
  endAt: string
  room: string
  status: 'CONFIRMED' | 'CANCELLED'
  cancelledAt: string | null
  createdAt: string
}

export interface AdminPtStats {
  activeCount: number
  uniqueMembers: number
  uniqueTrainers: number
  cancelledCount: number
}

export interface AdminPtFilters {
  start?: string
  end?: string
  trainerId?: string
  status?: string
  q?: string
  page?: number
  size?: number
}

export interface PtPage<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
}
