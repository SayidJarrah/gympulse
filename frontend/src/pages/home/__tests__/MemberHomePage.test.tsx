import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { MemberHomePage } from '../MemberHomePage'
import { useMembershipStore } from '../../../store/membershipStore'
import type { MemberHomeClassPreviewResponse } from '../../../types/memberHome'
import type { MembershipPlan } from '../../../types/membershipPlan'
import type { TrainerDiscoveryResponse } from '../../../types/trainerDiscovery'
import type { UserMembership } from '../../../types/userMembership'
import {
  getMemberHomeClassesPreview,
  getMemberHomePlanTeasers,
  getMemberHomeTrainerPreview,
} from '../../../api/memberHome'
import { getMyMembership } from '../../../api/memberships'

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
  }
})

vi.mock('../../../hooks/useScheduleTimeZone', () => ({
  useScheduleTimeZone: () => 'UTC',
}))

vi.mock('../../../components/layout/Navbar', () => ({
  Navbar: () => <div data-testid="navbar" />,
}))

const mockedGetMyMembership = vi.mocked(getMyMembership)
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

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</div>
}

function renderPage(initialEntry = '/home') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <MemberHomePage />
      <LocationDisplay />
    </MemoryRouter>
  )
}

describe('MemberHomePage', () => {
  beforeEach(() => {
    mockedGetMyMembership.mockReset()
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

  it('renders the active state and consumes the activation banner query param', async () => {
    mockedGetMyMembership.mockResolvedValueOnce(activeMembership)

    renderPage('/home?membershipBanner=activated#membership')

    expect(await screen.findByText('Membership activated')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Monthly Plus' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Explore classes' })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/home#membership')
    })
  })

  it('renders the no-membership teaser state with plans deep links', async () => {
    mockedGetMyMembership.mockRejectedValueOnce(noMembershipError())
    mockedGetMemberHomePlanTeasers.mockResolvedValueOnce([teaserPlan])

    renderPage()

    expect(await screen.findByRole('heading', { name: 'No active membership' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Compare all plans' })).toHaveAttribute(
      'href',
      '/plans?source=home'
    )
    expect(screen.getByRole('link', { name: 'View plan' })).toHaveAttribute(
      'href',
      `/plans?source=home&highlight=${teaserPlan.id}`
    )
    expect(screen.queryByRole('button', { name: /Activate Starter/i })).not.toBeInTheDocument()
  })

  it('renders the no-plans-available state', async () => {
    mockedGetMyMembership.mockRejectedValueOnce(noMembershipError())
    mockedGetMemberHomePlanTeasers.mockResolvedValueOnce([])

    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'No active membership' })
    ).toBeInTheDocument()
    expect(screen.getByText('No plans available right now')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Browse trainers' })).toBeInTheDocument()
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
    expect(screen.getByText('Trainers unavailable')).toBeInTheDocument()
    expect(screen.getByText('Invalid sort selection. Please refresh the page.')).toBeInTheDocument()
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
    expect(screen.getByText('Classes unavailable')).toBeInTheDocument()
    expect(screen.getByText('Could not load upcoming classes right now.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Jane Smith' })).toBeInTheDocument()
  })

  it('keeps page-level horizontal overflow hidden', async () => {
    mockedGetMyMembership.mockResolvedValueOnce(activeMembership)

    renderPage()

    await screen.findByRole('heading', { name: 'Monthly Plus' })
    expect(screen.getByTestId('member-home-root')).toHaveClass('overflow-x-hidden')
  })
})
