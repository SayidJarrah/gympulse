import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { LandingPage } from '../LandingPage'
import type { MembershipPlan } from '../../../types/membershipPlan'
import type { UserMembership } from '../../../types/userMembership'

const mockUseLandingPlans = vi.fn()
const mockUseAuthStore = vi.fn()
const mockUseMembershipStore = vi.fn()
const mockRefetch = vi.fn()
const mockFetchMyMembership = vi.fn()

vi.mock('../../../hooks/useLandingPlans', () => ({
  useLandingPlans: () => mockUseLandingPlans(),
}))

vi.mock('../../../store/authStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}))

vi.mock('../../../store/membershipStore', () => ({
  useMembershipStore: () => mockUseMembershipStore(),
}))

const samplePlan: MembershipPlan = {
  id: 'plan-1',
  name: 'Performance',
  description: 'Train consistently with one active membership.',
  priceInCents: 7900,
  durationDays: 30,
  maxBookingsPerMonth: 12,
  status: 'ACTIVE',
  createdAt: '2026-03-29T10:00:00Z',
  updatedAt: '2026-03-29T10:00:00Z',
}

const activeMembership: UserMembership = {
  id: 'membership-1',
  userId: 'user-1',
  userEmail: 'member@example.com',
  userFirstName: 'Sam',
  userLastName: 'Rivers',
  userPhone: null,
  userDateOfBirth: null,
  userFitnessGoals: [],
  userPreferredClassTypes: [],
  userHasProfilePhoto: false,
  userProfilePhotoUrl: null,
  planId: 'plan-1',
  planName: 'Performance',
  startDate: '2026-03-29',
  endDate: '2026-04-28',
  status: 'ACTIVE',
  bookingsUsedThisMonth: 2,
  maxBookingsPerMonth: 12,
  createdAt: '2026-03-29T10:00:00Z',
}

function renderLandingPage() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  )
}

describe('LandingPage', () => {
  beforeEach(() => {
    mockRefetch.mockReset()
    mockFetchMyMembership.mockReset()

    mockUseLandingPlans.mockReturnValue({
      plans: [samplePlan],
      loading: false,
      error: null,
      refetch: mockRefetch,
    })

    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      user: null,
    })

    mockUseMembershipStore.mockReturnValue({
      activeMembership: null,
      membershipLoading: false,
      membershipErrorCode: null,
      fetchMyMembership: mockFetchMyMembership,
    })
  })

  afterEach(() => {
    cleanup()
    document.title = 'GymFlow'
    document.head.querySelector('meta[name="description"]')?.remove()
  })

  it('renders guest CTA links for registration and sign in', () => {
    renderLandingPage()

    expect(screen.getByRole('link', { name: /join gymflow/i })).toHaveAttribute(
      'href',
      '/register'
    )
    expect(screen.getByRole('link', { name: /browse plans/i })).toHaveAttribute(
      'href',
      '#plans'
    )
    expect(screen.getAllByRole('link', { name: /sign in/i })).toHaveLength(2)
  })

  it('renders the signed-in non-member CTA to membership plans', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', email: 'member@example.com', role: 'USER' },
    })
    mockUseMembershipStore.mockReturnValue({
      activeMembership: null,
      membershipLoading: false,
      membershipErrorCode: 'NO_ACTIVE_MEMBERSHIP',
      fetchMyMembership: mockFetchMyMembership,
    })

    renderLandingPage()

    expect(screen.getByRole('link', { name: /view membership plans/i })).toHaveAttribute(
      'href',
      '/plans'
    )
    expect(screen.getAllByRole('link', { name: /sign in/i })).toHaveLength(1)
  })

  it('renders the signed-in active-member CTA to the member area', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      user: { id: 'user-1', email: 'member@example.com', role: 'USER' },
    })
    mockUseMembershipStore.mockReturnValue({
      activeMembership,
      membershipLoading: false,
      membershipErrorCode: null,
      fetchMyMembership: mockFetchMyMembership,
    })

    renderLandingPage()

    expect(screen.getByRole('link', { name: /open member area/i })).toHaveAttribute(
      'href',
      '/home'
    )
  })

  it('renders the plans loading state without hiding the rest of the page', () => {
    mockUseLandingPlans.mockReturnValue({
      plans: [],
      loading: true,
      error: null,
      refetch: mockRefetch,
    })

    renderLandingPage()

    expect(screen.getByLabelText(/loading membership plans/i)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /compare the live offer before you commit/i })
    ).toBeInTheDocument()
  })

  it('renders the plans empty state', () => {
    mockUseLandingPlans.mockReturnValue({
      plans: [],
      loading: false,
      error: null,
      refetch: mockRefetch,
    })

    renderLandingPage()

    expect(
      screen.getByText(/membership plans are being updated/i)
    ).toBeInTheDocument()
  })

  it('renders the plans error state and retries on demand', async () => {
    mockUseLandingPlans.mockReturnValue({
      plans: [],
      loading: false,
      error: 'Failed to load membership plans.',
      refetch: mockRefetch,
    })

    renderLandingPage()

    expect(screen.getByText(/unable to load plans right now/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /try again/i }))

    expect(mockRefetch).toHaveBeenCalledTimes(1)
  })

  it('updates the document title and meta description on mount', () => {
    renderLandingPage()

    expect(document.title).toBe('GymFlow | Memberships and Class Booking')
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Compare active memberships, understand the booking flow, and take the right next step whether you are joining, choosing a plan, or returning as a member.'
    )
  })
})
