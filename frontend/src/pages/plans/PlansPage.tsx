import { useState } from 'react'
import { Navbar } from '../../components/layout/Navbar'
import { PlanCard, PlanCardSkeleton } from '../../components/plans/PlanCard'
import { usePlans } from '../../hooks/usePlans'

const PLANS_PER_PAGE = 9 // 3-column grid fills nicely with multiples of 3

export function PlansPage() {
  const [page, setPage] = useState(0)
  const { plans, totalPages, currentPage, totalElements, isLoading, error, refetch } = usePlans(
    page,
    PLANS_PER_PAGE
  )

  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      <Navbar />

      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page header */}
          <div className="pt-12 pb-8">
            <h1 className="text-3xl font-bold leading-tight text-white">Membership Plans</h1>
            <p className="mt-2 text-base font-normal leading-normal text-gray-400">
              Choose the plan that fits your goals.
            </p>
          </div>

          {/* Plan count */}
          {!isLoading && !error && (
            <p className="mb-4 text-sm text-gray-400">
              {totalElements} {totalElements === 1 ? 'plan' : 'plans'} available
            </p>
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <>
              {/* Visually hidden live region announces loading to screen readers */}
              <span className="sr-only" aria-live="polite">
                Loading plans...
              </span>
              <div
                className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
                aria-hidden="true"
              >
                {Array.from({ length: 3 }).map((_, i) => (
                  <PlanCardSkeleton key={i} />
                ))}
              </div>
            </>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <div className="flex flex-col items-center gap-4 py-24 text-center">
              <p className="text-base text-gray-400">{error}</p>
              <button
                type="button"
                onClick={refetch}
                className="inline-flex items-center justify-center rounded-md border border-green-500 bg-transparent px-4 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0F0F]"
              >
                Try again
              </button>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && plans.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-24 text-center">
              <p className="text-lg font-semibold text-white">No plans available</p>
              <p className="text-sm text-gray-400">
                Check back later for available membership options.
              </p>
            </div>
          )}

          {/* Plan grid */}
          {!isLoading && !error && plans.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
              </div>

              {/* Pagination controls — only rendered when more than one page */}
              {totalPages > 1 && (
                <div className="mt-10 flex items-center justify-between">
                  <p className="text-sm text-gray-400">
                    Page {currentPage + 1} of {totalPages}
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={currentPage === 0}
                      onClick={() => setPage((p) => p - 1)}
                      className="rounded-md border border-green-500 bg-transparent px-4 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0F0F]"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                      className="rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 disabled:cursor-not-allowed disabled:bg-green-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0F0F]"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Bottom spacing */}
          <div className="pb-16" />
        </div>
      </main>
    </div>
  )
}
