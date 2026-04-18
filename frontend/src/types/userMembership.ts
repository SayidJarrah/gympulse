export type MembershipStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED';

export interface PaymentMethod {
  brand: string;
  last4: string;
}

export interface UserMembership {
  id: string;
  userId: string;
  userEmail: string | null;
  userFirstName: string | null;
  userLastName: string | null;
  userPhone: string | null;
  userDateOfBirth: string | null;
  userFitnessGoals: string[];
  userPreferredClassTypes: string[];
  userHasProfilePhoto: boolean;
  userProfilePhotoUrl: string | null;
  planId: string;
  planName: string;
  startDate: string; // ISO 8601 date string: "2026-03-23"
  endDate: string;   // ISO 8601 date string: "2026-04-22"
  status: MembershipStatus;
  bookingsUsedThisMonth: number;
  maxBookingsPerMonth: number;
  createdAt: string; // ISO 8601 datetime string
  // Display fields for the Membership Control card (added in member-profile-redesign)
  price: string;           // "$120 / 90 days" — server-formatted
  paymentMethod: PaymentMethod | null; // null until payment integration is wired
  nextChargeCopy: string;  // "$120 on May 2" — server-formatted
  autoRenew: boolean;
}

export interface MembershipPurchaseRequest {
  planId: string;
}

export interface AdminMembershipsQuery {
  status?: MembershipStatus;
  userId?: string;
  memberQuery?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface PaginatedMemberships {
  content: UserMembership[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
