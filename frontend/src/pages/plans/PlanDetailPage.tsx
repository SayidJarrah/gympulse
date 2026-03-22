import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeftIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { Navbar } from '../../components/layout/Navbar'
import type { MembershipPlan } from '../../types/membershipPlan'
import { getPlanById } from '../../api/membershipPlans'
import { formatPrice, formatDuration, formatMonthYear } from '../../utils/planFormatters'
import type { AxiosError } from 'axios'
import type { ApiErrorResponse } from '../../types/auth'

function PlanDetailSkeleton() {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 animate-pulse" aria-hidden="true">
      <div className="flex items-start justify-between">
        <div className="h-8 w-48 rounded bg-gray-800" />
        <div className="h-10 w-24 rounded bg-gray-800" />
      </div>
      <div className="mt-2 h-4 w-20 rounded bg-gray-800" />
      <div className="mt-6 space-y-2">
        <div className="h-4 w-full rounded bg-gray-800" />
        <div className="h-4 w-full rounded bg-gray-800" />
        <div className="h-4 w-3/4 rounded bg-gray-800" />
      </div>
      <div className="mt-6 h-3 w-32 rounded bg-gray-800" />
      <div className="mt-8 h-12 w-full rounded-md bg-gray-800" />
    </div>
  )
}

function PlanDetailNotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
        <ExclamationCircleIcon className="h-8 w-8 text-gray-500" />
      </div>
      <h2 className="text-xl font-semibold text-white">Plan not found</h2>
      <p className="text-sm text-gray-400">
        This plan could not be found or is no longer available.
      </p>
      <Link
        to="/plans"
        className="mt-2 inline-flex items-center justify-center rounded-md border border-green-500 bg-transparent px-4 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0F0F]"
      >
        Browse all plans
      </Link>
    </div>
  )
}

function PlanDetailError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
        <ExclamationCircleIcon className="h-8 w-8 text-gray-500" />
      </div>
      <h2 className="text-xl font-semibold text-white">Something went wrong</h2>
      <p className="text-sm text-gray-400">
        Unable to load plan details. Please try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 inline-flex items-center justify-center rounded-md border border-green-500 bg-transparent px-4 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0F0F]"
      >
        Try again
      </button>
    </div>
  )
}

export function PlanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [plan, setPlan] = useState<MembershipPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [fetchError, setFetchError] = useState(false)

  const load = () => {
    if (!id) {
      setNotFound(true)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setNotFound(false)
    setFetchError(false)

    getPlanById(id)
      .then((data) => {
        setPlan(data)
      })
      .catch((err: AxiosError<ApiErrorResponse>) => {
        if (err.response?.status === 404) {
          setNotFound(true)
        } else {
          // Network errors, 500s, etc. show a generic error state rather than
          // silently pretending the plan does not exist.
          setFetchError(true)
        }
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  useEffect(() => {
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const backLink = (
    <Link
      to="/plans"
      className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-green-400 hover:text-green-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:rounded-sm"
    >
      <ChevronLeftIcon className="h-4 w-4" />
      Back to Plans
    </Link>
  )

  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      <Navbar />

      <main>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {isLoading && (
            <>
              <span className="sr-only" aria-live="polite">Loading plan details...</span>
              {/* Back link placeholder */}
              <div className="mb-6 h-4 w-24 rounded bg-gray-800 animate-pulse" aria-hidden="true" />
              <PlanDetailSkeleton />
            </>
          )}

          {!isLoading && notFound && (
            <>
              {backLink}
              <PlanDetailNotFound />
            </>
          )}

          {!isLoading && fetchError && (
            <>
              {backLink}
              <PlanDetailError onRetry={load} />
            </>
          )}

          {!isLoading && !notFound && !fetchError && plan && (
            <>
              {backLink}

              <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 shadow-md shadow-black/50">
                <div className="flex items-start justify-between">
                  <h1 className="text-3xl font-bold leading-tight text-white">{plan.name}</h1>
                  <span className="ml-6 flex-shrink-0 text-4xl font-bold text-green-400">
                    {formatPrice(plan.priceInCents)}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-gray-500">
                  {formatDuration(plan.durationDays)}
                </p>
                <p className="mt-6 text-base font-normal leading-relaxed text-white">
                  {plan.description}
                </p>
                <p className="mt-6 text-xs text-gray-600">
                  Available since {formatMonthYear(plan.createdAt)}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="mt-8 w-full rounded-md bg-green-500 px-6 py-3 text-base font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                >
                  Get Started
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
