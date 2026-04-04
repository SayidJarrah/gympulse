import { Link } from 'react-router-dom'
import type { MembershipPlan } from '../../types/membershipPlan'
import type { UserMembership } from '../../types/userMembership'
import { formatPrice } from '../../utils/planFormatters'
import { MembershipStatusBadge } from '../membership/MembershipStatusBadge'

interface Props {
  membership: UserMembership | null;
  availablePlans: MembershipPlan[];
  mode: 'loading' | 'active' | 'empty' | 'error';
  errorMessage: string | null;
  planTeasersLoading?: boolean;
  onRetryMembership: () => void;
  onBrowsePlans: () => void;
  onManageMembership: () => void;
  onExploreClasses: () => void;
  onSelectPlan: (plan: MembershipPlan) => void;
}

function formatDate(dateIso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${dateIso}T00:00:00`))
}

export function MembershipPrimaryCard({
  membership,
  availablePlans,
  mode,
  errorMessage,
  planTeasersLoading = false,
  onRetryMembership,
  onBrowsePlans,
  onManageMembership,
  onExploreClasses,
  onSelectPlan,
}: Props) {
  if (mode === 'loading') {
    return (
      <section
        aria-label="Loading membership"
        className="rounded-[24px] border border-gray-800 bg-[#0F0F0F] p-6 shadow-md shadow-black/40"
      >
        <div className="animate-pulse space-y-6">
          <div className="space-y-3">
            <div className="h-4 w-28 rounded-full bg-gray-800" />
            <div className="h-9 w-56 rounded-xl bg-gray-800" />
            <div className="h-4 w-72 rounded-full bg-gray-800" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
                <div className="h-3 w-20 rounded-full bg-gray-800" />
                <div className="mt-3 h-6 w-28 rounded-full bg-gray-800" />
              </div>
            ))}
          </div>
          <div className="h-2 rounded-full bg-gray-800" />
        </div>
      </section>
    )
  }

  if (mode === 'error') {
    return (
      <section className="rounded-[24px] border border-red-500/30 bg-red-500/10 p-6 shadow-md shadow-black/40">
        <h2 className="text-2xl font-semibold leading-tight text-white">Membership unavailable</h2>
        <p className="mt-3 text-sm text-gray-300">
          {errorMessage ?? 'We couldn’t load your current membership. Please try again.'}
        </p>
        <button
          type="button"
          onClick={onRetryMembership}
          className="mt-6 inline-flex items-center justify-center rounded-md border border-green-500 bg-transparent px-4 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          Retry
        </button>
      </section>
    )
  }

  if (mode === 'active' && membership) {
    const bookingsRemaining = Math.max(
      membership.maxBookingsPerMonth - membership.bookingsUsedThisMonth,
      0
    )
    const bookingUsagePercent =
      membership.maxBookingsPerMonth > 0
        ? Math.min((membership.bookingsUsedThisMonth / membership.maxBookingsPerMonth) * 100, 100)
        : 0
    const filledSegments =
      bookingUsagePercent === 0 ? 0 : Math.max(1, Math.round(bookingUsagePercent / 10))

    return (
      <section className="rounded-[24px] border border-gray-800 bg-[#0F0F0F] p-6 shadow-md shadow-black/40">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-gray-500">
              Membership
            </p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight text-white">
              {membership.planName}
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Your membership is active and ready for class booking.
            </p>
          </div>
          <MembershipStatusBadge status={membership.status} />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <MetricCard label="Start date" value={formatDate(membership.startDate)} />
          <MetricCard label="End date" value={formatDate(membership.endDate)} />
          <MetricCard
            label="Bookings this month"
            value={`${membership.bookingsUsedThisMonth} / ${membership.maxBookingsPerMonth}`}
          />
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Monthly booking usage</span>
            <span>{bookingsRemaining} left</span>
          </div>
          <div className="mt-2 grid grid-cols-10 gap-1" aria-hidden="true">
            {Array.from({ length: 10 }).map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full ${
                  index < filledSegments ? 'bg-green-500' : 'bg-gray-800'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onManageMembership}
            className="inline-flex items-center justify-center rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            Manage membership
          </button>
          <button
            type="button"
            onClick={onExploreClasses}
            className="inline-flex items-center justify-center rounded-md border border-green-500 bg-transparent px-4 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 hover:text-green-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            Explore classes
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-[24px] border border-gray-800 bg-[#0F0F0F] p-6 shadow-md shadow-black/40">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-gray-500">
            Membership
          </p>
          <h2 className="mt-2 text-3xl font-semibold leading-tight text-white">
            No active membership
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Pick a plan to unlock class booking and member access.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-300">
          Activation needed
        </span>
      </div>

      <div className="mt-6">
        {planTeasersLoading ? (
          <div className="grid gap-3 lg:grid-cols-3" aria-label="Loading plans">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 w-24 rounded-full bg-gray-800" />
                  <div className="h-6 w-20 rounded-full bg-gray-800" />
                  <div className="h-9 w-full rounded-md bg-gray-800" />
                </div>
              </div>
            ))}
          </div>
        ) : availablePlans.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-3">
            {availablePlans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-2xl border border-gray-800 bg-gray-900 p-4 shadow-sm shadow-black/40"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-white">{plan.name}</p>
                    <p className="mt-1 text-sm text-gray-400">{plan.durationDays}-day access</p>
                  </div>
                  <p className="text-lg font-semibold text-green-400">
                    {formatPrice(plan.priceInCents)}
                  </p>
                </div>
                <p className="mt-3 text-sm text-gray-400">
                  {plan.maxBookingsPerMonth} class bookings per month.
                </p>
                <button
                  type="button"
                  onClick={() => onSelectPlan(plan)}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-md border border-green-500 bg-transparent px-4 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 hover:text-green-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                >
                  Activate {plan.name}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 px-5 py-6">
            <p className="text-base font-semibold text-white">No plans available right now.</p>
            <p className="mt-2 text-sm text-gray-400">
              Please check back later.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onBrowsePlans}
          className="inline-flex items-center justify-center rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          Browse plans
        </button>
        <button
          type="button"
          onClick={onExploreClasses}
          className="inline-flex items-center justify-center rounded-md border border-green-500 bg-transparent px-4 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 hover:text-green-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          See what&apos;s inside the club
        </button>
      </div>

      {availablePlans.length > 0 && (
        <p className="mt-4 text-xs text-gray-500">
          Prefer the full catalogue? <Link to="/plans" className="text-green-400 hover:text-green-300">Browse every plan</Link>
        </p>
      )}
    </section>
  )
}

interface MetricCardProps {
  label: string;
  value: string;
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
      <p className="text-sm font-medium text-gray-400">{label}</p>
      <p className="mt-2 text-lg font-semibold leading-tight text-white">{value}</p>
    </div>
  )
}
