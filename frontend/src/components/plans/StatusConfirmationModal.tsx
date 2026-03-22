import { useState, useEffect, useCallback, useRef } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { MembershipPlan } from '../../types/membershipPlan'
import { activatePlan, deactivatePlan } from '../../api/membershipPlans'
import { useMembershipPlanStore } from '../../store/membershipPlanStore'
import type { AxiosError } from 'axios'
import type { ApiErrorResponse } from '../../types/auth'
import { getPlanErrorMessage } from '../../utils/planErrors'

interface StatusConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: MembershipPlan | null;
}

export function StatusConfirmationModal({ isOpen, onClose, plan }: StatusConfirmationModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { updatePlanInStore } = useMembershipPlanStore()
  const actionButtonRef = useRef<HTMLButtonElement>(null)

  const isDeactivating = plan?.status === 'ACTIVE'

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null)
      setIsLoading(false)
      // Focus the action button when modal opens
      setTimeout(() => actionButtonRef.current?.focus(), 50)
    }
  }, [isOpen, plan])

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose()
      }
    },
    [isLoading, onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  const handleConfirm = async () => {
    if (!plan) return
    setIsLoading(true)
    setError(null)

    try {
      const updated = isDeactivating
        ? await deactivatePlan(plan.id)
        : await activatePlan(plan.id)
      updatePlanInStore(updated)
      onClose()
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code ?? ''
      const message = getPlanErrorMessage(code, axiosError.response?.data?.error)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen || !plan) return null

  const title = isDeactivating ? 'Deactivate Plan' : 'Reactivate Plan'
  const bodyText = isDeactivating
    ? `Are you sure you want to deactivate "${plan.name}"? Existing members on this plan will not be affected.`
    : `Reactivate "${plan.name}"? It will immediately appear in the public plan catalogue.`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
      aria-describedby="status-modal-body"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose()
      }}
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-900 shadow-xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-5">
          <h2 id="status-modal-title" className="text-xl font-semibold text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-md p-1 text-gray-500 transition-colors duration-200 hover:bg-gray-800 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div id="status-modal-body" className="px-6 py-6">
          <p className="text-sm text-gray-400">{bodyText}</p>

          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-800 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-transparent px-4 py-2 text-sm font-medium text-gray-400 transition-all duration-200 hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:text-gray-700"
          >
            Cancel
          </button>
          <button
            ref={actionButtonRef}
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            aria-busy={isLoading}
            className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed ${
              isDeactivating
                ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500 disabled:bg-red-600/40'
                : 'bg-green-500 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:ring-green-500 disabled:bg-green-500/40'
            }`}
          >
            {isLoading ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
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
                {isDeactivating ? 'Deactivating...' : 'Activating...'}
              </>
            ) : isDeactivating ? (
              'Deactivate'
            ) : (
              'Activate'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
