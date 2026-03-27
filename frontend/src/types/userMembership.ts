export type MembershipStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED';

export interface UserMembership {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  startDate: string; // ISO 8601 date string: "2026-03-23"
  endDate: string;   // ISO 8601 date string: "2026-04-22"
  status: MembershipStatus;
  bookingsUsedThisMonth: number;
  maxBookingsPerMonth: number;
  createdAt: string; // ISO 8601 datetime string
}

export interface MembershipPurchaseRequest {
  planId: string;
}

export interface PaginatedMemberships {
  content: UserMembership[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
