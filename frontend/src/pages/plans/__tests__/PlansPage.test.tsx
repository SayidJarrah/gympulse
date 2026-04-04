import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { PlansPage } from '../PlansPage'
import type { MembershipPlan } from '../../../types/membershipPlan'

const mockUsePlans = vi.fn()
const mockUsePlansAccessGate = vi.fn()

vi.mock('../../../hooks/usePlans', () => ({
  usePlans: (...args: unknown[]) => mockUsePlans(...args),
}))

vi.mock('../../../hooks/usePlansAccessGate', () => ({
  usePlansAccessGate: () => mockUsePlansAccessGate(),
}))

vi.mock('../../../components/layout/Navbar', () => ({
  Navbar: () => <div data-testid="navbar" />,
}))

vi.mock('../../../components/plans/PlanCard', () => ({
  PlanCard: ({
    plan,
    highlighted,
    onActivate,
    ctaMode,
  }: {
    plan: MembershipPlan;
    highlighted?: boolean;
    onActivate?: () => void;
    ctaMode?: 'register' | 'details';
  }) => (
    <div data-testid={`plan-card-${plan.id}`}>
      <span>{plan.name}</span>
      <span>{highlighted ? 'highlighted' : 'standard'}</span>
      <span>{ctaMode}</span>
      {onActivate ? <button onClick={onActivate}>{`Activate ${plan.name}`}</button> : null}
    </div>
  ),
  PlanCardSkeleton: () => <div data-testid="plan-card-skeleton" />,
}))

vi.mock('../../../components/membership/PurchaseConfirmModal', () => ({
  PurchaseConfirmModal: ({ isOpen, plan }: { isOpen: boolean; plan: MembershipPlan }) =>
    isOpen ? <div>{`Purchase modal for ${plan.name}`}</div> : null,
}))

const basePlan: MembershipPlan = {
  id: 'plan-1',
  name: 'Starter',
  description: 'Starter plan',
  priceInCents: 3900,
  durationDays: 30,
  maxBookingsPerMonth: 6,
  status: 'ACTIVE',
  createdAt: '2026-04-01T10:00:00Z',
  updatedAt: '2026-04-01T10:00:00Z',
}

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</div>
}

function renderPage(initialEntry = '/plans') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/plans" element={<PlansPage />} />
        <Route
          path="/home"
          element={
            <>
              <div>Home page</div>
              <LocationDisplay />
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('PlansPage', () => {
  beforeEach(() => {
    mockUsePlans.mockReset()
    mockUsePlansAccessGate.mockReset()

    mockUsePlans.mockReturnValue({
      plans: [basePlan],
      totalPages: 1,
      currentPage: 0,
      totalElements: 1,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
  })

  it('redirects active members to the home membership banner', async () => {
    mockUsePlansAccessGate.mockReturnValue({
      mode: 'redirect',
      canPurchase: false,
      redirectTo: '/home?membershipBanner=already-active#membership',
    })

    renderPage()

    expect(await screen.findByText('Home page')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/home?membershipBanner=already-active#membership'
    )
  })

  it('renders authenticated comparison context, highlights the requested plan, and opens purchase', async () => {
    const user = userEvent.setup()

    mockUsePlansAccessGate.mockReturnValue({
      mode: 'authenticated',
      canPurchase: true,
      redirectTo: null,
    })

    mockUsePlans.mockReturnValue({
      plans: [basePlan, { ...basePlan, id: 'plan-2', name: 'Unlimited' }],
      totalPages: 1,
      currentPage: 0,
      totalElements: 2,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    renderPage('/plans?source=home&highlight=plan-2')

    expect(screen.getByText('Choose the plan that unlocks your booking access')).toBeInTheDocument()
    expect(screen.getByText('Back to Home')).toBeInTheDocument()
    expect(screen.getByText('No active membership')).toBeInTheDocument()
    expect(screen.getByTestId('plan-card-plan-1')).toHaveTextContent('standard')
    expect(screen.getByTestId('plan-card-plan-2')).toHaveTextContent('highlighted')
    expect(screen.getByTestId('plan-card-plan-2')).toHaveTextContent('details')

    await user.click(screen.getByRole('button', { name: 'Activate Unlimited' }))

    expect(screen.getByText('Purchase modal for Unlimited')).toBeInTheDocument()
  })

  it('renders the public catalogue without authenticated context', () => {
    mockUsePlansAccessGate.mockReturnValue({
      mode: 'public',
      canPurchase: false,
      redirectTo: null,
    })

    renderPage()

    expect(screen.getByRole('heading', { name: 'Membership Plans' })).toBeInTheDocument()
    expect(screen.queryByText('Back to Home')).not.toBeInTheDocument()
    expect(screen.getByTestId('plan-card-plan-1')).toHaveTextContent('register')
  })
})
