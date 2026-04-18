export interface MembershipPlanRecord {
  id: string;                    // fixed UUID — must not change
  name: string;
  description: string;
  priceInCents: number;
  durationDays: number;
  status: 'ACTIVE' | 'INACTIVE';
  maxBookingsPerMonth: number;   // 0 = unlimited
}

export const MEMBERSHIP_PLANS: MembershipPlanRecord[] = [
  {
    id: '22222222-2222-2222-2222-222222222201',
    name: 'Trial',
    description: 'Short-term trial plan for new members.',
    priceInCents: 1500,
    durationDays: 7,
    status: 'ACTIVE',
    maxBookingsPerMonth: 4,
  },
  {
    id: '22222222-2222-2222-2222-222222222202',
    name: 'Monthly',
    description: 'Unlimited class bookings with full schedule access.',
    priceInCents: 7900,
    durationDays: 30,
    status: 'ACTIVE',
    maxBookingsPerMonth: 0,
  },
  {
    id: '22222222-2222-2222-2222-222222222203',
    name: 'Annually',
    description: 'Best value annual plan with unlimited bookings.',
    priceInCents: 69900,
    durationDays: 365,
    status: 'ACTIVE',
    maxBookingsPerMonth: 0,
  },
];
