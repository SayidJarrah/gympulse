import { useState, forwardRef, useImperativeHandle } from 'react'
import { useOnboardingStore } from '../../../store/onboardingStore'
import { GroupClassList } from '../booking/GroupClassList'
import { TrainerList } from '../booking/TrainerList'
import { createBooking } from '../../../api/bookings'
import { createPtBooking } from '../../../api/ptBookings'

export interface StepBookingHandle {
  submit: () => Promise<boolean>
}

export const StepBooking = forwardRef<StepBookingHandle, object>((_props, ref) => {
  const store = useOnboardingStore()
  const [mode, setMode] = useState<'class' | 'trainer'>(store.bookingMode)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(store.selectedClassInstanceId)
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(store.selectedTrainerId)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(store.selectedTrainerSlot)
  const [error, setError] = useState<string | null>(null)

  useImperativeHandle(ref, () => ({
    async submit(): Promise<boolean> {
      setError(null)

      if (mode === 'class' && selectedClassId) {
        try {
          const booking = await createBooking({ classId: selectedClassId })
          store.setBookingSelection('class', selectedClassId, null, null)
          store.setCompletedBooking(booking.id)
        } catch {
          setError('Unable to create booking. You can skip and book later.')
          return false
        }
      } else if (mode === 'trainer' && selectedTrainerId && selectedSlot) {
        try {
          const booking = await createPtBooking({
            trainerId: selectedTrainerId,
            startAt: selectedSlot,
          })
          store.setBookingSelection('trainer', null, selectedTrainerId, selectedSlot)
          store.setCompletedBooking(booking.id)
        } catch {
          setError('Unable to create PT booking. You can skip and book later.')
          return false
        }
      } else {
        // No selection — advance as skip
        store.setBookingSelection(mode, null, null, null)
      }

      return true
    }
  }))

  return (
    <div className="flex flex-col gap-8 max-w-[820px]">
      {/* Eyebrow */}
      <p
        className="text-xs font-semibold uppercase"
        style={{ letterSpacing: '0.22em', color: 'var(--color-primary-light)' }}
      >
        Step 05 · First booking
      </p>

      <h1
        className="uppercase leading-none"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(36px, 5vw, 48px)',
          fontWeight: 700,
          letterSpacing: '-0.01em',
          color: 'var(--color-fg-default)',
        }}
      >
        Book your first session
      </h1>

      <p className="text-[15px] max-w-[580px]" style={{ color: 'var(--color-fg-muted)', lineHeight: 1.6 }}>
        Optional. Your membership activates before the session.
      </p>

      {error && <p className="text-sm" style={{ color: 'var(--color-error-fg)' }}>{error}</p>}

      {/* Mode toggle */}
      <div
        className="inline-flex rounded-full p-1"
        style={{ background: 'var(--color-bg-surface-2)' }}
      >
        {(['class', 'trainer'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => {
              if (m === mode) return
              setMode(m)
              // Clear the opposing selection so stale data cannot leak across modes.
              if (m === 'trainer') {
                setSelectedClassId(null)
              } else {
                setSelectedTrainerId(null)
                setSelectedSlot(null)
              }
            }}
            className="px-5 py-2 rounded-full text-sm font-medium transition-all duration-150"
            style={{
              background: mode === m ? 'var(--color-primary)' : 'transparent',
              color: mode === m ? '#0F0F0F' : 'var(--color-fg-muted)',
            }}
          >
            {m === 'class' ? 'Group class' : 'Personal training'}
          </button>
        ))}
      </div>

      {mode === 'class' ? (
        <GroupClassList
          selectedId={selectedClassId}
          onSelect={setSelectedClassId}
        />
      ) : (
        <TrainerList
          selectedTrainerId={selectedTrainerId}
          selectedSlot={selectedSlot}
          onSelect={(trainerId, slot) => {
            setSelectedTrainerId(trainerId)
            setSelectedSlot(slot)
          }}
          onClear={() => {
            setSelectedTrainerId(null)
            setSelectedSlot(null)
          }}
        />
      )}
    </div>
  )
})

StepBooking.displayName = 'StepBooking'
