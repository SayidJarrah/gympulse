import { useState } from 'react'
import { MemberNav } from '../../components/layout/MemberNav'
import { PulseFooter } from '../../components/landing/PulseFooter'
import { AmbientWaveform } from '../../components/landing/AmbientWaveform'
import { ActivityFeed } from '../../components/landing/ActivityFeed'
import { HomeHero } from '../../components/home/HomeHero'
import { MemberStats } from '../../components/home/MemberStats'
import { UpcomingSection } from '../../components/home/UpcomingSection'
import { MembershipSection } from '../../components/home/MembershipSection'
import { CancelBookingDialog } from '../../components/home/CancelBookingDialog'
import { BookingToast } from '../../components/schedule/BookingToast'
import { useHomePage } from '../../hooks/useHomePage'
import { usePageMeta } from '../../hooks/usePageMeta'

const PAGE_TITLE = 'GymFlow | Home'
const PAGE_DESCRIPTION =
  "Your member home — next booked class, upcoming sessions, membership status, and what's happening at the club right now."

export function MemberHomePage() {
  const {
    firstName,
    onTheFloor,
    nextBookedClass,
    nextClassStudio,
    upcomingBookings,
    upcomingLoading,
    bookingsUsed,
    bookingsMax,
    renewsAt,
    renewsInDays,
    planName,
    membershipStatus,
    membershipLoading,
    savedCoachesCount,
    feedEvents,
    feedActiveIndex,
    cancelNextBooking,
    cancellingBooking,
    bookingsUsedOverride,
  } = useHomePage()

  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)

  usePageMeta({ title: PAGE_TITLE, description: PAGE_DESCRIPTION })

  const handleCancelRequest = () => {
    setShowCancelDialog(true)
  }

  const handleCancelConfirm = async () => {
    const className = nextBookedClass?.className ?? 'class'
    try {
      await cancelNextBooking()
      setShowCancelDialog(false)
      setToast({ kind: 'success', message: `Cancelled ${className}` })
    } catch {
      setShowCancelDialog(false)
      setToast({ kind: 'error', message: 'Failed to cancel. Please try again.' })
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-[#0F0F0F] text-white"
      data-testid="member-home-root"
    >
      <MemberNav />

      <main
        className="relative flex-1 overflow-hidden px-4 pb-12 pt-10 sm:px-6 lg:px-10"
        style={{ position: 'relative' }}
      >
        {/* Ambient radial green glow — top-left */}
        <div
          className="pointer-events-none absolute -left-[5%] -top-[10%] h-[600px] w-[800px]"
          style={{
            background: 'radial-gradient(circle, rgba(34,197,94,0.13), transparent 60%)',
            filter: 'blur(40px)',
            zIndex: 0,
          }}
          aria-hidden="true"
        />

        {/* Ambient waveform SVG */}
        <div
          className="pointer-events-none absolute left-0 right-0 overflow-hidden"
          style={{ top: 60, height: 400, zIndex: 1 }}
          aria-hidden="true"
        >
          <AmbientWaveform />
        </div>

        {/* Page content */}
        <div
          className="relative mx-auto w-full max-w-[1440px]"
          style={{ zIndex: 2 }}
        >
          {/* Hero row: left=countdown, right=activity feed */}
          <div
            className="grid min-h-[440px] items-stretch"
            style={{ gridTemplateColumns: '1.3fr 1fr', gap: 40 }}
          >
            <div className="flex flex-col justify-center">
              <HomeHero
                firstName={firstName}
                nextBookedClass={nextBookedClass}
                nextClassStudio={nextClassStudio}
                onTheFloor={onTheFloor}
                onCancelBooking={handleCancelRequest}
                cancellingBooking={cancellingBooking}
              />
            </div>
            <div className="flex flex-col justify-center">
              <ActivityFeed
                events={feedEvents}
                activeIndex={feedActiveIndex}
                mode="club"
              />
            </div>
          </div>

          {/* Stats strip */}
          <div className="mt-9">
            <MemberStats
              bookingsUsed={bookingsUsed}
              bookingsMax={bookingsMax}
              renewsAt={renewsAt}
              renewsInDays={renewsInDays}
              loading={membershipLoading}
              savedCoachesCount={savedCoachesCount}
              bookingsUsedOverride={bookingsUsedOverride}
            />
          </div>

          {/* Bottom row: upcoming + membership */}
          <div
            className="mt-6 grid"
            style={{ gridTemplateColumns: '1.4fr 1fr', gap: 20 }}
          >
            <UpcomingSection
              bookings={upcomingBookings}
              loading={upcomingLoading}
            />
            <MembershipSection
              planName={planName}
              status={membershipStatus}
              bookingsUsed={bookingsUsed}
              bookingsMax={bookingsMax}
              renewsAt={renewsAt}
              renewsInDays={renewsInDays}
              loading={membershipLoading}
            />
          </div>
        </div>
      </main>

      <PulseFooter />

      {/* Cancel booking confirm dialog */}
      {showCancelDialog && nextBookedClass && (
        <CancelBookingDialog
          className={nextBookedClass.className}
          onConfirm={() => { void handleCancelConfirm() }}
          onCancel={() => setShowCancelDialog(false)}
          loading={cancellingBooking}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <BookingToast
          kind={toast.kind}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}
