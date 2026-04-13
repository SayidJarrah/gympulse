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
    name: 'Starter Monthly',
    description: 'Entry-level access with a limited monthly booking allowance.',
    priceInCents: 3900,
    durationDays: 30,
    status: 'ACTIVE',
    maxBookingsPerMonth: 8,
  },
  {
    id: '22222222-2222-2222-2222-222222222202',
    name: 'Standard Monthly',
    description: 'Balanced monthly plan for regular class attendance.',
    priceInCents: 5900,
    durationDays: 30,
    status: 'ACTIVE',
    maxBookingsPerMonth: 16,
  },
  {
    id: '22222222-2222-2222-2222-222222222203',
    name: 'Unlimited Monthly',
    description: 'Unlimited class bookings with full schedule access.',
    priceInCents: 7900,
    durationDays: 30,
    status: 'ACTIVE',
    maxBookingsPerMonth: 0,
  },
  {
    id: '22222222-2222-2222-2222-222222222204',
    name: 'Quarterly Saver',
    description: 'Prepay for 3 months and save on the monthly rate.',
    priceInCents: 16500,
    durationDays: 90,
    status: 'ACTIVE',
    maxBookingsPerMonth: 48,
  },
  {
    id: '22222222-2222-2222-2222-222222222205',
    name: 'Annual Unlimited',
    description: 'Best value annual plan with unlimited bookings.',
    priceInCents: 69900,
    durationDays: 365,
    status: 'ACTIVE',
    maxBookingsPerMonth: 0,
  },
  {
    id: '22222222-2222-2222-2222-222222222206',
    name: 'Off-Peak Monthly',
    description: 'Discounted plan for midday and early afternoon bookings.',
    priceInCents: 3500,
    durationDays: 30,
    status: 'ACTIVE',
    maxBookingsPerMonth: 8,
  },
  {
    id: '22222222-2222-2222-2222-222222222207',
    name: 'Student Flex',
    description: 'Flexible plan for students with capped monthly bookings.',
    priceInCents: 3200,
    durationDays: 30,
    status: 'ACTIVE',
    maxBookingsPerMonth: 10,
  },
  {
    id: '22222222-2222-2222-2222-222222222208',
    name: 'Family Duo',
    description: 'Shared plan intended for two household members.',
    priceInCents: 9900,
    durationDays: 30,
    status: 'ACTIVE',
    maxBookingsPerMonth: 20,
  },
  {
    id: '22222222-2222-2222-2222-222222222209',
    name: 'Recovery & Wellness',
    description: 'Lower intensity plan focused on mobility, yoga, and recovery.',
    priceInCents: 4500,
    durationDays: 30,
    status: 'ACTIVE',
    maxBookingsPerMonth: 8,
  },
  {
    id: '22222222-2222-2222-2222-222222222210',
    name: 'Trial Week',
    description: 'Short-term trial plan for new members.',
    priceInCents: 1500,
    durationDays: 7,
    status: 'ACTIVE',
    maxBookingsPerMonth: 2,
  },
];
