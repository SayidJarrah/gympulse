import { Link } from 'react-router-dom'
import type { MembershipPlan } from '../../types/membershipPlan'
import type { UserMembership } from '../../types/userMembership'
import { formatPrice } from '../../utils/planFormatters'
import { MembershipStatusBadge } from '../membership/MembershipStatusBadge'
import { MemberHomeSectionErrorCard } from './MemberHomeSectionErrorCard'

interface Props {
  membership: UserMembership | null;
  availablePlans: MembershipPlan[];
  mode: 'loading' | 'active' | 'empty' | 'error';
  errorMessage: string | null;
  planTeasersLoading?: boolean;
  planTeasersError?: string | null;
  onRetryMembership: () => void;
  onManageMembership: () => void;
  onExploreClasses: () => void;
  onBrowseTrainers: () => void;
  browsePlansHref: string;
  getPlanHref: (planId: string) => string;
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
  planTeasersError = null,
  onRetryMembership,
  onManageMembership,
  onExploreClasses,
  onBrowseTrainers,
  browsePlansHref,
  getPlanHref,
}: Props) {
  if (mode === 'loading') {
    return (
      <section
        aria-label="Loading membership"
        className="rounded-[28px] border border-gray-800 bg-gray-900 p-6 shadow-xl shadow-black/30 sm:p-8"
      >
        <div className="animate-pulse space-y-6">
          <div className="space-y-3">
            <div className="h-4 w-28 rounded-full bg-gray-800" />
            <div className="h-9 w-56 rounded-xl bg-gray-800" />
            <div className="h-4 w-72 rounded-full bg-gray-800" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-gray-800 bg-[#0F0F0F] p-4">
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
      <section className="rounded-[28px] border border-red-500/30 bg-red-500/10 p-6 shadow-xl shadow-black/30 sm:p-8">
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
      <section className="rounded-[28px] border border-gray-800 bg-gray-900 p-6 shadow-xl shadow-black/30 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-gray-500">
              Your access
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
            Open schedule
          </button>
        </div>
      </section>
    )
  }

  const hasNoPlansAvailable =
    !planTeasersLoading && !planTeasersError && availablePlans.length === 0
  const headerBody = hasNoPlansAvailable
    ? 'Membership access is temporarily unavailable. You can still explore the club.'
    : 'Pick a plan to unlock booking and member-only access.'

  return (
    <section className="rounded-[28px] border border-gray-800 bg-gray-900 p-6 shadow-xl shadow-black/30 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-gray-500">
            Your access
          </p>
          <h2 className="mt-2 text-3xl font-semibold leading-tight text-white">
            Activate your access
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            {headerBody}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-300">
          Activation needed
        </span>
      </div>

      <div className="mt-6">
        {planTeasersLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible" aria-label="Loading plans">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="min-w-[240px] rounded-2xl border border-gray-800 bg-[#0F0F0F] p-4 lg:min-w-0"
              >
                <div className="animate-pulse space-y-3">
                  <div className="h-4 w-24 rounded-full bg-gray-800" />
                  <div className="h-6 w-20 rounded-full bg-gray-800" />
                  <div className="h-9 w-full rounded-md bg-gray-800" />
                </div>
              </div>
            ))}
          </div>
        ) : planTeasersError ? (
          <MemberHomeSectionErrorCard
            title="Plans unavailable"
            body={planTeasersError}
            onRetry={onRetryMembership}
          />
        ) : availablePlans.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible">
            {availablePlans.map((plan) => (
              <div
                key={plan.id}
                className="min-w-[240px] rounded-2xl border border-gray-800 bg-[#111827] p-5 shadow-md shadow-black/40 transition-all duration-200 hover:-translate-y-0.5 hover:border-green-500/40 lg:min-w-0"
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
                <Link
                  to={getPlanHref(plan.id)}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-md border border-green-500 bg-transparent px-4 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 hover:text-green-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                >
                  View plan
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-6">
            <p className="text-base font-semibold text-white">No plans available right now</p>
            <p className="mt-2 text-sm text-orange-100/80">
              There are currently no memberships available to activate. This is a catalogue issue, not a problem with your account.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onRetryMembership}
                className="inline-flex items-center justify-center rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={onBrowseTrainers}
                className="inline-flex items-center justify-center rounded-md border border-orange-500/40 bg-transparent px-4 py-2 text-sm font-medium text-orange-100 transition-all duration-200 hover:bg-orange-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                Browse trainers
              </button>
            </div>
          </div>
        )}
      </div>

      {!hasNoPlansAvailable ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            to={browsePlansHref}
            className="inline-flex items-center justify-center rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            Compare all plans
          </Link>
          <button
            type="button"
            onClick={onExploreClasses}
            className="inline-flex items-center justify-center rounded-md border border-green-500 bg-transparent px-4 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 hover:text-green-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            See schedule
          </button>
        </div>
      ) : null}
    </section>
  )
}

interface MetricCardProps {
  label: string;
  value: string;
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-[#0F0F0F] p-4">
      <p className="text-sm font-medium text-gray-400">{label}</p>
      <p className="mt-2 text-lg font-semibold leading-tight text-white">{value}</p>
    </div>
  )
}
