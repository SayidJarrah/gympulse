export type PlanStatus = 'ACTIVE' | 'INACTIVE';

export interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  priceInCents: number;
  durationDays: number;
  status: PlanStatus;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface MembershipPlanRequest {
  name: string;
  description: string;
  priceInCents: number;
  durationDays: number;
}

export interface PaginatedPlans {
  content: MembershipPlan[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
