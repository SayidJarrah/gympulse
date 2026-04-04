import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { MemberHomePage } from '../MemberHomePage'
import { useMembershipStore } from '../../../store/membershipStore'
import type { MembershipPlan } from '../../../types/membershipPlan'
import type { MemberHomeClassPreviewResponse } from '../../../types/memberHome'
import type { TrainerDiscoveryResponse } from '../../../types/trainerDiscovery'
import type { UserMembership } from '../../../types/userMembership'
import { getMemberHomeClassesPreview, getMemberHomePlanTeasers, getMemberHomeTrainerPreview } from '../../../api/memberHome'
import { getMyMembership, purchaseMembership } from '../../../api/memberships'

vi.mock('../../../api/memberHome', () => ({
  getMemberHomeClassesPreview: vi.fn(),
  getMemberHomePlanTeasers: vi.fn(),
  getMemberHomeTrainerPreview: vi.fn(),
}))

vi.mock('../../../api/memberships', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/memberships')>()
  return {
    ...actual,
    getMyMembership: vi.fn(),
    purchaseMembership: vi.fn(),
  }
})

vi.mock('../../../hooks/useScheduleTimeZone', () => ({
  useScheduleTimeZone: () => 'UTC',
}))

vi.mock('../../../components/layout/Navbar', () => ({
  Navbar: () => <div data-testid="navbar" />,
}))

const mockedGetMyMembership = vi.mocked(getMyMembership)
const mockedPurchaseMembership = vi.mocked(purchaseMembership)
const mockedGetMemberHomePlanTeasers = vi.mocked(getMemberHomePlanTeasers)
const mockedGetMemberHomeTrainerPreview = vi.mocked(getMemberHomeTrainerPreview)
const mockedGetMemberHomeClassesPreview = vi.mocked(getMemberHomeClassesPreview)

const activeMembership: UserMembership = {
  id: 'membership-1',
  userId: 'user-1',
  userEmail: 'member@example.com',
  userFirstName: 'Daria',
  userLastName: 'Korn',
  userPhone: null,
  userDateOfBirth: null,
  userFitnessGoals: ['Strength'],
  userPreferredClassTypes: ['Yoga'],
  userHasProfilePhoto: false,
  userProfilePhotoUrl: null,
  planId: 'plan-1',
  planName: 'Monthly Plus',
  startDate: '2026-04-01',
  endDate: '2026-05-01',
  status: 'ACTIVE',
  bookingsUsedThisMonth: 2,
  maxBookingsPerMonth: 10,
  createdAt: '2026-04-01T09:00:00Z',
}

const teaserPlan: MembershipPlan = {
  id: 'plan-2',
  name: 'Starter',
  description: 'A short route back into the club.',
  priceInCents: 3900,
  durationDays: 30,
  maxBookingsPerMonth: 6,
  status: 'ACTIVE',
  createdAt: '2026-04-01T10:00:00Z',
  updatedAt: '2026-04-01T10:00:00Z',
}

const trainerPreview: TrainerDiscoveryResponse[] = [
  {
    id: 'trainer-1',
    firstName: 'Jane',
    lastName: 'Smith',
    profilePhotoUrl: null,
    specializations: ['Yoga', 'Pilates'],
    experienceYears: 8,
    classCount: 6,
    isFavorited: false,
  },
]

const classesPreview: MemberHomeClassPreviewResponse = {
  timeZone: 'UTC',
  rangeStartDate: '2026-04-04',
  rangeEndDateExclusive: '2026-04-18',
  entries: [
    {
      id: 'class-1',
      name: 'Yoga Flow',
      scheduledAt: '2026-04-05T16:00:00Z',
      localDate: '2026-04-05',
      durationMin: 60,
      trainerDisplayName: 'Jane Smith',
      classPhotoUrl: null,
    },
  ],
}

function noMembershipError() {
  return {
    response: {
      data: {
        code: 'NO_ACTIVE_MEMBERSHIP',
        error: 'No active membership found.',
      },
    },
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <MemberHomePage />
    </MemoryRouter>
  )
}

describe('MemberHomePage', () => {
  beforeEach(() => {
    mockedGetMyMembership.mockReset()
    mockedPurchaseMembership.mockReset()
    mockedGetMemberHomePlanTeasers.mockReset()
    mockedGetMemberHomeTrainerPreview.mockReset()
    mockedGetMemberHomeClassesPreview.mockReset()

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

    mockedGetMemberHomeTrainerPreview.mockResolvedValue(trainerPreview)
    mockedGetMemberHomeClassesPreview.mockResolvedValue(classesPreview)
  })

  it('renders the membership ACTIVE state', async () => {
    mockedGetMyMembership.mockResolvedValueOnce(activeMembership)

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Monthly Plus' })).toBeInTheDocument()
    expect(screen.getByLabelText('Status: Active')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Manage membership' })).toBeInTheDocument()
    expect(screen.getByText('Yoga Flow')).toBeInTheDocument()
  })

  it('renders the no-membership state with teaser plans', async () => {
    mockedGetMyMembership.mockRejectedValueOnce(noMembershipError())
    mockedGetMemberHomePlanTeasers.mockResolvedValueOnce([teaserPlan])

    renderPage()

    expect(await screen.findByRole('heading', { name: 'No active membership' })).toBeInTheDocument()
    expect(screen.getByText('Starter')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Activate Starter' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Jane Smith' })).toBeInTheDocument()
  })

  it('renders the no-plans-available state', async () => {
    mockedGetMyMembership.mockRejectedValueOnce(noMembershipError())
    mockedGetMemberHomePlanTeasers.mockResolvedValueOnce([])

    renderPage()

    expect(await screen.findByRole('heading', { name: 'No active membership' })).toBeInTheDocument()
    expect(screen.getByText('No plans available right now.')).toBeInTheDocument()
  })

  it('keeps membership and classes visible when the trainer section fails', async () => {
    mockedGetMyMembership.mockResolvedValueOnce(activeMembership)
    mockedGetMemberHomeTrainerPreview.mockRejectedValueOnce({
      response: {
        data: {
          code: 'INVALID_SORT_FIELD',
          error: 'Invalid sort field.',
        },
      },
    })

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Monthly Plus' })).toBeInTheDocument()
    expect(screen.getByText('Could not load trainers right now.')).toBeInTheDocument()
    expect(screen.getByText('Yoga Flow')).toBeInTheDocument()
  })

  it('keeps membership and trainers visible when the classes section fails', async () => {
    mockedGetMyMembership.mockResolvedValueOnce(activeMembership)
    mockedGetMemberHomeClassesPreview.mockRejectedValueOnce({
      response: {
        data: {
          code: 'INVALID_TIME_ZONE',
          error: 'Invalid time zone.',
        },
      },
    })

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Monthly Plus' })).toBeInTheDocument()
    expect(screen.getAllByText('Could not load upcoming classes right now.')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Jane Smith' })).toBeInTheDocument()
  })

  it('refreshes to the ACTIVE state after a successful inline purchase', async () => {
    const user = userEvent.setup()

    mockedGetMyMembership.mockRejectedValueOnce(noMembershipError())
    mockedGetMemberHomePlanTeasers.mockResolvedValueOnce([teaserPlan])
    mockedPurchaseMembership.mockResolvedValueOnce({
      ...activeMembership,
      planId: teaserPlan.id,
      planName: teaserPlan.name,
      maxBookingsPerMonth: teaserPlan.maxBookingsPerMonth,
    })

    renderPage()

    await screen.findByRole('heading', { name: 'No active membership' })
    await user.click(screen.getByRole('button', { name: 'Activate Starter' }))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(() => {
      expect(mockedPurchaseMembership).toHaveBeenCalledWith({ planId: teaserPlan.id })
    })

    expect(await screen.findByRole('heading', { name: 'Starter' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Manage membership' })).toBeInTheDocument()
  })

  it('keeps page-level horizontal overflow hidden', async () => {
    mockedGetMyMembership.mockResolvedValueOnce(activeMembership)

    renderPage()

    await screen.findByRole('heading', { name: 'Monthly Plus' })
    expect(screen.getByTestId('member-home-root')).toHaveClass('overflow-x-hidden')
  })
})
