import { useEffect } from 'react'
import { useOnboardingStore } from '../../store/onboardingStore'
import { useAuthStore } from '../../store/authStore'
import { getMyProfile } from '../../api/profile'
import { OnboardingShell } from '../../components/onboarding/OnboardingShell'
import type { StepKey } from '../../types/onboarding'

const STALE_PASSWORD_MS = 24 * 60 * 60 * 1000  // 24 hours

interface ResumeContext {
  isAuthenticated: boolean
  store: ReturnType<typeof useOnboardingStore.getState>
}

/**
 * Compute which step to resume from based on persisted store state.
 * SDD §4.4: a brand-new visitor returns 'credentials'; an authenticated returning
 * user with profile data resumes wherever the existing logic decides
 * (profile / membership / etc.).
 */
function computeResumeStep({ isAuthenticated, store }: ResumeContext): StepKey {
  // Wizard already completed (e.g. terms-step register flipped isAuthenticated,
  // bootstrap spinner unmounted/remounted us). 'done' is the wizard's
  // authoritative intent under unified-signup — never override it.
  if (store.currentStep === 'done') {
    return 'done'
  }

  // Brand-new visitor: nothing typed yet — start at credentials.
  if (!isAuthenticated && !store.email && !store.firstName) {
    return 'credentials'
  }

  // Authenticated returning user (existing onboarding flow). The credentials
  // step is irrelevant for them — jump to the appropriate step based on data.
  if (isAuthenticated) {
    if (!store.firstName || !store.lastName || !store.phone || !store.dob) {
      return 'profile'
    }
    return 'membership'
  }

  // Unauthenticated guest with some progress: respect their persisted step.
  if (store.currentStep) {
    return store.currentStep
  }

  return 'credentials'
}

export function OnboardingPage() {
  const { setOnboardingCompletedAt, isAuthenticated } = useAuthStore()

  useEffect(() => {
    // SDD §4.2 step 4 — anonymous returning-guest cleanup. If a guest left
    // mid-wizard and returned more than 24h later, wipe the password from
    // store + localStorage so it does not sit in plaintext indefinitely.
    // Email and other typed fields stay so the user does not feel reset.
    if (!isAuthenticated) {
      const last = useOnboardingStore.getState().lastTouchedAt
      if (last && Date.now() - last > STALE_PASSWORD_MS && useOnboardingStore.getState().password) {
        useOnboardingStore.setState({ password: '' })
      }
    }

    if (isAuthenticated) {
      // Hydrate profile data into the store so step components show existing values.
      // If the fetch fails we just continue — step components load their own data.
      getMyProfile()
        .then(profile => {
          // Sync first/last name from server if not yet set in the onboarding store
          if (!useOnboardingStore.getState().firstName && profile.firstName) {
            useOnboardingStore.getState().setProfileFields({
              firstName: profile.firstName ?? '',
              lastName: profile.lastName ?? '',
              phone: profile.phone ?? '',
              dob: profile.dateOfBirth ?? '',
            })
          }
          // If profile already has an onboardingCompletedAt, sync to auth store
          if (profile.onboardingCompletedAt) {
            setOnboardingCompletedAt(profile.onboardingCompletedAt)
          }
        })
        .catch(() => {
          // Non-fatal — the step components will handle their own loads
        })
    }

    // Restore the correct step based on persisted data
    const resumeStep = computeResumeStep({
      isAuthenticated,
      store: useOnboardingStore.getState(),
    })
    if (resumeStep !== useOnboardingStore.getState().currentStep) {
      useOnboardingStore.getState().setStep(resumeStep)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <OnboardingShell />
}
