import { useEffect, useRef } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { GroupClassScheduleEntry } from '../../types/groupClassSchedule'
import {
  formatLongDateLabel,
  formatTimeRange,
} from '../../utils/scheduleFormatters'

interface BookingConfirmModalProps {
  entry: GroupClassScheduleEntry;
  isOpen: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  timeZone: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function BookingConfirmModal({
  entry,
  isOpen,
  isSubmitting,
  errorMessage,
  timeZone,
  onConfirm,
  onClose,
}: BookingConfirmModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setTimeout(() => closeButtonRef.current?.focus(), 0)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-confirm-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 backdrop-blur-sm sm:items-center"
      onClick={(event) => {
        if (event.target === overlayRef.current && !isSubmitting) {
          onClose()
        }
      }}
    >
      <div className="w-full max-w-md rounded-t-3xl border border-gray-800 bg-gray-900 p-6 shadow-xl shadow-black/60 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="booking-confirm-title" className="text-xl font-semibold text-white">
              Confirm booking
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Reserve your spot before this class fills up.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-gray-800 bg-[#0F0F0F] p-4">
            <div className="text-lg font-semibold text-white">{entry.name}</div>
            <div className="mt-2 text-sm text-gray-300">
              {formatLongDateLabel(entry.localDate, timeZone)}
            </div>
            <div className="mt-1 text-sm text-green-300">
              {formatTimeRange(entry.scheduledAt, entry.durationMin, timeZone)}
            </div>
            <div className="mt-3 text-sm text-gray-400">
              {entry.trainerNames.length > 0 ? entry.trainerNames.join(', ') : 'Trainer TBA'}
            </div>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              {errorMessage}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-800 pt-4">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-gray-400 transition-colors duration-200 hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          >
            Keep browsing
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="inline-flex items-center justify-center rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:cursor-not-allowed disabled:bg-green-500/40"
          >
            {isSubmitting ? 'Booking...' : 'Confirm booking'}
          </button>
        </div>
      </div>
    </div>
  )
}
