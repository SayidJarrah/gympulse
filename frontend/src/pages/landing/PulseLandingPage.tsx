import { useEffect } from 'react'
import { ActivityFeed } from '../../components/landing/ActivityFeed'
import { AmbientWaveform } from '../../components/landing/AmbientWaveform'
import { HeroBooked } from '../../components/landing/HeroBooked'
import { HeroLoggedOut } from '../../components/landing/HeroLoggedOut'
import { HeroNoBooked } from '../../components/landing/HeroNoBooked'
import { PulseFooter } from '../../components/landing/PulseFooter'
import { PulseNav } from '../../components/landing/PulseNav'
import { StatsStrip } from '../../components/landing/StatsStrip'
import { useActivityFeed } from '../../hooks/useActivityFeed'
import { useLandingStats } from '../../hooks/useLandingStats'
import { usePageMeta } from '../../hooks/usePageMeta'
import { useViewerState } from '../../hooks/useViewerState'
import { useAuthStore } from '../../store/authStore'
import { trackEvent } from '../../utils/analytics'

const LANDING_TITLE = 'GymFlow | The Pulse'
const LANDING_DESCRIPTION =
  'See what is happening at GymFlow right now — check in, book your next class, or join and start moving.'

export function PulseLandingPage() {
  const { isAuthenticated, user } = useAuthStore()
  const { data: viewerData, loading: viewerLoading } = useViewerState()
  const { stats } = useLandingStats()
  const { events, activeIndex } = useActivityFeed()

  usePageMeta({ title: LANDING_TITLE, description: LANDING_DESCRIPTION })

  // Fire landing_page_view exactly once on mount
  useEffect(() => {
    trackEvent('landing_page_view', {
      isAuthenticated,
      role: user?.role ?? 'GUEST',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const state = viewerData?.state ?? 'loggedOut'
  const isLoggedOut = state === 'loggedOut'

  const userName: string | undefined = (() => {
    if (!viewerData) return undefined
    if (viewerData.state === 'booked') return viewerData.firstName
    if (viewerData.state === 'nobooked') return viewerData.firstName
    return undefined
  })()

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0F0F0F] text-white">
      <PulseNav authed={isAuthenticated} userName={userName} />

      <main
        className="relative flex-1 grid gap-10 overflow-hidden"
        style={{
          gridTemplateColumns: '1.3fr 1fr',
          padding: '48px 40px 32px',
        }}
      >
        {/* Ambient radial green glow */}
        <div
          className="pointer-events-none absolute z-0"
          style={{
            top: '-20%',
            left: '-10%',
            width: 700,
            height: 700,
            background: 'radial-gradient(circle, rgba(34,197,94,0.15), transparent 60%)',
            filter: 'blur(40px)',
          }}
          aria-hidden="true"
        />

        {/* Ambient waveform */}
        <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden="true">
          <AmbientWaveform />
        </div>

        {/* Left column — hero */}
        <div className="relative flex flex-col justify-center" style={{ maxWidth: 640 }}>
          {viewerLoading && (
            <div className="animate-pulse space-y-6">
              <div className="h-3 w-40 rounded bg-gray-800" />
              <div className="h-20 w-80 rounded bg-gray-800" />
              <div className="h-24 w-72 rounded bg-gray-800" />
            </div>
          )}

          {!viewerLoading && viewerData?.state === 'booked' && (
            <HeroBooked data={viewerData} onTheFloor={viewerData.onTheFloor} />
          )}

          {!viewerLoading && viewerData?.state === 'nobooked' && (
            <HeroNoBooked data={viewerData} onTheFloor={viewerData.onTheFloor} />
          )}

          {!viewerLoading && (viewerData?.state === 'loggedOut' || !viewerData) && (
            <HeroLoggedOut />
          )}
        </div>

        {/* Right column — feed + stats */}
        <div className="relative z-[2] flex flex-col justify-center gap-5">
          <ActivityFeed
            events={events}
            activeIndex={activeIndex}
            isLoggedOut={isLoggedOut}
          />
          <StatsStrip stats={stats} />
        </div>
      </main>

      <PulseFooter />

      {/* Dev-only state switcher is intentionally omitted.
          viewerState is derived from the backend at runtime. */}
    </div>
  )
}
