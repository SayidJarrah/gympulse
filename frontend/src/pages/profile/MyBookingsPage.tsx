import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDaysIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { Navbar } from '../../components/layout/Navbar'
import { CancelBookingModal } from '../../components/schedule/CancelBookingModal'
import { useBookingStore } from '../../store/bookingStore'
import { useScheduleTimeZone } from '../../hooks/useScheduleTimeZone'
import type { BookingResponse } from '../../types/booking'
import { getBookingErrorMessage } from '../../utils/errorMessages'
import { formatLongDateLabel, formatTimeRange } from '../../utils/scheduleFormatters'

type StatusFilter = 'ALL' | 'CONFIRMED' | 'CANCELLED'

const STATUS_FILTERS: ReadonlyArray<{ value: StatusFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export function MyBookingsPage() {
  const timeZone = useScheduleTimeZone()
  const {
    myBookings,
    myBookingsLoading,
    myBookingsError,
    fetchMyBookings,
    cancelUserBooking,
    upsertBooking,
  } = useBookingStore()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [selectedCancelBooking, setSelectedCancelBooking] = useState<BookingResponse | null>(null)
  const [isCancelSubmitting, setIsCancelSubmitting] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  useEffect(() => {
    void fetchMyBookings({ page: 0, size: 100 })
  }, [fetchMyBookings])

  const filteredBookings = useMemo(() => {
    if (statusFilter === 'ALL') {
      return myBookings
    }
    return myBookings.filter((booking) => booking.status === statusFilter)
  }, [myBookings, statusFilter])

  const { upcoming, pastAndCancelled } = useMemo(() => {
    const now = Date.now()
    const upcomingGroup: BookingResponse[] = []
    const pastGroup: BookingResponse[] = []
    filteredBookings.forEach((booking) => {
      const isUpcoming =
        booking.status === 'CONFIRMED' && new Date(booking.scheduledAt).getTime() >= now
      if (isUpcoming) {
        upcomingGroup.push(booking)
      } else {
        pastGroup.push(booking)
      }
    })
    upcomingGroup.sort(
      (left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime()
    )
    pastGroup.sort(
      (left, right) => new Date(right.scheduledAt).getTime() - new Date(left.scheduledAt).getTime()
    )
    return { upcoming: upcomingGroup, pastAndCancelled: pastGroup }
  }, [filteredBookings])

  const handleCancelRequest = (booking: BookingResponse) => {
    setCancelError(null)
    setSelectedCancelBooking(booking)
  }

  const handleConfirmCancellation = async () => {
    if (!selectedCancelBooking) return
    setIsCancelSubmitting(true)
    setCancelError(null)
    try {
      const booking = await cancelUserBooking(selectedCancelBooking.id)
      upsertBooking(booking)
      setSelectedCancelBooking(null)
      await fetchMyBookings({ page: 0, size: 100 })
    } catch (err) {
      const errorResponse = err as { response?: { data?: { code?: string } } }
      const code = errorResponse.response?.data?.code
      setCancelError(getBookingErrorMessage(code, 'Could not cancel this booking right now.'))
    } finally {
      setIsCancelSubmitting(false)
    }
  }

  const handleRetry = () => {
    void fetchMyBookings({ page: 0, size: 100 })
  }

  const isEmpty =
    !myBookingsLoading &&
    !myBookingsError &&
    upcoming.length === 0 &&
    pastAndCancelled.length === 0

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold leading-tight text-white">My Bookings</h1>
          <p className="mt-1 text-sm text-gray-400">
            Your upcoming reservations and past class history.
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6">
          <aside className="mb-6 lg:mb-0">
            <ProfileSideNav />
          </aside>

          <div>
            <BookingsFilterBar value={statusFilter} onChange={setStatusFilter} />

            {myBookingsLoading ? (
              <BookingsSkeleton />
            ) : myBookingsError ? (
              <ErrorCard message={myBookingsError} onRetry={handleRetry} />
            ) : isEmpty ? (
              <EmptyState />
            ) : (
              <div className="space-y-8">
                <BookingSection
                  title="Upcoming"
                  bookings={upcoming}
                  emptyMessage="No upcoming bookings."
                  timeZone={timeZone}
                  onCancel={handleCancelRequest}
                />
                <BookingSection
                  title="Past & Cancelled"
                  bookings={pastAndCancelled}
                  emptyMessage="No past bookings yet."
                  timeZone={timeZone}
                  onCancel={null}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {selectedCancelBooking && (
        <CancelBookingModal
          booking={selectedCancelBooking}
          isOpen={Boolean(selectedCancelBooking)}
          isSubmitting={isCancelSubmitting}
          errorMessage={cancelError}
          timeZone={timeZone}
          onConfirm={handleConfirmCancellation}
          onClose={() => {
            if (isCancelSubmitting) return
            setSelectedCancelBooking(null)
            setCancelError(null)
          }}
        />
      )}
    </div>
  )
}

function ProfileSideNav() {
  return (
    <nav className="flex flex-col gap-1 rounded-2xl border border-gray-800 bg-gray-900 p-3">
      <Link
        to="/profile"
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors duration-200 hover:bg-gray-800 hover:text-white"
      >
        Profile
      </Link>
      <Link
        to="/profile/bookings"
        className="flex items-center gap-3 rounded-lg bg-green-500/10 px-3 py-2 text-sm font-medium text-green-400"
        aria-current="page"
      >
        My Bookings
      </Link>
    </nav>
  )
}

interface BookingsFilterBarProps {
  value: StatusFilter;
  onChange: (next: StatusFilter) => void;
}

function BookingsFilterBar({ value, onChange }: BookingsFilterBarProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-4">
      <div
        role="tablist"
        aria-label="Filter bookings by status"
        className="inline-flex rounded-xl border border-gray-800 bg-[#0F0F0F] p-1"
      >
        {STATUS_FILTERS.map((filter) => {
          const isActive = filter.value === value
          return (
            <button
              key={filter.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(filter.value)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                isActive
                  ? 'bg-green-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {filter.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface BookingSectionProps {
  title: string;
  bookings: BookingResponse[];
  emptyMessage: string;
  timeZone: string;
  onCancel: ((booking: BookingResponse) => void) | null;
}

function BookingSection({ title, bookings, emptyMessage, timeZone, onCancel }: BookingSectionProps) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
        {title}
      </h2>
      {bookings.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 py-8 text-center text-sm text-gray-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="divide-y divide-gray-800 rounded-xl border border-gray-800 bg-gray-900">
          {bookings.map((booking) => (
            <BookingRow
              key={booking.id}
              booking={booking}
              timeZone={timeZone}
              onCancel={onCancel}
            />
          ))}
        </div>
      )}
    </section>
  )
}

interface BookingRowProps {
  booking: BookingResponse;
  timeZone: string;
  onCancel: ((booking: BookingResponse) => void) | null;
}

function BookingRow({ booking, timeZone, onCancel }: BookingRowProps) {
  const localDate = new Date(booking.scheduledAt).toISOString().slice(0, 10)
  const trainerLabel =
    booking.trainerNames.length > 0 ? booking.trainerNames.join(', ') : 'Trainer TBA'
  const now = Date.now()
  const isUpcoming = new Date(booking.scheduledAt).getTime() >= now
  const canCancel =
    booking.status === 'CONFIRMED' && booking.isCancellable && isUpcoming && onCancel !== null
  const showLocked =
    booking.status === 'CONFIRMED' && !booking.isCancellable && isUpcoming && onCancel !== null

  return (
    <article className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white">{booking.className}</div>
        <div className="mt-1 text-sm text-gray-400">
          {formatLongDateLabel(localDate, timeZone)} ·{' '}
          {formatTimeRange(booking.scheduledAt, booking.durationMin, timeZone)}
        </div>
        <div className="mt-1 text-xs text-gray-500">{trainerLabel}</div>
        {canCancel ? (
          <div className="mt-1 text-xs text-gray-500">
            Cancellable until{' '}
            {formatTimeRange(booking.cancellationCutoffAt, 0, timeZone).split(' - ')[0]}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <StatusChip status={booking.status} />
        {canCancel ? (
          <button
            type="button"
            onClick={() => onCancel?.(booking)}
            className="inline-flex items-center justify-center rounded-md border border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-200 transition-colors duration-200 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Cancel
          </button>
        ) : showLocked ? (
          <span className="text-xs text-orange-400">Cancellation closed</span>
        ) : null}
      </div>
    </article>
  )
}

interface StatusChipProps {
  status: BookingResponse['status'];
}

function StatusChip({ status }: StatusChipProps) {
  const config: Record<
    BookingResponse['status'],
    { label: string; className: string }
  > = {
    CONFIRMED: {
      label: 'Confirmed',
      className: 'border-green-500/30 bg-green-500/10 text-green-400',
    },
    CANCELLED: {
      label: 'Cancelled',
      className: 'border-gray-700 bg-gray-700/40 text-gray-400',
    },
    ATTENDED: {
      label: 'Attended',
      className: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    },
  }
  const chip = config[status]
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${chip.className}`}
    >
      {chip.label}
    </span>
  )
}

function BookingsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-xl bg-gray-800" />
      ))}
    </div>
  )
}

interface ErrorCardProps {
  message: string;
  onRetry: () => void;
}

function ErrorCard({ message, onRetry }: ErrorCardProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-14 text-center">
      <ExclamationTriangleIcon className="h-10 w-10 text-red-400" aria-hidden="true" />
      <h2 className="text-lg font-semibold text-white">Bookings unavailable</h2>
      <p className="text-sm text-gray-200">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center justify-center rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      >
        Try again
      </button>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-800 bg-gray-900 px-6 py-14 text-center">
      <CalendarDaysIcon className="h-10 w-10 text-gray-600" aria-hidden="true" />
      <h2 className="text-lg font-semibold text-gray-300">No bookings yet.</h2>
      <p className="text-sm text-gray-500">Book your first class from the schedule.</p>
      <Link
        to="/schedule"
        className="mt-2 inline-flex items-center justify-center rounded-md bg-green-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
      >
        Browse classes
      </Link>
    </div>
  )
}
