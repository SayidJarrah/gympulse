import { Link, useNavigate } from 'react-router-dom'
import type { MembershipPlan } from '../../types/membershipPlan'
import { formatPrice, formatDuration } from '../../utils/planFormatters'

interface PlanCardProps {
  plan: MembershipPlan;
  /**
   * When provided and the user is authenticated with no active membership,
   * render an "Activate" button instead of "Get Started". Opens PurchaseConfirmModal.
   * When not provided, the card renders the default "Get Started" button linking to /register.
   */
  onActivate?: () => void;
}

export function PlanCard({ plan, onActivate }: PlanCardProps) {
  const navigate = useNavigate()

  return (
    <div className="group relative flex flex-col rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-md shadow-black/50 transition-all duration-200 hover:border-gray-600 hover:bg-gray-800">
      <Link
        to={`/plans/${plan.id}`}
        className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0F0F]"
        aria-label={`View details for ${plan.name}`}
      />
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold leading-tight text-white">{plan.name}</h3>
        <span className="ml-4 flex-shrink-0 text-2xl font-bold text-green-400">
          {formatPrice(plan.priceInCents)}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-normal leading-normal text-gray-400">
        {plan.description}
      </p>
      <p className="mt-3 text-xs font-medium text-gray-500">
        {formatDuration(plan.durationDays)}
      </p>
      {onActivate ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            onActivate()
          }}
          className="relative z-10 mt-6 w-full inline-flex items-center justify-center gap-2 rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 active:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          Activate
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            navigate('/register')
          }}
          className="relative z-10 mt-6 w-full rounded-md bg-green-500 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          Get Started
        </button>
      )}
    </div>
  )
}

export function PlanCardSkeleton() {
  return (
    <div
      className="rounded-xl border border-gray-800 bg-gray-900 p-6 animate-pulse"
      aria-hidden="true"
    >
      <div className="flex items-start justify-between">
        <div className="h-5 w-32 rounded bg-gray-800" />
        <div className="h-7 w-16 rounded bg-gray-800" />
      </div>
      <div className="mt-3 h-4 w-full rounded bg-gray-800" />
      <div className="mt-2 h-4 w-3/4 rounded bg-gray-800" />
      <div className="mt-3 h-3 w-20 rounded bg-gray-800" />
      <div className="mt-6 h-9 w-full rounded-md bg-gray-800" />
    </div>
  )
}
