import type {
  BookingDeniedReason,
  ScheduleEntryBookingSummary,
} from './booking'

export type ScheduleView = 'week' | 'day' | 'list'

export interface GroupClassScheduleEntry {
  id: string;
  name: string;
  scheduledAt: string;
  localDate: string;
  durationMin: number;
  trainerNames: string[];
  classPhotoUrl: string | null;
  capacity: number;
  confirmedBookings: number;
  remainingSpots: number;
  currentUserBooking: ScheduleEntryBookingSummary | null;
  bookingAllowed: boolean;
  bookingDeniedReason: BookingDeniedReason | null;
  cancellationAllowed: boolean;
}

export interface GroupClassScheduleResponse {
  view: ScheduleView;
  anchorDate: string;
  timeZone: string;
  week: string;
  rangeStartDate: string;
  rangeEndDateExclusive: string;
  hasActiveMembership: boolean;
  entries: GroupClassScheduleEntry[];
}

export interface GetGroupClassScheduleParams {
  view: ScheduleView;
  anchorDate: string;
  timeZone: string;
}
