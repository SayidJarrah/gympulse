import { useRef, useState } from 'react'
import { useOnboardingStore } from '../../store/onboardingStore'
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
  const currentStep = store.currentStep
  const [loading, setLoading] = useState(false)

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
          await preferencesRef.current?.submit()
          advance()
          break
        }

        case 'membership': {
          await membershipRef.current?.submit()
          // Whether result is 'plan-selected' or 'skip', visibleSteps is recalculated at
          // render time (it filters on selectedPlanId from the store), so advance() always
          // lands on the correct next step.
          advance()
          break
        }

        case 'booking': {
          await bookingRef.current?.submit()
          advance()
          break
        }

        case 'terms': {
          const canContinue = termsRef.current?.canContinue() ?? false
          if (!canContinue) break
          advance()
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

  if (currentStep === 'done') {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: 'var(--color-bg-base)' }}
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
            <span className="text-lg font-bold text-white">GymFlow</span>
          </div>
        </header>

        <main className="flex-1 flex items-start justify-center px-6 py-8 overflow-y-auto">
          <StepDone />
        </main>
      </div>
    )
  }

  // ─── Main wizard layout ────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-bg-base)' }}
    >
      <MiniNav currentStep={currentStep} visibleSteps={visibleSteps} />

      <ProgressBar currentStep={currentStep} visibleSteps={visibleSteps} />

      {/* Body: rail + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left rail */}
        <aside
          className="hidden lg:flex flex-col px-10 pt-10 shrink-0"
          style={{
            width: '280px',
            borderRight: '1px solid var(--color-border-card)',
          }}
        >
          <StepRail
            visibleSteps={visibleSteps}
            currentStep={currentStep}
            onNavigateBack={navigateBack}
          />
        </aside>

        {/* Content area */}
        <main className="flex-1 overflow-y-auto px-8 lg:px-16 py-12">
          <StepContent
            currentStep={currentStep}
            firstName={store.firstName || null}
            profileRef={profileRef}
            preferencesRef={preferencesRef}
            membershipRef={membershipRef}
            bookingRef={bookingRef}
            termsRef={termsRef}
          />
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
}

function StepContent({
  currentStep,
  firstName,
  profileRef,
  preferencesRef,
  membershipRef,
  bookingRef,
  termsRef,
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
      return <StepTerms ref={termsRef} />
    default:
      return null
  }
}
