import { useEffect } from 'react'
import { useOnboardingStore } from '../../store/onboardingStore'
import { useAuthStore } from '../../store/authStore'
import { getMyProfile } from '../../api/profile'
import { OnboardingShell } from '../../components/onboarding/OnboardingShell'
import type { StepKey } from '../../types/onboarding'

/**
 * Compute which step to resume from based on persisted store state.
 * If the store already has a currentStep other than 'welcome' we trust it.
 * Otherwise we derive the furthest-reached step from the data already saved.
 */
function computeResumeStep(store: ReturnType<typeof useOnboardingStore.getState>): StepKey {
  // If the store already has an in-progress step, respect it
  if (store.currentStep && store.currentStep !== 'welcome') {
    return store.currentStep
  }

  // Derive from saved data — walk forward until we hit an incomplete required step
  if (!store.firstName || !store.lastName) return 'profile'
  if (!store.agreeTerms || !store.agreeWaiver) {
    // Profile done, skip preferences + membership + booking; land at terms
    // But if plan is selected and booking not done, land at booking
    if (store.selectedPlanId && !store.completedBookingId) return 'booking'
    return 'terms'
  }
  return 'terms'
}

export function OnboardingPage() {
  const store = useOnboardingStore()
  const { setOnboardingCompletedAt } = useAuthStore()

  useEffect(() => {
    // Hydrate profile data into the store so step components show existing values.
    // If the fetch fails we just continue — step components load their own data.
    getMyProfile()
      .then(profile => {
        // Sync first/last name from server if not yet set in the onboarding store
        if (!store.firstName && profile.firstName) {
          store.setProfileFields({
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

    // Restore the correct step based on persisted data
    const resumeStep = computeResumeStep(store)
    if (resumeStep !== store.currentStep) {
      store.setStep(resumeStep)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <OnboardingShell />
}
