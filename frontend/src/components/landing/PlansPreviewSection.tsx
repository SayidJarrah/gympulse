import { Link } from 'react-router-dom'
import type { MembershipPlan } from '../../types/membershipPlan'
import type { LandingPlanAction } from '../../types/landing'
import { formatDuration, formatPrice } from '../../utils/planFormatters'

interface Props {
  plans: MembershipPlan[];
  loading: boolean;
  error: string | null;
  planAction: LandingPlanAction;
  onRetry: () => Promise<void>;
  onPlanActionClick: (plan: MembershipPlan) => void;
}

function LandingPlanCardSkeleton() {
  return (
    <div className="rounded-3xl border border-gray-800 bg-gray-900/70 p-6 animate-pulse">
      <div className="h-4 w-24 rounded bg-gray-800" />
      <div className="mt-5 h-8 w-28 rounded bg-gray-800" />
      <div className="mt-3 h-4 w-3/4 rounded bg-gray-800" />
      <div className="mt-8 h-4 w-full rounded bg-gray-800" />
      <div className="mt-3 h-4 w-5/6 rounded bg-gray-800" />
      <div className="mt-8 h-11 w-full rounded-xl bg-gray-800" />
    </div>
  )
}

export function PlansPreviewSection({
  plans,
  loading,
  error,
  planAction,
  onRetry,
  onPlanActionClick,
}: Props) {
  return (
    <section id="plans" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-green-400">
          Membership plans
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-white">
          Compare the live offer before you commit
        </h2>
        <p className="mt-3 text-base leading-7 text-gray-400">
          The landing page uses the same active plans available in GymFlow. If a plan is
          visible here, it is a real option for the current membership flow.
        </p>
      </div>

      {loading && (
        <div
          aria-label="Loading membership plans"
          className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
        >
          {Array.from({ length: 3 }).map((_, index) => (
            <LandingPlanCardSkeleton key={index} />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="mt-10 rounded-3xl border border-red-500/25 bg-red-500/10 p-6">
          <p className="text-base font-semibold text-white">Unable to load plans right now</p>
          <p className="mt-2 text-sm leading-6 text-gray-300">{error}</p>
          <button
            type="button"
            onClick={() => void onRetry()}
            className="mt-5 inline-flex items-center justify-center rounded-xl border border-green-500 px-5 py-3 text-sm font-semibold text-green-300 transition-colors duration-200 hover:bg-green-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && plans.length === 0 && (
        <div className="mt-10 rounded-3xl border border-gray-800 bg-gray-900/70 p-8 text-center">
          <p className="text-2xl font-semibold text-white">
            Membership plans are being updated
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-400">
            Active offerings will return here as soon as they are available again. You
            can still learn how GymFlow works and come back when memberships are live.
          </p>
        </div>
      )}

      {!loading && !error && plans.length > 0 && (
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className="flex h-full flex-col rounded-3xl border border-gray-800 bg-gray-900/70 p-6 shadow-xl shadow-black/20 transition-transform duration-200 hover:-translate-y-1 hover:border-gray-700"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                    {formatDuration(plan.durationDays)}
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold text-white">{plan.name}</h3>
                </div>
                <span className="text-3xl font-bold text-green-400">
                  {formatPrice(plan.priceInCents)}
                </span>
              </div>

              <p className="mt-5 text-sm leading-6 text-gray-400">{plan.description}</p>

              <dl className="mt-6 grid gap-4 rounded-2xl border border-gray-800 bg-gray-950/70 p-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                    Duration
                  </dt>
                  <dd className="mt-2 text-sm font-medium text-white">
                    {formatDuration(plan.durationDays)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                    Monthly bookings
                  </dt>
                  <dd className="mt-2 text-sm font-medium text-white">
                    {plan.maxBookingsPerMonth} class bookings
                  </dd>
                </div>
              </dl>

              <Link
                to={planAction.to}
                onClick={() => onPlanActionClick(plan)}
                className={`mt-8 inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0F0F] ${
                  planAction.variant === 'primary'
                    ? 'bg-green-500 text-white hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/20'
                    : 'border border-gray-700 bg-gray-900 text-white hover:border-gray-500 hover:bg-gray-800'
                }`}
              >
                {planAction.label}
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
