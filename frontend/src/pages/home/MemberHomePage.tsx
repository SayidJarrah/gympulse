import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Navbar } from '../../components/layout/Navbar'
import { ClassPreviewCarousel } from '../../components/home/ClassPreviewCarousel'
import { MemberHomeHero } from '../../components/home/MemberHomeHero'
import { MembershipAccessBanner } from '../../components/home/MembershipAccessBanner'
import { MembershipPrimaryCard } from '../../components/home/MembershipPrimaryCard'
import { QuickActionsPanel } from '../../components/home/QuickActionsPanel'
import { TrainerPreviewCarousel } from '../../components/home/TrainerPreviewCarousel'
import { useMemberHomeClassesPreview } from '../../hooks/useMemberHomeClassesPreview'
import { useMemberHomeMembershipSection } from '../../hooks/useMemberHomeMembershipSection'
import { useMemberHomeTrainerPreview } from '../../hooks/useMemberHomeTrainerPreview'
import { usePageMeta } from '../../hooks/usePageMeta'
import {
  buildPlansPath,
  getMembershipBanner,
  withoutMembershipBanner,
  type MembershipBanner,
} from '../../utils/accessFlowNavigation'

const PAGE_TITLE = 'GymFlow | Member Home'
const PAGE_DESCRIPTION =
  'Review your membership status, browse trainers, and preview the next group classes from one member-focused home surface.'

export function MemberHomePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const classesSectionRef = useRef<HTMLElement | null>(null)
  const [banner, setBanner] = useState<MembershipBanner | null>(null)

  const {
    membership,
    availablePlans,
    mode,
    error,
    planTeasersError,
    planTeasersLoading,
    retry: retryMembership,
  } = useMemberHomeMembershipSection()
  const trainerPreview = useMemberHomeTrainerPreview()
  const classesPreview = useMemberHomeClassesPreview()

  usePageMeta({
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  })

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const membershipBanner = getMembershipBanner(searchParams)

    if (!membershipBanner) {
      return
    }

    setBanner(membershipBanner)

    const nextSearchParams = withoutMembershipBanner(searchParams)
    const search = nextSearchParams.toString()

    navigate(
      {
        pathname: location.pathname,
        search: search ? `?${search}` : '',
        hash: location.hash,
      },
      { replace: true }
    )
  }, [location.hash, location.pathname, location.search, navigate])

  const heroStats = useMemo(() => {
    if (membership) {
      return [
        { label: 'Status', value: 'Active member' },
        {
          label: 'Bookings left',
          value: `${Math.max(membership.maxBookingsPerMonth - membership.bookingsUsedThisMonth, 0)} this month`,
        },
      ]
    }

    if (mode === 'loading') {
      return [
        { label: 'Portal', value: 'Loading status' },
        { label: 'Access', value: 'Checking membership' },
      ]
    }

    return [
      { label: 'Portal', value: 'Membership activation ready' },
      { label: 'Access', value: 'Browse before you commit' },
    ]
  }, [membership, mode])

  const firstName = membership?.userFirstName ?? null

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[#0F0F0F] text-white"
      data-testid="member-home-root"
    >
      <Navbar />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section id="membership" className="scroll-mt-24">
          <div className="flex flex-col gap-4">
            {banner ? <MembershipAccessBanner banner={banner} /> : null}
            <MembershipPrimaryCard
              membership={membership}
              availablePlans={availablePlans}
              mode={mode}
              errorMessage={error}
              planTeasersLoading={planTeasersLoading}
              planTeasersError={planTeasersError}
              onRetryMembership={() => {
                void retryMembership()
              }}
              onManageMembership={() => navigate('/membership')}
              onExploreClasses={() => navigate('/schedule')}
              onBrowseTrainers={() => navigate('/trainers')}
              browsePlansHref={buildPlansPath({ source: 'home' })}
              getPlanHref={(planId) => buildPlansPath({ source: 'home', highlight: planId })}
            />
          </div>
        </section>

        <MemberHomeHero
          firstName={firstName}
          hasActiveMembership={membership !== null}
          activePlanName={membership?.planName ?? null}
          stats={heroStats}
        />

        <QuickActionsPanel
          hasActiveMembership={membership !== null}
          onScrollToClasses={() => {
            classesSectionRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            })
          }}
        />

        <TrainerPreviewCarousel
          trainers={trainerPreview.data}
          loading={trainerPreview.loading}
          errorMessage={trainerPreview.error}
          onRetry={() => {
            void trainerPreview.retry()
          }}
        />

        <section ref={classesSectionRef}>
          <ClassPreviewCarousel
            entries={classesPreview.data?.entries ?? []}
            timeZone={classesPreview.data?.timeZone ?? classesPreview.timeZone}
            loading={classesPreview.loading}
            errorMessage={classesPreview.error}
            onRetry={() => {
              void classesPreview.retry()
            }}
          />
        </section>
      </main>
    </div>
  )
}
