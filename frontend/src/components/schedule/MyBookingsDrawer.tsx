import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { BookingResponse } from '../../types/booking'
import { formatLongDateLabel, formatTimeRange } from '../../utils/scheduleFormatters'

interface MyBookingsDrawerProps {
  isOpen: boolean;
  bookings: BookingResponse[];
  isLoading: boolean;
  errorMessage: string | null;
  timeZone: string;
  onRetry: () => void;
  onClose: () => void;
  onCancelBooking: (booking: BookingResponse) => void;
  onJumpToClass: (classId: string) => void;
}

function groupBookings(bookings: BookingResponse[]) {
  const now = Date.now()
  return bookings.reduce<{ upcoming: BookingResponse[]; past: BookingResponse[] }>(
    (groups, booking) => {
      const isUpcoming =
        booking.status === 'CONFIRMED' && new Date(booking.scheduledAt).getTime() >= now
      if (isUpcoming) {
        groups.upcoming.push(booking)
      } else {
        groups.past.push(booking)
      }
      return groups
    },
    { upcoming: [], past: [] }
  )
}

function getLocalDate(isoDateTime: string): string {
  return new Date(isoDateTime).toISOString().slice(0, 10)
}

export function MyBookingsDrawer({
  isOpen,
  bookings,
  isLoading,
  errorMessage,
  timeZone,
  onRetry,
  onClose,
  onCancelBooking,
  onJumpToClass,
}: MyBookingsDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const { upcoming, past } = useMemo(() => groupBookings(bookings), [bookings])
  const nextUpcoming = upcoming[0] ?? null

  useEffect(() => {
    if (!isOpen) return
    setTimeout(() => closeButtonRef.current?.focus(), 0)
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close bookings drawer"
        className="absolute inset-0"
        onClick={onClose}
      />
      <aside className="absolute inset-x-0 bottom-0 z-10 max-h-[85vh] rounded-t-3xl border border-gray-800 bg-gray-950 shadow-2xl shadow-black/60 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[30rem] sm:rounded-none sm:border-l sm:border-t-0">
        <div className="border-b border-gray-800 px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-300">
                Booking hub
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">My bookings</h2>
              <p className="mt-1 text-sm text-gray-400">
                Upcoming classes and inactive booking history.
              </p>
            </div>
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

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-gray-800 bg-[#0F0F0F] px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                Upcoming
              </div>
              <div className="mt-2 font-['Barlow_Condensed'] text-4xl font-bold uppercase leading-none text-white">
                {upcoming.length}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-[#0F0F0F] px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                Next class
              </div>
              <div className="mt-2 text-sm font-semibold text-white">
                {nextUpcoming ? nextUpcoming.className : 'Nothing booked'}
              </div>
              <div className="mt-1 text-xs text-gray-400">
                {nextUpcoming
                  ? formatTimeRange(nextUpcoming.scheduledAt, nextUpcoming.durationMin, timeZone)
                  : 'Book from the schedule'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex h-full flex-col overflow-y-auto px-5 py-5">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-2xl border border-gray-800 bg-gray-900/70"
                />
              ))}
            </div>
          ) : null}

          {!isLoading && errorMessage ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
              <div className="text-sm font-medium text-red-200">{errorMessage}</div>
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 inline-flex rounded-md border border-red-500/30 px-3 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/10"
              >
                Retry
              </button>
            </div>
          ) : null}

          {!isLoading && !errorMessage && bookings.length === 0 ? (
            <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5 text-sm text-gray-400">
              No bookings yet.
            </div>
          ) : null}

          {!isLoading && !errorMessage && bookings.length > 0 ? (
            <div className="space-y-6 pb-8">
              <BookingGroup
                title="Upcoming"
                bookings={upcoming}
                timeZone={timeZone}
                onCancelBooking={onCancelBooking}
                onJumpToClass={onJumpToClass}
              />
              <BookingGroup
                title="Past / inactive"
                bookings={past}
                timeZone={timeZone}
                onCancelBooking={onCancelBooking}
                onJumpToClass={onJumpToClass}
              />
            </div>
          ) : null}
        </div>

        <div className="border-t border-gray-800 px-5 py-4">
          <Link
            to="/profile/bookings"
            onClick={onClose}
            className="inline-flex items-center text-sm font-semibold text-green-400 hover:text-green-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded-md"
          >
            See all my bookings →
          </Link>
        </div>
      </aside>
    </div>
  )
}

interface BookingGroupProps {
  title: string;
  bookings: BookingResponse[];
  timeZone: string;
  onCancelBooking: (booking: BookingResponse) => void;
  onJumpToClass: (classId: string) => void;
}

function BookingGroup({
  title,
  bookings,
  timeZone,
  onCancelBooking,
  onJumpToClass,
}: BookingGroupProps) {
  return (
    <section>
      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-500">
        {title}
      </h3>
      <div className="mt-3 space-y-3">
        {bookings.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 text-sm text-gray-500">
            No classes here.
          </div>
        ) : null}
        {bookings.map((booking) => {
          const localDate = getLocalDate(booking.scheduledAt)
          return (
            <article
              key={booking.id}
              className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-white">{booking.className}</div>
                  <div className="mt-1 text-sm text-gray-300">
                    {formatLongDateLabel(localDate, timeZone)}
                  </div>
                  <div className="mt-1 text-sm text-green-300">
                    {formatTimeRange(booking.scheduledAt, booking.durationMin, timeZone)}
                  </div>
                  <div className="mt-2 text-xs uppercase tracking-[0.12em] text-gray-500">
                    {booking.status === 'CONFIRMED'
                      ? booking.isCancellable
                        ? 'Booked'
                        : 'Cancellation locked'
                      : booking.status.toLowerCase()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onJumpToClass(booking.classId)}
                  className="rounded-md border border-gray-700 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-gray-800"
                >
                  Jump to class
                </button>
              </div>
              {booking.status === 'CONFIRMED' ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onJumpToClass(booking.classId)}
                    className="inline-flex rounded-md bg-green-500 px-3 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-green-600"
                  >
                    Show class
                  </button>
                  <span
                    title={
                      !booking.isCancellable
                        ? 'Cancellation closes 2 hours before class start'
                        : undefined
                    }
                  >
                    <button
                      type="button"
                      aria-disabled={!booking.isCancellable}
                      onClick={booking.isCancellable ? () => onCancelBooking(booking) : undefined}
                      className={`inline-flex rounded-md border border-red-500/30 px-3 py-2 text-sm font-semibold text-red-200 transition-colors duration-200 hover:bg-red-500/10 ${
                        !booking.isCancellable
                          ? 'pointer-events-none cursor-not-allowed border-gray-800 bg-transparent text-gray-600'
                          : ''
                      }`}
                    >
                      Cancel booking
                    </button>
                  </span>
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </section>
  )
}
