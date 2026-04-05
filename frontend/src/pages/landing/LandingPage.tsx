import { useEffect } from 'react'
import { LandingFooter } from '../../components/landing/LandingFooter'
import { FaqSection } from '../../components/landing/FaqSection'
import { HeroSection } from '../../components/landing/HeroSection'
import { HowItWorksSection } from '../../components/landing/HowItWorksSection'
import { LandingHeader } from '../../components/landing/LandingHeader'
import { PlansPreviewSection } from '../../components/landing/PlansPreviewSection'
import { useLandingPlans } from '../../hooks/useLandingPlans'
import { usePageMeta } from '../../hooks/usePageMeta'
import { useAuthStore } from '../../store/authStore'
import { useMembershipStore } from '../../store/membershipStore'
import { trackEvent } from '../../utils/analytics'
import { resolveLandingActions } from '../../utils/landingActions'

const LANDING_TITLE = 'GymFlow | Memberships and Class Booking'
const LANDING_DESCRIPTION =
  'Compare active memberships, understand the booking flow, and take the right next step whether you are joining, choosing a plan, or returning as a member.'

export function LandingPage() {
  const { plans, loading, error, refetch } = useLandingPlans()
  const { isAuthenticated, user } = useAuthStore()
  const {
    activeMembership,
    membershipLoading,
    membershipErrorCode,
    fetchMyMembership,
  } = useMembershipStore()

  usePageMeta({
    title: LANDING_TITLE,
    description: LANDING_DESCRIPTION,
  })

  useEffect(() => {
    trackEvent('landing_page_view', {
      isAuthenticated,
      role: user?.role ?? 'GUEST',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (
      isAuthenticated &&
      user?.role === 'USER' &&
      activeMembership === null &&
      membershipErrorCode === null &&
      !membershipLoading
    ) {
      void fetchMyMembership()
    }
  }, [
    activeMembership,
    fetchMyMembership,
    isAuthenticated,
    membershipErrorCode,
    membershipLoading,
    user?.role,
  ])

  const resolvedActions = resolveLandingActions({
    isAuthenticated,
    role: user?.role ?? null,
    hasActiveMembership: activeMembership !== null,
    membershipLoading,
    membershipErrorCode,
  })

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      <LandingHeader
        isAuthenticated={isAuthenticated}
        primaryAction={resolvedActions.headerPrimary}
        onSignInClick={() => {
          trackEvent('landing_sign_in_click', {
            placement: 'header',
          })
        }}
      />

      <main>
        <HeroSection
          primaryAction={resolvedActions.heroPrimary}
          secondaryAction={resolvedActions.heroSecondary}
          onPrimaryClick={() => {
            trackEvent('landing_hero_primary_click', {
              destination:
                resolvedActions.heroPrimary.kind === 'link'
                  ? resolvedActions.heroPrimary.to
                  : 'disabled',
              role: user?.role ?? 'GUEST',
            })
          }}
          onSecondaryClick={() => {
            trackEvent('landing_hero_secondary_click', {
              destination:
                resolvedActions.heroSecondary.kind === 'link'
                  ? resolvedActions.heroSecondary.to
                  : 'disabled',
              role: user?.role ?? 'GUEST',
            })
          }}
        />
        <PlansPreviewSection
          plans={plans}
          loading={loading}
          error={error}
          planAction={resolvedActions.planAction}
          onRetry={refetch}
          onPlanActionClick={(plan) => {
            trackEvent('landing_plan_cta_click', {
              planId: plan.id,
              planName: plan.name,
              destination: resolvedActions.planAction.to,
            })
          }}
        />
        <HowItWorksSection />
        <FaqSection />
      </main>

      <LandingFooter />
    </div>
  )
}
