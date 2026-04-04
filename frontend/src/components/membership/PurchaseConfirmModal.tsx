import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { MembershipPlan } from '../../types/membershipPlan'
import { useMembershipStore } from '../../store/membershipStore'
import { getMembershipErrorMessage } from '../../utils/membershipErrors'
import { formatPrice } from '../../utils/planFormatters'
import { buildHomeMembershipPath } from '../../utils/accessFlowNavigation'
import type { AxiosError } from 'axios'
import type { ApiErrorResponse } from '../../types/auth'

interface PurchaseConfirmModalProps {
  isOpen: boolean;
  plan: MembershipPlan;
  onCancel: () => void;
  onSuccess?: () => void;
  redirectTo?: string | null;
}

export function PurchaseConfirmModal({
  isOpen,
  plan,
  onCancel,
  onSuccess,
  redirectTo = buildHomeMembershipPath('activated'),
}: PurchaseConfirmModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { purchaseMembership, fetchMyMembership } = useMembershipStore()
  const navigate = useNavigate()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Reset error when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null)
      setIsLoading(false)
      // Focus the close button when modal opens
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
      await purchaseMembership(plan.id)
      onCancel()
      onSuccess?.()
      if (redirectTo) {
        navigate(redirectTo)
      }
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code ?? ''

      if (code === 'MEMBERSHIP_ALREADY_ACTIVE') {
        await fetchMyMembership()

        if (useMembershipStore.getState().activeMembership) {
          onCancel()
          onSuccess?.()
          navigate(buildHomeMembershipPath('already-active'))
          return
        }
      }

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
      aria-labelledby="purchase-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={handleOverlayClick}
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-900 shadow-xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-5">
          <h2
            id="purchase-modal-title"
            className="text-xl font-semibold text-white"
          >
            Activate plan?
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
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-semibold text-white">{plan.name}</p>
              <p className="mt-0.5 text-sm text-gray-400">
                {plan.durationDays}-day membership
              </p>
            </div>
            <p className="text-2xl font-bold text-green-400">
              {formatPrice(plan.priceInCents)}
            </p>
          </div>
          <div className="my-4 border-t border-gray-800" />
          <p className="text-sm text-gray-400">
            Your membership starts today. You can cancel at any time.
          </p>
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
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:bg-green-500/40"
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
                Activating...
              </>
            ) : (
              'Confirm'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
