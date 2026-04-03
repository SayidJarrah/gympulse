import { useEffect, useRef } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { GroupClassScheduleEntry } from '../../types/groupClassSchedule'
import {
  formatLongDateLabel,
  formatTimeRange,
} from '../../utils/scheduleFormatters'

interface GroupScheduleEntryModalProps {
  isOpen: boolean;
  entry: GroupClassScheduleEntry | null;
  isStale: boolean;
  timeZone: string;
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
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-800 px-6 py-4">
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
