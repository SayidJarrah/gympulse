import { useState, forwardRef, useImperativeHandle, useId } from 'react'
import { ExclamationCircleIcon } from '@heroicons/react/24/outline'
import { useOnboardingStore } from '../../../store/onboardingStore'
import { TermsModal } from '../TermsModal'

export interface StepTermsHandle {
  canContinue: () => boolean
}

interface StepTermsProps {
  externalError?: string | null
}

export const StepTerms = forwardRef<StepTermsHandle, StepTermsProps>(({ externalError }, ref) => {
  const store = useOnboardingStore()
  const [agreeTerms, setAgreeTerms] = useState(store.agreeTerms)
  const [agreeWaiver, setAgreeWaiver] = useState(store.agreeWaiver)
  const [notifBooking, setNotifBooking] = useState(store.notifBooking)
  const [notifNews, setNotifNews] = useState(store.notifNews)
  const [modal, setModal] = useState<'terms' | 'waiver' | null>(null)

  const termsId = useId()
  const waiverId = useId()
  const bookingId = useId()
  const newsId = useId()

  useImperativeHandle(ref, () => ({
    canContinue: () => agreeTerms && agreeWaiver
  }))

  // Sync to store on every change
  function updateTerms(val: boolean) {
    setAgreeTerms(val)
    store.setTerms({ agreeTerms: val, agreeWaiver, notifBooking, notifNews })
  }
  function updateWaiver(val: boolean) {
    setAgreeWaiver(val)
    store.setTerms({ agreeTerms, agreeWaiver: val, notifBooking, notifNews })
  }
  function updateNotifBooking(val: boolean) {
    setNotifBooking(val)
    store.setTerms({ agreeTerms, agreeWaiver, notifBooking: val, notifNews })
  }
  function updateNotifNews(val: boolean) {
    setNotifNews(val)
    store.setTerms({ agreeTerms, agreeWaiver, notifBooking, notifNews: val })
  }

  return (
    <div className="flex flex-col gap-8 max-w-[560px]">
      {/* Eyebrow */}
      <p
        className="text-xs font-semibold uppercase"
        style={{ letterSpacing: '0.22em', color: 'var(--color-primary-light)' }}
      >
        Step 06 · Final check
      </p>

      <div className="flex items-center gap-2">
        <h1
          className="uppercase leading-none"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 5vw, 48px)',
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: 'var(--color-fg-default)',
          }}
        >
          Final check
        </h1>
        <span
          className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full"
          style={{
            letterSpacing: '0.18em',
            color: 'var(--color-primary-light)',
            background: 'var(--color-primary-tint)',
            border: '1px solid var(--color-primary-border)',
          }}
        >
          Required
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <ToggleRow
          id={termsId}
          label="I agree to the GymFlow terms of use"
          helper="Read the full terms before agreeing."
          required
          checked={agreeTerms}
          onChange={updateTerms}
          onRead={() => setModal('terms')}
        />
        <ToggleRow
          id={waiverId}
          label="I acknowledge the health and liability waiver"
          helper="Confirm you've read the waiver."
          required
          checked={agreeWaiver}
          onChange={updateWaiver}
          onRead={() => setModal('waiver')}
        />
        <ToggleRow
          id={bookingId}
          label="Booking reminders"
          helper="Get reminders before your booked classes."
          required={false}
          checked={notifBooking}
          onChange={updateNotifBooking}
        />
        <ToggleRow
          id={newsId}
          label="Product updates and events"
          helper="Hear about new features and GymFlow events."
          required={false}
          checked={notifNews}
          onChange={updateNotifNews}
        />
      </div>

      {(!agreeTerms || !agreeWaiver) && (
        <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>
          Please agree to the terms and waiver to continue.
        </p>
      )}

      {externalError && (
        <p className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-error-fg)' }}>
          <ExclamationCircleIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {externalError}
        </p>
      )}

      {modal && (
        <TermsModal
          title={modal === 'terms' ? 'Terms of use' : 'Health & liability waiver'}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
})

StepTerms.displayName = 'StepTerms'

interface ToggleRowProps {
  id: string
  label: string
  helper: string
  required: boolean
  checked: boolean
  onChange: (val: boolean) => void
  onRead?: () => void
}

function ToggleRow({ id, label, helper, required, checked, onChange, onRead }: ToggleRowProps) {
  return (
    <div
      className="flex items-start gap-4 p-4 rounded-xl transition-colors"
      style={{
        background: 'var(--color-bg-surface-1)',
        border: '1px solid var(--color-border-card)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {/* Custom checkbox */}
      <button
        type="button"
        id={id}
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="w-[22px] h-[22px] rounded-md shrink-0 mt-0.5 flex items-center justify-center transition-all duration-150"
        style={{
          background: checked ? 'var(--color-primary)' : 'transparent',
          border: `2px solid ${checked ? 'var(--color-primary)' : 'var(--color-border-input)'}`,
        }}
        aria-required={required}
      >
        {checked && (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#0F0F0F" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </button>

      {/* Label + helper */}
      <div className="flex-1 min-w-0">
        <label
          htmlFor={id}
          className="text-sm font-medium cursor-pointer"
          style={{ color: 'var(--color-fg-default)' }}
        >
          {label}
          {required && <span style={{ color: 'var(--color-error-fg)' }}> *</span>}
        </label>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-fg-muted)' }}>{helper}</p>
      </div>

      {/* Read link */}
      {onRead && (
        <button
          type="button"
          onClick={onRead}
          className="text-xs shrink-0 underline transition-colors"
          style={{ color: 'var(--color-fg-link)' }}
        >
          Read
        </button>
      )}
    </div>
  )
}
