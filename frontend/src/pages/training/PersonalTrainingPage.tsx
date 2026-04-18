import { useState } from 'react'
import { MemberNav } from '../../components/layout/MemberNav'
import { PulseFooter } from '../../components/landing/PulseFooter'
import { TrainerDirectory } from '../../components/training/TrainerDirectory'
import { SlotPicker } from '../../components/training/SlotPicker'
import { ConfirmBookingModal } from '../../components/training/ConfirmBookingModal'
import { MyUpcomingPT } from '../../components/training/MyUpcomingPT'
import { BookingToast } from '../../components/schedule/BookingToast'
import { useAuthStore } from '../../store/authStore'
import { usePtTrainerDirectory, usePtSlotPicker, useMyPtBookings } from '../../hooks/usePtBooking'
import { usePageMeta } from '../../hooks/usePageMeta'
import type { PtTrainerSummary } from '../../types/ptBooking'
import { usePtBookingStore } from '../../store/ptBookingStore'

const PAGE_TITLE = 'GymFlow | Personal Training'
const PAGE_DESCRIPTION = 'Book a one-on-one personal training session with your trainer of choice.'

export function PersonalTrainingPage() {
  usePageMeta({ title: PAGE_TITLE, description: PAGE_DESCRIPTION })

  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null)
  const { selectedTrainer, selectTrainer: storeSelectTrainer } = usePtBookingStore()

  const {
    trainers,
    allSpecialties,
    trainersLoading,
    trainersError,
    selectedSpecialty,
    setSelectedSpecialty,
  } = usePtTrainerDirectory()

  const {
    availability,
    availabilityLoading,
    availabilityError,
    availabilityWeekOffset,
    pendingSlot,
    bookingLoading,
    bookingError,
    clearSelectedTrainer,
    setWeekOffset,
    openConfirmModal,
    closeConfirmModal,
    confirmBooking,
    canGoBack,
    canGoForward,
  } = usePtSlotPicker()

  const { upcoming, cancelMyPtBooking } = useMyPtBookings()

  const handleSelectTrainer = (trainer: PtTrainerSummary) => {
    storeSelectTrainer(trainer)
  }

  const handleConfirm = async () => {
    try {
      const booking = await confirmBooking()
      const when = new Date(booking.startAt).toLocaleString([], {
        weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
      setToast({ kind: 'success', message: `Booked with ${booking.trainerName} — ${when}` })
      clearSelectedTrainer()
    } catch {
      // error is in store state, modal stays open
    }
  }

  const pendingTrainer = pendingSlot
    ? trainers.find((t) => t.id === pendingSlot.trainerId) ?? selectedTrainer
    : null

  return (
    <div className="flex min-h-screen flex-col bg-[#0F0F0F] text-white">
      <MemberNav />

      <main className="relative flex-1 overflow-hidden px-10 pb-14 pt-10" style={{ maxWidth: 1320, margin: '0 auto', width: '100%' }}>
        {/* Ambient glows */}
        <div
          className="pointer-events-none absolute -right-[5%] -top-[10%] h-[500px] w-[600px]"
          style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.10), transparent 60%)', filter: 'blur(40px)', zIndex: 0 }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-[5%] -left-[5%] h-[400px] w-[500px]"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.06), transparent 60%)', filter: 'blur(40px)', zIndex: 0 }}
          aria-hidden="true"
        />

        <div className="relative z-10">
          {/* Hero */}
          <div className="mb-10">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#22C55E]">
              PERSONAL TRAINING
            </p>
            <h1 className="font-['Barlow_Condensed'] text-[56px] font-bold uppercase leading-none tracking-tight text-white">
              ONE-ON-ONE,
              <br />
              <span className="text-[#22C55E]">ON YOUR TERMS.</span>
            </h1>
            <p className="mt-3 max-w-[560px] text-[15px] text-[#9CA3AF]">
              Every active member gets access to personal training. Pick a trainer, choose your time, and lock it in.
            </p>
          </div>

          {/* Upcoming sessions */}
          <MyUpcomingPT bookings={upcoming} onCancel={cancelMyPtBooking} />

          {/* Step content */}
          {selectedTrainer ? (
            <SlotPicker
              trainer={selectedTrainer}
              availability={availability}
              loading={availabilityLoading}
              error={availabilityError}
              weekOffset={availabilityWeekOffset}
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              onBack={clearSelectedTrainer}
              onNextWeek={() => setWeekOffset(availabilityWeekOffset + 1)}
              onPrevWeek={() => setWeekOffset(availabilityWeekOffset - 1)}
              onSlotClick={openConfirmModal}
            />
          ) : (
            <TrainerDirectory
              trainers={trainers}
              loading={trainersLoading}
              error={trainersError}
              allSpecialties={allSpecialties}
              selectedSpecialty={selectedSpecialty}
              onSpecialtyChange={setSelectedSpecialty}
              onSelectTrainer={handleSelectTrainer}
            />
          )}
        </div>
      </main>

      <PulseFooter />

      {/* Confirm modal */}
      {pendingSlot && pendingTrainer && (
        <ConfirmBookingModal
          trainer={pendingTrainer}
          startAt={pendingSlot.startAt}
          room={pendingTrainer.defaultRoom ?? ''}
          loading={bookingLoading}
          error={bookingError}
          onConfirm={handleConfirm}
          onClose={closeConfirmModal}
        />
      )}

      {/* Toast */}
      {toast && (
        <BookingToast kind={toast.kind} message={toast.message} onDismiss={() => setToast(null)} />
      )}
    </div>
  )
}
