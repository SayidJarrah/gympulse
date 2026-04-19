import { useRef, useState } from 'react'
import { useOnboardingStore } from '../../store/onboardingStore'
import { useAuthStore } from '../../store/authStore'
import { completeOnboarding } from '../../api/onboarding'
import { ALL_STEPS } from '../../types/onboarding'
import type { StepKey } from '../../types/onboarding'

import { MiniNav } from './MiniNav'
import { ProgressBar } from './ProgressBar'
import { StepRail } from './StepRail'
import { StickyFooter } from './StickyFooter'

import { StepWelcome } from './steps/StepWelcome'
import { StepProfile } from './steps/StepProfile'
import type { StepProfileHandle } from './steps/StepProfile'
import { StepPreferences } from './steps/StepPreferences'
import type { StepPreferencesHandle } from './steps/StepPreferences'
import { StepMembership } from './steps/StepMembership'
import type { StepMembershipHandle } from './steps/StepMembership'
import { StepBooking } from './steps/StepBooking'
import type { StepBookingHandle } from './steps/StepBooking'
import { StepTerms } from './steps/StepTerms'
import type { StepTermsHandle } from './steps/StepTerms'
import { StepDone } from './steps/StepDone'

export function OnboardingShell() {
  const store = useOnboardingStore()
  // Read currentStep fresh on every render — do not destructure into a local
  // const before branching, as that would snapshot the value at render time.
  const { setOnboardingCompletedAt, user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [termsError, setTermsError] = useState<string | null>(null)

  // Step refs — only used for steps that expose an imperative handle
  const profileRef = useRef<StepProfileHandle>(null)
  const preferencesRef = useRef<StepPreferencesHandle>(null)
  const membershipRef = useRef<StepMembershipHandle>(null)
  const bookingRef = useRef<StepBookingHandle>(null)
  const termsRef = useRef<StepTermsHandle>(null)

  // Compute visible steps: filter out booking when no plan selected
  const visibleSteps = ALL_STEPS.filter(
    s => !s.conditional || !!store.selectedPlanId
  )

  const currentStep = store.currentStep
  const currentIndex = visibleSteps.findIndex(s => s.key === currentStep)

  // ─── Navigation helpers ────────────────────────────────────────────────────

  function advance() {
    const nextStep = visibleSteps[currentIndex + 1]
    if (nextStep) {
      store.setStep(nextStep.key)
    } else {
      store.setStep('done')
    }
  }

  function retreat() {
    if (currentIndex <= 0) return
    store.setStep(visibleSteps[currentIndex - 1].key)
  }

  function skip() {
    advance()
  }

  function navigateBack(step: StepKey) {
    // Only allow navigating to already-completed steps
    const targetIndex = visibleSteps.findIndex(s => s.key === step)
    if (targetIndex < currentIndex) {
      store.setStep(step)
    }
  }

  // ─── Continue handler ──────────────────────────────────────────────────────

  async function handleContinue() {
    if (loading) return
    setLoading(true)

    try {
      switch (currentStep) {
        case 'welcome': {
          advance()
          break
        }

        case 'profile': {
          const ok = await profileRef.current?.submit()
          if (ok) advance()
          break
        }

        case 'preferences': {
          const ok = await preferencesRef.current?.submit()
          if (ok) advance()
          break
        }

        case 'membership': {
          const result = await membershipRef.current?.submit()
          // Only advance if the submission succeeded (plan-selected or skip).
          // A false/undefined result means an API error occurred — stay on this step.
          if (result === 'plan-selected' || result === 'skip') {
            advance()
          }
          break
        }

        case 'booking': {
          const ok = await bookingRef.current?.submit()
          if (ok) advance()
          break
        }

        case 'terms': {
          const canContinue = termsRef.current?.canContinue() ?? false
          if (!canContinue) break

          // Call completeOnboarding before advancing to Done.
          // AC-44: if the call fails, show error on this step and do not advance.
          try {
            setTermsError(null)
            const res = await completeOnboarding()
            const userId = user?.id ?? null
            console.info('[analytics] onboarding_completed', { userId })
            // Advance to Done BEFORE setting onboardingCompletedAt.
            // OnboardingRoute reads onboardingCompletedAt — if we set it first,
            // the route guard redirects to /home before the Done screen mounts.
            advance()
            // Delay the auth store update so Done renders in this tick first.
            setTimeout(() => {
              setOnboardingCompletedAt(res.onboardingCompletedAt)
            }, 0)
          } catch {
            setTermsError('Unable to complete onboarding. Please try again.')
          }
          break
        }

        default:
          advance()
      }
    } finally {
      setLoading(false)
    }
  }

  // ─── Continue disabled logic ───────────────────────────────────────────────

  const continueDisabled: boolean = (() => {
    if (currentStep === 'terms') {
      // Disable until both required checkboxes are checked
      return !store.agreeTerms || !store.agreeWaiver
    }
    return false
  })()

  // ─── Done screen ───────────────────────────────────────────────────────────
  // Rendered as a branch inside the same component — NOT an early return — so
  // that Zustand subscriptions keep firing when "Review my info" calls
  // store.setStep('profile') and transitions us back to the wizard layout.

  if (currentStep === 'done') {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: 'var(--color-bg-page)' }}
      >
        {/* Minimal nav without step counter */}
        <header
          className="flex items-center px-12 h-[72px] shrink-0"
          style={{ borderBottom: '1px solid var(--color-border-card)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: 'var(--color-primary)' }}
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="white">
                <path d="M13 2L4.5 13.5H11L9 22L19.5 9.5H13.5L16 2Z" />
              </svg>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-start justify-center px-6 py-8 overflow-y-auto">
          <StepDone onReviewInfo={() => store.setStep('profile')} />
        </main>
      </div>
    )
  }

  // ─── Main wizard layout ────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-bg-page)' }}
    >
      <MiniNav currentStep={currentStep} visibleSteps={visibleSteps} />

      <ProgressBar currentStep={currentStep} visibleSteps={visibleSteps} />

      {/* Body: rail + content — CSS grid per handoff spec */}
      <div
        className="flex-1 overflow-hidden hidden lg:grid"
        style={{ gridTemplateColumns: '260px 1fr', gap: '48px', padding: '40px 48px' }}
      >
        {/* Left rail — 260px, no extra padding */}
        <aside
          style={{ borderRight: '1px solid var(--color-border-card)', paddingRight: '48px' }}
        >
          <StepRail
            visibleSteps={visibleSteps}
            currentStep={currentStep}
            onNavigateBack={navigateBack}
          />
        </aside>

        {/* Content area with step transition */}
        <main className="overflow-y-auto">
          <div key={currentStep} className="animate-fadeSlideIn">
            <StepContent
              currentStep={currentStep}
              firstName={store.firstName || null}
              profileRef={profileRef}
              preferencesRef={preferencesRef}
              membershipRef={membershipRef}
              bookingRef={bookingRef}
              termsRef={termsRef}
              termsError={termsError}
            />
          </div>
        </main>
      </div>

      {/* Mobile layout (< lg) — no rail */}
      <div className="flex-1 overflow-hidden lg:hidden">
        <main className="overflow-y-auto px-6 py-8">
          <div key={currentStep} className="animate-fadeSlideIn">
            <StepContent
              currentStep={currentStep}
              firstName={store.firstName || null}
              profileRef={profileRef}
              preferencesRef={preferencesRef}
              membershipRef={membershipRef}
              bookingRef={bookingRef}
              termsRef={termsRef}
              termsError={termsError}
            />
          </div>
        </main>
      </div>

      <StickyFooter
        currentStep={currentStep}
        visibleSteps={visibleSteps}
        onBack={retreat}
        onSkip={skip}
        onContinue={handleContinue}
        continueDisabled={continueDisabled}
        continueLoading={loading}
      />
    </div>
  )
}

// ─── Step content switcher ─────────────────────────────────────────────────

interface StepContentProps {
  currentStep: StepKey
  firstName: string | null
  profileRef: React.RefObject<StepProfileHandle>
  preferencesRef: React.RefObject<StepPreferencesHandle>
  membershipRef: React.RefObject<StepMembershipHandle>
  bookingRef: React.RefObject<StepBookingHandle>
  termsRef: React.RefObject<StepTermsHandle>
  termsError: string | null
}

function StepContent({
  currentStep,
  firstName,
  profileRef,
  preferencesRef,
  membershipRef,
  bookingRef,
  termsRef,
  termsError,
}: StepContentProps) {
  switch (currentStep) {
    case 'welcome':
      return <StepWelcome firstName={firstName} />
    case 'profile':
      return <StepProfile ref={profileRef} />
    case 'preferences':
      return <StepPreferences ref={preferencesRef} />
    case 'membership':
      return <StepMembership ref={membershipRef} />
    case 'booking':
      return <StepBooking ref={bookingRef} />
    case 'terms':
      return <StepTerms ref={termsRef} externalError={termsError} />
    default:
      return null
  }
}
