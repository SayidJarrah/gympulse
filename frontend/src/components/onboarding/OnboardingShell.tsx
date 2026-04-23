import { useRef, useState } from 'react'
import type { AxiosError } from 'axios'
import { useOnboardingStore } from '../../store/onboardingStore'
import { useAuthStore } from '../../store/authStore'
import { register as authRegister } from '../../api/auth'
import { ALL_STEPS } from '../../types/onboarding'
import type { StepKey } from '../../types/onboarding'
import type { ApiErrorResponse, AuthUser, UserRole, RegisterRequest } from '../../types/auth'
import { getRegisterErrorMessage } from '../../utils/errorMessages'

import { MiniNav } from './MiniNav'
import { ProgressBar } from './ProgressBar'
import { StepRail } from './StepRail'
import { StickyFooter } from './StickyFooter'

import { StepCredentials } from './steps/StepCredentials'
import type { StepCredentialsHandle } from './steps/StepCredentials'
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

// Convert a US-formatted phone string to E.164. Mirrors StepProfile's local
// helper — the wizard collects and stores `(###) ###-####`, and the backend
// register endpoint requires the E.164 form.
function toE164(formatted: string): string {
  const digits = formatted.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return `+${digits}`
}

function decodeJwtPayload(token: string): AuthUser | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const json = atob(padded)
    const payload = JSON.parse(json) as { sub: string; role: UserRole; email?: string }
    return {
      id: payload.sub,
      email: payload.email ?? '',
      role: payload.role,
    }
  } catch {
    return null
  }
}

export function OnboardingShell() {
  const store = useOnboardingStore()
  // Read currentStep fresh on every render — do not destructure into a local
  // const before branching, as that would snapshot the value at render time.
  const { setOnboardingCompletedAt, setTokens, setUser } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [termsError, setTermsError] = useState<string | null>(null)

  // Step refs — only used for steps that expose an imperative handle
  const credentialsRef = useRef<StepCredentialsHandle>(null)
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

  // SDD §4.4 + Decision 20 — terms boundary lock. After the user submits terms
  // and is on any post-terms step, the rail rows for credentials/profile/terms
  // become non-interactive and the StickyFooter Back is disabled (computed
  // there from currentStep, not from this flag).
  const backLocked =
    currentStep === 'preferences' ||
    currentStep === 'membership' ||
    currentStep === 'booking'

  // ─── Navigation helpers ────────────────────────────────────────────────────

  function advance() {
    // Read selectedPlanId fresh from the store to avoid a stale closure.
    // At the point advance() is called (e.g. after StepMembership.submit()),
    // the store has already been updated with the new planId, but the
    // `visibleSteps` computed at render time still reflects the pre-submit
    // state. Using getState() ensures the Booking step is included when a
    // plan was just selected.
    const freshPlanId = useOnboardingStore.getState().selectedPlanId
    const freshSteps = ALL_STEPS.filter(s => !s.conditional || !!freshPlanId)
    const freshIndex = freshSteps.findIndex(s => s.key === store.currentStep)
    const nextStep = freshSteps[freshIndex + 1]
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
        case 'credentials': {
          const ok = await credentialsRef.current?.submit()
          if (ok) advance()
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
          // Read from the store instead of the imperative ref. The layout renders
          // two StepContent trees (desktop + mobile) sharing the same termsRef;
          // the mobile instance's useImperativeHandle overwrites the desktop one,
          // leaving a stale closure that always returns false. The store is the
          // authoritative source and is kept in sync by every checkbox change.
          if (!store.agreeTerms || !store.agreeWaiver) break

          // Unified-signup combined-payload submission (SDD §4.4).
          // Build the request from the wizard state, hit POST /auth/register,
          // store tokens on success and snap back to credentials on the late
          // EMAIL_ALREADY_EXISTS error.
          setTermsError(null)
          try {
            const fresh = useOnboardingStore.getState()
            const req: RegisterRequest = {
              email: fresh.email,
              password: fresh.password,
              firstName: fresh.firstName,
              lastName: fresh.lastName,
              phone: toE164(fresh.phone),
              dateOfBirth: fresh.dob,
              agreeTerms: fresh.agreeTerms,
              agreeWaiver: fresh.agreeWaiver,
            }
            const response = await authRegister(req)

            // Authenticate the just-created user.
            setTokens(response.accessToken, response.refreshToken)
            const decoded = decodeJwtPayload(response.accessToken)
            if (decoded) {
              setUser({ ...decoded, email: req.email })
            }
            // Mark onboarding as not yet complete so OnboardingRoute does not
            // immediately redirect — StepDone's mount effect calls
            // POST /onboarding/complete (later, when the user reaches `done`)
            // which will then set this to a real timestamp.
            setOnboardingCompletedAt(null)
            // Wipe the password from store + localStorage immediately on
            // success (SDD §4.2 step 3).
            store.clearPassword()

            // Advance to the next step. With `terms` at position 3 in the
            // reordered ALL_STEPS, advance() derives `preferences` as the next
            // step (terms-early SDD §4.4 + Decision 16). Do not hardcode the
            // target — the data-driven advance keeps register-at-commit
            // semantics intact while only the position changes.
            advance()
          } catch (err) {
            const axiosError = err as AxiosError<ApiErrorResponse>
            const code = axiosError.response?.data?.code
            const message = axiosError.response?.data?.error

            if (code === 'EMAIL_ALREADY_EXISTS') {
              // Snap back to the credentials step with the persistent banner.
              store.setCredentialsLateError(getRegisterErrorMessage('EMAIL_ALREADY_EXISTS'))
              store.setStep('credentials')
            } else if (
              code === 'INVALID_FIRST_NAME' ||
              code === 'INVALID_LAST_NAME' ||
              code === 'INVALID_PHONE' ||
              code === 'INVALID_DATE_OF_BIRTH'
            ) {
              setTermsError(getRegisterErrorMessage(code, message))
            } else {
              setTermsError(getRegisterErrorMessage(code, message))
            }
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
            backLocked={backLocked}
          />
        </aside>

        {/* Content area with step transition */}
        <main className="overflow-y-auto">
          <div key={currentStep} className="animate-fadeSlideIn">
            <StepContent
              currentStep={currentStep}
              credentialsRef={credentialsRef}
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
              credentialsRef={credentialsRef}
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
        continueRetry={!!termsError}
      />
    </div>
  )
}

// ─── Step content switcher ─────────────────────────────────────────────────

interface StepContentProps {
  currentStep: StepKey
  credentialsRef: React.RefObject<StepCredentialsHandle>
  profileRef: React.RefObject<StepProfileHandle>
  preferencesRef: React.RefObject<StepPreferencesHandle>
  membershipRef: React.RefObject<StepMembershipHandle>
  bookingRef: React.RefObject<StepBookingHandle>
  termsRef: React.RefObject<StepTermsHandle>
  termsError: string | null
}

function StepContent({
  currentStep,
  credentialsRef,
  profileRef,
  preferencesRef,
  membershipRef,
  bookingRef,
  termsRef,
  termsError,
}: StepContentProps) {
  switch (currentStep) {
    case 'credentials':
      return <StepCredentials ref={credentialsRef} />
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
