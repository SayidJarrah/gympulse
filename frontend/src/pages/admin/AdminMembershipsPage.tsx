import { useState, useEffect, useRef } from 'react'
import { CreditCardIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline'
import { AdminSidebar } from '../../components/layout/AdminSidebar'
import { MembershipStatusBadge } from '../../components/membership/MembershipStatusBadge'
import { AdminCancelMembershipModal } from '../../components/membership/AdminCancelMembershipModal'
import { AdminMembershipDetailsModal } from '../../components/membership/AdminMembershipDetailsModal'
import { getUserProfilePhotoBlob } from '../../api/profile'
import type {
  UserMembership,
  MembershipStatus,
  AdminMembershipsQuery,
} from '../../types/userMembership'
import { useMembershipStore } from '../../store/membershipStore'
import { revokeObjectUrl } from '../../utils/entityImage'

const PAGE_SIZE = 20
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

function getMemberDisplayName(membership: UserMembership): string {
  const fullName = [membership.userFirstName, membership.userLastName]
    .filter(Boolean)
    .join(' ')
  if (fullName.trim().length > 0) return fullName
  if (membership.userEmail) return membership.userEmail
  return 'Member'
}

function getMemberInitials(membership: UserMembership): string {
  const firstInitial = membership.userFirstName?.[0] ?? ''
  const lastInitial = membership.userLastName?.[0] ?? ''
  const initials = `${firstInitial}${lastInitial}`.toUpperCase()
  if (initials.trim().length > 0) return initials
  return membership.userEmail?.[0]?.toUpperCase() ?? '?'
}

function TableSkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-t border-gray-800 animate-pulse" aria-hidden="true">
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gray-800" />
              <div className="space-y-2">
                <div className="h-4 w-32 rounded bg-gray-800" />
                <div className="h-3 w-24 rounded bg-gray-800" />
              </div>
            </div>
          </td>
          <td className="hidden px-4 py-3 sm:table-cell">
            <div className="h-4 w-24 rounded bg-gray-800" />
          </td>
          <td className="px-4 py-3">
            <div className="h-5 w-16 rounded-full bg-gray-800" />
          </td>
          <td className="hidden px-4 py-3 lg:table-cell">
            <div className="h-4 w-24 rounded bg-gray-800" />
          </td>
          <td className="hidden px-4 py-3 lg:table-cell">
            <div className="h-4 w-24 rounded bg-gray-800" />
          </td>
          <td className="hidden px-4 py-3 xl:table-cell">
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

function buildAdminMembershipsQuery(
  status: MembershipStatus | '',
  searchInput: string,
  page: number
): AdminMembershipsQuery {
  const trimmedSearchInput = searchInput.trim()

  return {
    ...(status !== '' ? { status } : {}),
    ...(trimmedSearchInput !== ''
      ? UUID_PATTERN.test(trimmedSearchInput)
        ? { userId: trimmedSearchInput }
        : { memberQuery: trimmedSearchInput }
      : {}),
    page,
    size: PAGE_SIZE,
  }
}

export function AdminMembershipsPage() {
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState<MembershipStatus | ''>('')
  const [memberSearchFilter, setMemberSearchFilter] = useState('')
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState('')
  const [cancelTarget, setCancelTarget] = useState<UserMembership | null>(null)
  const [detailTarget, setDetailTarget] = useState<UserMembership | null>(null)
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null)
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({})
  const memberSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const avatarUrlsRef = useRef<Record<string, string>>({})

  const {
    adminMemberships,
    adminMembershipsTotalPages,
    adminMembershipsPage,
    adminMembershipsTotalElements,
    adminMembershipsLoading,
    adminMembershipsError,
    fetchAdminMemberships,
  } = useMembershipStore()

  // Debounce the member search input while keeping filter-on-change behavior.
  useEffect(() => {
    if (memberSearchDebounceRef.current) clearTimeout(memberSearchDebounceRef.current)
    memberSearchDebounceRef.current = setTimeout(() => {
      setDebouncedMemberSearch(memberSearchFilter)
    }, 300)
    return () => {
      if (memberSearchDebounceRef.current) clearTimeout(memberSearchDebounceRef.current)
    }
  }, [memberSearchFilter])

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    avatarUrlsRef.current = avatarUrls
  }, [avatarUrls])

  useEffect(() => {
    let isCancelled = false
    const desiredIds = new Set(
      adminMemberships
        .filter((membership) => membership.userHasProfilePhoto || Boolean(membership.userProfilePhotoUrl))
        .map((membership) => membership.userId)
    )

    const currentUrls = avatarUrlsRef.current
    const nextUrls: Record<string, string> = { ...currentUrls }
    Object.entries(currentUrls).forEach(([userId, url]) => {
      if (!desiredIds.has(userId)) {
        revokeObjectUrl(url)
        delete nextUrls[userId]
      }
    })

    if (Object.keys(nextUrls).length !== Object.keys(currentUrls).length) {
      setAvatarUrls(nextUrls)
    }

    const missingIds = Array.from(desiredIds).filter((userId) => !nextUrls[userId])
    if (missingIds.length === 0) {
      return () => {
        isCancelled = true
      }
    }

    const loadPhotos = async () => {
      const updates: Record<string, string> = {}
      await Promise.all(
        missingIds.map(async (userId) => {
          try {
            const blob = await getUserProfilePhotoBlob(userId)
            updates[userId] = URL.createObjectURL(blob)
          } catch {
            // Ignore image fetch failures and keep initials fallback.
          }
        })
      )

      if (isCancelled) {
        Object.values(updates).forEach(revokeObjectUrl)
        return
      }

      if (Object.keys(updates).length > 0) {
        setAvatarUrls((prev) => ({ ...prev, ...updates }))
      }
    }

    loadPhotos()

    return () => {
      isCancelled = true
    }
  }, [adminMemberships])

  useEffect(() => {
    return () => {
      Object.values(avatarUrlsRef.current).forEach(revokeObjectUrl)
    }
  }, [])

  // Fetch when filters or page change
  useEffect(() => {
    fetchAdminMemberships(
      buildAdminMembershipsQuery(statusFilter, debouncedMemberSearch, page)
    )
  }, [statusFilter, debouncedMemberSearch, page, fetchAdminMemberships])

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as MembershipStatus | '')
    setPage(0)
  }

  const handleMemberSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMemberSearchFilter(e.target.value)
    setPage(0)
  }

  const handleCopyUserId = async (
    event: React.MouseEvent<HTMLButtonElement>,
    userId: string
  ) => {
    event.stopPropagation()
    if (!navigator?.clipboard) return
    try {
      await navigator.clipboard.writeText(userId)
      setCopiedUserId(userId)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopiedUserId(null), 1500)
    } catch {
      // Ignore clipboard errors
    }
  }

  const openDetailModal = (membership: UserMembership) => {
    setDetailTarget(membership)
  }

  const openCancelModal = (membership: UserMembership) => {
    setCancelTarget(membership)
  }

  const handleCancelModalClose = () => {
    setCancelTarget(null)
  }

  const handleDetailClose = () => {
    setDetailTarget(null)
  }

  const handleDetailCancel = (membership: UserMembership) => {
    setDetailTarget(null)
    openCancelModal(membership)
  }

  const handleMembershipCancelled = () => {
    setCancelTarget(null)
    // Re-fetch current page to reflect the updated status
    fetchAdminMemberships(buildAdminMembershipsQuery(statusFilter, debouncedMemberSearch, page))
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
              Name or UUID
            </label>
            <input
              id="user-id-filter"
              type="text"
              value={memberSearchFilter}
              onChange={handleMemberSearchChange}
              placeholder="Search by first name, last name, or UUID"
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
                    className="border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400"
                  >
                    Member
                  </th>
                  <th
                    scope="col"
                    className="hidden border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 sm:table-cell"
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
                    className="hidden border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 lg:table-cell"
                  >
                    Start date
                  </th>
                  <th
                    scope="col"
                    className="hidden border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 lg:table-cell"
                  >
                    End date
                  </th>
                  <th
                    scope="col"
                    className="hidden border-b border-gray-800 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 xl:table-cell"
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
                      role="button"
                      tabIndex={0}
                      onClick={() => openDetailModal(membership)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          openDetailModal(membership)
                        }
                      }}
                      className="border-t border-gray-800 transition-colors duration-100 hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 last:border-0 cursor-pointer"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {avatarUrls[membership.userId] ? (
                            <img
                              src={avatarUrls[membership.userId]}
                              alt={`${getMemberDisplayName(membership)} avatar`}
                              className="h-9 w-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 text-xs font-semibold text-white">
                              {getMemberInitials(membership)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-semibold text-white">
                                {getMemberDisplayName(membership)}
                              </p>
                              <button
                                type="button"
                                onClick={(event) => handleCopyUserId(event, membership.userId)}
                                className="rounded-md p-1 text-gray-400 hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                                aria-label="Copy user ID"
                                title="Copy user ID"
                              >
                                <DocumentDuplicateIcon
                                  className={`h-4 w-4 ${
                                    copiedUserId === membership.userId ? 'text-green-400' : ''
                                  }`}
                                />
                              </button>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                              <span className="truncate">
                                {membership.userEmail ?? 'No email on file'}
                              </span>
                              {membership.userPhone && (
                                <>
                                  <span className="hidden sm:inline text-gray-700">•</span>
                                  <span className="hidden sm:inline">{membership.userPhone}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 font-medium text-white sm:table-cell">
                        {membership.planName}
                      </td>
                      <td className="px-4 py-3">
                        <MembershipStatusBadge status={membership.status} />
                      </td>
                      <td className="hidden px-4 py-3 text-gray-400 lg:table-cell">
                        {formatMembershipDate(membership.startDate)}
                      </td>
                      <td className="hidden px-4 py-3 text-gray-400 lg:table-cell">
                        {formatMembershipDate(membership.endDate)}
                      </td>
                      <td className="hidden px-4 py-3 text-gray-400 xl:table-cell">
                        {membership.bookingsUsedThisMonth} /{' '}
                        {membership.maxBookingsPerMonth}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {membership.status === 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              openCancelModal(membership)
                            }}
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
        {!adminMembershipsLoading && totalPages > 1 && (
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

      {detailTarget && (
        <AdminMembershipDetailsModal
          isOpen={true}
          membership={detailTarget}
          avatarUrl={avatarUrls[detailTarget.userId] ?? null}
          onClose={handleDetailClose}
          onCancelMembership={handleDetailCancel}
        />
      )}
    </div>
  )
}
