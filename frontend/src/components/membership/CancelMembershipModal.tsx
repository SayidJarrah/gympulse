import { useState, useEffect, useRef } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { UserMembership } from '../../types/userMembership'
import { useMembershipStore } from '../../store/membershipStore'
import { getMembershipErrorMessage } from '../../utils/membershipErrors'
import type { AxiosError } from 'axios'
import type { ApiErrorResponse } from '../../types/auth'

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

interface CancelMembershipModalProps {
  isOpen: boolean;
  membership: UserMembership;
  onCancel: () => void;
  onCancelled: () => void;
}

export function CancelMembershipModal({
  isOpen,
  membership,
  onCancel,
  onCancelled,
}: CancelMembershipModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { cancelMyMembership } = useMembershipStore()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null)
      setIsLoading(false)
      setTimeout(() => closeButtonRef.current?.focus(), 0)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, onCancel])

  const handleConfirm = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await cancelMyMembership()
      onCancelled()
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code ?? ''
      setError(getMembershipErrorMessage(code))
      setIsLoading(false)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current && !isLoading) {
      onCancel()
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-membership-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={handleOverlayClick}
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-900 shadow-xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-5">
          <h2
            id="cancel-membership-modal-title"
            className="text-xl font-semibold text-white"
          >
            Cancel membership?
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <p className="text-sm text-gray-400">
            You will immediately lose access to class bookings. You can re-activate a
            new plan at any time.
          </p>
          <div className="mt-4 rounded-md border border-gray-800 bg-gray-800/50 px-4 py-3">
            <p className="text-sm font-medium text-white">{membership.planName}</p>
            <p className="mt-0.5 text-sm text-gray-400">
              Active until {formatMembershipDate(membership.endDate)}
            </p>
          </div>
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-800 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-transparent px-4 py-2 text-sm font-medium text-gray-400 transition-all duration-200 hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:text-gray-700"
          >
            Keep membership
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:bg-red-600/40"
          >
            {isLoading ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Cancelling...
              </>
            ) : (
              'Cancel membership'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
