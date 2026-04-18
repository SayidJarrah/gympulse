import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MemberHomePage } from '../MemberHomePage'
import { useMembershipStore } from '../../../store/membershipStore'
import type { UserMembership } from '../../../types/userMembership'
import type { PaginatedBookingsResponse } from '../../../types/booking'

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('../../../api/memberships', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/memberships')>()
  return { ...actual, getMyMembership: vi.fn() }
})

vi.mock('../../../api/bookings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/bookings')>()
  return { ...actual, getMyBookings: vi.fn(), cancelBooking: vi.fn() }
})

vi.mock('../../../api/landing', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/landing')>()
  return {
    ...actual,
    fetchActivityFeed: vi.fn().mockResolvedValue([]),
    createActivityStream: vi.fn().mockReturnValue({ close: vi.fn() }),
  }
})

// ---------------------------------------------------------------------------
// Imported mocks
// ---------------------------------------------------------------------------

import { getMyMembership } from '../../../api/memberships'
import { getMyBookings } from '../../../api/bookings'

const mockedGetMyMembership = vi.mocked(getMyMembership)
const mockedGetMyBookings = vi.mocked(getMyBookings)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const activeMembership: UserMembership = {
  id: 'membership-1',
  userId: 'user-1',
  userEmail: 'member@example.com',
  userFirstName: 'Dana',
  userLastName: 'Reeves',
  userPhone: null,
  userDateOfBirth: null,
  userFitnessGoals: [],
  userPreferredClassTypes: [],
  userHasProfilePhoto: false,
  userProfilePhotoUrl: null,
  planId: 'plan-1',
  planName: 'Quarterly',
  startDate: '2026-02-01',
  endDate: '2026-05-02',
  status: 'ACTIVE',
  bookingsUsedThisMonth: 4,
  maxBookingsPerMonth: 12,
  price: '$120 / 90 days',
  paymentMethod: null,
  nextChargeCopy: '$120 on May 2',
  autoRenew: true,
  createdAt: '2026-02-01T09:00:00Z',
}

const futureBooking = {
  id: 'booking-1',
  userId: 'user-1',
  classId: 'class-1',
  status: 'CONFIRMED' as const,
  bookedAt: '2026-04-17T10:00:00Z',
  cancelledAt: null,
  className: 'Morning Flow Yoga',
  scheduledAt: new Date(Date.now() + 2 * 3_600_000).toISOString(), // 2h from now
  durationMin: 60,
  trainerNames: ['Priya Mendes'],
  classPhotoUrl: null,
  isCancellable: true,
  cancellationCutoffAt: new Date(Date.now() + 3_600_000).toISOString(),
}

const emptyBookings: PaginatedBookingsResponse = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: 0,
}

const oneBooking: PaginatedBookingsResponse = {
  content: [futureBooking],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 10,
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <MemberHomePage />
    </MemoryRouter>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MemberHomePage (Pulse redesign)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useMembershipStore.setState({
      activeMembership: null,
      membershipLoading: false,
      membershipError: null,
      membershipErrorCode: null,
      adminMemberships: [],
      adminMembershipsTotalPages: 0,
      adminMembershipsPage: 0,
      adminMembershipsTotalElements: 0,
      adminMembershipsLoading: false,
      adminMembershipsError: null,
    })
  })

  it('renders the root container', async () => {
    mockedGetMyMembership.mockResolvedValue(activeMembership)
    mockedGetMyBookings.mockResolvedValue(emptyBookings)

    renderPage()

    expect(screen.getByTestId('member-home-root')).toBeInTheDocument()
  })

  it('shows welcome headline with member first name when membership is active', async () => {
    mockedGetMyMembership.mockResolvedValue(activeMembership)
    mockedGetMyBookings.mockResolvedValue(emptyBookings)

    renderPage()

    // The heading contains "Welcome back," + the first name
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Dana')
  })

  it('shows no-booked hero variant when member has no upcoming bookings', async () => {
    mockedGetMyMembership.mockResolvedValue(activeMembership)
    mockedGetMyBookings.mockResolvedValue(emptyBookings)

    renderPage()

    await waitFor(() => {
      // No-booked variant headline
      expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Get on a mat')
    })
  })

  it('shows countdown hero variant when member has an upcoming booking', async () => {
    mockedGetMyMembership.mockResolvedValue(activeMembership)
    mockedGetMyBookings.mockResolvedValue(oneBooking)

    renderPage()

    // "Add to calendar" button appears only in the booked hero variant
    await waitFor(() => {
      expect(screen.getByText('Add to calendar')).toBeInTheDocument()
    })
    expect(screen.getByText('Cancel booking')).toBeInTheDocument()
    expect(screen.getByText('Morning Flow Yoga starts in')).toBeInTheDocument()
  })

  it('shows plan name and ACTIVE pill in membership section', async () => {
    mockedGetMyMembership.mockResolvedValue(activeMembership)
    mockedGetMyBookings.mockResolvedValue(emptyBookings)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('ACTIVE')).toBeInTheDocument()
    })
    // Membership section shows plan name
    expect(screen.getByText('Quarterly')).toBeInTheDocument()
  })

  it('shows "No sessions booked" in upcoming section when bookings list is empty', async () => {
    mockedGetMyMembership.mockResolvedValue(activeMembership)
    mockedGetMyBookings.mockResolvedValue(emptyBookings)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('No sessions booked')).toBeInTheDocument()
    })
  })

  it('shows "Next up" pill for first booking in upcoming section', async () => {
    mockedGetMyMembership.mockResolvedValue(activeMembership)
    mockedGetMyBookings.mockResolvedValue(oneBooking)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Next up')).toBeInTheDocument()
    })
  })

  it('shows stat strip bookings-left count', async () => {
    mockedGetMyMembership.mockResolvedValue(activeMembership)
    mockedGetMyBookings.mockResolvedValue(emptyBookings)

    renderPage()

    // bookingsMax - bookingsUsed = 12 - 4 = 8
    await waitFor(() => {
      expect(screen.getByText('BOOKINGS LEFT')).toBeInTheDocument()
    })
  })

  it('shows membership section browse plans link when no membership is active', async () => {
    mockedGetMyMembership.mockRejectedValue({
      response: { data: { code: 'NO_ACTIVE_MEMBERSHIP', error: 'No active membership.' } },
    })
    mockedGetMyBookings.mockResolvedValue(emptyBookings)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Browse plans')).toBeInTheDocument()
    })
  })
})
