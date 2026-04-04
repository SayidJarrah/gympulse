import { useEffect, useRef } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { GroupClassScheduleEntry } from '../../types/groupClassSchedule'
import {
  formatLongDateLabel,
  formatTimeRange,
} from '../../utils/scheduleFormatters'
import {
  getEntrySupportingCopy,
  getScheduleEntryPresentationState,
} from '../../utils/bookingPresentation'

interface GroupScheduleEntryModalProps {
  isOpen: boolean;
  entry: GroupClassScheduleEntry | null;
  isStale: boolean;
  timeZone: string;
  actionError?: string | null;
  onBook?: (entry: GroupClassScheduleEntry) => void;
  onCancelBooking?: (entry: GroupClassScheduleEntry) => void;
  onBrowsePlans?: () => void;
  onClose: () => void;
}

function getTrainerField(trainerNames: string[]) {
  if (trainerNames.length === 0) {
    return { label: 'Trainer', value: 'Trainer TBA' }
  }
  if (trainerNames.length === 1) {
    return { label: 'Trainer', value: trainerNames[0] }
  }
  return { label: 'Trainers', value: trainerNames.join(', ') }
}

export function GroupScheduleEntryModal({
  isOpen,
  entry,
  isStale,
  timeZone,
  actionError,
  onBook,
  onCancelBooking,
  onBrowsePlans,
  onClose,
}: GroupScheduleEntryModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const lastActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      lastActiveElementRef.current = document.activeElement as HTMLElement | null
      setTimeout(() => closeButtonRef.current?.focus(), 0)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen && lastActiveElementRef.current) {
      lastActiveElementRef.current.focus()
    }
  }, [isOpen])

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === overlayRef.current) {
      onClose()
    }
  }

  if (!isOpen) return null

  const trainerField = entry ? getTrainerField(entry.trainerNames) : null
  const presentationState = entry ? getScheduleEntryPresentationState(entry) : 'unavailable'

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-entry-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={handleOverlayClick}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 shadow-xl shadow-black/50">
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-5">
          <h2 id="schedule-entry-modal-title" className="text-xl font-semibold text-white">
            {entry?.name ?? 'Class details'}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6">
          {isStale && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              This class is no longer in the latest schedule. Close and continue browsing.
            </div>
          )}

          {!isStale && entry && trainerField && (
            <div className="space-y-5">
              {entry.classPhotoUrl && (
                <div className="h-48 overflow-hidden rounded-2xl border border-gray-800 bg-gray-950">
                  <img
                    src={entry.classPhotoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                    Date
                  </p>
                  <p className="mt-1 text-sm text-white">
                    {formatLongDateLabel(entry.localDate, timeZone)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                    Time
                  </p>
                  <p className="mt-1 text-sm text-white">
                    {formatTimeRange(entry.scheduledAt, entry.durationMin, timeZone)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                    Duration
                  </p>
                  <p className="mt-1 text-sm text-white">{entry.durationMin} min</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                    {trainerField.label}
                  </p>
                  <p className="mt-1 text-sm text-white">{trainerField.value}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-800 bg-[#0F0F0F] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {presentationState === 'booked' || presentationState === 'cancellation-locked' ? (
                    <span className="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-green-300">
                      Booked
                    </span>
                  ) : null}
                  {presentationState === 'full' ? (
                    <span className="inline-flex items-center rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-orange-300">
                      Fully booked
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm text-gray-300">{getEntrySupportingCopy(entry)}</p>
              </div>

              {actionError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {actionError}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-800 px-6 py-4">
          {!isStale && entry && presentationState === 'available' ? (
            <button
              type="button"
              onClick={() => onBook?.(entry)}
              className="inline-flex items-center justify-center rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              Book spot
            </button>
          ) : null}
          {!isStale && entry && presentationState === 'booked' ? (
            <button
              type="button"
              onClick={() => onCancelBooking?.(entry)}
              className="inline-flex items-center justify-center rounded-md border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-200 transition-colors duration-200 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              Cancel booking
            </button>
          ) : null}
          {!isStale && entry && presentationState === 'membership-required' ? (
            <button
              type="button"
              onClick={onBrowsePlans}
              className="inline-flex items-center justify-center rounded-md border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-200 transition-colors duration-200 hover:bg-green-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              Browse plans
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium text-gray-400 transition-all duration-200 hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
