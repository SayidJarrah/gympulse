import { useState } from 'react'
import type { UserMembership } from '../../types/userMembership'
import { MembershipStatusBadge } from './MembershipStatusBadge'
import { CancelMembershipModal } from './CancelMembershipModal'

interface MembershipStatusCardProps {
  membership: UserMembership;
  onCancelled: () => void;
}

/**
 * Formats an ISO 8601 date string ("2026-03-23") to a display string ("23 Mar 2026").
 * Uses UTC to avoid timezone-shift issues with date-only strings.
 */
function formatMembershipDate(isoDateString: string): string {
  // Append T00:00:00Z so Date interprets it as UTC, avoiding local-timezone shifts
  const date = new Date(`${isoDateString}T00:00:00Z`)
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function MembershipStatusCard({ membership, onCancelled }: MembershipStatusCardProps) {
  const [cancelModalOpen, setCancelModalOpen] = useState(false)

  const bookingsPct =
    membership.maxBookingsPerMonth > 0
      ? (membership.bookingsUsedThisMonth / membership.maxBookingsPerMonth) * 100
      : 0

  return (
    <>
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-md shadow-black/50">
        {/* Header row: plan name + status badge */}
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-bold leading-tight text-white">
            {membership.planName}
          </h2>
          <MembershipStatusBadge status={membership.status} />
        </div>

        {/* Date range */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Start date
            </p>
            <p className="mt-1 text-base font-medium text-white">
              {formatMembershipDate(membership.startDate)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              End date
            </p>
            <p className="mt-1 text-base font-medium text-white">
              {formatMembershipDate(membership.endDate)}
            </p>
          </div>
        </div>

        {/* Bookings usage bar */}
        <div className="mt-6">
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-300">Bookings this month</p>
            <p className="text-sm font-medium text-white">
              {membership.bookingsUsedThisMonth} / {membership.maxBookingsPerMonth}
            </p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
            <div
              role="progressbar"
              aria-valuenow={membership.bookingsUsedThisMonth}
              aria-valuemin={0}
              aria-valuemax={membership.maxBookingsPerMonth}
              aria-label="Bookings used this month"
              className="h-full rounded-full bg-green-500 transition-all duration-300"
              style={{ width: `${bookingsPct}%` }}
            />
          </div>
        </div>

        {/* Footer: cancel action */}
        <div className="mt-6 flex justify-end border-t border-gray-800 pt-4 sm:justify-end">
          <button
            type="button"
            onClick={() => setCancelModalOpen(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-red-400 transition-colors duration-200 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 sm:w-auto"
          >
            Cancel membership
          </button>
        </div>
      </div>

      <CancelMembershipModal
        isOpen={cancelModalOpen}
        membership={membership}
        onCancel={() => setCancelModalOpen(false)}
        onCancelled={() => {
          setCancelModalOpen(false)
          onCancelled()
        }}
      />
    </>
  )
}

export function MembershipStatusCardSkeleton() {
  return (
    <div
      className="rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-md shadow-black/50 animate-pulse"
      aria-hidden="true"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="h-7 w-48 rounded-md bg-gray-800" />
        <div className="h-5 w-16 rounded-full bg-gray-800" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-gray-800" />
          <div className="h-5 w-32 rounded bg-gray-800" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-gray-800" />
          <div className="h-5 w-32 rounded bg-gray-800" />
        </div>
      </div>
      <div className="mt-6 space-y-2">
        <div className="h-3 w-40 rounded bg-gray-800" />
        <div className="h-2 w-full rounded-full bg-gray-800" />
      </div>
    </div>
  )
}
