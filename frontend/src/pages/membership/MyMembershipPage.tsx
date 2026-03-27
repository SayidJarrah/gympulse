import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CreditCardIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { Navbar } from '../../components/layout/Navbar'
import {
  MembershipStatusCard,
  MembershipStatusCardSkeleton,
} from '../../components/membership/MembershipStatusCard'
import { useMembershipStore } from '../../store/membershipStore'

export function MyMembershipPage() {
  const {
    activeMembership,
    membershipLoading,
    membershipError,
    membershipErrorCode,
    fetchMyMembership,
  } = useMembershipStore()

  useEffect(() => {
    fetchMyMembership()
  }, [fetchMyMembership])

  const isNoMembership = membershipErrorCode === 'NO_ACTIVE_MEMBERSHIP'

  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      <Navbar />

      <main>
        <div className="max-w-2xl mx-auto px-4 py-12">
          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold leading-tight text-white">
              My Membership
            </h1>
            <p className="mt-1 text-base text-gray-400">
              Manage your active subscription.
            </p>
          </div>

          {/* Loading skeleton */}
          {membershipLoading && (
            <>
              <span className="sr-only" aria-live="polite">
                Loading membership...
              </span>
              <MembershipStatusCardSkeleton />
            </>
          )}

          {/* Active membership */}
          {!membershipLoading && activeMembership && (
            <MembershipStatusCard
              membership={activeMembership}
              onCancelled={fetchMyMembership}
            />
          )}

          {/* No active membership empty state */}
          {!membershipLoading && !membershipError && isNoMembership && (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 py-16 px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-800">
                <CreditCardIcon
                  className="h-7 w-7 text-gray-500"
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">
                  No active membership
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  You do not have an active membership. Browse our plans to get
                  started.
                </p>
              </div>
              <Link
                to="/plans"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-green-500 px-6 py-3 text-base font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                Browse plans
              </Link>
            </div>
          )}

          {/* General error state */}
          {!membershipLoading && membershipError && (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-red-500/30 bg-red-500/10 py-12 px-6 text-center">
              <ExclamationTriangleIcon
                className="h-8 w-8 text-red-400"
                aria-hidden="true"
              />
              <p className="text-base font-semibold text-white">
                Something went wrong
              </p>
              <p className="text-sm text-gray-400">
                Unable to load your membership. Please try again.
              </p>
              <button
                type="button"
                onClick={fetchMyMembership}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-green-500 bg-transparent px-4 py-2 text-sm font-medium text-green-400 transition-all duration-200 hover:bg-green-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
