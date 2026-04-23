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
 *
 * SDD onboarding-terms-early §4.4 + Decision 21 — decision tree precedence
 * (top-down, first match wins):
 *
 *   1. store.currentStep === 'done'                             → 'done'
 *      (terminal-state guarantee from unified-signup §6 Decision 11; must be
 *       the very first check or an authenticated user awaiting the
 *       POST /onboarding/complete flip can be wrongly re-routed to 'booking'
 *       mid-render and never fire the completion call)
 *   2. !isAuthenticated && !store.email && !store.firstName     → 'credentials'
 *      (brand-new unauthenticated visitor with nothing typed)
 *   3. !isAuthenticated                                          → store.currentStep ?? 'credentials'
 *      (unauthenticated guest with credentials/profile in store but not yet
 *       registered — respect their persisted step so they resume mid pre-terms
 *       section)
 *   4. isAuthenticated && no preferences attempted               → 'preferences'
 *      (goals/classTypes/frequency all empty — first post-terms enrichment step)
 *   5. isAuthenticated && !selectedPlanId                        → 'membership'
 *   6. isAuthenticated && selectedPlanId && !completedBookingId  → 'booking'
 *   7. otherwise                                                  → 'done'
 */
function computeResumeStep({ isAuthenticated, store }: ResumeContext): StepKey {
  // 1. Terminal-state guarantee — must stay at the top.
  if (store.currentStep === 'done') {
    return 'done'
  }

  // 2. Brand-new unauthenticated visitor.
  if (!isAuthenticated && !store.email && !store.firstName) {
    return 'credentials'
  }

  // 3. Unauthenticated guest with partial pre-terms data.
  if (!isAuthenticated) {
    return store.currentStep ?? 'credentials'
  }

  // 4-7. Authenticated returner — walk the post-terms decision tree.
  if (
    store.goals.length === 0 &&
    store.classTypes.length === 0 &&
    !store.frequency
  ) {
    return 'preferences'
  }
  if (!store.selectedPlanId) {
    return 'membership'
  }
  if (store.selectedPlanId && !store.completedBookingId) {
    return 'booking'
  }
  return 'done'
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
