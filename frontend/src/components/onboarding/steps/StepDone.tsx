import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnboardingStore } from '../../../store/onboardingStore'
import { useAuthStore } from '../../../store/authStore'
import { completeOnboarding } from '../../../api/onboarding'

interface StepDoneProps {
  onReviewInfo: () => void
}

export function StepDone({ onReviewInfo }: StepDoneProps) {
  const navigate = useNavigate()
  const store = useOnboardingStore()
  const setOnboardingCompletedAt = useAuthStore(s => s.setOnboardingCompletedAt)
  const onboardingCompletedAt = useAuthStore(s => s.onboardingCompletedAt)
  const completeFiredRef = useRef(false)

  // Fire POST /onboarding/complete once on mount, after the unified-signup
  // register has authenticated the user. The auth store already has the
  // tokens by this point (set in OnboardingShell.terms-case before
  // setStep('done')). SDD §4.3 / §4.4.
  useEffect(() => {
    if (completeFiredRef.current) return
    if (onboardingCompletedAt) return
    completeFiredRef.current = true
    completeOnboarding()
      .then(res => {
        setOnboardingCompletedAt(res.onboardingCompletedAt)
      })
      .catch(() => {
        // Non-fatal — the user can finish from the Done screen and any later
        // login will resume them at the right state via useBootstrap.
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const name = store.firstName || 'there'

  return (
    <div
      className="flex flex-col items-center text-center gap-8 w-full max-w-3xl mx-auto py-16"
      style={{ color: 'var(--color-fg-default)' }}
    >
      {/* Success circle */}
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center onboarding-pulse"
        style={{
          background: 'var(--color-primary-tint)',
          border: '2px solid var(--color-primary)',
        }}
      >
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: 'var(--color-primary)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>

      {/* Headline */}
      <h1
        className="uppercase leading-none"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(36px, 6vw, 56px)',
          fontWeight: 700,
          letterSpacing: '-0.01em',
        }}
      >
        Welcome to the flow, {name.toUpperCase()}
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        {/* Profile card */}
        <div
          className="flex flex-col gap-2 p-5 rounded-xl text-left"
          style={{
            background: 'var(--color-bg-surface-1)',
            border: '1px solid var(--color-border-card)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <p className="text-xs font-semibold uppercase" style={{ letterSpacing: '0.18em', color: 'var(--color-fg-metadata)' }}>Profile</p>
          {store.firstName && (
            <p className="text-sm font-medium">{store.firstName} {store.lastName}</p>
          )}
          {store.phone && <p className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>{store.phone}</p>}
          {store.dob && <p className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>{store.dob}</p>}
        </div>

        {/* Plan card */}
        <div
          className="flex flex-col gap-2 p-5 rounded-xl text-left"
          style={{
            background: 'var(--color-bg-surface-1)',
            border: '1px solid var(--color-border-card)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <p className="text-xs font-semibold uppercase" style={{ letterSpacing: '0.18em', color: 'var(--color-fg-metadata)' }}>Plan</p>
          {store.selectedPlanName ? (
            <>
              <p className="text-sm font-medium">{store.selectedPlanName}</p>
              <p className="text-xs" style={{ color: 'var(--color-fg-muted)' }}>
                ${Math.floor((store.selectedPlanPriceInCents ?? 0) / 100)}/mo · Pending activation
              </p>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>
              No plan yet.{' '}
              <button
                type="button"
                onClick={() => navigate('/plans')}
                className="underline"
                style={{ color: 'var(--color-fg-link)' }}
              >
                Browse plans
              </button>
            </p>
          )}
        </div>

        {/* Booking card */}
        <div
          className="flex flex-col gap-2 p-5 rounded-xl text-left"
          style={{
            background: 'var(--color-bg-surface-1)',
            border: '1px solid var(--color-border-card)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <p className="text-xs font-semibold uppercase" style={{ letterSpacing: '0.18em', color: 'var(--color-fg-metadata)' }}>First booking</p>
          {store.completedBookingId ? (
            <p className="text-sm font-medium">
              {store.bookingMode === 'class' ? 'Group class booked' : 'PT session booked'}
              {store.selectedTrainerSlot && (
                <span className="block text-xs mt-0.5" style={{ color: 'var(--color-fg-muted)' }}>
                  {new Date(store.selectedTrainerSlot).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-fg-muted)' }}>No booking yet.</p>
          )}
        </div>
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={() => navigate('/home')}
        className="px-8 py-3 rounded-full text-base font-semibold transition-all duration-150 mt-2"
        style={{ background: 'var(--color-primary)', color: '#0F0F0F' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-dark)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary)' }}
      >
        Enter GymFlow →
      </button>

      {/* Review link */}
      <button
        type="button"
        onClick={onReviewInfo}
        className="text-sm underline"
        style={{ color: 'var(--color-fg-muted)' }}
      >
        Review my info
      </button>
    </div>
  )
}
