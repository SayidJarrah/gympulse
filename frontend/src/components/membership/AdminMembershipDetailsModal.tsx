import { useEffect, useRef, useState } from 'react'
import {
  DocumentDuplicateIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import type { UserMembership } from '../../types/userMembership'
import { MembershipStatusBadge } from './MembershipStatusBadge'

interface AdminMembershipDetailsModalProps {
  isOpen: boolean;
  membership: UserMembership;
  onClose: () => void;
  onCancelMembership: (membership: UserMembership) => void;
}

function formatMembershipDate(isoDateString: string | null): string {
  if (!isoDateString) return '--'
  const date = new Date(`${isoDateString}T00:00:00Z`)
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function formatMembershipDateTime(isoDateTimeString: string | null): string {
  if (!isoDateTimeString) return '--'
  const date = new Date(isoDateTimeString)
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatDisplayValue(value?: string | null): string {
  if (!value || value.trim().length === 0) return '--'
  return value
}

function getInitials(firstName?: string | null, lastName?: string | null, email?: string | null) {
  const firstInitial = firstName?.[0] ?? ''
  const lastInitial = lastName?.[0] ?? ''
  const initials = `${firstInitial}${lastInitial}`.toUpperCase()
  if (initials.trim().length > 0) return initials
  return email?.[0]?.toUpperCase() ?? '?'
}

export function AdminMembershipDetailsModal({
  isOpen,
  membership,
  onClose,
  onCancelMembership,
}: AdminMembershipDetailsModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isOpen) {
      setCopiedField(null)
      setTimeout(() => closeButtonRef.current?.focus(), 0)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [])

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) {
      onClose()
    }
  }

  const handleCopy = async (value: string, field: string) => {
    if (!navigator?.clipboard) return
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopiedField(null), 1500)
    } catch {
      // Ignore clipboard errors
    }
  }

  if (!isOpen) return null

  const fullName = [membership.userFirstName, membership.userLastName]
    .filter(Boolean)
    .join(' ')
  const displayName = fullName || membership.userEmail || 'Member'
  const initials = getInitials(
    membership.userFirstName,
    membership.userLastName,
    membership.userEmail
  )

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-membership-details-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={handleOverlayClick}
    >
      <div className="relative w-full max-w-3xl rounded-2xl border border-gray-800 bg-gray-900 shadow-xl shadow-black/50">
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-800 text-sm font-semibold text-white">
              {initials}
            </div>
            <div>
              <h2
                id="admin-membership-details-title"
                className="text-xl font-semibold text-white"
              >
                {displayName}
              </h2>
              <p className="text-sm text-gray-400">
                Membership details and member profile
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <UserCircleIcon className="h-5 w-5 text-gray-400" />
                Member profile
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-gray-400">User ID</dt>
                  <dd className="flex items-center gap-2 text-right text-gray-200">
                    <span className="font-mono text-xs text-gray-400">
                      {membership.userId.slice(0, 10)}...
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(membership.userId, 'userId')}
                      className="rounded-md p-1 text-gray-400 hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                      aria-label="Copy user ID"
                    >
                      <DocumentDuplicateIcon
                        className={`h-4 w-4 ${
                          copiedField === 'userId' ? 'text-green-400' : ''
                        }`}
                      />
                    </button>
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-gray-400">Email</dt>
                  <dd className="text-right text-gray-200">
                    {formatDisplayValue(membership.userEmail)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-gray-400">Phone</dt>
                  <dd className="text-right text-gray-200">
                    {formatDisplayValue(membership.userPhone)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-gray-400">Date of birth</dt>
                  <dd className="text-right text-gray-200">
                    {formatMembershipDate(membership.userDateOfBirth)}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-400">Fitness goals</dt>
                  <dd className="mt-2 flex flex-wrap gap-2 text-right">
                    {membership.userFitnessGoals.length > 0 ? (
                      membership.userFitnessGoals.map((goal) => (
                        <span
                          key={goal}
                          className="rounded-full border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs text-gray-200"
                        >
                          {goal}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">None provided</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-400">Preferred class types</dt>
                  <dd className="mt-2 flex flex-wrap gap-2 text-right">
                    {membership.userPreferredClassTypes.length > 0 ? (
                      membership.userPreferredClassTypes.map((type) => (
                        <span
                          key={type}
                          className="rounded-full border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs text-gray-200"
                        >
                          {type}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">None provided</span>
                    )}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-xl border border-gray-800 bg-gray-900/60 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                Membership
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-gray-400">Membership ID</dt>
                  <dd className="flex items-center gap-2 text-right text-gray-200">
                    <span className="font-mono text-xs text-gray-400">
                      {membership.id.slice(0, 10)}...
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(membership.id, 'membershipId')}
                      className="rounded-md p-1 text-gray-400 hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                      aria-label="Copy membership ID"
                    >
                      <DocumentDuplicateIcon
                        className={`h-4 w-4 ${
                          copiedField === 'membershipId' ? 'text-green-400' : ''
                        }`}
                      />
                    </button>
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-gray-400">Plan</dt>
                  <dd className="text-right text-gray-200">{membership.planName}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-gray-400">Status</dt>
                  <dd>
                    <MembershipStatusBadge status={membership.status} />
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-gray-400">Start date</dt>
                  <dd className="text-right text-gray-200">
                    {formatMembershipDate(membership.startDate)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-gray-400">End date</dt>
                  <dd className="text-right text-gray-200">
                    {formatMembershipDate(membership.endDate)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-gray-400">Bookings</dt>
                  <dd className="text-right text-gray-200">
                    {membership.bookingsUsedThisMonth} / {membership.maxBookingsPerMonth}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-gray-400">Created at</dt>
                  <dd className="text-right text-gray-200">
                    {formatMembershipDateTime(membership.createdAt)}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-800 px-6 py-4">
          <p className="text-xs text-gray-500">
            {copiedField ? 'Copied to clipboard.' : 'Click any ID icon to copy.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-colors duration-150 hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              Close
            </button>
            {membership.status === 'ACTIVE' && (
              <button
                type="button"
                onClick={() => onCancelMembership(membership)}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                Cancel membership
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
