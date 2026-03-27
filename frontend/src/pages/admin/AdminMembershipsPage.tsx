import { useState, useEffect, useRef } from 'react'
import { CreditCardIcon } from '@heroicons/react/24/outline'
import { AdminSidebar } from '../../components/layout/AdminSidebar'
import { MembershipStatusBadge } from '../../components/membership/MembershipStatusBadge'
import { AdminCancelMembershipModal } from '../../components/membership/AdminCancelMembershipModal'
import type { UserMembership, MembershipStatus } from '../../types/userMembership'
import { useMembershipStore } from '../../store/membershipStore'

const PAGE_SIZE = 20

/**
 * Formats an ISO 8601 date string ("2026-03-23") to a display string ("23 Mar 2026").
 * Uses UTC to avoid timezone-shift issues with date-only strings.
 */
function formatMembershipDate(isoDateString: string): string {
  const date = new Date(`${isoDateString}T00:00:00Z`)
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function TableSkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-t border-gray-800 animate-pulse" aria-hidden="true">
          <td className="hidden px-4 py-3 sm:table-cell">
            <div className="h-4 w-24 rounded bg-gray-800" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 w-32 rounded bg-gray-800" />
          </td>
          <td className="px-4 py-3">
            <div className="h-5 w-16 rounded-full bg-gray-800" />
          </td>
          <td className="hidden px-4 py-3 sm:table-cell">
            <div className="h-4 w-24 rounded bg-gray-800" />
          </td>
          <td className="hidden px-4 py-3 sm:table-cell">
            <div className="h-4 w-24 rounded bg-gray-800" />
          </td>
          <td className="hidden px-4 py-3 sm:table-cell">
            <div className="h-4 w-16 rounded bg-gray-800" />
          </td>
          <td className="px-4 py-3 text-right">
            <div className="ml-auto h-7 w-14 rounded bg-gray-800" />
          </td>
        </tr>
      ))}
    </>
  )
}

export function AdminMembershipsPage() {
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState<MembershipStatus | ''>('')
  const [userIdFilter, setUserIdFilter] = useState('')
  const [debouncedUserId, setDebouncedUserId] = useState('')
  const [cancelTarget, setCancelTarget] = useState<UserMembership | null>(null)
  const userIdDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    adminMemberships,
    adminMembershipsTotalPages,
    adminMembershipsPage,
    adminMembershipsTotalElements,
    adminMembershipsLoading,
    adminMembershipsError,
    fetchAdminMemberships,
  } = useMembershipStore()

  // Debounce user ID filter input
  useEffect(() => {
    if (userIdDebounceRef.current) clearTimeout(userIdDebounceRef.current)
    userIdDebounceRef.current = setTimeout(() => {
      setDebouncedUserId(userIdFilter)
      setPage(0)
    }, 300)
    return () => {
      if (userIdDebounceRef.current) clearTimeout(userIdDebounceRef.current)
    }
  }, [userIdFilter])

  // Fetch when filters or page change
  useEffect(() => {
    fetchAdminMemberships(
      statusFilter !== '' ? statusFilter : undefined,
      debouncedUserId !== '' ? debouncedUserId : undefined,
      page,
      PAGE_SIZE
    )
  }, [statusFilter, debouncedUserId, page, fetchAdminMemberships])

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as MembershipStatus | '')
    setPage(0)
  }

  const handleUserIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserIdFilter(e.target.value)
  }

  const openCancelModal = (membership: UserMembership) => {
    setCancelTarget(membership)
  }

  const handleCancelModalClose = () => {
    setCancelTarget(null)
  }

  const handleMembershipCancelled = () => {
    setCancelTarget(null)
    // Re-fetch current page to reflect the updated status
    fetchAdminMemberships(
      statusFilter !== '' ? statusFilter : undefined,
      debouncedUserId !== '' ? debouncedUserId : undefined,
      page,
      PAGE_SIZE
    )
  }

  const currentPage = adminMembershipsPage
  const totalPages = adminMembershipsTotalPages
  const totalElements = adminMembershipsTotalElements

  return (
    <div className="flex h-screen bg-[#0F0F0F] overflow-hidden">
      <AdminSidebar />

      <main className="flex-1 overflow-y-auto bg-[#0F0F0F] p-8">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold leading-tight text-white">
              Memberships
            </h1>
            <p className="mt-1 text-base text-gray-400">
              All user subscriptions across the platform.
            </p>
          </div>
          {!adminMembershipsLoading && (
            <span className="inline-flex items-center rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-sm font-medium text-gray-300">
              {totalElements} total
            </span>
          )}
        </div>

        {/* Filter bar */}
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="status-filter"
              className="text-xs font-semibold uppercase tracking-wider text-gray-400"
            >
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={handleStatusChange}
              className="rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              <option value="">All</option>
              <option value="ACTIVE">Active</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="user-id-filter"
              className="text-xs font-semibold uppercase tracking-wider text-gray-400"
            >
              User ID
            </label>
            <input
              id="user-id-filter"
              type="text"
              value={userIdFilter}
              onChange={handleUserIdChange}
              placeholder="Paste user UUID..."
              className="w-72 rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-transparent"
            />
          </div>
        </div>

        {/* Error state */}
        {!adminMembershipsLoading && adminMembershipsError && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {adminMembershipsError}
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-gray-800 bg-[#0F0F0F]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-busy={adminMembershipsLoading}>
              <thead className="sticky top-0 bg-gray-900">
                <tr>
                  <th
                    scope="col"
                    className="hidden border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 sm:table-cell"
                  >
                    User ID
                  </th>
                  <th
                    scope="col"
                    className="border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400"
                  >
                    Plan
                  </th>
                  <th
                    scope="col"
                    className="border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="hidden border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 sm:table-cell"
                  >
                    Start date
                  </th>
                  <th
                    scope="col"
                    className="hidden border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 sm:table-cell"
                  >
                    End date
                  </th>
                  <th
                    scope="col"
                    className="hidden border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 sm:table-cell"
                  >
                    Bookings
                  </th>
                  <th
                    scope="col"
                    className="border-b border-gray-800 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {adminMembershipsLoading && <TableSkeletonRows />}

                {!adminMembershipsLoading && adminMemberships.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-800">
                          <CreditCardIcon
                            className="h-6 w-6 text-gray-500"
                            aria-hidden="true"
                          />
                        </div>
                        <p className="text-sm font-medium text-white">
                          No memberships found
                        </p>
                        <p className="text-sm text-gray-500">
                          Try adjusting the filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}

                {!adminMembershipsLoading &&
                  adminMemberships.map((membership) => (
                    <tr
                      key={membership.id}
                      className="border-t border-gray-800 transition-colors duration-100 hover:bg-gray-900 last:border-0"
                    >
                      <td className="hidden px-4 py-3 font-mono text-xs text-gray-400 sm:table-cell">
                        {membership.userId.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 font-medium text-white">
                        {membership.planName}
                      </td>
                      <td className="px-4 py-3">
                        <MembershipStatusBadge status={membership.status} />
                      </td>
                      <td className="hidden px-4 py-3 text-gray-400 sm:table-cell">
                        {formatMembershipDate(membership.startDate)}
                      </td>
                      <td className="hidden px-4 py-3 text-gray-400 sm:table-cell">
                        {formatMembershipDate(membership.endDate)}
                      </td>
                      <td className="hidden px-4 py-3 text-gray-400 sm:table-cell">
                        {membership.bookingsUsedThisMonth} /{' '}
                        {membership.maxBookingsPerMonth}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {membership.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => openCancelModal(membership)}
                            className="rounded-md px-3 py-2 text-xs font-medium text-red-400 transition-colors duration-150 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {!adminMembershipsLoading && totalElements > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing{' '}
              {Math.min(currentPage * PAGE_SIZE + 1, totalElements)}
              –
              {Math.min((currentPage + 1) * PAGE_SIZE, totalElements)} of{' '}
              {totalElements}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-md border border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors duration-150 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                Previous
              </button>
              <span className="text-sm text-gray-400">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors duration-150 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Admin cancel modal */}
      {cancelTarget && (
        <AdminCancelMembershipModal
          isOpen={true}
          membership={cancelTarget}
          onCancel={handleCancelModalClose}
          onCancelled={handleMembershipCancelled}
        />
      )}
    </div>
  )
}
