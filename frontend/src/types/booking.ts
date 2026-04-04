export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'ATTENDED';

export type BookingDeniedReason =
  | 'MEMBERSHIP_REQUIRED'
  | 'CLASS_ALREADY_STARTED'
  | 'CLASS_FULL'
  | 'ALREADY_BOOKED';

export interface ScheduleEntryBookingSummary {
  id: string;
  status: BookingStatus;
  bookedAt: string;
}

export interface BookingResponse {
  id: string;
  userId: string;
  classId: string;
  status: BookingStatus;
  bookedAt: string;
  cancelledAt: string | null;
  className: string;
  scheduledAt: string;
  durationMin: number;
  trainerNames: string[];
  classPhotoUrl: string | null;
  isCancellable: boolean;
  cancellationCutoffAt: string;
}

export interface PaginatedBookingsResponse {
  content: BookingResponse[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface BookingRequest {
  classId: string;
}

export interface AdminBookingRequest {
  userId: string;
  classId: string;
}

export interface AdminBookingMemberSummaryResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  hasActiveMembership: boolean;
}

export interface SearchBookingMembersParams {
  query?: string;
  page?: number;
  size?: number;
}
