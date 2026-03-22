import { useState, useEffect, useCallback } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { MembershipPlan, MembershipPlanRequest } from '../../types/membershipPlan'
import { PlanForm } from './PlanForm'
import { createPlan, updatePlan } from '../../api/membershipPlans'
import { useMembershipPlanStore } from '../../store/membershipPlanStore'
import type { AxiosError } from 'axios'
import type { ApiErrorResponse } from '../../types/auth'
import { getPlanErrorMessage, FIELD_ERROR_CODES } from '../../utils/planErrors'

interface PlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editTarget?: MembershipPlan; // undefined = create mode
}

const FORM_ID = 'plan-form-modal'

export function PlanFormModal({ isOpen, onClose, editTarget }: PlanFormModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof MembershipPlanRequest, string>>>({})
  const { addPlan, updatePlanInStore } = useMembershipPlanStore()

  const isEditMode = editTarget !== undefined
  const title = isEditMode ? 'Edit Plan' : 'New Plan'

  // Reset error state when modal opens/closes or switches between create/edit
  useEffect(() => {
    if (isOpen) {
      setServerError(null)
      setFieldErrors({})
      setIsLoading(false)
    }
  }, [isOpen, editTarget])

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

  const handleSubmit = async (req: MembershipPlanRequest) => {
    setIsLoading(true)
    setServerError(null)
    setFieldErrors({})

    try {
      if (isEditMode) {
        const updated = await updatePlan(editTarget.id, req)
        updatePlanInStore(updated)
      } else {
        const created = await createPlan(req)
        addPlan(created)
      }
      onClose()
    } catch (err) {
      const axiosError = err as AxiosError<ApiErrorResponse>
      const code = axiosError.response?.data?.code ?? ''
      const message = getPlanErrorMessage(code, axiosError.response?.data?.error)

      // Field-level error codes get placed under their input
      if (code in FIELD_ERROR_CODES) {
        const fieldKey = FIELD_ERROR_CODES[code]
        setFieldErrors({ [fieldKey]: message })
      } else {
        // All other errors (server errors, 409 conflicts) go to the banner
        setServerError(message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-form-modal-title"
      aria-describedby="plan-form-modal-body"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose()
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 shadow-xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-5">
          <h2 id="plan-form-modal-title" className="text-xl font-semibold text-white">
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
        <div id="plan-form-modal-body" className="overflow-y-auto px-6 py-6">
          <PlanForm
            formId={FORM_ID}
            initialValues={
              editTarget
                ? {
                    name: editTarget.name,
                    description: editTarget.description,
                    priceInCents: editTarget.priceInCents,
                    durationDays: editTarget.durationDays,
                  }
                : undefined
            }
            onSubmit={handleSubmit}
            isLoading={isLoading}
            serverError={serverError}
            fieldErrors={fieldErrors}
          />
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
            type="submit"
            form={FORM_ID}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:bg-green-500/40"
            aria-busy={isLoading}
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
                Saving...
              </>
            ) : (
              'Save Plan'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
