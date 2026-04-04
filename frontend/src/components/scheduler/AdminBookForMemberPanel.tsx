import { useEffect, useMemo, useState } from 'react'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { adminCreateBooking, searchBookingMembers } from '../../api/bookings'
import type {
  AdminBookingMemberSummaryResponse,
  BookingResponse,
} from '../../types/booking'
import type { ClassInstanceResponse } from '../../types/scheduler'
import { getBookingErrorMessage } from '../../utils/errorMessages'
import { formatTimeRange } from '../../utils/scheduleFormatters'

interface AdminBookForMemberPanelProps {
  classInstance: ClassInstanceResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onBooked?: (booking: BookingResponse) => void;
}

export function AdminBookForMemberPanel({
  classInstance,
  isOpen,
  onClose,
  onBooked,
}: AdminBookForMemberPanelProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AdminBookingMemberSummaryResponse[]>([])
  const [selectedMember, setSelectedMember] = useState<AdminBookingMemberSummaryResponse | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const trimmedQuery = query.trim()
  const canSearch = trimmedQuery.length >= 2

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setResults([])
      setSelectedMember(null)
      setIsSearching(false)
      setIsSubmitting(false)
      setErrorMessage(null)
      setSuccessMessage(null)
      return
    }

    if (!canSearch) {
      setResults([])
      setIsSearching(false)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setIsSearching(true)
      setErrorMessage(null)
      void searchBookingMembers({ query: trimmedQuery, page: 0, size: 10 })
        .then((response) => {
          setResults(response.content)
        })
        .catch((error: unknown) => {
          const responseError = error as { response?: { data?: { code?: string } } }
          const code = responseError.response?.data?.code
          setErrorMessage(
            getBookingErrorMessage(code, 'Could not search members right now.')
          )
          setResults([])
        })
        .finally(() => {
          setIsSearching(false)
        })
    }, 250)

    return () => window.clearTimeout(timeoutId)
  }, [canSearch, isOpen, trimmedQuery])

  const trainerNames = useMemo(() => {
    if (!classInstance) return 'Trainer TBA'
    if (classInstance.trainers.length === 0) return 'Trainer TBA'
    return classInstance.trainers
      .map((trainer) => `${trainer.firstName} ${trainer.lastName}`)
      .join(', ')
  }, [classInstance])

  if (!isOpen || !classInstance) {
    return null
  }

  const handleConfirm = async () => {
    if (!selectedMember) return

    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      const booking = await adminCreateBooking({
        userId: selectedMember.id,
        classId: classInstance.id,
      })
      setSuccessMessage(`Booked ${selectedMember.displayName}.`)
      onBooked?.(booking)
      onClose()
    } catch (error) {
      const responseError = error as { response?: { data?: { code?: string } } }
      const code = responseError.response?.data?.code
      setErrorMessage(
        getBookingErrorMessage(code, 'Could not complete this booking right now.')
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <aside className="fixed inset-y-0 right-[400px] z-20 hidden w-[26rem] border-l border-gray-800 bg-[#101010] shadow-2xl shadow-black/50 lg:flex lg:flex-col">
      <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Book for member</h2>
          <p className="mt-1 text-sm text-gray-400">
            Reserve a spot without requiring an active membership.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-300"
          aria-label="Close"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4">
          <div className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
            Selected class
          </div>
          <div className="mt-3 text-base font-semibold text-white">{classInstance.name}</div>
          <div className="mt-1 text-sm text-green-300">
            {formatTimeRange(classInstance.scheduledAt, classInstance.durationMin, 'UTC')}
          </div>
          <div className="mt-1 text-sm text-gray-400">{trainerNames}</div>
          <div className="mt-3 text-xs text-gray-500">
            Capacity {classInstance.capacity}
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="member-search" className="mb-2 block text-sm font-semibold text-gray-300">
            Find member
          </label>
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              id="member-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setSelectedMember(null)
                setSuccessMessage(null)
              }}
              placeholder="Search by name or email"
              className="w-full rounded-xl border border-gray-700 bg-gray-900 px-10 py-3 text-sm text-white placeholder:text-gray-500 focus:border-green-500 focus:outline-none"
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Search starts after 2 characters.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-gray-800 bg-gray-900/60">
          {isSearching ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-14 animate-pulse rounded-xl bg-gray-800/70"
                />
              ))}
            </div>
          ) : null}

          {!isSearching && !canSearch ? (
            <div className="p-4 text-sm text-gray-500">Search for a member to continue.</div>
          ) : null}

          {!isSearching && canSearch && results.length === 0 && !errorMessage ? (
            <div className="p-4 text-sm text-gray-500">No members matched this search.</div>
          ) : null}

          {!isSearching && results.length > 0 ? (
            <div className="divide-y divide-gray-800">
              {results.map((member) => {
                const isSelected = selectedMember?.id === member.id
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      setSelectedMember(member)
                      setSuccessMessage(null)
                    }}
                    className={`flex w-full items-start justify-between px-4 py-3 text-left transition-colors duration-150 hover:bg-gray-800 ${
                      isSelected ? 'bg-gray-800/80' : ''
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-white">{member.displayName}</div>
                      <div className="mt-1 text-xs text-gray-400">{member.email}</div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      {member.hasActiveMembership ? 'Active member' : 'No membership'}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>

        {selectedMember && (
          <div className="mt-5 rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
            <div className="text-sm font-semibold text-white">{selectedMember.displayName}</div>
            <div className="mt-1 text-sm text-gray-300">{selectedMember.email}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.12em] text-green-200">
              {selectedMember.hasActiveMembership ? 'Active membership' : 'Admin bypass available'}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mt-5 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
            {successMessage}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-gray-800 px-5 py-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!selectedMember || isSubmitting}
          className="rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-green-500/40"
        >
          {isSubmitting ? 'Booking...' : 'Confirm booking'}
        </button>
      </div>
    </aside>
  )
}
